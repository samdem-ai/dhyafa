'use client';

/**
 * Browser Supabase client — anon key, RLS applies.
 *
 * Import this in Client Components that need Supabase access (e.g., Realtime
 * subscriptions for live message counts, calendar drag interactions).
 *
 * NEVER use the service-role key here. NEVER import lib/supabase/server.ts
 * from a 'use client' module.
 */

import { createBrowserClient } from '@dyafa/api-client';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
