'use server';

/**
 * Listing-moderation Server Actions.
 *
 * SECURITY: Server Actions can be invoked by anyone with the action id, so each
 * action below re-verifies the caller is an admin via `requireAdminAction()`
 * BEFORE any mutation, using the service-role client (lib/supabase/server.ts).
 * Authorization is never assumed from the page that rendered the form.
 *
 * Each decision performs three writes in sequence:
 *   1. UPDATE properties (the moderation decision)
 *   2. INSERT audit_log  (append-only record of who/what/before/after)
 *   3. INSERT notification to the host (localized in-app message)
 * then revalidates the moderation routes.
 *
 * Ordering rationale: the property UPDATE is the source of truth and runs first.
 * If a *subsequent* audit/notification insert fails we report a partial-success
 * error rather than rolling back (the decision itself is already correctly
 * applied and visible); the failure is surfaced so an operator can follow up.
 * The status update itself is guarded with `.eq('status', 'pending')` so a
 * double-submit can't move an already-decided listing.
 */

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { adminSupabase } from '../../lib/supabase/server';
import { requireAdminAction, NotAuthorizedError, type AppRole } from '../../lib/auth';
import { isRejectionReason, type RejectionReason } from '../../lib/moderation-i18n';

/** Discriminated result returned to the client form. */
export type ModerationResult =
  | { ok: true; status: 'approved' | 'rejected' }
  | {
      ok: false;
      code:
        | 'not_authorized'
        | 'not_found'
        | 'invalid_input'
        | 'update_failed'
        | 'partial'
        | 'host_not_verified'
        | 'unknown';
      message?: string;
      /** For host_not_verified: the host's owner user id, to link to verification. */
      hostOwnerId?: string;
    };

/** Minimal shape we read back before/after a decision for the audit snapshot. */
interface PropertyModerationRow {
  id: string;
  status: string;
  host_profile_id: string;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
}

/** Resolve actor IP / user-agent for the audit row (best-effort). */
function requestMeta(): { ip: string | null; userAgent: string | null } {
  const h = headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
  const userAgent = h.get('user-agent') ?? null;
  return { ip, userAgent };
}

