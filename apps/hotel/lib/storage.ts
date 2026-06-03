/**
 * Storage URL helpers for property photos (hotel dashboard).
 *
 * Photos live in the public `listing-photos` bucket. `getPublicUrl` is a pure
 * string builder (no network call) — safe to call many times in a Server
 * Component. We use the service-role client purely as a URL builder here; it
 * performs no privileged read.
 *
 * SERVER-ONLY: imports lib/supabase/server (service-role client).
 */

import 'server-only';
import { adminSupabase } from './supabase/server';

export const LISTING_PHOTOS_BUCKET = 'listing-photos';

/** Build a public URL for a photo storage path, or null when path is missing. */
export function photoPublicUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  const { data } = adminSupabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl ?? null;
}
