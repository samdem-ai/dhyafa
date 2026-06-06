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
      code:
        | 'not_authorized'
        | 'forbidden'
        | 'invalid_input'
        | 'update_failed'
        | 'not_found'
        | 'last_room_type'
        | 'unknown';
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

export interface CreateRoomTypeInput {
  propertyId: string;
  /** Display name (stored as the English/default locale field). */
  name: string;
  maxOccupancy: number;
  baseOccupancy: number;
  basePriceDzd: number;
  weekendPriceDzd: number | null;
  cleaningFeeDzd: number;
  inventoryCount: number;
}

/**
 * Add a new room type to a property (manager/owner only).
 *
 * Verifies the property belongs to the caller's host_profile (via the RLS-scoped
 * user client — a non-visible property returns `not_found`), then inserts an
 * active room_types row. RLS (`room_types_manager_write`) re-enforces that the
 * caller may write; we check `canManage()` first for a clean typed error.
 */
export async function createRoomType(input: CreateRoomTypeInput): Promise<ActionResult> {
  let accessToken: string;
  let hostProfileId: string;
  try {
    const session = await requireHostAction();
    if (!canManage(session)) return { ok: false, code: 'forbidden' };
    accessToken = session.accessToken;
    hostProfileId = session.hostProfileId;
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { ok: false, code: 'not_authorized' };
    return { ok: false, code: 'unknown' };
  }

  if (!input.propertyId) return { ok: false, code: 'invalid_input' };

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length === 0 || name.length > 120) return { ok: false, code: 'invalid_input' };

  const maxOccupancy = parseIntField(input.maxOccupancy);
  const baseOccupancy = parseIntField(input.baseOccupancy);
  const base = parseIntField(input.basePriceDzd);
  const weekend = parseIntField(input.weekendPriceDzd);
  const cleaning = parseIntField(input.cleaningFeeDzd);
  const inventory = parseIntField(input.inventoryCount);
  if (
    maxOccupancy === 'invalid' ||
    baseOccupancy === 'invalid' ||
    base === 'invalid' ||
    weekend === 'invalid' ||
    cleaning === 'invalid' ||
    inventory === 'invalid'
  ) {
    return { ok: false, code: 'invalid_input' };
  }
  if (maxOccupancy === null || maxOccupancy < 1) return { ok: false, code: 'invalid_input' };
  if (baseOccupancy === null || baseOccupancy < 1 || baseOccupancy > maxOccupancy) {
    return { ok: false, code: 'invalid_input' };
  }
  if (base === null || base <= 0) return { ok: false, code: 'invalid_input' };
  if (inventory === null || inventory < 1) return { ok: false, code: 'invalid_input' };

  const supabase = createUserClient(accessToken);

  // Ownership: the property must be visible to (i.e. belong to) this host.
  const { data: prop, error: propError } = await supabase
    .from('properties')
    .select('id, host_profile_id')
    .eq('id', input.propertyId)
    .is('deleted_at', null)
    .maybeSingle();
  if (propError) return { ok: false, code: 'update_failed', message: propError.message };
  if (!prop || prop.host_profile_id !== hostProfileId) return { ok: false, code: 'not_found' };

  const { error } = await supabase.from('room_types').insert({
    property_id: input.propertyId,
    name_en: name,
    base_occupancy: baseOccupancy,
    max_occupancy: maxOccupancy,
    base_price_dzd: base,
    weekend_price_dzd: weekend,
    cleaning_fee_dzd: cleaning ?? 0,
    inventory_count: inventory,
    is_active: true,
  });

  if (error) return { ok: false, code: 'update_failed', message: error.message };

  revalidatePath('/properties');
  revalidatePath(`/properties/${input.propertyId}`);
  revalidatePath('/calendar');
  return { ok: true };
}

export interface RemoveRoomTypeInput {
  roomTypeId: string;
  propertyId: string;
}

/**
 * Soft-remove a room type (manager/owner only): set `is_active = false`.
 *
 * We never hard-delete — room_types is FK-referenced by bookings ON DELETE
 * RESTRICT, so deleting would either fail or orphan history. Deactivating hides
 * it from guests + the calendar while preserving past bookings. Blocks removing
 * the property's only remaining active room type.
 */
export async function removeRoomType(input: RemoveRoomTypeInput): Promise<ActionResult> {
  let accessToken: string;
  let hostProfileId: string;
  try {
    const session = await requireHostAction();
    if (!canManage(session)) return { ok: false, code: 'forbidden' };
    accessToken = session.accessToken;
    hostProfileId = session.hostProfileId;
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { ok: false, code: 'not_authorized' };
    return { ok: false, code: 'unknown' };
  }

  if (!input.roomTypeId || !input.propertyId) return { ok: false, code: 'invalid_input' };

  const supabase = createUserClient(accessToken);

  // Ownership: load the room type + its property and verify it's ours.
  const { data: rt, error: rtError } = await supabase
    .from('room_types')
    .select('id, is_active, property_id, properties ( host_profile_id, deleted_at )')
    .eq('id', input.roomTypeId)
    .maybeSingle();
  if (rtError) return { ok: false, code: 'update_failed', message: rtError.message };

  const row = rt as
    | { id: string; is_active: boolean; property_id: string; properties: { host_profile_id: string; deleted_at: string | null } | null }
    | null;
  if (
    !row ||
    row.property_id !== input.propertyId ||
    !row.properties ||
    row.properties.deleted_at !== null ||
    row.properties.host_profile_id !== hostProfileId
  ) {
    return { ok: false, code: 'not_found' };
  }

  // Already inactive → idempotent success.
  if (!row.is_active) {
    revalidatePath(`/properties/${input.propertyId}`);
    return { ok: true };
  }

  // Block removing the last active room type for this property.
  const { count, error: countError } = await supabase
    .from('room_types')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', input.propertyId)
    .eq('is_active', true);
  if (countError) return { ok: false, code: 'update_failed', message: countError.message };
  if ((count ?? 0) <= 1) return { ok: false, code: 'last_room_type' };

  const { error } = await supabase
    .from('room_types')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', input.roomTypeId);

  if (error) return { ok: false, code: 'update_failed', message: error.message };

  revalidatePath('/properties');
  revalidatePath(`/properties/${input.propertyId}`);
  revalidatePath('/calendar');
  return { ok: true };
}
