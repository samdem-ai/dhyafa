/**
 * Typed data layer for guest bookings (M2).
 *
 * - priceQuote(): a CLIENT-SIDE PREVIEW of the price breakdown. The server
 *   snapshot from create_booking is authoritative; this is only for the
 *   pre-submit widget so the guest sees an estimate before committing.
 * - createBooking(): calls the `create_booking` RPC (insert is RPC-only). The
 *   RPC raises Postgres errors with codes (NO_AVAILABILITY, OCCUPANCY_EXCEEDED,
 *   PROPERTY_UNAVAILABLE, …); we surface those as friendly localized messages.
 * - listMyBookings()/getBookingDetail(): a signed-in guest reads their OWN rows
 *   (RLS), joined to a small property summary for trip cards.
 */

import type { Database } from '@dyafa/api-client';
import type { Locale } from '@dyafa/i18n';
import { supabaseClient } from './supabase';
import { resolvePhotoUrl, type PhotoLite } from './discovery';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

export type BookingRow = Tables['bookings']['Row'];
export type BookingStatus = Enums['booking_status'];
export type RoomTypeRow = Tables['room_types']['Row'];

// ---------------------------------------------------------------------------
// Client-side price preview
// ---------------------------------------------------------------------------

export interface PriceQuoteInput {
  /** Base nightly rate in DZD (room_types.base_price_dzd). */
  nightlyRateDzd: number;
  checkIn: Date;
  checkOut: Date;
  /** Cleaning fee in DZD (room_types.cleaning_fee_dzd). */
  cleaningFeeDzd: number;
  /** Per extra-guest-per-night fee in DZD (room_types.extra_guest_fee_dzd). */
  extraGuestFeeDzd: number;
  /** Base occupancy included in the nightly rate before extra-guest fees apply. */
  baseOccupancy: number;
  /** Total guests (adults + children). */
  guests: number;
  /** Number of units booked (defaults 1). */
  units?: number;
  /** Platform service fee, as basis points of the nightly subtotal (preview only). */
  serviceFeeBps?: number;
}

export interface PriceQuote {
  nights: number;
  units: number;
  nightlyRateDzd: number;
  nightlySubtotalDzd: number;
  cleaningFeeDzd: number;
  extraGuestFeeDzd: number;
  serviceFeeDzd: number;
  totalDzd: number;
  /** Number of guests beyond base occupancy that incur the extra-guest fee. */
  extraGuests: number;
}

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole nights between two dates (date-only, ignores time + DST). */
export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const a = Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  const b = Date.UTC(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
  return Math.max(0, Math.round((b - a) / MS_PER_DAY));
}

/** Format a Date as a YYYY-MM-DD date string (local calendar day) for the RPC. */
export function toDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Compute a price preview. Default service fee is a flat estimate; the real
 * value comes from the server snapshot returned by create_booking.
 */
export function priceQuote(input: PriceQuoteInput): PriceQuote {
  const nights = nightsBetween(input.checkIn, input.checkOut);
  const units = Math.max(1, input.units ?? 1);
  const nightlySubtotal = input.nightlyRateDzd * nights * units;

  const extraGuests = Math.max(0, input.guests - input.baseOccupancy * units);
  const extraGuestFee = extraGuests * input.extraGuestFeeDzd * nights;

  const cleaningFee = input.cleaningFeeDzd * units;

  const serviceBps = input.serviceFeeBps ?? 0;
  const serviceFee = Math.round((nightlySubtotal * serviceBps) / 10000);

  const total = nightlySubtotal + cleaningFee + extraGuestFee + serviceFee;

  return {
    nights,
    units,
    nightlyRateDzd: input.nightlyRateDzd,
    nightlySubtotalDzd: nightlySubtotal,
    cleaningFeeDzd: cleaningFee,
    extraGuestFeeDzd: extraGuestFee,
    serviceFeeDzd: serviceFee,
    totalDzd: total,
    extraGuests,
  };
}

// ---------------------------------------------------------------------------
// create_booking RPC
// ---------------------------------------------------------------------------

export interface CreateBookingInput {
  propertyId: string;
  roomTypeId: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  units: number;
  specialRequests?: string | null;
}

