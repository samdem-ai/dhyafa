/**
 * Typed data layer for host-mode management screens (M4).
 *
 * Covers the surfaces beyond the listing wizard (M1) and reviews/messaging (M3):
 *   - Reservations  — incoming requests + upcoming stays, accept/decline/cancel.
 *   - Calendar      — read availability rows, bulk block/price/min-stay edits.
 *   - Earnings      — payouts + per-booking commission breakdown.
 *   - Performance   — bookings / occupancy / revenue rollups.
 *
 * RLS already scopes every read to the signed-in host's own data (bookings,
 * room_types, availability, payouts all carry host_profile_id = my host, or
 * descend from it), so the reads here are plain typed selects. The mutating
 * RPCs (accept_booking_request, decline_booking_request, cancel_booking,
 * set_availability_range) ARE present in the generated Database type, so they go
 * through the fully-typed `supabaseClient.rpc(...)` — no loosening needed.
 *
 * Strict TS, no `as any`. Where a nested select returns a shape the generated
 * types can't infer, we map through a narrow local interface (same pattern as
 * src/lib/bookings.ts).
 */

import type { Database } from '@dyafa/api-client';
import { supabaseClient } from './supabase';
import { getMyHostProfileId } from './listings';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

export type BookingRow = Tables['bookings']['Row'];
export type BookingStatus = Enums['booking_status'];
export type AvailabilityRow = Tables['availability']['Row'];
export type PayoutRow = Tables['payouts']['Row'];
export type PayoutStatus = Enums['payout_status'];
export type RoomTypeRow = Tables['room_types']['Row'];
export type PropertyRow = Tables['properties']['Row'];

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

/** A booking joined with the guest name + property/room titles, for host cards. */
export interface HostBooking extends BookingRow {
  guestName: string;
  property: {
    id: string;
    title_ar: string | null;
    title_fr: string | null;
    title_en: string | null;
  } | null;
  roomType: {
    id: string;
    name_ar: string | null;
    name_fr: string | null;
    name_en: string | null;
  } | null;
}

const HOST_BOOKING_SELECT = `
  *,
  guest:profiles ( id, display_name ),
  property:properties ( id, title_ar, title_fr, title_en ),
  room_type:room_types ( id, name_ar, name_fr, name_en )
`;

interface RawHostBooking extends BookingRow {
  guest: { id: string; display_name: string } | null;
  property: {
    id: string;
    title_ar: string | null;
    title_fr: string | null;
    title_en: string | null;
  } | null;
  room_type: {
    id: string;
    name_ar: string | null;
    name_fr: string | null;
    name_en: string | null;
  } | null;
}

function toHostBooking(raw: RawHostBooking): HostBooking {
  return {
    ...raw,
    guestName: raw.guest?.display_name ?? '',
    property: raw.property,
    roomType: raw.room_type,
  };
}

/** Statuses treated as "upcoming stays" on the host reservations screen. */
export const UPCOMING_STAY_STATUSES: BookingStatus[] = ['confirmed', 'checked_in'];

/**
 * Incoming booking requests awaiting the host's response (status='requested'),
 * soonest check-in first. RLS scopes to the host's own bookings.
 */
export async function listBookingRequests(): Promise<HostBooking[]> {
  const { data, error } = await supabaseClient
    .from('bookings')
    .select(HOST_BOOKING_SELECT)
    .eq('status', 'requested')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawHostBooking[]).map(toHostBooking);
}

/**
 * Upcoming/active stays the host has accepted (confirmed or checked-in),
 * soonest check-in first.
 */
export async function listUpcomingStays(): Promise<HostBooking[]> {
  const { data, error } = await supabaseClient
    .from('bookings')
    .select(HOST_BOOKING_SELECT)
    .in('status', UPCOMING_STAY_STATUSES)
    .order('check_in', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as RawHostBooking[]).map(toHostBooking);
}

/** Accept a pending booking request → moves it toward payment/confirmation. */
export async function acceptBookingRequest(bookingId: string): Promise<void> {
  const { error } = await supabaseClient.rpc('accept_booking_request', {
    p_booking_id: bookingId,
  });
  if (error) throw new Error(error.message);
}

/** Decline a pending booking request (optional reason). */
export async function declineBookingRequest(
  bookingId: string,
  reason?: string,
): Promise<void> {
  const { error } = await supabaseClient.rpc('decline_booking_request', {
    p_booking_id: bookingId,
    ...(reason ? { p_reason: reason } : {}),
  });
  if (error) throw new Error(error.message);
}

