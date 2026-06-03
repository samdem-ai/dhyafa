'use client';

/**
 * Browser Supabase client — anon key, RLS applies.
 *
 * Import this in Client Components that need Supabase access (e.g., Realtime
 * subscriptions for the live moderation-queue badge).
 *
 * NEVER use the service-role key here. NEVER import lib/supabase/server.ts
 * from a 'use client' module.
 */

import { createBrowserClient, type Database, type SupabaseClient } from '@dyafa/api-client';

let _browser: SupabaseClient<Database> | null = null;
function browserClient(): SupabaseClient<Database> {
  if (!_browser) {
    _browser = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _browser;
}

// Lazy proxy so importing this module doesn't construct the client at build/SSG
// time (when NEXT_PUBLIC_* may be absent). Created on first property access.
export const supabase: SupabaseClient<Database> = new Proxy(
  {} as SupabaseClient<Database>,
  {
    get(_t, prop, receiver) {
      const c = browserClient() as unknown as Record<string | symbol, unknown>;
      const v = Reflect.get(c, prop, receiver);
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(c) : v;
    },
  },
);
