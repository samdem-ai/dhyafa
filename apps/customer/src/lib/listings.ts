/**
 * Typed data layer for host listing creation (M1).
 *
 * Wraps the Supabase client with helpers for the listing wizard:
 * lookups (property types, amenities, wilayas, communes), draft persistence,
 * room types, photo upload to the `listing-photos` bucket, amenity sync, and
 * submit-for-review.
 *
 * RLS allows an authenticated host to insert/update their OWN draft property +
 * child rows (host_profiles.owner_id = auth.uid()), so all writes go directly
 * through supabase-js as the signed-in host.
 *
 * NOTE: the generated `Database` types in @dyafa/api-client predate the
 * become_host / submit_property_for_review RPCs and the listing enums, so the
 * client's `.rpc()` map is typed `never`. We call those RPCs through a narrowly
 * loosened client (`rpcClient`) and keep table reads/writes fully typed.
 */

import type { Database } from '@dyafa/api-client';
import type { Locale } from '@dyafa/i18n';
import { supabase } from './auth';

// ---------------------------------------------------------------------------
// Row / Insert aliases from the generated Database type
// ---------------------------------------------------------------------------
type Tables = Database['public']['Tables'];

export type PropertyRow = Tables['properties']['Row'];
export type PropertyInsert = Tables['properties']['Insert'];
export type PropertyUpdate = Tables['properties']['Update'];
export type RoomTypeRow = Tables['room_types']['Row'];
export type RoomTypeInsert = Tables['room_types']['Insert'];
export type PropertyPhotoRow = Tables['property_photos']['Row'];
export type PropertyTypeRow = Tables['property_types']['Row'];
export type AmenityRow = Tables['amenities']['Row'];

// Lookups select only the columns the wizard needs.
export type WilayaRow = Pick<
  Tables['wilayas']['Row'],
  'code' | 'name_ar' | 'name_fr' | 'name_en'
>;
export type CommuneRow = Pick<
  Tables['communes']['Row'],
  'id' | 'wilaya_code' | 'name_ar' | 'name_fr' | 'name_en' | 'post_code'
>;

// Enum-ish unions (not present in the generated types — kept local & explicit).
export type ListingKind = 'single_unit' | 'multi_room';
export type CancellationTier = 'flexible' | 'moderate' | 'strict';
export type PropertyStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export const STORAGE_BUCKET = 'listing-photos';

/**
 * The RPCs (become_host, submit_property_for_review) aren't in the generated
 * types. Cast to a loosened rpc signature so calls compile without weakening
 * the rest of the typed client.
 */
type LooseRpc = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};
const rpcClient = supabase as unknown as LooseRpc;

// ---------------------------------------------------------------------------
// Localized-name helper
// ---------------------------------------------------------------------------
interface LocalizedNames {
  name_ar?: string | null;
  name_fr?: string | null;
  name_en?: string | null;
}

