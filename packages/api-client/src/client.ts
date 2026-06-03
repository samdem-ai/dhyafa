import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dyafa/types';

/**
 * Browser / public client.
 *
 * Uses the **anon** key — every request is constrained by Row Level Security.
 * Safe to ship to clients (mobile + web). Persists the auth session so the
 * signed-in user is remembered across reloads.
 */
export function createBrowserClient(url: string, anonKey: string): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/**
 * Server-only client backed by the **service role** key.
 *
 * The service role key bypasses RLS — NEVER import this in client/browser code
 * or expose the key via `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*`. Intended for Next.js
 * Route Handlers / Server Actions and edge functions. Sessions are not
 * persisted and tokens are not auto-refreshed (stateless server usage).
 */
export function createServerClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * User-scoped server client: **anon** key + a caller-supplied access-token JWT
 * forwarded as the `Authorization` header. Every request runs as that user with
 * RLS applied (NOT god-mode). Sessions are not persisted (stateless server use).
 *
 * Use for SECURITY DEFINER RPCs that self-check the caller's role/identity via
 * `auth.uid()` / `has_role(...)` (e.g. `run_payouts`, `cancel_booking`), which
 * would fail under the service-role client because it carries no JWT.
 */
export function createUserClient(
  url: string,
  anonKey: string,
  accessToken: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

/**
 * Typed names of the SECURITY DEFINER Postgres RPCs exposed by the platform
 * (see canonical spec §3 / §5). Use these constants instead of bare strings
 * when calling `supabase.rpc(...)` so renames surface at compile time.
 */
export const RPC = {
  createBooking: 'create_booking',
  acceptBookingRequest: 'accept_booking_request',
  cancelBooking: 'cancel_booking',
} as const;

export type RpcName = (typeof RPC)[keyof typeof RPC];
