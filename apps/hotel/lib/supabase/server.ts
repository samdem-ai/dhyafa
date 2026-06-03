/**
 * SERVER-ONLY Supabase client — service-role key, bypasses RLS entirely.
 *
 * ⚠️  NEVER import this file from a 'use client' component or any module
 *     that could be included in the browser bundle. The service-role key
 *     grants unrestricted database access (equivalent to DB root).
 *
 * Use only inside:
 *   - Server Actions ('use server')
 *   - Route Handlers (app/api/.../route.ts)
 *   - Server Components that perform privileged reads
 *
 * Hotel dashboard Server Actions use this client for operations that cross
 * RLS boundaries (e.g., manager inviting staff, reading payouts across properties).
 * Each action must re-verify caller identity and team-member role server-side.
 */

import { createServerClient, type Database, type SupabaseClient } from '@dyafa/api-client';

// SUPABASE_SERVICE_ROLE_KEY intentionally has no NEXT_PUBLIC_ prefix so it
// is stripped from the browser bundle by Next.js at build time.
let _admin: SupabaseClient<Database> | null = null;
function adminClient(): SupabaseClient<Database> {
  if (!_admin) {
    _admin = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _admin;
}

// Lazy proxy: built on first property access (request time), not at module load,
// so `next build` / SSG can import without env present. Call sites unchanged.
export const adminSupabase: SupabaseClient<Database> = new Proxy(
  {} as SupabaseClient<Database>,
  {
    get(_t, prop, receiver) {
      const c = adminClient() as unknown as Record<string | symbol, unknown>;
      const v = Reflect.get(c, prop, receiver);
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(c) : v;
    },
  },
);
