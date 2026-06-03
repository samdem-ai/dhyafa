/**
 * SERVER-ONLY Supabase client that runs **as the signed-in admin user**.
 *
 * Unlike `lib/supabase/server.ts` (service-role, bypasses RLS), this client uses
 * the public **anon** key and forwards the admin's access token (from the
 * httpOnly session cookie) as the `Authorization: Bearer <jwt>` header. Every
 * request therefore runs under the caller's identity with RLS applied.
 *
 * WHY IT EXISTS: a few privileged RPCs self-check the caller's role internally
 * via `has_role('admin')` / `auth.uid()` and must NOT be invoked with the
 * service-role key (which has no JWT, so `auth.uid()` is null and the self-check
 * fails). The two callers in this dashboard are:
 *   • `run_payouts(p_period_start, p_period_end)` — generates host payouts.
 *   • `cancel_booking(p_booking_id, p_reason)` — admin force-cancel + refund calc.
 *
 * SECURITY: still guard the surrounding Server Action with `requireAdminAction()`
 * first. This client is a thin per-request wrapper — never cache or share it
 * across requests, and never import it from a 'use client' module.
 */

import 'server-only';
import { cookies } from 'next/headers';
import { createUserClient, type SupabaseClient, type Database } from '@dyafa/api-client';
import { ACCESS_TOKEN_COOKIE } from '../auth';

/**
 * Build a Supabase client that authenticates as the current admin user by
 * forwarding their access-token JWT. Returns `null` when no token cookie is
 * present (caller should treat that as "not authorized").
 *
 * Reads the SAME env vars the browser client uses (anon key) but resolves them
 * server-side. We accept the `NEXT_PUBLIC_` anon key here because forwarding the
 * user's own JWT under RLS is exactly the constrained, non-privileged path.
 */
export function userSupabase(): SupabaseClient<Database> | null {
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createUserClient(url, anonKey, token);
}
