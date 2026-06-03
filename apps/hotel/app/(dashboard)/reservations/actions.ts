'use server';

/**
 * Reservation Server Actions (hotel dashboard) — all via SECURITY DEFINER RPCs
 * called with the per-request USER-TOKEN client so the RPC receives the
 * hook-injected JWT claims and authorizes the caller (host/staff) correctly.
 *
 *   • accept_booking_request(p_booking_id)
 *   • decline_booking_request(p_booking_id)
 *   • cancel_booking(p_booking_id, p_reason)
 *
 * Capability: cancel-with-refund is manager/owner only (capability matrix). The
 * RPC re-enforces this; we also gate here so reception gets a clean error.
 * Accept/decline is allowed for reception too.
 */

import { revalidatePath } from 'next/cache';
import { requireHostAction, NotAuthorizedError, canManage } from '../../../lib/auth';
import { createUserClient } from '../../../lib/supabase/userServer';

export type ReservationResult =
  | { ok: true }
  | {
      ok: false;
      code: 'not_authorized' | 'forbidden' | 'invalid_input' | 'rpc_failed' | 'unknown';
      message?: string;
    };

export async function acceptBookingRequest(bookingId: string): Promise<ReservationResult> {
  let accessToken: string;
  try {
    const session = await requireHostAction();
    accessToken = session.accessToken;
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { ok: false, code: 'not_authorized' };
    return { ok: false, code: 'unknown' };
  }
  if (!bookingId) return { ok: false, code: 'invalid_input' };

  const supabase = createUserClient(accessToken);
  const { error } = await supabase.rpc('accept_booking_request', { p_booking_id: bookingId });
  if (error) return { ok: false, code: 'rpc_failed', message: error.message };

  revalidatePath('/reservations');
  revalidatePath('/');
  return { ok: true };
}

export async function declineBookingRequest(bookingId: string): Promise<ReservationResult> {
  let accessToken: string;
  try {
    const session = await requireHostAction();
    accessToken = session.accessToken;
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { ok: false, code: 'not_authorized' };
    return { ok: false, code: 'unknown' };
  }
  if (!bookingId) return { ok: false, code: 'invalid_input' };

  const supabase = createUserClient(accessToken);
  const { error } = await supabase.rpc('decline_booking_request', { p_booking_id: bookingId });
  if (error) return { ok: false, code: 'rpc_failed', message: error.message };

  revalidatePath('/reservations');
  revalidatePath('/');
  return { ok: true };
}

export async function cancelBooking(
  bookingId: string,
  reason: string,
): Promise<ReservationResult> {
  let accessToken: string;
  try {
    const session = await requireHostAction();
    // Cancel-with-refund is manager/owner only.
    if (!canManage(session)) return { ok: false, code: 'forbidden' };
    accessToken = session.accessToken;
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { ok: false, code: 'not_authorized' };
    return { ok: false, code: 'unknown' };
  }
  if (!bookingId) return { ok: false, code: 'invalid_input' };
  const trimmed = reason.trim();
  if (trimmed.length === 0) return { ok: false, code: 'invalid_input' };

  const supabase = createUserClient(accessToken);
  const { error } = await supabase.rpc('cancel_booking', {
    p_booking_id: bookingId,
    p_reason: trimmed,
  });
  if (error) return { ok: false, code: 'rpc_failed', message: error.message };

  revalidatePath('/reservations');
  revalidatePath('/');
  return { ok: true };
}