/** Known business error codes the RPC raises (mapped to friendly copy). */
export type BookingErrorCode =
  | 'NO_AVAILABILITY'
  | 'OCCUPANCY_EXCEEDED'
  | 'PROPERTY_UNAVAILABLE'
  | 'INVALID_DATES'
  | 'MIN_NIGHTS'
  | 'NOT_AUTHENTICATED'
  | 'UNKNOWN';

export class BookingError extends Error {
  code: BookingErrorCode;
  constructor(code: BookingErrorCode, message: string) {
    super(message);
    this.name = 'BookingError';
    this.code = code;
  }
}

const ERROR_COPY: Record<BookingErrorCode, { ar: string; fr: string; en: string }> = {
  NO_AVAILABILITY: {
    ar: 'لا تتوفر إقامة في هذه التواريخ. جرّب تواريخ أخرى.',
    fr: 'Aucune disponibilité pour ces dates. Essayez d’autres dates.',
    en: 'No availability for these dates. Try different dates.',
  },
  OCCUPANCY_EXCEEDED: {
    ar: 'عدد الضيوف يتجاوز السعة المسموحة لهذا الخيار.',
    fr: 'Le nombre de voyageurs dépasse la capacité autorisée.',
    en: 'Guest count exceeds the allowed occupancy.',
  },
  PROPERTY_UNAVAILABLE: {
    ar: 'هذا الإعلان غير متاح للحجز حاليًا.',
    fr: 'Cette annonce n’est pas disponible à la réservation.',
    en: 'This listing is not available to book right now.',
  },
  INVALID_DATES: {
    ar: 'التواريخ غير صالحة. تحقق من تاريخي الوصول والمغادرة.',
    fr: 'Dates invalides. Vérifiez l’arrivée et le départ.',
    en: 'Invalid dates. Check your check-in and check-out.',
  },
  MIN_NIGHTS: {
    ar: 'مدة الإقامة أقل من الحد الأدنى المطلوب.',
    fr: 'La durée du séjour est inférieure au minimum requis.',
    en: 'Your stay is shorter than the minimum nights required.',
  },
  NOT_AUTHENTICATED: {
    ar: 'يجب تسجيل الدخول لإتمام الحجز.',
    fr: 'Vous devez vous connecter pour réserver.',
    en: 'You must sign in to complete a booking.',
  },
  UNKNOWN: {
    ar: 'تعذّر إنشاء الحجز. حاول مرة أخرى.',
    fr: 'Impossible de créer la réservation. Réessayez.',
    en: 'Could not create the booking. Please try again.',
  },
};

/** Friendly localized message for a booking error. */
export function bookingErrorMessage(err: unknown, locale: Locale): string {
  const code = err instanceof BookingError ? err.code : 'UNKNOWN';
  const copy = ERROR_COPY[code];
  return locale === 'fr' ? copy.fr : locale === 'en' ? copy.en : copy.ar;
}

/** Map a raw Postgres/Supabase error message to a known code. */
function classifyError(message: string): BookingErrorCode {
  const m = message.toUpperCase();
  if (m.includes('NO_AVAILABILITY')) return 'NO_AVAILABILITY';
  if (m.includes('OCCUPANCY_EXCEEDED') || m.includes('OCCUPANCY')) return 'OCCUPANCY_EXCEEDED';
  if (m.includes('PROPERTY_UNAVAILABLE') || m.includes('UNAVAILABLE')) return 'PROPERTY_UNAVAILABLE';
  if (m.includes('MIN_NIGHTS')) return 'MIN_NIGHTS';
  if (m.includes('INVALID_DATES') || m.includes('DATE')) return 'INVALID_DATES';
  return 'UNKNOWN';
}

/**
 * Create a booking via the RPC. Returns the created booking id.
 * Throws a BookingError with a classified code on failure.
 */
export async function createBooking(input: CreateBookingInput): Promise<string> {
  const { data: auth } = await supabaseClient.auth.getUser();
  if (!auth.user) {
    throw new BookingError('NOT_AUTHENTICATED', 'not authenticated');
  }

  const { data, error } = await supabaseClient.rpc('create_booking', {
    p_property_id: input.propertyId,
    p_room_type_id: input.roomTypeId,
    p_check_in: toDateParam(input.checkIn),
    p_check_out: toDateParam(input.checkOut),
    p_adults: input.adults,
    p_children: input.children,
    p_units: input.units,
    p_special_requests: input.specialRequests ?? undefined,
  });

  if (error) {
    throw new BookingError(classifyError(error.message), error.message);
  }
  if (!data) {
    throw new BookingError('UNKNOWN', 'no booking id returned');
  }
  return data;
}