/** Cancel a confirmed booking (host-side), with a reason. Returns refund DZD. */
export async function cancelBooking(bookingId: string, reason: string): Promise<number> {
  const { data, error } = await supabaseClient.rpc('cancel_booking', {
    p_booking_id: bookingId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return typeof data === 'number' ? data : 0;
}

// ---------------------------------------------------------------------------
// Calendar / availability
// ---------------------------------------------------------------------------

/** Room types belonging to a property the host owns (ordered, active-first). */
export async function listRoomTypesForProperty(propertyId: string): Promise<RoomTypeRow[]> {
  const { data, error } = await supabaseClient
    .from('room_types')
    .select('*')
    .eq('property_id', propertyId)
    .order('is_default', { ascending: false })
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Availability rows for one room type within a date window (inclusive).
 * `from`/`to` are YYYY-MM-DD strings.
 */
export async function listAvailability(
  roomTypeId: string,
  from: string,
  to: string,
): Promise<AvailabilityRow[]> {
  const { data, error } = await supabaseClient
    .from('availability')
    .select('*')
    .eq('room_type_id', roomTypeId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface SetAvailabilityRangeInput {
  roomTypeId: string;
  /** YYYY-MM-DD (inclusive). */
  from: string;
  /** YYYY-MM-DD (inclusive). */
  to: string;
  /** Close (block) or open the range. */
  isClosed?: boolean;
  /** Nightly price override in whole DZD; null/undefined leaves it unchanged. */
  priceOverrideDzd?: number | null;
  /** Minimum stay (nights) for the range. */
  minStay?: number | null;
}

/**
 * Bulk-edit availability across a date range via the server RPC (one call per
 * range). Returns the number of affected day-rows.
 */
export async function setAvailabilityRange(
  input: SetAvailabilityRangeInput,
): Promise<number> {
  const args: {
    p_room_type_id: string;
    p_from: string;
    p_to: string;
    p_is_closed?: boolean;
    p_price_override_dzd?: number;
    p_min_stay?: number;
  } = {
    p_room_type_id: input.roomTypeId,
    p_from: input.from,
    p_to: input.to,
  };
  if (typeof input.isClosed === 'boolean') args.p_is_closed = input.isClosed;
  if (typeof input.priceOverrideDzd === 'number') {
    args.p_price_override_dzd = input.priceOverrideDzd;
  }
  if (typeof input.minStay === 'number') args.p_min_stay = input.minStay;

  const { data, error } = await supabaseClient.rpc('set_availability_range', args);
  if (error) throw new Error(error.message);
  return typeof data === 'number' ? data : 0;
}

// ---------------------------------------------------------------------------
// Earnings
// ---------------------------------------------------------------------------

/** All payouts for the signed-in host (newest period first). */
export async function listPayouts(): Promise<PayoutRow[]> {
  const hostProfileId = await getMyHostProfileId();
  if (!hostProfileId) return [];
  const { data, error } = await supabaseClient
    .from('payouts')
    .select('*')
    .eq('host_profile_id', hostProfileId)
    .order('period_end', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Statuses whose bookings count toward host earnings (money is committed). */
export const EARNING_STATUSES: BookingStatus[] = [
  'confirmed',
  'checked_in',
  'completed',
];

/** A trimmed booking row for the per-booking earnings breakdown. */
export interface EarningBooking {
  id: string;
  code: string;
  status: BookingStatus;
  check_in: string;
  check_out: string;
  total_dzd: number;
  commission_amount_dzd: number;
  host_payout_dzd: number;
  property: {
    id: string;
    title_ar: string | null;
    title_fr: string | null;
    title_en: string | null;
  } | null;
}

interface RawEarningBooking {
  id: string;
  code: string;
  status: BookingStatus;
  check_in: string;
  check_out: string;
  total_dzd: number;
  commission_amount_dzd: number;
  host_payout_dzd: number;
  property: {
    id: string;
    title_ar: string | null;
    title_fr: string | null;
    title_en: string | null;
  } | null;
}

/**
 * Per-booking earnings breakdown for the host's money-committed bookings
 * (confirmed/checked_in/completed), newest check-in first.
 */
export async function listEarningBookings(): Promise<EarningBooking[]> {
  const { data, error } = await supabaseClient
    .from('bookings')
    .select(
      `id, code, status, check_in, check_out, total_dzd,
       commission_amount_dzd, host_payout_dzd,
       property:properties ( id, title_ar, title_fr, title_en )`,
    )
    .in('status', EARNING_STATUSES)
    .order('check_in', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawEarningBooking[]).map((r) => ({
    id: r.id,
    code: r.code,
    status: r.status,
    check_in: r.check_in,
    check_out: r.check_out,
    total_dzd: r.total_dzd,
    commission_amount_dzd: r.commission_amount_dzd,
    host_payout_dzd: r.host_payout_dzd,
    property: r.property,
  }));
}

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

export interface HostPerformance {
  /** Distinct active (non-deleted) listings the host owns. */
  listingCount: number;
  /** Total bookings ever placed on the host's listings. */
  totalBookings: number;
  /** Bookings currently confirmed/checked-in. */
  confirmedBookings: number;
  /** Completed stays. */
  completedBookings: number;
  /** Pending requests awaiting response. */
  pendingRequests: number;
  /**
   * Occupancy estimate over the next 30 days: booked nights ÷ available
   * room-nights (rooms × 30). 0 when there are no room types. 0–1.
   */
  occupancy: number;
  /** Realized revenue (host payout) from money-committed bookings, in DZD. */
  revenueDzd: number;
}

const WINDOW_DAYS = 30;

/** YYYY-MM-DD for a local calendar day offset from today. */
function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Overlap (in nights) between [checkIn,checkOut) and [windowStart,windowEnd). */
function overlapNights(
  checkIn: string,
  checkOut: string,
  windowStart: string,
  windowEnd: string,
): number {
  const ci = Date.parse(checkIn);
  const co = Date.parse(checkOut);
  const ws = Date.parse(windowStart);
  const we = Date.parse(windowEnd);
  if ([ci, co, ws, we].some((n) => Number.isNaN(n))) return 0;
  const start = Math.max(ci, ws);
  const end = Math.min(co, we);
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

/**
 * Compute lightweight performance stats from the host's bookings + room types.
 *
 * There is NO view-tracking table, so "views" is intentionally omitted; the
 * screen shows listings / bookings / occupancy / revenue only.
 */
export async function getHostPerformance(): Promise<HostPerformance> {
  const hostProfileId = await getMyHostProfileId();
  if (!hostProfileId) {
    return {
      listingCount: 0,
      totalBookings: 0,
      confirmedBookings: 0,
      completedBookings: 0,
      pendingRequests: 0,
      occupancy: 0,
      revenueDzd: 0,
    };
  }

  // Active listings + their room-type inventory (for the occupancy denominator).
  const { data: propsData, error: propsErr } = await supabaseClient
    .from('properties')
    .select('id, room_types ( id, inventory_count )')
    .eq('host_profile_id', hostProfileId)
    .is('deleted_at', null);
  if (propsErr) throw propsErr;

  const properties = (propsData ?? []) as unknown as {
    id: string;
    room_types: { id: string; inventory_count: number }[] | null;
  }[];

  const listingCount = properties.length;
  const totalUnits = properties.reduce(
    (sum, p) => sum + (p.room_types ?? []).reduce((s, rt) => s + (rt.inventory_count ?? 1), 0),
    0,
  );

  // All bookings on the host's listings (RLS-scoped), trimmed to what we need.
  const { data: bookingsData, error: bookingsErr } = await supabaseClient
    .from('bookings')
    .select('status, check_in, check_out, host_payout_dzd');
  if (bookingsErr) throw bookingsErr;

  const bookings = (bookingsData ?? []) as {
    status: BookingStatus;
    check_in: string;
    check_out: string;
    host_payout_dzd: number;
  }[];

  const windowStart = dayOffset(0);
  const windowEnd = dayOffset(WINDOW_DAYS);

  let totalBookings = 0;
  let confirmedBookings = 0;
  let completedBookings = 0;
  let pendingRequests = 0;
  let revenueDzd = 0;
  let bookedNights = 0;

  for (const b of bookings) {
    totalBookings += 1;
    if (b.status === 'requested') pendingRequests += 1;
    if (b.status === 'confirmed' || b.status === 'checked_in') confirmedBookings += 1;
    if (b.status === 'completed') completedBookings += 1;
    if (EARNING_STATUSES.includes(b.status)) revenueDzd += b.host_payout_dzd;
    // Occupancy counts nights for money-committed stays overlapping the window.
    if (EARNING_STATUSES.includes(b.status)) {
      bookedNights += overlapNights(b.check_in, b.check_out, windowStart, windowEnd);
    }
  }

  const availableRoomNights = totalUnits * WINDOW_DAYS;
  const occupancy =
    availableRoomNights > 0 ? Math.min(1, bookedNights / availableRoomNights) : 0;

  return {
    listingCount,
    totalBookings,
    confirmedBookings,
    completedBookings,
    pendingRequests,
    occupancy,
    revenueDzd,
  };
}
