/**
 * Serialize/deserialize the discovery search state to/from expo-router params.
 *
 * Search flows across routes (Explore → results → detail → booking). Rather
 * than a global store, we pass the state as URL/query params — the expo-router
 * idiom already used elsewhere (e.g. sign-in reads `next`). All values are
 * strings on the wire; helpers parse them back to typed values defensively.
 */

import type { SearchFilters, SortKey } from './discovery';

export interface SearchState extends SearchFilters {
  /** ISO yyyy-mm-dd check-in (optional). */
  checkIn?: string | null;
  /** ISO yyyy-mm-dd check-out (optional). */
  checkOut?: string | null;
  adults?: number;
  children?: number;
}

/** Route param record (all string | undefined, as expo-router delivers them). */
export type SearchParamRecord = Record<string, string | undefined>;

function numOrUndef(v: string | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function idsOrUndef(v: string | undefined): number[] | undefined {
  if (!v) return undefined;
  const out = v
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  return out.length > 0 ? out : undefined;
}

const SORT_KEYS: SortKey[] = ['recommended', 'price_asc', 'price_desc', 'rating'];

function sortOrUndef(v: string | undefined): SortKey | undefined {
  return v && (SORT_KEYS as string[]).includes(v) ? (v as SortKey) : undefined;
}

/** Build a flat param object (omitting empties) for router.push({ params }). */
export function toParams(state: SearchState): SearchParamRecord {
  const p: SearchParamRecord = {};
  if (state.wilayaCode != null) p['wilayaCode'] = String(state.wilayaCode);
  if (state.checkIn) p['checkIn'] = state.checkIn;
  if (state.checkOut) p['checkOut'] = state.checkOut;
  if (state.adults != null) p['adults'] = String(state.adults);
  if (state.children != null) p['children'] = String(state.children);
  if (state.guests != null) p['guests'] = String(state.guests);
  if (state.minPrice != null) p['minPrice'] = String(state.minPrice);
  if (state.maxPrice != null) p['maxPrice'] = String(state.maxPrice);
  if (state.propertyTypeIds && state.propertyTypeIds.length > 0) {
    p['propertyTypeIds'] = state.propertyTypeIds.join(',');
  }
  if (state.instantBookOnly) p['instantBookOnly'] = '1';
  if (state.minRating != null) p['minRating'] = String(state.minRating);
  if (state.amenityIds && state.amenityIds.length > 0) {
    p['amenityIds'] = state.amenityIds.join(',');
  }
  if (state.sort) p['sort'] = state.sort;
  return p;
}

/** Parse expo-router params back into a typed SearchState. */
export function fromParams(params: SearchParamRecord): SearchState {
  const adults = numOrUndef(params['adults']);
  const children = numOrUndef(params['children']);
  const guestsParam = numOrUndef(params['guests']);
  const guests =
    guestsParam != null ? guestsParam : adults != null || children != null ? (adults ?? 0) + (children ?? 0) : undefined;

  return {
    wilayaCode: numOrUndef(params['wilayaCode']) ?? null,
    checkIn: params['checkIn'] ?? null,
    checkOut: params['checkOut'] ?? null,
    adults,
    children,
    guests: guests ?? null,
    minPrice: numOrUndef(params['minPrice']) ?? null,
    maxPrice: numOrUndef(params['maxPrice']) ?? null,
    propertyTypeIds: idsOrUndef(params['propertyTypeIds']),
    instantBookOnly: params['instantBookOnly'] === '1',
    minRating: numOrUndef(params['minRating']) ?? null,
    amenityIds: idsOrUndef(params['amenityIds']),
    sort: sortOrUndef(params['sort']),
  };
}

/** Extract just the SearchFilters subset for searchProperties(). */
export function toFilters(state: SearchState): SearchFilters {
  return {
    wilayaCode: state.wilayaCode ?? null,
    guests: state.guests ?? null,
    minPrice: state.minPrice ?? null,
    maxPrice: state.maxPrice ?? null,
    propertyTypeIds: state.propertyTypeIds,
    instantBookOnly: state.instantBookOnly,
    minRating: state.minRating ?? null,
    amenityIds: state.amenityIds,
    sort: state.sort,
  };
}

/** Count of "active" filters for the Filters button badge. */
export function activeFilterCount(state: SearchState): number {
  let n = 0;
  if (state.minPrice != null) n++;
  if (state.maxPrice != null) n++;
  if (state.propertyTypeIds && state.propertyTypeIds.length > 0) n++;
  if (state.instantBookOnly) n++;
  if (state.minRating != null) n++;
  if (state.amenityIds && state.amenityIds.length > 0) n++;
  return n;
}

/**
 * Validate a `next` route param into a safe in-app pathname.
 *
 * Accepts the legacy group token 'host' and any in-app absolute path
 * (starting with '/', no scheme/host so external/deep links can't be injected).
 * Returns null when the value isn't a safe in-app route.
 */
export function safeNextPath(next: string | undefined | null): string | null {
  if (!next) return null;
  if (next === 'host') return '/host';
  // Only allow in-app absolute paths; reject anything with a scheme or '//'.
  if (next.startsWith('/') && !next.startsWith('//') && !next.includes('://')) {
    return next;
  }
  return null;
}

/**
 * Build a single in-app path string (pathname + query) suitable for passing as
 * the `next` param to the auth screens. The result round-trips through
 * safeNextPath() and can be handed straight to router.replace().
 *
 * Example: buildNextPath('/booking/confirm', { propertyId: 'x', checkIn: '2026-…' })
 *   → '/booking/confirm?propertyId=x&checkIn=2026-…'
 */
export function buildNextPath(
  pathname: string,
  params: Record<string, string | number | undefined | null>,
): string {
  const query = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return query ? `${pathname}?${query}` : pathname;
}

/** Parse a yyyy-mm-dd string to a local Date (midnight). Null on invalid. */
export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const date = new Date(y, mo, d);
  return Number.isNaN(date.getTime()) ? null : date;
}
