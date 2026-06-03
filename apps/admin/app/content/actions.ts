'use server';

/**
 * CMS / master-data Server Actions.
 *
 * SECURITY: every action re-verifies admin via `requireAdminAction()` using the
 * service-role client, and writes an append-only `audit_log` row
 * (`content.update`) capturing a coarse before/after. No user notifications —
 * these are operator-facing catalog edits, not user-affecting account changes.
 *
 * Covered tables (all writes are service-role):
 *   • featured_collections (create / update / toggle active / delete)
 *   • collection_items     (add / remove / reorder)
 *   • promo_banners        (create / update / toggle active / delete)
 *   • home_rails           (update / toggle active)
 *   • property_types       (create / update)
 *   • amenities            (create / update)
 *   • wilayas              (toggle is_active)   — communes are read-only (no write here)
 *
 * Localized fields are passed as a small {ar,fr,en} object and written to the
 * matching *_ar/_fr/_en columns. Inputs are validated/trimmed; empties become null.
 */

import { revalidatePath } from 'next/cache';
import { adminSupabase } from '../../lib/supabase/server';
import { requireAdminAction, NotAuthorizedError, type AppRole } from '../../lib/auth';
import { writeAudit, type Json } from '../../lib/audit';

export type ContentResult =
  | { ok: true; id?: string }
  | {
      ok: false;
      code: 'not_authorized' | 'not_found' | 'invalid_input' | 'update_failed' | 'partial' | 'unknown';
      message?: string;
    };

export interface L10nInput {
  ar?: string | null;
  fr?: string | null;
  en?: string | null;
}

interface Actor {
  actorId: string;
  actorRole: AppRole;
}

async function authorize(): Promise<Actor | { error: ContentResult }> {
  try {
    const session = await requireAdminAction();
    return { actorId: session.userId, actorRole: session.primaryRole };
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: { ok: false, code: 'not_authorized' } };
    return { error: { ok: false, code: 'unknown' } };
  }
}

const clean = (v: string | null | undefined): string | null => {
  const t = v?.trim();
  return t && t.length > 0 ? t : null;
};

function l10nCols(prefix: 'title' | 'subtitle' | 'body' | 'name', l: L10nInput) {
  return {
    [`${prefix}_ar`]: clean(l.ar),
    [`${prefix}_fr`]: clean(l.fr),
    [`${prefix}_en`]: clean(l.en),
  } as Record<string, string | null>;
}

async function audit(
  actor: Actor,
  targetType: string,
  targetId: string | null,
  before: { [key: string]: Json | undefined } | null,
  after: { [key: string]: Json | undefined } | null,
): Promise<string | null> {
  return writeAudit({
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    action: 'content.update',
    targetType,
    targetId,
    before: before ?? undefined,
    after: after ?? undefined,
  });
}

function finalize(targetId: string | null, auditErr: string | null): ContentResult {
  revalidatePath('/content', 'layout');
  if (auditErr) return { ok: false, code: 'partial', message: auditErr };
  return { ok: true, id: targetId ?? undefined };
}

// ─────────────────────────────────────────────────────────────────────────────
// featured_collections
// ─────────────────────────────────────────────────────────────────────────────

export async function saveCollection(input: {
  id?: string;
  slug: string;
  title: L10nInput;
  subtitle: L10nInput;
  sortOrder: number;
  isActive: boolean;
}): Promise<ContentResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  const slug = clean(input.slug);
  if (!slug) return { ok: false, code: 'invalid_input' };

  const row = {
    slug,
    ...l10nCols('title', input.title),
    ...l10nCols('subtitle', input.subtitle),
    sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await adminSupabase
      .from('featured_collections')
      .update(row)
      .eq('id', input.id)
      .select('id')
      .maybeSingle();
    if (error) return { ok: false, code: 'update_failed', message: error.message };
    if (!data) return { ok: false, code: 'not_found' };
    return finalize(data.id, await audit(auth, 'featured_collection', data.id, null, { slug }));
  }

  const { data, error } = await adminSupabase
    .from('featured_collections')
    .insert(row)
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, code: 'update_failed', message: error.message };
  return finalize(data?.id ?? null, await audit(auth, 'featured_collection', data?.id ?? null, null, { slug }));
}