/** Load the property (must currently be pending) for a moderation decision. */
async function loadPendingProperty(
  propertyId: string,
): Promise<PropertyModerationRow | null> {
  const { data, error } = await adminSupabase
    .from('properties')
    .select('id, status, host_profile_id, title_ar, title_fr, title_en')
    .eq('id', propertyId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as PropertyModerationRow;
}

/** Resolve the host's owner_id (= auth user) so we can notify them. */
async function hostOwnerId(hostProfileId: string): Promise<string | null> {
  const { data, error } = await adminSupabase
    .from('host_profiles')
    .select('owner_id')
    .eq('id', hostProfileId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as unknown as { owner_id: string }).owner_id;
}

/** Best-effort localized title for notification copy. */
function listingTitle(row: PropertyModerationRow): string {
  return row.title_ar ?? row.title_fr ?? row.title_en ?? '—';
}

// ─────────────────────────────────────────────────────────────────────────────
// approveListing
// ─────────────────────────────────────────────────────────────────────────────

export async function approveListing(propertyId: string): Promise<ModerationResult> {
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

  if (!propertyId) return { ok: false, code: 'invalid_input' };

  const before = await loadPendingProperty(propertyId);
  if (!before) return { ok: false, code: 'not_found' };

  const now = new Date().toISOString();

  // 1. UPDATE properties — guarded on the pending status to avoid double-apply.
  const { data: updated, error: updateError } = await adminSupabase
    .from('properties')
    .update({
      status: 'approved',
      approved_at: now,
      published_at: now,
      reviewed_by: actorId,
      updated_at: now,
    })
    .eq('id', propertyId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (updateError) {
    // The properties_guard_approval trigger blocks approval until the host's
    // identity is verified — surface a dedicated code so the UI can offer a
    // one-click redirect to that host's verification page.
    if (/HOST_NOT_VERIFIED/i.test(updateError.message)) {
      const ownerId = await hostOwnerId(before.host_profile_id);
      return { ok: false, code: 'host_not_verified', hostOwnerId: ownerId ?? undefined };
    }
    return { ok: false, code: 'update_failed', message: updateError.message };
  }
  if (!updated) return { ok: false, code: 'not_found' }; // already decided / not pending

  // 2. INSERT audit_log (append-only).
  const { ip, userAgent } = requestMeta();
  const { error: auditError } = await adminSupabase.from('audit_log').insert({
    actor_id: actorId,
    actor_role: actorRole,
    action: 'listing.approve',
    target_type: 'property',
    target_id: propertyId,
    before: { status: before.status },
    after: { status: 'approved' },
    ip,
    user_agent: userAgent,
  });

  // 3. INSERT notification to the host.
  let notifyError: string | null = null;
  const ownerId = await hostOwnerId(before.host_profile_id);
  if (ownerId) {
    const title = listingTitle(before);
    const { error: notifError } = await adminSupabase.from('notifications').insert({
      user_id: ownerId,
      type: 'listing_approved',
      title_ar: 'تمت الموافقة على إعلانك',
      title_fr: 'Votre annonce a été approuvée',
      title_en: 'Your listing was approved',
      body_ar: `تمت الموافقة على «${title}» وأصبح الآن مرئيًا للضيوف.`,
      body_fr: `« ${title} » a été approuvée et est désormais visible par les voyageurs.`,
      body_en: `“${title}” has been approved and is now visible to guests.`,
      data: { property_id: propertyId },
      sent_push: false,
    });
    if (notifError) notifyError = notifError.message;
  } else {
    notifyError = 'host owner not found';
  }

  revalidatePath('/moderation');
  revalidatePath(`/moderation/${propertyId}`);

  if (auditError || notifyError) {
    return {
      ok: false,
      code: 'partial',
      message: [auditError?.message, notifyError].filter(Boolean).join('; '),
    };
  }

  return { ok: true, status: 'approved' };
}

// ─────────────────────────────────────────────────────────────────────────────
// rejectListing
// ─────────────────────────────────────────────────────────────────────────────

export async function rejectListing(
  propertyId: string,
  reason: RejectionReason,
  note?: string,
): Promise<ModerationResult> {
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

  if (!propertyId) return { ok: false, code: 'invalid_input' };
  if (!isRejectionReason(reason)) return { ok: false, code: 'invalid_input' };

  const trimmedNote = note?.trim() ? note.trim() : null;

  const before = await loadPendingProperty(propertyId);
  if (!before) return { ok: false, code: 'not_found' };

  const now = new Date().toISOString();

  // 1. UPDATE properties.
  const { data: updated, error: updateError } = await adminSupabase
    .from('properties')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      rejection_note: trimmedNote,
      reviewed_by: actorId,
      updated_at: now,
    })
    .eq('id', propertyId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (updateError) return { ok: false, code: 'update_failed', message: updateError.message };
  if (!updated) return { ok: false, code: 'not_found' };

  // 2. INSERT audit_log — reason_code = enum value, reason = free-text note.
  const { ip, userAgent } = requestMeta();
  const { error: auditError } = await adminSupabase.from('audit_log').insert({
    actor_id: actorId,
    actor_role: actorRole,
    action: 'listing.reject',
    target_type: 'property',
    target_id: propertyId,
    before: { status: before.status },
    after: { status: 'rejected', rejection_reason: reason },
    reason_code: reason,
    reason: trimmedNote,
    ip,
    user_agent: userAgent,
  });

  // 3. INSERT notification to the host.
  let notifyError: string | null = null;
  const ownerId = await hostOwnerId(before.host_profile_id);
  if (ownerId) {
    const title = listingTitle(before);
    const noteSuffixAr = trimmedNote ? ` الملاحظة: ${trimmedNote}` : '';
    const noteSuffixFr = trimmedNote ? ` Remarque : ${trimmedNote}` : '';
    const noteSuffixEn = trimmedNote ? ` Note: ${trimmedNote}` : '';
    const { error: notifError } = await adminSupabase.from('notifications').insert({
      user_id: ownerId,
      type: 'listing_rejected',
      title_ar: 'تم رفض إعلانك',
      title_fr: 'Votre annonce a été rejetée',
      title_en: 'Your listing was rejected',
      body_ar: `لم تتم الموافقة على «${title}». يمكنك التعديل وإعادة الإرسال.${noteSuffixAr}`,
      body_fr: `« ${title} » n’a pas été approuvée. Vous pouvez la modifier et la resoumettre.${noteSuffixFr}`,
      body_en: `“${title}” was not approved. You can edit it and resubmit.${noteSuffixEn}`,
      data: { property_id: propertyId, rejection_reason: reason },
      sent_push: false,
    });
    if (notifError) notifyError = notifError.message;
  } else {
    notifyError = 'host owner not found';
  }

  revalidatePath('/moderation');
  revalidatePath(`/moderation/${propertyId}`);

  if (auditError || notifyError) {
    return {
      ok: false,
      code: 'partial',
      message: [auditError?.message, notifyError].filter(Boolean).join('; '),
    };
  }

  return { ok: true, status: 'rejected' };
}
