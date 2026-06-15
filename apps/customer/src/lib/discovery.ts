/**
 * Typed data layer for guest discovery (M2).
 *
 * Reads APPROVED, non-deleted listings from `properties` and joins the child
 * rows the result cards + detail screen need (photos, room types, amenities,
 * wilaya, property type, reviews). Anyone may read approved properties (public
 * RLS), so all reads go straight through the typed supabase client.
 *
 * Conventions mirror src/lib/listings.ts: Row aliases off the generated
 * Database type, an ar→fr→en `localizedName` helper, no `as any`.
 */

import type { Database } from '@dyafa/api-client';
import type { Locale } from '@dyafa/i18n';
import { supabaseClient } from './supabase';
import { STORAGE_BUCKET, localizedName, localizedNameWithSource } from './listings';

type Tables = Database['public']['Tables'];

export type PropertyRow = Tables['properties']['Row'];
export type RoomTypeRow = Tables['room_types']['Row'];
export type PropertyPhotoRow = Tables['property_photos']['Row'];
export type AmenityRow = Tables['amenities']['Row'];
export type ReviewRow = Tables['reviews']['Row'];

// Lookups select only the columns discovery needs.
export type WilayaLite = Pick<Tables['wilayas']['Row'], 'code' | 'name_ar' | 'name_fr' | 'name_en'>;
export type CommuneLite = Pick<Tables['communes']['Row'], 'id' | 'name_ar' | 'name_fr' | 'name_en'>;
export type PropertyTypeLite = Pick<
  Tables['property_types']['Row'],
  'id' | 'slug' | 'icon' | 'name_ar' | 'name_fr' | 'name_en' | 'kind'
>;

export { localizedName, localizedNameWithSource };

// ---------------------------------------------------------------------------
// Shaped read results
// ---------------------------------------------------------------------------

/** Minimal photo shape the image component needs. */
export interface PhotoLite {
  id: string;
  storage_path: string;
  is_cover: boolean;
  sort_order: number;
  room_type_id: string | null;
  alt_ar: string | null;
  alt_fr: string | null;
  alt_en: string | null;
}

/** A property as rendered in a result card / rail. */
export interface PropertySummary {
  id: string;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  wilaya_code: number;
  property_type_id: number;
  instant_book: boolean;
  cancellation_tier: Database['public']['Enums']['cancellation_tier'];
  rating_avg: number;
  review_count: number;
  listing_kind: Database['public']['Enums']['listing_kind'];
  cover_photo_path: string | null;
  photos: PhotoLite[];
  room_types: Pick<RoomTypeRow, 'id' | 'base_price_dzd' | 'max_occupancy' | 'is_active'>[];
  wilaya: WilayaLite | null;
  property_type: PropertyTypeLite | null;
  /** Cheapest active room base price; null when no active room. */
  from_price_dzd: number | null;
}

/** A review joined with its author + (optional) host reply, for the detail screen. */
export interface ReviewWithMeta extends ReviewRow {
  author: { id: string; display_name: string } | null;
  reply: { id: string; body: string; created_at: string } | null;
}

/** Full property detail (detail screen). */
export interface PropertyDetail extends PropertySummary {
  description_ar: string | null;
  description_fr: string | null;
  description_en: string | null;
  house_rules_ar: string | null;
  house_rules_fr: string | null;
  house_rules_en: string | null;
  checkin_time: string;
  checkout_time: string;
  min_nights: number;
  max_nights: number | null;
  commune_id: number | null;
  commune: CommuneLite | null;
  full_room_types: RoomTypeRow[];
  amenities: AmenityRow[];
  /** Published reviews (newest first) with author + host reply joined in. */
  reviews: ReviewWithMeta[];
}

// ---------------------------------------------------------------------------
// Filters & sort
// ---------------------------------------------------------------------------

export type SortKey = 'recommended' | 'price_asc' | 'price_desc' | 'rating';

