'use server';

/**
 * Staff Server Action — add_hotel_staff(p_user_id, p_staff_role) (owner only).
 *
 * Called with the per-request USER-TOKEN client so the SECURITY DEFINER RPC
 * derives the caller's host and enforces owner-only. We also gate `isOwner()`
 * here to return a clean typed error.
 */

import { revalidatePath } from 'next/cache';
import { requireHostAction, NotAuthorizedError, isOwner, type StaffRole } from '../../../lib/auth';
import { createUserClient } from '../../../lib/supabase/userServer';

export type StaffResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code: 'not_authorized' | 'forbidden' | 'invalid_input' | 'rpc_failed' | 'unknown';
      message?: string;
    };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isStaffRole(v: unknown): v is StaffRole {
  return v === 'reception' || v === 'manager';
}

export async function addStaff(userId: string, role: string): Promise<StaffResult> {
  let accessToken: string;
  try {
    const session = await requireHostAction();
    if (!isOwner(session)) return { ok: false, code: 'forbidden' };
    accessToken = session.accessToken;
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { ok: false, code: 'not_authorized' };
    return { ok: false, code: 'unknown' };
  }

  const trimmedId = userId.trim();
  if (!UUID_RE.test(trimmedId)) return { ok: false, code: 'invalid_input' };
  if (!isStaffRole(role)) return { ok: false, code: 'invalid_input' };

  const supabase = createUserClient(accessToken);
  const { data, error } = await supabase.rpc('add_hotel_staff', {
    p_user_id: trimmedId,
    p_staff_role: role,
  });
  if (error) return { ok: false, code: 'rpc_failed', message: error.message };

  revalidatePath('/staff');
  return { ok: true, id: typeof data === 'string' ? data : '' };
}
