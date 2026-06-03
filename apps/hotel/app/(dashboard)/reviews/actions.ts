'use server';

/**
 * Reviews Server Action — host_reply_review(p_review_id, p_body).
 *
 * Called with the per-request USER-TOKEN client so the SECURITY DEFINER RPC
 * authorizes the caller (host owner/manager for the reviewed property). One reply
 * per review is enforced by the RPC.
 */

import { revalidatePath } from 'next/cache';
import { requireHostAction, NotAuthorizedError } from '../../../lib/auth';
import { createUserClient } from '../../../lib/supabase/userServer';

export type ReviewResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code: 'not_authorized' | 'invalid_input' | 'rpc_failed' | 'unknown';
      message?: string;
    };

export async function replyToReview(reviewId: string, body: string): Promise<ReviewResult> {
  let accessToken: string;
  try {
    const session = await requireHostAction();
    accessToken = session.accessToken;
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { ok: false, code: 'not_authorized' };
    return { ok: false, code: 'unknown' };
  }
  if (!reviewId) return { ok: false, code: 'invalid_input' };
  const trimmed = body.trim();
  if (trimmed.length === 0) return { ok: false, code: 'invalid_input' };

  const supabase = createUserClient(accessToken);
  const { data, error } = await supabase.rpc('host_reply_review', {
    p_review_id: reviewId,
    p_body: trimmed,
  });
  if (error) return { ok: false, code: 'rpc_failed', message: error.message };

  revalidatePath('/reviews');
  return { ok: true, id: typeof data === 'string' ? data : '' };
}