export interface SearchFilters {
  /** Wilaya code to scope to (destination). */
  wilayaCode?: number | null;
  /** Min total guests the listing must accommodate (sum of adults+children). */
  guests?: number | null;
  /** Inclusive DZD price floor (matched against from_price). */
  minPrice?: number | null;
  /** Inclusive DZD price ceiling. */
  maxPrice?: number | null;
  /** Property type ids to include (OR). Empty/undefined = all. */
  propertyTypeIds?: number[];
  /** Only instant-book listings. */
  instantBookOnly?: boolean;
  /** Minimum rating_avg (e.g. 4 for "4+"). */
  minRating?: number | null;
  /** Amenity ids that must ALL be present. */
  amenityIds?: number[];
  sort?: SortKey;
}

// Columns selected for a summary read. Kept as one string so the shape stays
// in sync between rails and results.
const SUMMARY_SELECT = `
  id, title_ar, title_fr, title_en, wilaya_code, property_type_id,
  instant_book, cancellation_tier, rating_avg, review_count, listing_kind,
  cover_photo_path,
  property_photos ( id, storage_path, is_cover, sort_order, room_type_id, alt_ar, alt_fr, alt_en ),
  room_types ( id, base_price_dzd, max_occupancy, is_active ),
  wilaya:wilayas ( code, name_ar, name_fr, name_en ),
  property_type:property_types ( id, slug, icon, name_ar, name_fr, name_en, kind )
`;

// ---------------------------------------------------------------------------
// Row → shape mappers (typed, no `any`)
// ---------------------------------------------------------------------------

interface RawSummary {
  id: string;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  wilaya_code: number;
  property_type_id: number;
  instant_book: boolean;
  cancellation_tier: Database['public']['Enums']['cancellation_tier'];
  rating_avg: number;
  review_count: number;
  listing_kind: Database['public']['Enums']['listing_kind'];
  cover_photo_path: string | null;
  property_photos: PhotoLite[] | null;
  room_types: Pick<RoomTypeRow, 'id' | 'base_price_dzd' | 'max_occupancy' | 'is_active'>[] | null;
  wilaya: WilayaLite | null;
  property_type: PropertyTypeLite | null;
}

function cheapestActivePrice(
  rooms: Pick<RoomTypeRow, 'base_price_dzd' | 'is_active'>[],
): number | null {
  const active = rooms.filter((r) => r.is_active);
  if (active.length === 0) return null;
  return active.reduce((min, r) => (r.base_price_dzd < min ? r.base_price_dzd : min), active[0]!.base_price_dzd);
}

