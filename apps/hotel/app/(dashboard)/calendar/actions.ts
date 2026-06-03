'use server';

/**
 * Calendar / availability Server Actions (hotel dashboard).
 *
 *   • setAvailabilityRange → set_availability_range(p_room_type_id, p_from, p_to,
 *       p_is_closed, p_price_override_dzd, p_min_stay) — the bulk workhorse.
 *
 * Called via the per-request USER-TOKEN client so RLS / the RPC's own ownership
 * checks authorize the caller. Capability: availability close/open is allowed for
 * reception; PRICE overrides are manager/owner only (capability matrix), so we
 * strip the price for reception callers.
 */

import { revalidatePath } from 'next/cache';
import { requireHostAction, NotAuthorizedError, canManage } from '../../../lib/auth';
import { createUserClient } from '../../../lib/supabase/userServer';

export type CalendarResult =
  | { ok: true; updated: number }
  | {
      ok: false;
      code: 'not_authorized' | 'forbidden_price' | 'invalid_input' | 'rpc_failed' | 'unknown';
      message?: string;
    };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface SetAvailabilityInput {
  roomTypeId: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  isClosed: boolean;
  priceOverrideDzd: number | null;
  minStay: number | null;
}

export async function setAvailabilityRange(
  input: SetAvailabilityInput,
): Promise<CalendarResult> {
  let accessToken: string;
  let manage: boolean;
  try {
    const session = await requireHostAction();
    accessToken = session.accessToken;
    manage = canManage(session);
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { ok: false, code: 'not_authorized' };
    return { ok: false, code: 'unknown' };
  }

  if (!input.roomTypeId) return { ok: false, code: 'invalid_input' };
  if (!ISO_DATE.test(input.from) || !ISO_DATE.test(input.to)) {
    return { ok: false, code: 'invalid_input' };
  }
  if (input.from > input.to) return { ok: false, code: 'invalid_input' };

  // Reception may not set price overrides.
  if (input.priceOverrideDzd != null && !manage) {
    return { ok: false, code: 'forbidden_price' };
  }

  let price: number | undefined;
  if (input.priceOverrideDzd != null) {
    if (
      !Number.isFinite(input.priceOverrideDzd) ||
      !Number.isInteger(input.priceOverrideDzd) ||
      input.priceOverrideDzd < 0
    ) {
      return { ok: false, code: 'invalid_input' };
    }
    price = input.priceOverrideDzd;
  }

  let minStay: number | undefined;
  if (input.minStay != null) {
    if (!Number.isInteger(input.minStay) || input.minStay < 1 || input.minStay > 365) {
      return { ok: false, code: 'invalid_input' };
    }
    minStay = input.minStay;
  }

  const supabase = createUserClient(accessToken);
  const { data, error } = await supabase.rpc('set_availability_range', {
    p_room_type_id: input.roomTypeId,
    p_from: input.from,
    p_to: input.to,
    p_is_closed: input.isClosed,
    ...(price !== undefined ? { p_price_override_dzd: price } : {}),
    ...(minStay !== undefined ? { p_min_stay: minStay } : {}),
  });

  if (error) return { ok: false, code: 'rpc_failed', message: error.message };

  revalidatePath('/calendar');
  return { ok: true, updated: typeof data === 'number' ? data : 0 };
}
