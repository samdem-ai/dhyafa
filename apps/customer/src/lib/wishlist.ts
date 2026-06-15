/**
 * Typed data layer for wishlists (Phase 5a).
 *
 * A user has a single default wishlist (find-or-created server-side); membership
 * is the set of property_ids in `wishlist_items` joined to that user's wishlists.
 * All reads/writes are owner-scoped by RLS, so they go straight through the typed
 * supabase client.
 *
 * `toggle_wishlist` isn't in the BUILT @dyafa/api-client RPC map yet (same gap as
 * become_host / mark_notifications_read), so it goes through a narrowly loosened
 * rpc signature; table reads stay fully typed. No `as any`.
 */

import { supabaseClient } from './supabase';
import { searchProperties, type PropertySummary } from './discovery';

// Loosened rpc surface (matches src/lib/notifications.ts).
type LooseRpc = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};
const rpcClient = supabaseClient as unknown as LooseRpc;

/**
 * The set of property_ids the signed-in user has saved (across their wishlists).
 * Reads `wishlist_items` filtered to the user's own wishlists via the FK join;
 * RLS already scopes wishlists to the owner so the join is sufficient.
 */
export async function listWishlistPropertyIds(): Promise<string[]> {
  const { data, error } = await supabaseClient
    .from('wishlist_items')
    .select('property_id, wishlists!inner(user_id)');
  if (error) throw error;
  return (data ?? []).map((r) => r.property_id);
}

/**
 * Toggle a property in the user's default wishlist. Returns true if it is now
 * saved, false if it was removed. Server find-or-creates the default wishlist.
 */
export async function toggleWishlist(propertyId: string): Promise<boolean> {
  const { data, error } = await rpcClient.rpc('toggle_wishlist', {
    p_property_id: propertyId,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/**
 * Full PropertySummary[] for the user's saved properties, in the same shape the
 * result/rail cards render. Reuses the discovery fetch (whole approved set) and
 * filters to the saved id set so cards are identical — saved listings that are no
 * longer approved simply drop off.
 */
export async function listSavedProperties(): Promise<PropertySummary[]> {
  const ids = await listWishlistPropertyIds();
  if (ids.length === 0) return [];
  const saved = new Set(ids);
  const all = await searchProperties();
  return all.filter((p) => saved.has(p.id));
}
