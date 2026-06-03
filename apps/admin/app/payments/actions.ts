'use server';

/**
 * Payments & payouts Server Actions.
 *
 * SECURITY: every action re-verifies admin via `requireAdminAction()`.
 *
 * Three privileged operations:
 *   • runPayouts(periodStart, periodEnd) — generates payout rows. The RPC
 *     `run_payouts` SELF-CHECKS `has_role('admin')`, so it MUST run with a client
 *     carrying the admin user's JWT (lib/supabase/userServer.ts), NOT the
 *     service-role client (no auth.uid()). Audited as `payout.run`.
 *   • markPayoutPaid(payoutId, reference) — service-role UPDATE status='paid',
 *     paid_at=now() (no RPC for this). Audited as `payout.release`; notifies host.
 *   • markTransactionRefunded(txnId, amount, reason) — records a manual refund by
 *     setting transactions.status + refunded_dzd via service role (programmatic
 *     provider refunds run in an Edge Function out of scope here). Audited as
 *     `payment.refund`.
 */

import { revalidatePath } from 'next/cache';
import { adminSupabase } from '../../lib/supabase/server';
import { userSupabase } from '../../lib/supabase/userServer';
import { requireAdminAction, NotAuthorizedError, type AppRole } from '../../lib/auth';
import { writeAudit, notify } from '../../lib/audit';

export type PaymentActionResult =
  | { ok: true; info?: string }
  | {
      ok: false;
      code:
        | 'not_authorized'
        | 'not_found'
        | 'invalid_input'
        | 'rpc_failed'
        | 'update_failed'
        | 'partial'
        | 'unknown';
      message?: string;
    };

interface Actor {
  actorId: string;
  actorRole: AppRole;
}

async function authorize(): Promise<Actor | { error: PaymentActionResult }> {
  try {
    const session = await requireAdminAction();
    return { actorId: session.userId, actorRole: session.primaryRole };
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: { ok: false, code: 'not_authorized' } };
    return { error: { ok: false, code: 'unknown' } };
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ─────────────────────────────────────────────────────────────────────────────
// runPayouts — admin-JWT client (run_payouts self-checks has_role('admin'))
// ─────────────────────────────────────────────────────────────────────────────

export async function runPayouts(
  periodStart: string,
  periodEnd: string,
): Promise<PaymentActionResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;

  if (!ISO_DATE.test(periodStart) || !ISO_DATE.test(periodEnd)) {
    return { ok: false, code: 'invalid_input' };
  }
  if (periodStart > periodEnd) return { ok: false, code: 'invalid_input' };

  const userClient = userSupabase();
  if (!userClient) return { ok: false, code: 'not_authorized' };

  // The RPC runs under the admin's JWT so its internal has_role('admin') passes.
  const { data: count, error } = await userClient.rpc('run_payouts', {
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });
  if (error) return { ok: false, code: 'rpc_failed', message: error.message };

  const generated = typeof count === 'number' ? count : 0;

  const auditErr = await writeAudit({
    actorId: auth.actorId,
    actorRole: auth.actorRole,
    action: 'payout.run',
    targetType: 'payout_batch',
    targetId: null,
    after: { period_start: periodStart, period_end: periodEnd, generated },
  });

  revalidatePath('/payments');
  if (auditErr) return { ok: false, code: 'partial', message: auditErr };
  return { ok: true, info: String(generated) };
}

// ─────────────────────────────────────────────────────────────────────────────
// markPayoutPaid — service-role UPDATE (no RPC)
// ─────────────────────────────────────────────────────────────────────────────

