/**
 * Server-side authentication & authorization for the Dyafa HOTEL dashboard.
 *
 * ── Auth approach (mirrors apps/admin/lib/auth.ts) ───────────────────────────
 * `@supabase/ssr` is NOT a dependency, and `@dyafa/api-client` exposes only a
 * browser client (anon key) and a service-role client. We bridge the session to
 * the server ourselves:
 *
 *   1. The user signs in client-side with the anon browser client
 *      (app/(auth)/sign-in/page.tsx). Supabase returns an access + refresh token.
 *   2. The client POSTs those tokens to `POST /api/session`, a Route Handler that
 *      stores them in **httpOnly** cookies. `DELETE /api/session` clears them.
 *   3. Server Components / Server Actions call `requireHost()` below, which:
 *        a. reads the access token from the httpOnly cookie,
 *        b. validates it against Supabase Auth via `adminSupabase.auth.getUser(token)`
 *           (verifies the JWT, not just the cookie's presence),
 *        c. loads the caller's roles from `public.user_roles` via the **service-role**
 *           client so an attacker can't hide their own row via RLS,
 *        d. asserts the caller holds one of `host_individual | host_hotel | hotel_staff`,
 *        e. resolves the caller's `host_profile_id` (own profile for a host, or the
 *           employing hotel for staff) and `hotel_staff.staff_role` (null for owners).
 *
 * IMPORTANT — data access: this gate returns the validated `accessToken`. All
 * hotel data reads/writes use a per-request anon client carrying that token
 * (lib/supabase/userServer.ts) so RLS auto-scopes to the host AND SECURITY
 * DEFINER RPCs receive the hook-injected JWT claims (host_id, app_roles). The
 * service-role client is used ONLY here (privileged role/profile resolution).
 *
 * This module is SERVER-ONLY (it imports the service-role client). Never import
 * it from a 'use client' module.
 */

import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminSupabase } from './supabase/server';
import type { Database } from '@dyafa/api-client';

/** `app_role` enum, sourced from generated types (same identity the client uses). */
export type AppRole = Database['public']['Enums']['app_role'];
/** `staff_role` enum — reception | manager. */
export type StaffRole = Database['public']['Enums']['staff_role'];

/** Cookie names for the httpOnly session bridge (hotel-scoped, distinct from admin). */
export const ACCESS_TOKEN_COOKIE = 'dyafa_hotel_at';
export const REFRESH_TOKEN_COOKIE = 'dyafa_hotel_rt';

/** Roles that may access the hotel / property-manager dashboard. */
export const HOST_ROLES: readonly AppRole[] = [
  'host_individual',
  'host_hotel',
  'hotel_staff',
] as const;

/** The verified, authorized host identity returned by the auth gate. */
export interface HostSession {
  /** auth.users.id of the signed-in user. */
  userId: string;
  email: string | null;
  /** Validated Supabase access token — pass to the per-request user client. */
  accessToken: string;
  /**
   * The host business this user operates within:
   *   • owner (host_individual/host_hotel): their own host_profiles.id
   *   • staff (hotel_staff): the employing host's host_profiles.id
   * `null` only when no profile/membership could be resolved (treated as not authorized).
   */
  hostProfileId: string;
  /** `reception` | `manager` for staff; `null` for an owner. */
  staffRole: StaffRole | null;
  /** Whether this caller owns the host account (vs. employed staff). */
  isOwner: boolean;
  /** The host roles this user holds (subset of HOST_ROLES, non-empty). */
  roles: AppRole[];
}

/** Thrown when the caller is not a signed-in host. Carries a reason for logging. */
export class NotAuthorizedError extends Error {
  constructor(
    public readonly reason: 'no_session' | 'invalid_token' | 'not_host' | 'no_profile',
  ) {
    super(`Not authorized: ${reason}`);
    this.name = 'NotAuthorizedError';
  }
}

/** Minimal row shapes for the privileged lookups (avoids `as any`). */
interface HostProfileIdRow {
  id: string;
}
interface HotelStaffRow {
  host_profile_id: string;
  staff_role: StaffRole;
}

/**
 * Resolve and verify the current host session WITHOUT redirecting.
 * Returns `null` when there is no valid host session.
 *
 * Safe to call from Server Components and Server Actions.
 */
export async function getHostSession(): Promise<HostSession | null> {
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  // (b) Validate the JWT against Supabase Auth (don't merely trust the cookie).
  const { data: userData, error: userError } = await adminSupabase.auth.getUser(token);
  if (userError || !userData.user) return null;
  const user = userData.user;

  // (c) Load roles via the service-role client so RLS can't hide the row.
  const { data: roleRows, error: roleError } = await adminSupabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);
  if (roleError || !roleRows) return null;

  const roles = roleRows
    .map((r) => r.role)
    .filter((role): role is AppRole => HOST_ROLES.includes(role));

  // (d) Must hold at least one host role.
  if (roles.length === 0) return null;

  const isStaff = roles.includes('hotel_staff');

  // (e) Resolve the host_profile_id the caller operates within.
  let hostProfileId: string | null = null;
  let staffRole: StaffRole | null = null;
  let isOwner = false;

  // Prefer an owned host_profiles row when present (owner takes precedence).
  const { data: ownRows } = await adminSupabase
    .from('host_profiles')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1);
  const ownProfile = (ownRows ?? [])[0] as HostProfileIdRow | undefined;

  if (ownProfile) {
    hostProfileId = ownProfile.id;
    isOwner = true;
  } else if (isStaff) {
    // Employed staff: resolve the active hotel_staff membership.
    const { data: staffRows } = await adminSupabase
      .from('hotel_staff')
      .select('host_profile_id, staff_role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);
    const membership = (staffRows ?? [])[0] as HotelStaffRow | undefined;
    if (membership) {
      hostProfileId = membership.host_profile_id;
      staffRole = membership.staff_role;
    }
  }

  if (!hostProfileId) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    accessToken: token,
    hostProfileId,
    staffRole,
    isOwner,
    roles,
  };
}

/**
 * Require a signed-in host. In a Server Component this redirects unauthenticated
 * users to the sign-in page. In a Server Action prefer {@link requireHostAction}
 * which throws (so the action can report a typed failure to the client).
 *
 * @param redirectTo - path to return to after signing in (optional).
 */
export async function requireHost(redirectTo?: string): Promise<HostSession> {
  const session = await getHostSession();
  if (!session) {
    const next = redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : '';
    redirect(`/sign-in${next}`);
  }
  return session;
}

/**
 * Require a signed-in host from within a Server Action. Throws
 * {@link NotAuthorizedError} instead of redirecting.
 */
export async function requireHostAction(): Promise<HostSession> {
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) throw new NotAuthorizedError('no_session');

  const session = await getHostSession();
  if (!session) throw new NotAuthorizedError('not_host');
  return session;
}

/**
 * Capability helper — can this caller perform "manager-level" actions?
 * Owners and managers: yes. Reception staff: no.
 * (Server-side RPCs re-enforce this; the UI uses it to hide affordances.)
 */
export function canManage(session: HostSession): boolean {
  return session.isOwner || session.staffRole === 'manager';
}

/** Owner-only capability (e.g. managing staff). */
export function isOwner(session: HostSession): boolean {
  return session.isOwner;
}
