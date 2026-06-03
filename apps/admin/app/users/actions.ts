'use server';

/**
 * User-management Server Actions.
 *
 * SECURITY: each action re-verifies the caller is an admin via
 * `requireAdminAction()` BEFORE any mutation, using the service-role client
 * (bypasses RLS). Every mutation writes an append-only `audit_log` row and, when
 * the affected user should be told, a `notifications` row. Mirrors the
 * established app/moderation/actions.ts pattern.
 *
 * Covered:
 *   • suspendUser / unsuspendUser — toggle profiles.is_active (audit: user.suspend).
 *   • verifyHost — set host_profiles.identity_status = 'verified' (audit: user.verify).
 */

import { revalidatePath } from 'next/cache';
import { adminSupabase } from '../../lib/supabase/server';
import { requireAdminAction, NotAuthorizedError, type AppRole } from '../../lib/auth';
import { writeAudit, notify } from '../../lib/audit';

export type UserActionResult =
  | { ok: true }
  | {
      ok: false;
      code: 'not_authorized' | 'not_found' | 'invalid_input' | 'update_failed' | 'partial' | 'unknown';
      message?: string;
    };

interface Actor {
  actorId: string;
  actorRole: AppRole;
}

/** Resolve + authorize the calling admin, or a typed failure. */
async function authorize(): Promise<Actor | { error: UserActionResult }> {
  try {
    const session = await requireAdminAction();
    return { actorId: session.userId, actorRole: session.primaryRole };
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: { ok: false, code: 'not_authorized' } };
    return { error: { ok: false, code: 'unknown' } };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// suspend / unsuspend (profiles.is_active)
// ─────────────────────────────────────────────────────────────────────────────

async function setActive(
  userId: string,
  active: boolean,
  reason: string | null,
): Promise<UserActionResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!userId) return { ok: false, code: 'invalid_input' };
  // Suspending requires a justification; reactivating does not.
  if (!active && !reason?.trim()) return { ok: false, code: 'invalid_input' };

  const trimmed = reason?.trim() ? reason.trim() : null;

  const { data: before, error: readErr } = await adminSupabase
    .from('profiles')
    .select('id, is_active, display_name')
    .eq('id', userId)
    .maybeSingle();
  if (readErr) return { ok: false, code: 'update_failed', message: readErr.message };
  if (!before) return { ok: false, code: 'not_found' };

  const { data: updated, error: updErr } = await adminSupabase
    .from('profiles')
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id')
    .maybeSingle();
  if (updErr) return { ok: false, code: 'update_failed', message: updErr.message };
  if (!updated) return { ok: false, code: 'not_found' };

  const auditErr = await writeAudit({
    actorId: auth.actorId,
    actorRole: auth.actorRole,
    action: active ? 'user.unsuspend' : 'user.suspend',
    targetType: 'profile',
    targetId: userId,
    before: { is_active: before.is_active },
    after: { is_active: active },
    reason: trimmed,
  });

  // Tell the user their account state changed.
  const notifyErr = await notify({
    userId,
    type: active ? 'account_reactivated' : 'account_suspended',
    titleAr: active ? 'تمت إعادة تفعيل حسابك' : 'تم تعليق حسابك',
    titleFr: active ? 'Votre compte a été réactivé' : 'Votre compte a été suspendu',
    titleEn: active ? 'Your account was reactivated' : 'Your account was suspended',
    bodyAr: active
      ? 'يمكنك الآن استخدام دافة من جديد.'
      : `تم تعليق حسابك.${trimmed ? ` السبب: ${trimmed}` : ''}`,
    bodyFr: active
      ? 'Vous pouvez à nouveau utiliser Dyafa.'
      : `Votre compte a été suspendu.${trimmed ? ` Motif : ${trimmed}` : ''}`,
    bodyEn: active
      ? 'You can use Dyafa again.'
      : `Your account has been suspended.${trimmed ? ` Reason: ${trimmed}` : ''}`,
  });

  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);

  if (auditErr || notifyErr) {
    return { ok: false, code: 'partial', message: [auditErr, notifyErr].filter(Boolean).join('; ') };
  }
  return { ok: true };
}

export async function suspendUser(userId: string, reason: string): Promise<UserActionResult> {
  return setActive(userId, false, reason);
}

export async function unsuspendUser(userId: string): Promise<UserActionResult> {
  return setActive(userId, true, null);
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyHost (host_profiles.identity_status -> 'verified')
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyHost(hostProfileId: string): Promise<UserActionResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!hostProfileId) return { ok: false, code: 'invalid_input' };

  const { data: before, error: readErr } = await adminSupabase
    .from('host_profiles')
    .select('id, identity_status, owner_id, display_name')
    .eq('id', hostProfileId)
    .maybeSingle();
  if (readErr) return { ok: false, code: 'update_failed', message: readErr.message };
  if (!before) return { ok: false, code: 'not_found' };

  const { data: updated, error: updErr } = await adminSupabase
    .from('host_profiles')
    .update({ identity_status: 'verified', updated_at: new Date().toISOString() })
    .eq('id', hostProfileId)
    .select('id')
    .maybeSingle();
  if (updErr) return { ok: false, code: 'update_failed', message: updErr.message };
  if (!updated) return { ok: false, code: 'not_found' };

  const auditErr = await writeAudit({
    actorId: auth.actorId,
    actorRole: auth.actorRole,
    action: 'user.verify',
    targetType: 'host_profile',
    targetId: hostProfileId,
    before: { identity_status: before.identity_status },
    after: { identity_status: 'verified' },
  });

  const notifyErr = await notify({
    userId: before.owner_id,
    type: 'host_verified',
    titleAr: 'تم التحقق من هويتك',
    titleFr: 'Votre identité a été vérifiée',
    titleEn: 'Your identity was verified',
    bodyAr: 'تم التحقق من حسابك كمضيف. يمكنك الآن استقبال الحجوزات.',
    bodyFr: 'Votre compte hôte est vérifié. Vous pouvez désormais recevoir des réservations.',
    bodyEn: 'Your host account is verified. You can now receive bookings.',
  });

  revalidatePath('/users');
  revalidatePath(`/users/${before.owner_id}`);

  if (auditErr || notifyErr) {
    return { ok: false, code: 'partial', message: [auditErr, notifyErr].filter(Boolean).join('; ') };
  }
  return { ok: true };
}
