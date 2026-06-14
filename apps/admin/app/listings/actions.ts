'use server';

/**
 * Listing lifecycle Server Actions (suspend / restore).
 *
 * SECURITY: Server Actions can be invoked by anyone with the action id, so each
 * action below re-verifies the caller is an admin via `requireAdminAction()`
 * BEFORE any mutation, using the service-role client (lib/supabase/server.ts).
 * Authorization is never assumed from the page that rendered the form.
 *
 * Mirrors app/moderation/actions.ts exactly in structure — each action performs
 * three writes in sequence:
 *   1. UPDATE properties (the lifecycle decision), guarded on the current status
 *      so a double-submit can't transition an already-changed listing
 *   2. INSERT audit_log  (append-only record of who/what/before/after)
 *   3. INSERT notification to the host owner (localized in-app message)
 * then revalidates the listings + moderation routes.
 *
 * Ordering rationale: the property UPDATE is the source of truth and runs first.
 * If a *subsequent* audit/notification insert fails we report a partial-success
 * error rather than rolling back (the decision itself is already correctly
 * applied and visible); the failure is surfaced so an operator can follow up.
 */

import { revalidatePath } from 'next/cache';
import { adminSupabase } from '../../lib/supabase/server';
import { requireAdminAction, NotAuthorizedError, type AppRole } from '../../lib/auth';
import { writeAudit, notify } from '../../lib/audit';

/** Discriminated result returned to the client table (matches ModerationResult shape). */
export type ListingActionResult =
  | { ok: true; status: 'suspended' | 'approved' }
  | {
      ok: false;
      code: 'not_authorized' | 'not_found' | 'invalid_input' | 'update_failed' | 'partial' | 'unknown';
      message?: string;
    };

/** Minimal shape we read back before a transition for the audit snapshot + notify. */
interface PropertyLifecycleRow {
  id: string;
  status: string;
  host_profile_id: string;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
}

/** Load the property (for the before-snapshot + host resolution). */
async function loadProperty(propertyId: string): Promise<PropertyLifecycleRow | null> {
  const { data, error } = await adminSupabase
    .from('properties')
    .select('id, status, host_profile_id, title_ar, title_fr, title_en')
    .eq('id', propertyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as PropertyLifecycleRow;
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
function listingTitle(row: PropertyLifecycleRow): string {
  return row.title_ar ?? row.title_fr ?? row.title_en ?? '—';
}

// ─────────────────────────────────────────────────────────────────────────────
// suspendListing — approved → suspended
// ─────────────────────────────────────────────────────────────────────────────

export async function suspendListing(
  propertyId: string,
  reason?: string,
): Promise<ListingActionResult> {
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

  const trimmedReason = reason?.trim() ? reason.trim() : null;

  const before = await loadProperty(propertyId);
  if (!before) return { ok: false, code: 'not_found' };

  const now = new Date().toISOString();

  // 1. UPDATE properties — guarded on the approved status to avoid double-apply.
  const { data: updated, error: updateError } = await adminSupabase
    .from('properties')
    .update({
      status: 'suspended',
      reviewed_by: actorId,
      updated_at: now,
    })
    .eq('id', propertyId)
    .eq('status', 'approved')
    .select('id')
    .maybeSingle();

  if (updateError) return { ok: false, code: 'update_failed', message: updateError.message };
  if (!updated) return { ok: false, code: 'not_found' }; // not approved / already changed

  // 2. INSERT audit_log (append-only).
  const auditError = await writeAudit({
    actorId,
    actorRole,
    action: 'listing.suspend',
    targetType: 'property',
    targetId: propertyId,
    before: { status: before.status },
    after: { status: 'suspended' },
    reason: trimmedReason,
  });

  // 3. INSERT notification to the host owner.
  let notifyError: string | null = null;
  const ownerId = await hostOwnerId(before.host_profile_id);
  if (ownerId) {
    const title = listingTitle(before);
    notifyError = await notify({
      userId: ownerId,
      type: 'listing_suspended',
      titleAr: 'تم إيقاف إعلانك',
      titleFr: 'Votre annonce a été suspendue',
      titleEn: 'Your listing was suspended',
      bodyAr: `تم إيقاف «${title}» مؤقتًا ولم يعد مرئيًا للضيوف.`,
      bodyFr: `« ${title} » a été suspendue et n’est plus visible par les voyageurs.`,
      bodyEn: `“${title}” has been suspended and is no longer visible to guests.`,
      data: { property_id: propertyId },
    });
  } else {
    notifyError = 'host owner not found';
  }

  revalidatePath('/listings');
  revalidatePath('/moderation');
  revalidatePath(`/moderation/${propertyId}`);

  if (auditError || notifyError) {
    return {
      ok: false,
      code: 'partial',
      message: [auditError, notifyError].filter(Boolean).join('; '),
    };
  }

  return { ok: true, status: 'suspended' };
}

// ─────────────────────────────────────────────────────────────────────────────
// restoreListing — suspended → approved
// ─────────────────────────────────────────────────────────────────────────────

export async function restoreListing(propertyId: string): Promise<ListingActionResult> {
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

  const before = await loadProperty(propertyId);
  if (!before) return { ok: false, code: 'not_found' };

  const now = new Date().toISOString();

  // 1. UPDATE properties — guarded on the suspended status to avoid double-apply.
  const { data: updated, error: updateError } = await adminSupabase
    .from('properties')
    .update({
      status: 'approved',
      reviewed_by: actorId,
      updated_at: now,
    })
    .eq('id', propertyId)
    .eq('status', 'suspended')
    .select('id')
    .maybeSingle();

  if (updateError) return { ok: false, code: 'update_failed', message: updateError.message };
  if (!updated) return { ok: false, code: 'not_found' }; // not suspended / already changed

  // 2. INSERT audit_log (append-only).
  const auditError = await writeAudit({
    actorId,
    actorRole,
    action: 'listing.restore',
    targetType: 'property',
    targetId: propertyId,
    before: { status: before.status },
    after: { status: 'approved' },
  });

  // 3. INSERT notification to the host owner.
  let notifyError: string | null = null;
  const ownerId = await hostOwnerId(before.host_profile_id);
  if (ownerId) {
    const title = listingTitle(before);
    notifyError = await notify({
      userId: ownerId,
      type: 'listing_approved',
      titleAr: 'تمت استعادة إعلانك',
      titleFr: 'Votre annonce a été restaurée',
      titleEn: 'Your listing was restored',
      bodyAr: `عاد «${title}» مرئيًا للضيوف من جديد.`,
      bodyFr: `« ${title} » est de nouveau visible par les voyageurs.`,
      bodyEn: `“${title}” is visible to guests again.`,
      data: { property_id: propertyId },
    });
  } else {
    notifyError = 'host owner not found';
  }

  revalidatePath('/listings');
  revalidatePath('/moderation');
  revalidatePath(`/moderation/${propertyId}`);

  if (auditError || notifyError) {
    return {
      ok: false,
      code: 'partial',
      message: [auditError, notifyError].filter(Boolean).join('; '),
    };
  }

  return { ok: true, status: 'approved' };
}