function sortPhotos(photos: PhotoLite[]): PhotoLite[] {
  return [...photos].sort((a, b) => {
    if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
}

function toSummary(raw: RawSummary): PropertySummary {
  const photos = sortPhotos(raw.property_photos ?? []);
  const rooms = raw.room_types ?? [];
  return {
    id: raw.id,
    title_ar: raw.title_ar,
    title_fr: raw.title_fr,
    title_en: raw.title_en,
    wilaya_code: raw.wilaya_code,
    property_type_id: raw.property_type_id,
    instant_book: raw.instant_book,
    cancellation_tier: raw.cancellation_tier,
    rating_avg: raw.rating_avg,
    review_count: raw.review_count,
    listing_kind: raw.listing_kind,
    cover_photo_path: raw.cover_photo_path,
    photos,
    room_types: rooms,
    wilaya: raw.wilaya,
    property_type: raw.property_type,
    from_price_dzd: cheapestActivePrice(rooms),
  };
}

// ---------------------------------------------------------------------------
// Image URL resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a property_photos.storage_path to a renderable URL.
 *
 * Demo data stores FULL https URLs in storage_path — render those directly.
 * Otherwise treat it as a bucket key and build a public URL.
 */
export function resolvePhotoUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath;
  }
  return supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

/** The cover URL for a summary: explicit cover_photo_path → first sorted photo. */
export function coverUrl(p: Pick<PropertySummary, 'cover_photo_path' | 'photos'>): string | null {
  if (p.cover_photo_path) return resolvePhotoUrl(p.cover_photo_path);
  const first = p.photos[0];
  return first ? resolvePhotoUrl(first.storage_path) : null;
}

// ---------------------------------------------------------------------------
// Client-side filter + sort (applied after the base approved query)
// ---------------------------------------------------------------------------

function passesFilters(p: PropertySummary, f: SearchFilters, amenityByProp: Set<string> | null): boolean {
  if (f.wilayaCode != null && p.wilaya_code !== f.wilayaCode) return false;
  if (f.instantBookOnly && !p.instant_book) return false;
  if (f.minRating != null && p.rating_avg < f.minRating) return false;
  if (f.propertyTypeIds && f.propertyTypeIds.length > 0 && !f.propertyTypeIds.includes(p.property_type_id)) {
    return false;
  }
  if (f.guests != null && f.guests > 0) {
    const maxOcc = p.room_types.reduce((m, r) => (r.max_occupancy > m ? r.max_occupancy : m), 0);
    if (maxOcc < f.guests) return false;
  }
  const price = p.from_price_dzd;
  if (f.minPrice != null && (price == null || price < f.minPrice)) return false;
  if (f.maxPrice != null && (price == null || price > f.maxPrice)) return false;
  if (amenityByProp && !amenityByProp.has(p.id)) return false;
  return true;
}

function sortSummaries(rows: PropertySummary[], sort: SortKey): PropertySummary[] {
  const copy = [...rows];
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => (a.from_price_dzd ?? Infinity) - (b.from_price_dzd ?? Infinity));
    case 'price_desc':
      return copy.sort((a, b) => (b.from_price_dzd ?? -Infinity) - (a.from_price_dzd ?? -Infinity));
    case 'rating':
      return copy.sort((a, b) => b.rating_avg - a.rating_avg || b.review_count - a.review_count);
    case 'recommended':
    default:
      // Recommended ≈ instant-book first, then rating × log(reviews+1).
      return copy.sort((a, b) => {
        const sa = a.rating_avg * Math.log10(a.review_count + 10) + (a.instant_book ? 0.5 : 0);
        const sb = b.rating_avg * Math.log10(b.review_count + 10) + (b.instant_book ? 0.5 : 0);
        return sb - sa;
      });
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Base read of approved, non-deleted properties (summary shape). */
async function readApprovedSummaries(): Promise<PropertySummary[]> {
  const { data, error } = await supabaseClient
    .from('properties')
    .select(SUMMARY_SELECT)
    .eq('status', 'approved')
    .is('deleted_at', null);
  if (error) throw error;
  const raws = (data ?? []) as unknown as RawSummary[];
  return raws.map(toSummary);
}

/**
 * If amenity filtering is requested, fetch the set of property ids that have
 * ALL the required amenities (intersection done client-side over the join).
 */
async function propertyIdsWithAllAmenities(amenityIds: number[]): Promise<Set<string>> {
  const { data, error } = await supabaseClient
    .from('property_amenities')
    .select('property_id, amenity_id')
    .in('amenity_id', amenityIds);
  if (error) throw error;
  const counts = new Map<string, Set<number>>();
  for (const row of data ?? []) {
    const set = counts.get(row.property_id) ?? new Set<number>();
    set.add(row.amenity_id);
    counts.set(row.property_id, set);
  }
  const need = amenityIds.length;
  const out = new Set<string>();
  for (const [propId, set] of counts) {
    if (set.size >= need) out.add(propId);
  }
  return out;
}

/**
 * Search approved properties with filters + sort, applied client-side over the
 * approved set (the demo dataset is ~12 listings — no pagination needed yet).
 *
 * Used by Explore (whole approved set, cached) and as the fallback. The results
 * screen uses `searchPropertiesPage` for server-side filter/sort/pagination.
 */
export async function searchProperties(filters: SearchFilters = {}): Promise<PropertySummary[]> {
  const [all, amenitySet] = await Promise.all([
    readApprovedSummaries(),
    filters.amenityIds && filters.amenityIds.length > 0
      ? propertyIdsWithAllAmenities(filters.amenityIds)
      : Promise.resolve(null),
  ]);
  const filtered = all.filter((p) => passesFilters(p, filters, amenitySet));
  return sortSummaries(filtered, filters.sort ?? 'recommended');
}

// ---------------------------------------------------------------------------
// Server-side search (PostgREST filters + range pagination)
// ---------------------------------------------------------------------------

/** A page of search results. */
export interface SearchPage {
  rows: PropertySummary[];
  /** True when more rows exist beyond this page (drives onEndReached). */
  hasMore: boolean;
  /** Total matching count (when the server reports it). */
  total: number | null;
}

/** Default page size for the results list. */
export const SEARCH_PAGE_SIZE = 12;

/**
 * Server-side search: pushes the cheap facets (wilaya, property type,
 * instant-book, rating) into PostgREST `.eq/.in/.gte` filters and paginates with
 * `.range()`, instead of pulling the whole approved set client-side each change.
 *
 * Price + guest occupancy + amenity-ALL-match depend on the cheapest active room
 * / a join intersection, which PostgREST can't express cleanly here, so they're
 * applied to the fetched page. (For larger inventory these would move to a
 * dedicated RPC; the surface here stays stable either way.)
 *
 * Sort: rating + recency are pushed to the DB; price/recommended sorts (which
 * derive from `from_price_dzd`) are applied on the page.
 */
export async function searchPropertiesPage(
  filters: SearchFilters = {},
  page = 0,
  pageSize = SEARCH_PAGE_SIZE,
): Promise<SearchPage> {
  const amenitySet =
    filters.amenityIds && filters.amenityIds.length > 0
      ? await propertyIdsWithAllAmenities(filters.amenityIds)
      : null;

  let query = supabaseClient
    .from('properties')
    .select(SUMMARY_SELECT, { count: 'exact' })
    .eq('status', 'approved')
    .is('deleted_at', null);

  if (filters.wilayaCode != null) query = query.eq('wilaya_code', filters.wilayaCode);
  if (filters.propertyTypeIds && filters.propertyTypeIds.length > 0) {
    query = query.in('property_type_id', filters.propertyTypeIds);
  }
  if (filters.instantBookOnly) query = query.eq('instant_book', true);
  if (filters.minRating != null) query = query.gte('rating_avg', filters.minRating);
  if (amenitySet) {
    const ids = [...amenitySet];
    // Empty set → no property has all amenities; short-circuit.
    if (ids.length === 0) return { rows: [], hasMore: false, total: 0 };
    query = query.in('id', ids);
  }

  // Server-side ordering for the facets the DB can sort directly.
  const sort = filters.sort ?? 'recommended';
  if (sort === 'rating') {
    query = query.order('rating_avg', { ascending: false }).order('review_count', { ascending: false });
  } else {
    // Stable default ordering; price/recommended re-sort the page below.
    query = query.order('rating_avg', { ascending: false }).order('id', { ascending: true });
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const raws = (data ?? []) as unknown as RawSummary[];
  let rows = raws.map(toSummary);

  // Price + guest occupancy can't be expressed on the base query (they derive
  // from the cheapest active room), so apply them to the fetched page.
  rows = rows.filter((p) => {
    if (filters.guests != null && filters.guests > 0) {
      const maxOcc = p.room_types.reduce((m, r) => (r.max_occupancy > m ? r.max_occupancy : m), 0);
      if (maxOcc < filters.guests) return false;
    }
    const price = p.from_price_dzd;
    if (filters.minPrice != null && (price == null || price < filters.minPrice)) return false;
    if (filters.maxPrice != null && (price == null || price > filters.maxPrice)) return false;
    return true;
  });

  // Price/recommended ordering operates on from_price_dzd — re-sort the page.
  if (sort === 'price_asc' || sort === 'price_desc' || sort === 'recommended') {
    rows = sortSummaries(rows, sort);
  }

  const total = typeof count === 'number' ? count : null;
  // hasMore is based on the raw (pre-page-filter) fetch size: a full page back
  // means there may be more to fetch.
  const hasMore = raws.length === pageSize;
  return { rows, hasMore, total };
}

/**
 * Count matching listings for the filters (drives the filters sheet's live
 * "Show N stays"). Counts the cheap facets server-side; price/guest/amenity
 * refinements are estimated via a single page scan when present.
 */
export async function countMatchingProperties(filters: SearchFilters = {}): Promise<number> {
  const needsClientRefine =
    filters.minPrice != null ||
    filters.maxPrice != null ||
    (filters.guests != null && filters.guests > 0) ||
    (filters.amenityIds != null && filters.amenityIds.length > 0);

  if (!needsClientRefine) {
    const amenitySet = null;
    let query = supabaseClient
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .is('deleted_at', null);
    if (filters.wilayaCode != null) query = query.eq('wilaya_code', filters.wilayaCode);
    if (filters.propertyTypeIds && filters.propertyTypeIds.length > 0) {
      query = query.in('property_type_id', filters.propertyTypeIds);
    }
    if (filters.instantBookOnly) query = query.eq('instant_book', true);
    if (filters.minRating != null) query = query.gte('rating_avg', filters.minRating);
    void amenitySet;
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }

  // Refined facets: reuse the full client-side search (bounded demo dataset).
  const rows = await searchProperties(filters);
  return rows.length;
}

/** Curated rail: approved properties scoped to a wilaya, top-rated first. */
export async function railPopularInWilaya(wilayaCode: number, limit = 8): Promise<PropertySummary[]> {
  const rows = await searchProperties({ wilayaCode, sort: 'rating' });
  return rows.slice(0, limit);
}

/** Curated rail: top rated across all wilayas. */
export async function railTopRated(limit = 8): Promise<PropertySummary[]> {
  const rows = await searchProperties({ sort: 'rating', minRating: 4 });
  return rows.slice(0, limit);
}

/**
 * Curated rail by property-type slug bucket (e.g. beachfront / sahara).
 * The demo dataset has no explicit "beachfront" flag, so we approximate using
 * property-type slugs + wilaya hints; falls back to recommended if no match.
 */
export async function railByTypeSlugs(slugs: string[], limit = 8): Promise<PropertySummary[]> {
  const all = await searchProperties({ sort: 'recommended' });
  const matched = all.filter((p) => p.property_type?.slug != null && slugs.includes(p.property_type.slug));
  const rows = matched.length > 0 ? matched : all;
  return rows.slice(0, limit);
}

/** Curated rail by wilaya-code bucket (coastal / Saharan wilayas). */
export async function railByWilayaCodes(codes: number[], limit = 8): Promise<PropertySummary[]> {
  const all = await searchProperties({ sort: 'rating' });
  const matched = all.filter((p) => codes.includes(p.wilaya_code));
  return matched.slice(0, limit);
}

/** Full detail for one approved property. Returns null if not found/approved. */
export async function getPropertyDetail(id: string): Promise<PropertyDetail | null> {
  const { data, error } = await supabaseClient
    .from('properties')
    .select(
      `
      id, title_ar, title_fr, title_en, wilaya_code, property_type_id,
      instant_book, cancellation_tier, rating_avg, review_count, listing_kind,
      cover_photo_path,
      description_ar, description_fr, description_en,
      house_rules_ar, house_rules_fr, house_rules_en,
      checkin_time, checkout_time, min_nights, max_nights, commune_id,
      property_photos ( id, storage_path, is_cover, sort_order, room_type_id, alt_ar, alt_fr, alt_en ),
      room_types ( * ),
      wilaya:wilayas ( code, name_ar, name_fr, name_en ),
      commune:communes ( id, name_ar, name_fr, name_en ),
      property_type:property_types ( id, slug, icon, name_ar, name_fr, name_en, kind ),
      property_amenities ( amenities ( id, slug, icon, category, name_ar, name_fr, name_en ) ),
      reviews (
        id, overall, cleanliness, accuracy, location, value, checkin, communication,
        comment_text, created_at, status, author_id, booking_id, property_id, deleted_at,
        target, published_at, updated_at,
        author:profiles ( id, display_name ),
        review_replies ( id, body, created_at )
      )
    `,
    )
    .eq('id', id)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  interface RawDetail extends RawSummary {
    description_ar: string | null;
    description_fr: string | null;
    description_en: string | null;
    house_rules_ar: string | null;
    house_rules_fr: string | null;
    house_rules_en: string | null;
    checkin_time: string;
    checkout_time: string;
    min_nights: number;
    max_nights: number | null;
    commune_id: number | null;
    room_types: RoomTypeRow[] | null;
    commune: CommuneLite | null;
    property_amenities: { amenities: AmenityRow | null }[] | null;
    reviews: RawDetailReview[] | null;
  }

  interface RawDetailReview extends ReviewRow {
    author: { id: string; display_name: string } | null;
    review_replies: { id: string; body: string; created_at: string }[] | null;
  }

  const raw = data as unknown as RawDetail;
  const summary = toSummary(raw);
  const fullRooms = (raw.room_types ?? []).filter((r) => r.is_active);
  const amenities: AmenityRow[] = (raw.property_amenities ?? [])
    .map((j) => j.amenities)
    .filter((a): a is AmenityRow => a != null);
  // Only show published reviews; newest first. Carry author + first reply.
  const reviews: ReviewWithMeta[] = (raw.reviews ?? [])
    .filter((r) => r.status === 'published' && r.deleted_at == null)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((r) => ({
      ...r,
      author: r.author,
      reply: r.review_replies?.[0] ?? null,
    }));

  return {
    ...summary,
    room_types: fullRooms.map((r) => ({
      id: r.id,
      base_price_dzd: r.base_price_dzd,
      max_occupancy: r.max_occupancy,
      is_active: r.is_active,
    })),
    from_price_dzd: cheapestActivePrice(fullRooms),
    description_ar: raw.description_ar,
    description_fr: raw.description_fr,
    description_en: raw.description_en,
    house_rules_ar: raw.house_rules_ar,
    house_rules_fr: raw.house_rules_fr,
    house_rules_en: raw.house_rules_en,
    checkin_time: raw.checkin_time,
    checkout_time: raw.checkout_time,
    min_nights: raw.min_nights,
    max_nights: raw.max_nights,
    commune_id: raw.commune_id,
    commune: raw.commune,
    full_room_types: fullRooms,
    amenities,
    reviews,
  };
}

/** All active wilayas for the destination picker. */
export async function listActiveWilayas(): Promise<WilayaLite[]> {
  const { data, error } = await supabaseClient
    .from('wilayas')
    .select('code, name_ar, name_fr, name_en')
    .eq('is_active', true)
    .order('code', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Distinct wilaya codes that actually have approved listings (for picker hints). */
export async function listWilayasWithListings(): Promise<number[]> {
  const { data, error } = await supabaseClient
    .from('properties')
    .select('wilaya_code')
    .eq('status', 'approved')
    .is('deleted_at', null);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.wilaya_code))];
}

/** Property types for the filter sheet. */
export async function listPropertyTypesLite(): Promise<PropertyTypeLite[]> {
  const { data, error } = await supabaseClient
    .from('property_types')
    .select('id, slug, icon, name_ar, name_fr, name_en, kind')
    .order('sort_order', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

/** Amenities for the filter sheet (grouped by category at the UI layer). */
export async function listAmenitiesLite(): Promise<AmenityRow[]> {
  const { data, error } = await supabaseClient
    .from('amenities')
    .select('*')
    .order('category', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Localized title helper
// ---------------------------------------------------------------------------

export function propertyTitle(
  p: Pick<PropertySummary, 'title_ar' | 'title_fr' | 'title_en'>,
  locale: Locale,
): string {
  return localizedName({ name_ar: p.title_ar, name_fr: p.title_fr, name_en: p.title_en }, locale);
}
