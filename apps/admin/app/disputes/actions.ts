'use server';

/**
 * Dispute-resolution Server Actions.
 *
 * SECURITY: re-verifies admin via `requireAdminAction()` before any mutation,
 * using the service-role client. Resolving sets status + resolution_note +
 * resolved_by + resolved_at, writes an append-only `audit_log` row
 * (`dispute.resolve`), and notifies both parties (opener + the `against` user).
 *
 * Allowed transitions from this action:
 *   • under_review — acknowledge / start working (no note required)
 *   • resolved     — final, in favor of a party (note required)
 *   • rejected     — final, dismissed (note required)
 */

import { revalidatePath } from 'next/cache';
import { adminSupabase } from '../../lib/supabase/server';
import { requireAdminAction, NotAuthorizedError, type AppRole } from '../../lib/auth';
import { writeAudit, notify } from '../../lib/audit';

export type DisputeActionResult =
  | { ok: true }
  | {
      ok: false;
      code: 'not_authorized' | 'not_found' | 'invalid_input' | 'update_failed' | 'partial' | 'unknown';
      message?: string;
    };

export type DisputeDecision = 'under_review' | 'resolved' | 'rejected';

const DECISIONS: readonly DisputeDecision[] = ['under_review', 'resolved', 'rejected'];
const FINAL: readonly DisputeDecision[] = ['resolved', 'rejected'];

function isDecision(v: string): v is DisputeDecision {
  return (DECISIONS as readonly string[]).includes(v);
}

interface Actor {
  actorId: string;
  actorRole: AppRole;
}

async function authorize(): Promise<Actor | { error: DisputeActionResult }> {
  try {
    const session = await requireAdminAction();
    return { actorId: session.userId, actorRole: session.primaryRole };
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: { ok: false, code: 'not_authorized' } };
    return { error: { ok: false, code: 'unknown' } };
  }
}

interface DisputeBefore {
  id: string;
  status: string;
  opened_by: string;
  against: string | null;
  booking_id: string;
}

export async function resolveDispute(
  disputeId: string,
  decision: DisputeDecision,
  note?: string,
): Promise<DisputeActionResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!disputeId || !isDecision(decision)) return { ok: false, code: 'invalid_input' };

  const isFinal = (FINAL as readonly string[]).includes(decision);
  const trimmed = note?.trim() ? note.trim() : null;
  // Final decisions require a resolution note.
  if (isFinal && !trimmed) return { ok: false, code: 'invalid_input' };

  const { data: beforeData, error: readErr } = await adminSupabase
    .from('disputes')
    .select('id, status, opened_by, against, booking_id')
    .eq('id', disputeId)
    .maybeSingle();
  if (readErr) return { ok: false, code: 'update_failed', message: readErr.message };
  if (!beforeData) return { ok: false, code: 'not_found' };
  const before = beforeData as unknown as DisputeBefore;

  const now = new Date().toISOString();
  const patch: {
    status: DisputeDecision;
    updated_at: string;
    resolution_note?: string | null;
    resolved_by?: string | null;
    resolved_at?: string | null;
  } = { status: decision, updated_at: now };
  if (isFinal) {
    patch.resolution_note = trimmed;
    patch.resolved_by = auth.actorId;
    patch.resolved_at = now;
  }

  const { data: updated, error: updErr } = await adminSupabase
    .from('disputes')
    .update(patch)
    .eq('id', disputeId)
    .select('id')
    .maybeSingle();
  if (updErr) return { ok: false, code: 'update_failed', message: updErr.message };
  if (!updated) return { ok: false, code: 'not_found' };

  const auditErr = await writeAudit({
    actorId: auth.actorId,
    actorRole: auth.actorRole,
    action: 'dispute.resolve',
    targetType: 'dispute',
    targetId: disputeId,
    before: { status: before.status },
    after: { status: decision },
    reasonCode: decision,
    reason: trimmed,
  });

  // Notify both parties on a final decision.
  const messages: (string | null)[] = [];
  if (isFinal) {
    const recipients = [before.opened_by, before.against].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );
    const titleAr = decision === 'resolved' ? 'تم حل النزاع' : 'تم رفض النزاع';
    const titleFr = decision === 'resolved' ? 'Litige résolu' : 'Litige rejeté';
    const titleEn = decision === 'resolved' ? 'Dispute resolved' : 'Dispute rejected';
    const noteAr = trimmed ? ` ${trimmed}` : '';
    for (const userId of recipients) {
      messages.push(
        await notify({
          userId,
          type: 'dispute_resolved',
          titleAr,
          titleFr,
          titleEn,
          bodyAr: `تم تحديث حالة نزاعك.${noteAr}`,
          bodyFr: `Le statut de votre litige a été mis à jour.${trimmed ? ` ${trimmed}` : ''}`,
          bodyEn: `Your dispute status was updated.${trimmed ? ` ${trimmed}` : ''}`,
          data: { dispute_id: disputeId, booking_id: before.booking_id },
        }),
      );
    }
  }

  revalidatePath('/disputes');
  revalidatePath(`/disputes/${disputeId}`);

  const followups = [auditErr, ...messages].filter(Boolean) as string[];
  if (followups.length > 0) return { ok: false, code: 'partial', message: followups.join('; ') };
  return { ok: true };
}