/** Pick the best localized name with ar → fr → en fallback (matches i18n chain). */
export function localizedName(row: LocalizedNames, locale: Locale): string {
  const chain: (string | null | undefined)[] =
    locale === 'fr'
      ? [row.name_fr, row.name_ar, row.name_en]
      : locale === 'en'
        ? [row.name_en, row.name_fr, row.name_ar]
        : [row.name_ar, row.name_fr, row.name_en];
  for (const v of chain) {
    if (v && v.trim().length > 0) return v;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Host bootstrap
// ---------------------------------------------------------------------------

/**
 * Lazily create the caller's host_profile + grant host_individual.
 * Idempotent; returns the host_profile id.
 */
export async function becomeHost(displayName?: string): Promise<string> {
  const { data, error } = await rpcClient.rpc('become_host', {
    p_display_name: displayName ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Resolve the signed-in user's own host_profile id, or null if none yet. */
export async function getMyHostProfileId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('host_profiles')
    .select('id')
    .eq('owner_id', uid)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export async function listPropertyTypes(): Promise<PropertyTypeRow[]> {
  const { data, error } = await supabase
    .from('property_types')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAmenities(): Promise<AmenityRow[]> {
  const { data, error } = await supabase.from('amenities').select('*').order('category');
  if (error) throw error;
  return data ?? [];
}

export async function listWilayas(): Promise<WilayaRow[]> {
  const { data, error } = await supabase
    .from('wilayas')
    .select('code,name_ar,name_fr,name_en')
    .order('code', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listCommunes(wilayaCode: number): Promise<CommuneRow[]> {
  const { data, error } = await supabase
    .from('communes')
    .select('id,wilaya_code,name_ar,name_fr,name_en,post_code')
    .eq('wilaya_code', wilayaCode)
    .order('name_ar', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Properties (draft + listing)
// ---------------------------------------------------------------------------

/** Property + its room types + photos, used by the wizard review step. */
export interface PropertyWithChildren extends PropertyRow {
  room_types: RoomTypeRow[];
  property_photos: PropertyPhotoRow[];
}

/**
 * Create a draft property early in the wizard so child rows (photos, room
 * types, amenities) have a parent to attach to. Returns the new property id.
 */
export async function createDraftProperty(input: {
  hostProfileId: string;
  propertyTypeId: number;
  listingKind: ListingKind;
  wilayaCode: number;
}): Promise<string> {
  const insert: PropertyInsert = {
    host_profile_id: input.hostProfileId,
    property_type_id: input.propertyTypeId,
    listing_kind: input.listingKind as PropertyInsert['listing_kind'],
    wilaya_code: input.wilayaCode,
    status: 'draft' as PropertyInsert['status'],
  };
  const { data, error } = await supabase
    .from('properties')
    .insert(insert)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** Patch a draft property with any subset of editable columns. */
export async function updateProperty(
  propertyId: string,
  patch: PropertyUpdate,
): Promise<void> {
  const { error } = await supabase.from('properties').update(patch).eq('id', propertyId);
  if (error) throw error;
}

/** Fetch one property with its room types + photos. */
export async function getPropertyWithChildren(
  propertyId: string,
): Promise<PropertyWithChildren | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('*, room_types(*), property_photos(*)')
    .eq('id', propertyId)
    .maybeSingle();
  if (error) throw error;
  return (data as PropertyWithChildren | null) ?? null;
}

/** List the signed-in host's own properties (most recent first). */
export async function listMyProperties(): Promise<PropertyRow[]> {
  const hostProfileId = await getMyHostProfileId();
  if (!hostProfileId) return [];
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('host_profile_id', hostProfileId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Room types
// ---------------------------------------------------------------------------

export interface RoomTypeInput {
  propertyId: string;
  nameAr?: string | null;
  nameFr?: string | null;
  nameEn?: string | null;
  isDefault?: boolean;
  baseOccupancy?: number;
  maxOccupancy: number;
  maxAdults?: number | null;
  maxChildren?: number | null;
  basePriceDzd: number;
  weekendPriceDzd?: number | null;
  cleaningFeeDzd?: number;
  inventoryCount?: number;
}

/** Insert a room type and return its id. */
export async function addRoomType(input: RoomTypeInput): Promise<string> {
  const insert: RoomTypeInsert = {
    property_id: input.propertyId,
    name_ar: input.nameAr ?? null,
    name_fr: input.nameFr ?? null,
    name_en: input.nameEn ?? null,
    is_default: input.isDefault ?? false,
    base_occupancy: input.baseOccupancy ?? 2,
    max_occupancy: input.maxOccupancy,
    max_adults: input.maxAdults ?? null,
    max_children: input.maxChildren ?? null,
    base_price_dzd: input.basePriceDzd,
    weekend_price_dzd: input.weekendPriceDzd ?? null,
    cleaning_fee_dzd: input.cleaningFeeDzd ?? 0,
    inventory_count: input.inventoryCount ?? 1,
  };
  const { data, error } = await supabase
    .from('room_types')
    .insert(insert)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** Update an existing room type. */
export async function updateRoomType(
  roomTypeId: string,
  patch: Tables['room_types']['Update'],
): Promise<void> {
  const { error } = await supabase.from('room_types').update(patch).eq('id', roomTypeId);
  if (error) throw error;
}

export async function deleteRoomType(roomTypeId: string): Promise<void> {
  const { error } = await supabase.from('room_types').delete().eq('id', roomTypeId);
  if (error) throw error;
}

export async function listRoomTypes(propertyId: string): Promise<RoomTypeRow[]> {
  const { data, error } = await supabase
    .from('room_types')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

/** Decode a base64 string to a Uint8Array (RN has no atob/Buffer by default). */
function base64ToBytes(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  const clean = base64.replace(/=+$/, '');
  const byteLength = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(byteLength);

  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const e0 = lookup[clean.charCodeAt(i)] ?? 0;
    const e1 = lookup[clean.charCodeAt(i + 1)] ?? 0;
    const e2 = lookup[clean.charCodeAt(i + 2)] ?? 0;
    const e3 = lookup[clean.charCodeAt(i + 3)] ?? 0;
    if (p < byteLength) bytes[p++] = (e0 << 2) | (e1 >> 4);
    if (p < byteLength) bytes[p++] = ((e1 & 15) << 4) | (e2 >> 2);
    if (p < byteLength) bytes[p++] = ((e2 & 3) << 6) | e3;
  }
  return bytes;
}

export interface UploadPhotoInput {
  userId: string;
  propertyId: string;
  /** base64-encoded image bytes (from expo-image-picker with base64:true). */
  base64: string;
  /** File extension without the dot, e.g. 'jpg'. */
  ext?: string;
  contentType?: string;
  isCover?: boolean;
  sortOrder?: number;
}

/**
 * Upload one photo to `listing-photos` under the owner folder
 * `${userId}/${propertyId}/...` and insert the property_photos row.
 * Returns the created photo row.
 */
export async function uploadPhoto(input: UploadPhotoInput): Promise<PropertyPhotoRow> {
  const ext = input.ext ?? 'jpg';
  const contentType = input.contentType ?? 'image/jpeg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${input.userId}/${input.propertyId}/${filename}`;

  const bytes = base64ToBytes(input.base64);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('property_photos')
    .insert({
      property_id: input.propertyId,
      storage_path: path,
      is_cover: input.isCover ?? false,
      sort_order: input.sortOrder ?? 0,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listPhotos(propertyId: string): Promise<PropertyPhotoRow[]> {
  const { data, error } = await supabase
    .from('property_photos')
    .select('*')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Remove a photo: delete the storage object then the DB row. */
export async function deletePhoto(photo: PropertyPhotoRow): Promise<void> {
  await supabase.storage.from(STORAGE_BUCKET).remove([photo.storage_path]);
  const { error } = await supabase.from('property_photos').delete().eq('id', photo.id);
  if (error) throw error;
}

/** Get a public URL for a stored photo path (preview in the wizard). */
export function photoPublicUrl(storagePath: string): string {
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Amenities
// ---------------------------------------------------------------------------

/**
 * Replace the property's amenity set with exactly `amenityIds`.
 * Deletes removed rows and inserts new ones (idempotent).
 */
export async function setAmenities(
  propertyId: string,
  amenityIds: number[],
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from('property_amenities')
    .select('amenity_id')
    .eq('property_id', propertyId);
  if (readError) throw readError;

  const current = new Set((existing ?? []).map((r) => r.amenity_id));
  const target = new Set(amenityIds);

  const toAdd = amenityIds.filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !target.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('property_amenities')
      .delete()
      .eq('property_id', propertyId)
      .in('amenity_id', toRemove);
    if (error) throw error;
  }
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('property_amenities')
      .insert(toAdd.map((amenity_id) => ({ property_id: propertyId, amenity_id })));
    if (error) throw error;
  }
}

export async function getAmenityIds(propertyId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('property_amenities')
    .select('amenity_id')
    .eq('property_id', propertyId);
  if (error) throw error;
  return (data ?? []).map((r) => r.amenity_id);
}

// ---------------------------------------------------------------------------
// Submit for review
// ---------------------------------------------------------------------------

/**
 * Submit a draft property for admin review (draft → pending).
 * Server enforces: title in >=1 locale, >=1 room_type, >=1 photo.
 */
export async function submitForReview(propertyId: string): Promise<void> {
  const { error } = await rpcClient.rpc('submit_property_for_review', {
    p_property_id: propertyId,
  });
  if (error) throw new Error(error.message);
}