export async function toggleCollectionActive(id: string, isActive: boolean): Promise<ContentResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!id) return { ok: false, code: 'invalid_input' };
  const { data, error } = await adminSupabase
    .from('featured_collections')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, code: 'update_failed', message: error.message };
  if (!data) return { ok: false, code: 'not_found' };
  return finalize(id, await audit(auth, 'featured_collection', id, null, { is_active: isActive }));
}

export async function deleteCollection(id: string): Promise<ContentResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!id) return { ok: false, code: 'invalid_input' };
  // Remove items first (no cascade assumed), then the collection.
  await adminSupabase.from('collection_items').delete().eq('collection_id', id);
  const { error } = await adminSupabase.from('featured_collections').delete().eq('id', id);
  if (error) return { ok: false, code: 'update_failed', message: error.message };
  return finalize(id, await audit(auth, 'featured_collection', id, { id }, null));
}

// ── collection_items ──────────────────────────────────────────────────────────

export async function addCollectionItem(
  collectionId: string,
  propertyId: string,
  sortOrder: number,
): Promise<ContentResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!collectionId || !clean(propertyId)) return { ok: false, code: 'invalid_input' };
  const { error } = await adminSupabase.from('collection_items').upsert({
    collection_id: collectionId,
    property_id: propertyId.trim(),
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  });
  if (error) return { ok: false, code: 'update_failed', message: error.message };
  return finalize(collectionId, await audit(auth, 'collection_item', collectionId, null, { property_id: propertyId.trim() }));
}

export async function removeCollectionItem(
  collectionId: string,
  propertyId: string,
): Promise<ContentResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!collectionId || !propertyId) return { ok: false, code: 'invalid_input' };
  const { error } = await adminSupabase
    .from('collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('property_id', propertyId);
  if (error) return { ok: false, code: 'update_failed', message: error.message };
  return finalize(collectionId, await audit(auth, 'collection_item', collectionId, { property_id: propertyId }, null));
}

// ─────────────────────────────────────────────────────────────────────────────
// promo_banners
// ─────────────────────────────────────────────────────────────────────────────

export async function saveBanner(input: {
  id?: string;
  imagePath: string;
  title: L10nInput;
  body: L10nInput;
  targetUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}): Promise<ContentResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  const imagePath = clean(input.imagePath);
  if (!imagePath) return { ok: false, code: 'invalid_input' };

  const row = {
    image_path: imagePath,
    ...l10nCols('title', input.title),
    ...l10nCols('body', input.body),
    target_url: clean(input.targetUrl),
    sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    is_active: input.isActive,
    starts_at: clean(input.startsAt),
    ends_at: clean(input.endsAt),
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await adminSupabase
      .from('promo_banners')
      .update(row)
      .eq('id', input.id)
      .select('id')
      .maybeSingle();
    if (error) return { ok: false, code: 'update_failed', message: error.message };
    if (!data) return { ok: false, code: 'not_found' };
    return finalize(data.id, await audit(auth, 'promo_banner', data.id, null, { image_path: imagePath }));
  }

  const { data, error } = await adminSupabase
    .from('promo_banners')
    .insert(row)
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, code: 'update_failed', message: error.message };
  return finalize(data?.id ?? null, await audit(auth, 'promo_banner', data?.id ?? null, null, { image_path: imagePath }));
}

export async function toggleBannerActive(id: string, isActive: boolean): Promise<ContentResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!id) return { ok: false, code: 'invalid_input' };
  const { data, error } = await adminSupabase
    .from('promo_banners')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, code: 'update_failed', message: error.message };
  if (!data) return { ok: false, code: 'not_found' };
  return finalize(id, await audit(auth, 'promo_banner', id, null, { is_active: isActive }));
}

export async function deleteBanner(id: string): Promise<ContentResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!id) return { ok: false, code: 'invalid_input' };
  const { error } = await adminSupabase.from('promo_banners').delete().eq('id', id);
  if (error) return { ok: false, code: 'update_failed', message: error.message };
  return finalize(id, await audit(auth, 'promo_banner', id, { id }, null));
}