export async function markPayoutPaid(
  payoutId: string,
  reference: string,
): Promise<PaymentActionResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!payoutId) return { ok: false, code: 'invalid_input' };

  const trimmedRef = reference?.trim() ? reference.trim() : null;

  const { data: before, error: readErr } = await adminSupabase
    .from('payouts')
    .select('id, status, host_profile_id, net_dzd, period_start, period_end')
    .eq('id', payoutId)
    .maybeSingle();
  if (readErr) return { ok: false, code: 'update_failed', message: readErr.message };
  if (!before) return { ok: false, code: 'not_found' };

  const now = new Date().toISOString();
  // Guard on a not-already-paid status so a double-submit can't re-stamp.
  const { data: updated, error: updErr } = await adminSupabase
    .from('payouts')
    .update({ status: 'paid', paid_at: now, reference: trimmedRef, updated_at: now })
    .eq('id', payoutId)
    .neq('status', 'paid')
    .select('id, host_profile_id, net_dzd')
    .maybeSingle();
  if (updErr) return { ok: false, code: 'update_failed', message: updErr.message };
  if (!updated) return { ok: false, code: 'not_found' };

  const auditErr = await writeAudit({
    actorId: auth.actorId,
    actorRole: auth.actorRole,
    action: 'payout.release',
    targetType: 'payout',
    targetId: payoutId,
    before: { status: before.status },
    after: { status: 'paid', reference: trimmedRef },
    reason: trimmedRef,
  });

  // Notify the host's owner that they were paid.
  let notifyErr: string | null = null;
  const { data: hostRow } = await adminSupabase
    .from('host_profiles')
    .select('owner_id')
    .eq('id', before.host_profile_id)
    .maybeSingle();
  const ownerId = (hostRow as { owner_id: string } | null)?.owner_id ?? null;
  if (ownerId) {
    notifyErr = await notify({
      userId: ownerId,
      type: 'payout_paid',
      titleAr: 'تم تحويل مستحقّاتك',
      titleFr: 'Votre virement a été effectué',
      titleEn: 'Your payout was paid',
      bodyAr: `تم تحويل مستحقّاتك عن الفترة ${before.period_start} – ${before.period_end}.`,
      bodyFr: `Votre virement pour la période ${before.period_start} – ${before.period_end} a été effectué.`,
      bodyEn: `Your payout for ${before.period_start} – ${before.period_end} has been paid.`,
      data: { payout_id: payoutId },
    });
  }

  revalidatePath('/payments');
  if (auditErr || notifyErr) {
    return { ok: false, code: 'partial', message: [auditErr, notifyErr].filter(Boolean).join('; ') };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// markTransactionRefunded — service-role manual refund record
// ─────────────────────────────────────────────────────────────────────────────

export async function markTransactionRefunded(
  txnId: string,
  amountDzd: number,
  reason: string,
): Promise<PaymentActionResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!txnId) return { ok: false, code: 'invalid_input' };
  if (!Number.isFinite(amountDzd) || amountDzd <= 0) return { ok: false, code: 'invalid_input' };
  const trimmed = reason?.trim();
  if (!trimmed) return { ok: false, code: 'invalid_input' };

  const { data: before, error: readErr } = await adminSupabase
    .from('transactions')
    .select('id, status, amount_dzd, refunded_dzd')
    .eq('id', txnId)
    .maybeSingle();
  if (readErr) return { ok: false, code: 'update_failed', message: readErr.message };
  if (!before) return { ok: false, code: 'not_found' };

  const newRefunded = (before.refunded_dzd ?? 0) + amountDzd;
  if (newRefunded > before.amount_dzd) return { ok: false, code: 'invalid_input' };
  const fullyRefunded = newRefunded >= before.amount_dzd;
  const newStatus = fullyRefunded ? 'refunded' : 'partially_refunded';

  const now = new Date().toISOString();
  const { data: updated, error: updErr } = await adminSupabase
    .from('transactions')
    .update({ status: newStatus, refunded_dzd: newRefunded, updated_at: now })
    .eq('id', txnId)
    .select('id')
    .maybeSingle();
  if (updErr) return { ok: false, code: 'update_failed', message: updErr.message };
  if (!updated) return { ok: false, code: 'not_found' };

  const auditErr = await writeAudit({
    actorId: auth.actorId,
    actorRole: auth.actorRole,
    action: 'payment.refund',
    targetType: 'transaction',
    targetId: txnId,
    before: { status: before.status, refunded_dzd: before.refunded_dzd },
    after: { status: newStatus, refunded_dzd: newRefunded },
    reason: trimmed,
  });

  revalidatePath('/payments');
  if (auditErr) return { ok: false, code: 'partial', message: auditErr };
  return { ok: true };
}
