'use server';

/**
 * Messaging Server Actions (hotel dashboard).
 *
 *   • sendMessage → send_message(p_conversation_id, p_body)
 *   • startConversation → get_or_create_conversation(p_booking_id)
 *
 * Called with the per-request USER-TOKEN client so the SECURITY DEFINER RPC
 * authorizes the caller as a participant. Messaging is allowed for all host
 * roles (incl. reception).
 */

import { requireHostAction, NotAuthorizedError } from '../../../lib/auth';
import { createUserClient } from '../../../lib/supabase/userServer';

export type MessageResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code: 'not_authorized' | 'invalid_input' | 'rpc_failed' | 'unknown';
      message?: string;
    };

export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<MessageResult> {
  let accessToken: string;
  try {
    const session = await requireHostAction();
    accessToken = session.accessToken;
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { ok: false, code: 'not_authorized' };
    return { ok: false, code: 'unknown' };
  }
  if (!conversationId) return { ok: false, code: 'invalid_input' };
  const trimmed = body.trim();
  if (trimmed.length === 0) return { ok: false, code: 'invalid_input' };

  const supabase = createUserClient(accessToken);
  const { data, error } = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_body: trimmed,
  });
  if (error) return { ok: false, code: 'rpc_failed', message: error.message };

  return { ok: true, id: typeof data === 'string' ? data : '' };
}

export async function startConversation(bookingId: string): Promise<MessageResult> {
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
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_booking_id: bookingId,
  });
  if (error) return { ok: false, code: 'rpc_failed', message: error.message };

  return { ok: true, id: typeof data === 'string' ? data : '' };
}
