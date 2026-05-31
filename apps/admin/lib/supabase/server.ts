/**
 * SERVER-ONLY Supabase client — service-role key, bypasses RLS entirely.
 *
 * ⚠️  NEVER import this file from a 'use client' component or any module
 *     that could be included in the browser bundle. The service-role key
 *     grants unrestricted database access (equivalent to DB root).
 *
 * Use only inside:
 *   - Server Actions ('use server')
 *   - Route Handlers (app/api/**/route.ts)
 *   - Server Components that perform privileged reads
 *
 * Every Server Action that uses this client must re-verify the caller's
 * identity and role server-side before any mutation (see withAdmin helper).
 */

import { createServerClient } from '@dyafa/api-client';

// SUPABASE_SERVICE_ROLE_KEY intentionally has no NEXT_PUBLIC_ prefix so it
// is stripped from the browser bundle by Next.js at build time.
export const adminSupabase = createServerClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
