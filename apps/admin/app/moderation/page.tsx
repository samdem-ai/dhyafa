/**
 * Moderation queue — pending listings awaiting review.
 *
 * Server Component, gated by `requireAdmin()`. Reads `properties` where
 * status='pending', newest `submitted_at` first, flattens the joins to
 * pre-localized rows, and renders them inside the shared AppShell as a
 * @dyafa/ui DataTable (the reference implementation for the rework).
 */

import { requireAdmin } from '../../lib/auth';
import { resolveLocale } from '../../lib/i18n';
import { adminSupabase } from '../../lib/supabase/server';
import { PageHeader, Pill } from '@dyafa/ui';
import { AdminAppShell } from '../../components/AdminAppShell';
import { M, tl, localizedField, formatDateTime } from '../../lib/moderation-i18n';
import { ModerationQueue, type QueueRow } from './ModerationQueue';

export const dynamic = 'force-dynamic';

/** Shape of a row returned by the pending-listings query (joins flattened). */
interface PendingRow {
  id: string;
  submitted_at: string | null;
  created_at: string;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  host_profiles: { display_name: string | null } | null;
  wilayas: { name_ar: string | null; name_fr: string | null; name_en: string | null } | null;
  property_types: { name_ar: string | null; name_fr: string | null; name_en: string | null } | null;
  property_photos: { count: number }[] | null;
}

export default async function ModerationQueuePage() {
  await requireAdmin('/moderation');
  const locale = resolveLocale();

  const { data, error } = await adminSupabase
    .from('properties')
    .select(
      `id, submitted_at, created_at, title_ar, title_fr, title_en,
       host_profiles ( display_name ),
       wilayas ( name_ar, name_fr, name_en ),
       property_types ( name_ar, name_fr, name_en ),
       property_photos ( count )`,
    )
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false, nullsFirst: false });

  const raw = (data ?? []) as unknown as PendingRow[];

  const rows: QueueRow[] = raw.map((row) => ({
    id: row.id,
    title:
      localizedField({ ar: row.title_ar, fr: row.title_fr, en: row.title_en }, locale) ??
      tl(M.untitled, locale),
    host: row.host_profiles?.display_name ?? tl(M.unknownHost, locale),
    wilaya:
      localizedField(
        {
          ar: row.wilayas?.name_ar ?? null,
          fr: row.wilayas?.name_fr ?? null,
          en: row.wilayas?.name_en ?? null,
        },
        locale,
      ) ?? '—',
    type:
      localizedField(
        {
          ar: row.property_types?.name_ar ?? null,
          fr: row.property_types?.name_fr ?? null,
          en: row.property_types?.name_en ?? null,
        },
        locale,
      ) ?? '—',
    photoCount: row.property_photos?.[0]?.count ?? 0,
    submitted: formatDateTime(row.submitted_at ?? row.created_at, locale),
    submittedAt: row.submitted_at ?? row.created_at,
  }));

  return (
    <AdminAppShell locale={locale}>
      <PageHeader
        title={tl(M.queueTitle, locale)}
        meta={tl(M.queueSubtitle, locale)}
        status={
          <Pill variant="accent" size="md" className="tabular-nums">
            {rows.length}
          </Pill>
        }
      />

      {error ? (
        <div role="alert" className="rounded-card border border-error/25 bg-error-bg px-xl py-lg text-body-sm text-error">
          {tl(M.errorTitle, locale)} — {error.message}
        </div>
      ) : (
        <ModerationQueue rows={rows} locale={locale} />
      )}
    </AdminAppShell>
  );
}
