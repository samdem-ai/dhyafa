'use server';

/**
 * Property / room-type Server Actions (hotel dashboard).
 *
 * SECURITY: Server Actions can be invoked by anyone with the action id, so each
 * action re-verifies the caller via `requireHostAction()` and performs the write
 * through the per-request USER-TOKEN client (RLS enforces that the row belongs to
 * the caller's host AND that the caller's role may write it). We do NOT use the
 * service-role client for these mutations.
 *
 * Capability: editing room-type pricing/inventory requires manager/owner
 * (capability matrix). We check `canManage()` here in addition to RLS so the
 * client gets a clean typed error rather than an opaque RLS rejection.
 */

import { revalidatePath } from 'next/cache';
import { requireHostAction, NotAuthorizedError, canManage } from '../../../lib/auth';
import { createUserClient } from '../../../lib/supabase/userServer';

export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      code: 'not_authorized' | 'forbidden' | 'invalid_input' | 'update_failed' | 'unknown';
      message?: string;
    };

/** Parse a positive integer DZD amount (or null for "leave unset"). */
function parseIntField(value: unknown): number | null | 'invalid' {
  if (value === '' || value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return 'invalid';
  return n;
}

export interface UpdateRoomTypeInput {
  roomTypeId: string;
  propertyId: string;
  basePriceDzd: number;
  weekendPriceDzd: number | null;
  inventoryCount: number;
}

/**
 * Update a room type's base price, weekend price and inventory.
 * (Other room-type fields are managed in the mobile wizard; this is the common
 * web "tweak pricing/inventory" path.)
 */
export async function updateRoomType(input: UpdateRoomTypeInput): Promise<ActionResult> {
  let accessToken: string;
  try {
    const session = await requireHostAction();
    if (!canManage(session)) return { ok: false, code: 'forbidden' };
    accessToken = session.accessToken;
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { ok: false, code: 'not_authorized' };
    return { ok: false, code: 'unknown' };
  }

  if (!input.roomTypeId) return { ok: false, code: 'invalid_input' };

  const base = parseIntField(input.basePriceDzd);
  const weekend = parseIntField(input.weekendPriceDzd);
  const inventory = parseIntField(input.inventoryCount);
  if (base === 'invalid' || weekend === 'invalid' || inventory === 'invalid') {
    return { ok: false, code: 'invalid_input' };
  }
  if (base === null || base <= 0) return { ok: false, code: 'invalid_input' };
  if (inventory === null || inventory < 1) return { ok: false, code: 'invalid_input' };

  const supabase = createUserClient(accessToken);
  const { error } = await supabase
    .from('room_types')
    .update({
      base_price_dzd: base,
      weekend_price_dzd: weekend,
      inventory_count: inventory,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.roomTypeId);

  if (error) return { ok: false, code: 'update_failed', message: error.message };

  revalidatePath('/properties');
  revalidatePath(`/properties/${input.propertyId}`);
  return { ok: true };
}
