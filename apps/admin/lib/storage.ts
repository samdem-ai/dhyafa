/**
 * Storage URL helpers for property photos.
 *
 * Photos live in the public `listing-photos` bucket (public read). We build URLs
 * with the service-role client's `getPublicUrl`, which is a pure string builder
 * (no network call) — safe to call many times in a Server Component.
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
