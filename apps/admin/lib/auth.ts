/**
 * Server-side authentication & authorization for the Dyafa admin app.
 *
 * ── Auth approach (no new dependencies) ──────────────────────────────────────
 * `@supabase/ssr` is NOT a dependency of this app, and `@dyafa/api-client` only
 * exposes a browser client (anon key, persists session in the browser) and a
 * service-role server client. So we bridge the session to the server ourselves:
 *
 *   1. The user signs in client-side with the anon browser client
 *      (app/(auth)/sign-in/page.tsx). Supabase returns an access + refresh token.
 *   2. The client POSTs those tokens to `POST /api/session`, a Route Handler that
 *      stores them in **httpOnly** cookies (not readable by JS, sent on every
 *      same-site request). `DELETE /api/session` clears them (sign-out).
 *   3. Server Components and Server Actions call `requireAdmin()` below, which:
 *        a. reads the access token from the httpOnly cookie,
 *        b. validates it against Supabase Auth via `adminSupabase.auth.getUser(token)`
 *           (verifies the JWT, not just the cookie's presence),
 *        c. loads the caller's roles from `public.user_roles` using the
 *           **service-role** client so an attacker can't hide their own row via RLS,
 *        d. asserts the caller holds `admin` or `super_admin`.
 *
 * The cardinal rule (docs/06-admin-dashboard.md §0): bypassing RLS is not the same
 * as being authorized. Every privileged Server Action re-runs this gate server-side
 * before any mutation — Server Actions "can be called by anyone".
 *
 * This module is SERVER-ONLY (it imports the service-role client). Never import it
 * from a 'use client' module.
 */

import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminSupabase } from './supabase/server';
import type { Database } from '@dyafa/api-client';

/**
 * `app_role` enum — sourced from the generated `Database` type so it is the
 * SAME type identity the Supabase client uses for `user_roles.role` and
 * `audit_log.actor_role` (avoids "string is not assignable to enum" at inserts).
 */
export type AppRole = Database['public']['Enums']['app_role'];

/** Cookie names for the httpOnly session bridge (see module docs). */
export const ACCESS_TOKEN_COOKIE = 'dyafa_admin_at';
export const REFRESH_TOKEN_COOKIE = 'dyafa_admin_rt';

/** Roles that may access the admin dashboard / perform moderation. */
const ADMIN_ROLES: readonly AppRole[] = ['admin', 'super_admin'] as const;

/** The verified, authorized admin identity returned by the auth gate. */
export interface AdminSession {
  /** auth.users.id — used as actor_id / reviewed_by. */
  userId: string;
  email: string | null;
  /** The admin roles this user holds (subset of ADMIN_ROLES, non-empty). */
  roles: AppRole[];
  /** Highest-privilege role held, for audit_log.actor_role. */
  primaryRole: AppRole;
}

/** Thrown when the caller is not a signed-in admin. Carries a reason for logging. */
export class NotAuthorizedError extends Error {
  constructor(public readonly reason: 'no_session' | 'invalid_token' | 'not_admin') {
    super(`Not authorized: ${reason}`);
    this.name = 'NotAuthorizedError';
  }
}

/**
 * Resolve and verify the current admin session WITHOUT redirecting.
 * Returns `null` when there is no valid admin session (caller decides what to do).
 *
 * Safe to call from Server Components and Server Actions.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  // (b) Validate the JWT against Supabase Auth (not just trust the cookie).
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
    .map((r) => r.role as AppRole)
    .filter((role): role is AppRole => ADMIN_ROLES.includes(role));

  // (d) Must hold at least one admin role.
  if (roles.length === 0) return null;

  // super_admin outranks admin for audit attribution.
  const primaryRole: AppRole = roles.includes('super_admin') ? 'super_admin' : 'admin';

  return {
    userId: user.id,
    email: user.email ?? null,
    roles,
    primaryRole,
  };
}

/**
 * Require a signed-in admin. In a Server Component this redirects unauthenticated
 * users to the sign-in page. In a Server Action prefer {@link requireAdminAction}
 * which throws (so the action can report a typed failure to the client).
 *
 * @param redirectTo - path to return to after signing in (optional).
 */
export async function requireAdmin(redirectTo?: string): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    const next = redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : '';
    redirect(`/sign-in${next}`);
  }
  return session;
}

/**
 * Require a signed-in admin from within a Server Action. Throws
 * {@link NotAuthorizedError} instead of redirecting, so the action returns a
 * structured error the client form can render.
 */
export async function requireAdminAction(): Promise<AdminSession> {
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) throw new NotAuthorizedError('no_session');

  const session = await getAdminSession();
  if (!session) throw new NotAuthorizedError('not_admin');
  return session;
}
