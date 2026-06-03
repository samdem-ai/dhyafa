'use server';

/**
 * Review-moderation Server Actions.
 *
 * SECURITY: re-verifies admin via `requireAdminAction()` before any mutation,
 * using the service-role client. Each decision sets `reviews.status` and writes
 * an append-only `audit_log` row (`review.remove`). `reason_code` carries the
 * decision target; `reason` carries the optional free-text note.
 *
 * Statuses (review_status enum): pending | published | hidden | removed.
 *   • hide    → 'hidden'   (temporarily not shown; reversible)
 *   • remove  → 'removed'  (policy violation; stronger)
 *   • restore → 'published'
 */

import { revalidatePath } from 'next/cache';
import { adminSupabase } from '../../lib/supabase/server';
import { requireAdminAction, NotAuthorizedError, type AppRole } from '../../lib/auth';
import { writeAudit } from '../../lib/audit';

export type ReviewActionResult =
  | { ok: true }
  | {
      ok: false;
      code: 'not_authorized' | 'not_found' | 'invalid_input' | 'update_failed' | 'partial' | 'unknown';
      message?: string;
    };

export type ReviewDecision = 'hidden' | 'removed' | 'published';

const DECISIONS: readonly ReviewDecision[] = ['hidden', 'removed', 'published'];

function isDecision(v: string): v is ReviewDecision {
  return (DECISIONS as readonly string[]).includes(v);
}

interface Actor {
  actorId: string;
  actorRole: AppRole;
}

async function authorize(): Promise<Actor | { error: ReviewActionResult }> {
  try {
    const session = await requireAdminAction();
    return { actorId: session.userId, actorRole: session.primaryRole };
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: { ok: false, code: 'not_authorized' } };
    return { error: { ok: false, code: 'unknown' } };
  }
}

export async function setReviewStatus(
  reviewId: string,
  decision: ReviewDecision,
  note?: string,
): Promise<ReviewActionResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!reviewId || !isDecision(decision)) return { ok: false, code: 'invalid_input' };

  const trimmed = note?.trim() ? note.trim() : null;

  const { data: before, error: readErr } = await adminSupabase
    .from('reviews')
    .select('id, status, comment_text, overall')
    .eq('id', reviewId)
    .maybeSingle();
  if (readErr) return { ok: false, code: 'update_failed', message: readErr.message };
  if (!before) return { ok: false, code: 'not_found' };

  const { data: updated, error: updErr } = await adminSupabase
    .from('reviews')
    .update({ status: decision, updated_at: new Date().toISOString() })
    .eq('id', reviewId)
    .select('id')
    .maybeSingle();
  if (updErr) return { ok: false, code: 'update_failed', message: updErr.message };
  if (!updated) return { ok: false, code: 'not_found' };

  const auditErr = await writeAudit({
    actorId: auth.actorId,
    actorRole: auth.actorRole,
    action: 'review.remove',
    targetType: 'review',
    targetId: reviewId,
    before: { status: before.status, overall: before.overall, comment_text: before.comment_text },
    after: { status: decision },
    reasonCode: decision,
    reason: trimmed,
  });

  revalidatePath('/reviews');
  if (auditErr) return { ok: false, code: 'partial', message: auditErr };
  return { ok: true };
}
