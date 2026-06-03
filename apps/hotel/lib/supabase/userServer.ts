/**
 * Per-request, USER-SCOPED Supabase client for the hotel dashboard.
 *
 * Built from the **anon** key plus the signed-in user's access token injected as
 * `Authorization: Bearer <token>` (via `@dyafa/api-client`'s `createUserClient`).
 * This is the client used for ALL hotel data reads/writes because:
 *
 *   • RLS auto-scopes every row to the caller (host owner or staff) — enforced in
 *     Postgres, not the UI.
 *   • SECURITY DEFINER RPCs (accept_booking_request, set_availability_range,
 *     get_or_create_conversation, send_message, host_reply_review,
 *     add_hotel_staff, …) receive the auth hook-injected JWT claims
 *     (host_id, app_roles) and therefore authorize correctly.
 *
 * The service-role client (lib/supabase/server.ts) bypasses RLS and is used ONLY
 * where strictly necessary (privileged role/profile resolution in lib/auth.ts).
 *
 * SERVER-ONLY: never import from a 'use client' module.
 */

import 'server-only';
import {
  createUserClient as createUserTokenClient,
  type SupabaseClient,
  type Database,
} from '@dyafa/api-client';

/**
 * Build a request-scoped Supabase client bound to the caller's access token.
 * A fresh client is created per request (never shared/cached across users).
 */
export function createUserClient(accessToken: string): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase URL / anon key are not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).',
    );
  }

  return createUserTokenClient(url, anonKey, accessToken);
}