// ─────────────────────────────────────────────────────────────────────────────
// home_rails (update labels + toggle active)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveRail(input: {
  id: string;
  title: L10nInput;
  sortOrder: number;
  isActive: boolean;
}): Promise<ContentResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!input.id) return { ok: false, code: 'invalid_input' };
  const { data, error } = await adminSupabase
    .from('home_rails')
    .update({
      ...l10nCols('title', input.title),
      sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, code: 'update_failed', message: error.message };
  if (!data) return { ok: false, code: 'not_found' };
  return finalize(input.id, await audit(auth, 'home_rail', input.id, null, { is_active: input.isActive }));
}

// ─────────────────────────────────────────────────────────────────────────────
// property_types (numeric id, requires kind + slug)
// ─────────────────────────────────────────────────────────────────────────────

export async function savePropertyType(input: {
  id?: number;
  slug: string;
  kind: 'single_unit' | 'multi_room';
  name: L10nInput;
  icon: string | null;
  sortOrder: number;
}): Promise<ContentResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  const slug = clean(input.slug);
  if (!slug) return { ok: false, code: 'invalid_input' };
  if (input.kind !== 'single_unit' && input.kind !== 'multi_room') {
    return { ok: false, code: 'invalid_input' };
  }

  const base = {
    slug,
    kind: input.kind,
    ...l10nCols('name', input.name),
    icon: clean(input.icon),
    sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
  };

  if (input.id != null) {
    const { data, error } = await adminSupabase
      .from('property_types')
      .update(base)
      .eq('id', input.id)
      .select('id')
      .maybeSingle();
    if (error) return { ok: false, code: 'update_failed', message: error.message };
    if (!data) return { ok: false, code: 'not_found' };
    return finalize(String(data.id), await audit(auth, 'property_type', String(data.id), null, { slug }));
  }

  // New id: max(id)+1 (the column is a non-identity integer PK).
  const { data: maxRow } = await adminSupabase
    .from('property_types')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextId = ((maxRow as { id: number } | null)?.id ?? 0) + 1;

  const { data, error } = await adminSupabase
    .from('property_types')
    .insert({ id: nextId, ...base })
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, code: 'update_failed', message: error.message };
  return finalize(String(data?.id ?? nextId), await audit(auth, 'property_type', String(nextId), null, { slug }));
}

// ─────────────────────────────────────────────────────────────────────────────
// amenities (numeric id, requires slug)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveAmenity(input: {
  id?: number;
  slug: string;
  name: L10nInput;
  icon: string | null;
  category: string | null;
}): Promise<ContentResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  const slug = clean(input.slug);
  if (!slug) return { ok: false, code: 'invalid_input' };

  const base = {
    slug,
    ...l10nCols('name', input.name),
    icon: clean(input.icon),
    category: clean(input.category),
  };

  if (input.id != null) {
    const { data, error } = await adminSupabase
      .from('amenities')
      .update(base)
      .eq('id', input.id)
      .select('id')
      .maybeSingle();
    if (error) return { ok: false, code: 'update_failed', message: error.message };
    if (!data) return { ok: false, code: 'not_found' };
    return finalize(String(data.id), await audit(auth, 'amenity', String(data.id), null, { slug }));
  }

  const { data: maxRow } = await adminSupabase
    .from('amenities')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextId = ((maxRow as { id: number } | null)?.id ?? 0) + 1;

  const { data, error } = await adminSupabase
    .from('amenities')
    .insert({ id: nextId, ...base })
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, code: 'update_failed', message: error.message };
  return finalize(String(data?.id ?? nextId), await audit(auth, 'amenity', String(nextId), null, { slug }));
}

// ─────────────────────────────────────────────────────────────────────────────
// wilayas (read elsewhere; here we only toggle is_active)
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleWilayaActive(code: number, isActive: boolean): Promise<ContentResult> {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  if (!Number.isFinite(code)) return { ok: false, code: 'invalid_input' };
  const { data, error } = await adminSupabase
    .from('wilayas')
    .update({ is_active: isActive })
    .eq('code', code)
    .select('code')
    .maybeSingle();
  if (error) return { ok: false, code: 'update_failed', message: error.message };
  if (!data) return { ok: false, code: 'not_found' };
  return finalize(String(code), await audit(auth, 'wilaya', String(code), null, { is_active: isActive }));
}
