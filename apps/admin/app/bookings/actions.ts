'use server';

/**
 * Booking-oversight Server Actions (force-cancel / force-refund).
 *
 * SECURITY: re-verifies admin via `requireAdminAction()` before any mutation.
 *
 * Cancellation is performed via the `cancel_booking(p_booking_id, p_reason)`
 * SECURITY DEFINER RPC. Per the M6 contract this RPC self-authorizes (it checks
 * the *caller's* relationship to the booking), so it is invoked with a client
 * carrying the ADMIN USER's JWT (lib/supabase/userServer.ts) — NOT the
 * service-role client (which has no `auth.uid()` and would fail the self-check
 * or compute refunds without an actor). The RPC returns the refund amount in DZD
 * and writes cancellation fields itself.
 *
 * We then write the `audit_log` row (service role) capturing before/after status
 * + the refund amount, and notify both guest and host. This mirrors the
 * audit + notification discipline of app/moderation/actions.ts.
 */

import { revalidatePath } from 'next/cache';
import { adminSupabase } from '../../lib/supabase/server';
import { userSupabase } from '../../lib/supabase/userServer';
import { requireAdminAction, NotAuthorizedError, type AppRole } from '../../lib/auth';
import { writeAudit, notify } from '../../lib/audit';

export type BookingActionResult =
  | { ok: true; refundDzd: number }
  | {
      ok: false;
      code:
        | 'not_authorized'
        | 'not_found'
        | 'invalid_input'
        | 'rpc_failed'
        | 'partial'
        | 'unknown';
      message?: string;
    };

interface BookingBefore {
  id: string;
  status: string;
  guest_id: string;
  host_profile_id: string;
  code: string;
  refund_amount_dzd: number;
}

/** Resolve the host's owner_id (auth user) so we can notify them. */
async function hostOwnerId(hostProfileId: string): Promise<string | null> {
  const { data } = await adminSupabase
    .from('host_profiles')
    .select('owner_id')
    .eq('id', hostProfileId)
    .maybeSingle();
  return (data as { owner_id: string } | null)?.owner_id ?? null;
}

export async function forceCancelBooking(
  bookingId: string,
  reason: string,
): Promise<BookingActionResult> {
  // 1. Authorize the admin.
  let actorId: string;
  let actorRole: AppRole;
  try {
    const session = await requireAdminAction();
    actorId = session.userId;
    actorRole = session.primaryRole;
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { ok: false, code: 'not_authorized' };
    return { ok: false, code: 'unknown' };
  }

  if (!bookingId) return { ok: false, code: 'invalid_input' };
  const trimmed = reason?.trim();
  if (!trimmed) return { ok: false, code: 'invalid_input' };

  // 2. Snapshot before-state (service role read).
  const { data: beforeData, error: readErr } = await adminSupabase
    .from('bookings')
    .select('id, status, guest_id, host_profile_id, code, refund_amount_dzd')
    .eq('id', bookingId)
    .maybeSingle();
  if (readErr) return { ok: false, code: 'rpc_failed', message: readErr.message };
  if (!beforeData) return { ok: false, code: 'not_found' };
  const before = beforeData as unknown as BookingBefore;

  // 3. Cancel via the admin-JWT client so cancel_booking's self-auth + refund
  //    computation run under the admin identity (NOT service role).
  const userClient = userSupabase();
  if (!userClient) return { ok: false, code: 'not_authorized' };

  const { data: refund, error: rpcErr } = await userClient.rpc('cancel_booking', {
    p_booking_id: bookingId,
    p_reason: trimmed,
  });
  if (rpcErr) return { ok: false, code: 'rpc_failed', message: rpcErr.message };

  const refundDzd = typeof refund === 'number' ? refund : (before.refund_amount_dzd ?? 0);

  // 4. Audit (service role, append-only).
  const auditErr = await writeAudit({
    actorId,
    actorRole,
    action: 'booking.force_cancel',
    targetType: 'booking',
    targetId: bookingId,
    before: { status: before.status },
    after: { status: 'cancelled', refund_amount_dzd: refundDzd },
    reason: trimmed,
  });

  // 5. Notify guest + host.
  const ownerId = await hostOwnerId(before.host_profile_id);
  const messages: (string | null)[] = [];
  messages.push(
    await notify({
      userId: before.guest_id,
      type: 'booking_cancelled_admin',
      titleAr: 'تم إلغاء حجزك',
      titleFr: 'Votre réservation a été annulée',
      titleEn: 'Your booking was cancelled',
      bodyAr: `تم إلغاء الحجز «${before.code}» من قبل الإدارة. السبب: ${trimmed}`,
      bodyFr: `La réservation « ${before.code} » a été annulée par l’administration. Motif : ${trimmed}`,
      bodyEn: `Booking “${before.code}” was cancelled by an administrator. Reason: ${trimmed}`,
      data: { booking_id: bookingId, refund_amount_dzd: refundDzd },
    }),
  );
  if (ownerId) {
    messages.push(
      await notify({
        userId: ownerId,
        type: 'booking_cancelled_admin',
        titleAr: 'تم إلغاء حجز',
        titleFr: 'Une réservation a été annulée',
        titleEn: 'A booking was cancelled',
        bodyAr: `تم إلغاء الحجز «${before.code}» من قبل الإدارة. السبب: ${trimmed}`,
        bodyFr: `La réservation « ${before.code} » a été annulée par l’administration. Motif : ${trimmed}`,
        bodyEn: `Booking “${before.code}” was cancelled by an administrator. Reason: ${trimmed}`,
        data: { booking_id: bookingId },
      }),
    );
  }

  revalidatePath('/bookings');
  revalidatePath(`/bookings/${bookingId}`);

  const followups = [auditErr, ...messages].filter(Boolean) as string[];
  if (followups.length > 0) {
    return { ok: false, code: 'partial', message: followups.join('; ') };
  }
  return { ok: true, refundDzd };
}
