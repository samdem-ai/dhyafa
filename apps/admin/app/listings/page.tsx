/**
 * Listings — every property across the platform, all statuses.
 *
 * Server Component, gated by `requireAdmin()`. The moderation queue is
 * pending-only; this page covers ALL statuses where `deleted_at is null` and
 * exposes status / wilaya / search filters + offset pagination via URL search
 * params (?status= ?wilaya= ?q= ?page=) so views are shareable and the server
 * re-queries. Mirrors the moderation list query but WITHOUT the pending filter.
 *
 * Renders inside the shared AdminAppShell using the same @dyafa/ui chrome as the
 * reworked moderation flow: PageHeader + FilterBar + DataTable. Rows link to the
 * status-aware detail review page at /moderation/[id].
 */

import { requireAdmin } from '../../lib/auth';
import { resolveLocale } from '../../lib/i18n';
import { adminSupabase } from '../../lib/supabase/server';
import { PageHeader, Pill } from '@dyafa/ui';
import type { Locale } from '@dyafa/i18n';
import { AdminAppShell } from '../../components/AdminAppShell';
import { tl } from '../../lib/admin-i18n';
import {
  M,
  localizedField,
  formatDateTime,
  propertyStatusPill,
} from '../../lib/moderation-i18n';
import { L, isPropertyStatusFilter, type PropertyStatusFilter } from '../../lib/listings-i18n';
import { ListingsTable, type ListingRow, type WilayaOption } from './ListingsTable';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

/** Shape of a row returned by the listings query (joins flattened). */
interface ListingQueryRow {
  id: string;
  status: string;
  created_at: string;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  host_profiles: { display_name: string | null } | null;
  wilayas: { name_ar: string | null; name_fr: string | null; name_en: string | null } | null;
  property_types: { name_ar: string | null; name_fr: string | null; name_en: string | null } | null;
  property_photos: { count: number }[] | null;
}

interface WilayaRow {
  code: number;
  name_ar: string;
  name_fr: string;
  name_en: string | null;
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: { status?: string; wilaya?: string; q?: string; page?: string };
}) {
  await requireAdmin('/listings');
  const locale: Locale = resolveLocale();

  const status: PropertyStatusFilter | null = isPropertyStatusFilter(searchParams.status)
    ? searchParams.status
    : null;
  const wilaya = searchParams.wilaya?.trim() || null;
  const q = searchParams.q?.trim() ?? '';
  const parsedPage = Number(searchParams.page);
  const pageIndex = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 0;

  // Wilayas for the filter dropdown.
  const { data: wilayaData } = await adminSupabase
    .from('wilayas')
    .select('code, name_ar, name_fr, name_en')
    .eq('is_active', true)
    .order('code', { ascending: true });
  const wilayas = (wilayaData ?? []) as WilayaRow[];

  // When searching by text, resolve the host_profile ids whose display_name
  // matches first, so the listings OR can combine title (parent) + host columns
  // in a single supported top-level filter (PostgREST can't OR a parent column
  // with an embedded-table column in one clause).
  let matchingHostIds: string[] = [];
  if (q) {
    const { data: hostMatches } = await adminSupabase
      .from('host_profiles')
      .select('id')
      .ilike('display_name', `%${q}%`);
    matchingHostIds = (hostMatches ?? []).map((h) => (h as { id: string }).id);
  }

  // Listings query — all statuses, not-deleted, newest first; filters applied.
  let query = adminSupabase
    .from('properties')
    .select(
      `id, status, created_at, title_ar, title_fr, title_en,
       host_profiles ( display_name ),
       wilayas ( name_ar, name_fr, name_en ),
       property_types ( name_ar, name_fr, name_en ),
       property_photos ( count )`,
      { count: 'exact' },
    )
    .is('deleted_at', null);

  if (status) query = query.eq('status', status);
  if (wilaya) {
    const code = Number(wilaya);
    if (!Number.isNaN(code)) query = query.eq('wilaya_code', code);
  }
  if (q) {
    // Escape PostgREST list/pattern reserved characters in the user input.
    const like = q.replace(/([%,()])/g, '\\$1');
    const clauses = [
      `title_ar.ilike.%${like}%`,
      `title_fr.ilike.%${like}%`,
      `title_en.ilike.%${like}%`,
    ];
    if (matchingHostIds.length > 0) {
      clauses.push(`host_profile_id.in.(${matchingHostIds.join(',')})`);
    }
    query = query.or(clauses.join(','));
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);

  const raw = (data ?? []) as unknown as ListingQueryRow[];

  const rows: ListingRow[] = raw.map((row) => {
    const pill = propertyStatusPill(row.status, locale);
    return {
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
      status: row.status,
      statusLabel: pill.label,
      photoCount: row.property_photos?.[0]?.count ?? 0,
      created: formatDateTime(row.created_at, locale),
    };
  });

  const wilayaOptions: WilayaOption[] = wilayas.map((w) => ({
    value: String(w.code),
    label: localizedField({ ar: w.name_ar, fr: w.name_fr, en: w.name_en }, locale) ?? String(w.code),
  }));

  return (
    <AdminAppShell locale={locale}>
      <PageHeader
        title={tl(L.title, locale)}
        meta={tl(L.subtitle, locale)}
        status={
          <Pill variant="accent" size="md" className="tabular-nums">
            {count ?? rows.length}
          </Pill>
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-card border border-error/25 bg-error-bg px-xl py-lg text-body-sm text-error"
        >
          {tl(L.errorTitle, locale)} — {error.message}
        </div>
      ) : (
        <ListingsTable
          rows={rows}
          total={count ?? rows.length}
          pageIndex={pageIndex}
          status={status}
          wilaya={wilaya}
          search={q}
          wilayaOptions={wilayaOptions}
          locale={locale}
        />
      )}
    </AdminAppShell>
  );
}