// ---------------------------------------------------------------------------
// Reads (trips)
// ---------------------------------------------------------------------------

/** Property summary attached to a booking for trip cards. */
export interface BookingPropertyLite {
  id: string;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  wilaya_code: number;
  cover_photo_path: string | null;
  photos: PhotoLite[];
}

export interface BookingWithProperty extends BookingRow {
  property: BookingPropertyLite | null;
  room_type: Pick<RoomTypeRow, 'id' | 'name_ar' | 'name_fr' | 'name_en'> | null;
}

const BOOKING_SELECT = `
  *,
  property:properties (
    id, title_ar, title_fr, title_en, wilaya_code, cover_photo_path,
    property_photos ( id, storage_path, is_cover, sort_order, room_type_id, alt_ar, alt_fr, alt_en )
  ),
  room_type:room_types ( id, name_ar, name_fr, name_en )
`;

interface RawBookingProperty {
  id: string;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  wilaya_code: number;
  cover_photo_path: string | null;
  property_photos: PhotoLite[] | null;
}

function toBookingWithProperty(
  raw: BookingRow & {
    property: RawBookingProperty | null;
    room_type: Pick<RoomTypeRow, 'id' | 'name_ar' | 'name_fr' | 'name_en'> | null;
  },
): BookingWithProperty {
  const prop = raw.property;
  return {
    ...raw,
    property: prop
      ? {
          id: prop.id,
          title_ar: prop.title_ar,
          title_fr: prop.title_fr,
          title_en: prop.title_en,
          wilaya_code: prop.wilaya_code,
          cover_photo_path: prop.cover_photo_path,
          photos: prop.property_photos ?? [],
        }
      : null,
    room_type: raw.room_type,
  };
}

/** Grouping buckets for the Trips tabs. */
export type TripBucket = 'upcoming' | 'completed' | 'cancelled';

const BUCKET_STATUSES: Record<TripBucket, BookingStatus[]> = {
  upcoming: ['requested', 'awaiting_payment', 'confirmed', 'checked_in'],
  completed: ['completed'],
  cancelled: ['declined', 'cancelled', 'no_show', 'expired'],
};

/** Which bucket a status belongs to. */
export function bucketForStatus(status: BookingStatus): TripBucket {
  for (const [bucket, statuses] of Object.entries(BUCKET_STATUSES) as [TripBucket, BookingStatus[]][]) {
    if (statuses.includes(status)) return bucket;
  }
  return 'upcoming';
}

/**
 * List the signed-in guest's own bookings, optionally filtered to a trip bucket.
 * Newest check-in first. RLS scopes rows to the caller.
 */
export async function listMyBookings(bucket?: TripBucket): Promise<BookingWithProperty[]> {
  let query = supabaseClient.from('bookings').select(BOOKING_SELECT).order('check_in', { ascending: false });
  if (bucket) {
    query = query.in('status', BUCKET_STATUSES[bucket]);
  }
  const { data, error } = await query;
  if (error) throw error;
  const raws = (data ?? []) as unknown as (BookingRow & {
    property: RawBookingProperty | null;
    room_type: Pick<RoomTypeRow, 'id' | 'name_ar' | 'name_fr' | 'name_en'> | null;
  })[];
  return raws.map(toBookingWithProperty);
}

/** One booking with its property summary. Null if not found / not the caller's. */
export async function getBookingDetail(id: string): Promise<BookingWithProperty | null> {
  const { data, error } = await supabaseClient
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toBookingWithProperty(
    data as unknown as BookingRow & {
      property: RawBookingProperty | null;
      room_type: Pick<RoomTypeRow, 'id' | 'name_ar' | 'name_fr' | 'name_en'> | null;
    },
  );
}

/** Cover URL for a booking's property. */
export function bookingCoverUrl(b: BookingWithProperty): string | null {
  const prop = b.property;
  if (!prop) return null;
  if (prop.cover_photo_path) return resolvePhotoUrl(prop.cover_photo_path);
  const sorted = [...prop.photos].sort((a, c) => {
    if (a.is_cover !== c.is_cover) return a.is_cover ? -1 : 1;
    return a.sort_order - c.sort_order;
  });
  const first = sorted[0];
  return first ? resolvePhotoUrl(first.storage_path) : null;
}
