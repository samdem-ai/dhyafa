/**
 * Disputes / support tickets list.
 *
 * Server Component, gated by `requireAdmin()`. Filterable by status (?status=)
 * and category (?category=). Open/under-review float to the top by default
 * (newest first). Joins booking code + opener.
 */

import { requireAdmin } from '../../lib/auth';
import { resolveLocale } from '../../lib/i18n';
import { adminSupabase } from '../../lib/supabase/server';
import type { Locale } from '@dyafa/i18n';
import {
  C,
  DISPUTE_CATEGORY,
  DISPUTE_STATUS,
  formatDate,
  statusOf,
  tl,
} from '../../lib/admin-i18n';
import { AdminAppShell } from '../../components/AdminAppShell';
import { PageHeader, StatusPill, TableShell, Th, EmptyState, ErrorState } from '../../components/ui';
import { FilterSelect, type FilterOption } from '../../components/FilterSelect';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 40;

const T = {
  title: { ar: 'النزاعات', fr: 'Litiges', en: 'Disputes' },
  subtitle: {
    ar: 'شكاوى الضيوف والمضيفين وحلّها',
    fr: 'Réclamations voyageurs/hôtes et résolution',
    en: 'Guest/host complaints and resolution',
  },
  colOpened: { ar: 'فُتح في', fr: 'Ouvert le', en: 'Opened' },
  colBooking: { ar: 'الحجز', fr: 'Réservation', en: 'Booking' },
  colCategory: { ar: 'الفئة', fr: 'Catégorie', en: 'Category' },
  colOpenedBy: { ar: 'المُبلِّغ', fr: 'Signalé par', en: 'Opened by' },
  colStatus: { ar: 'الحالة', fr: 'Statut', en: 'Status' },
  statusAll: { ar: 'كل الحالات', fr: 'Tous les statuts', en: 'All statuses' },
  categoryAll: { ar: 'كل الفئات', fr: 'Toutes catégories', en: 'All categories' },
} as const;

interface DisputeListRow {
  id: string;
  status: string;
  category: string;
  created_at: string;
  booking_id: string;
  bookings: { code: string } | null;
  opener: { display_name: string } | null;
}

const STATUS_KEYS = ['open', 'under_review', 'resolved', 'rejected', 'cancelled'] as const;
const CATEGORY_KEYS = ['refund', 'no_show', 'property_mismatch', 'damage', 'payment', 'other'] as const;

export default async function DisputesPage({
  searchParams,
}: {
  searchParams: { status?: string; category?: string };
}) {
  await requireAdmin('/disputes');
  const locale: Locale = resolveLocale();
  const status = searchParams.status ?? null;
  const category = searchParams.category ?? null;

  let query = adminSupabase
    .from('disputes')
    .select(
      `id, status, category, created_at, booking_id,
       bookings ( code ),
       opener:profiles!disputes_opened_by_fkey ( display_name )`,
    )
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (status && (STATUS_KEYS as readonly string[]).includes(status)) {
    query = query.eq('status', status as (typeof STATUS_KEYS)[number]);
  }
  if (category && (CATEGORY_KEYS as readonly string[]).includes(category)) {
    query = query.eq('category', category as (typeof CATEGORY_KEYS)[number]);
  }

  const { data, error } = await query;
  const rows = (data ?? []) as unknown as DisputeListRow[];

  const statusOptions: FilterOption[] = STATUS_KEYS.map((k) => ({
    value: k,
    label: statusOf(DISPUTE_STATUS, k, locale).text,
  }));
  const categoryOptions: FilterOption[] = CATEGORY_KEYS.map((k) => ({
    value: k,
    label: DISPUTE_CATEGORY[k]?.[locale] ?? k,
  }));

  return (
    <AdminAppShell locale={locale}>
      <PageHeader title={tl(T.title, locale)} subtitle={tl(T.subtitle, locale)} />

      <section className="flex flex-wrap items-center gap-sm">
        <FilterSelect
          paramKey="status"
          options={statusOptions}
          allLabel={tl(T.statusAll, locale)}
          current={status}
        />
        <FilterSelect
          paramKey="category"
          options={categoryOptions}
          allLabel={tl(T.categoryAll, locale)}
          current={category}
        />
      </section>

      {error && <ErrorState locale={locale} message={error.message} />}

      {!error && rows.length === 0 && <EmptyState locale={locale} />}

      {!error && rows.length > 0 && (
        <TableShell>
          <div className="hidden md:grid grid-cols-[1.2fr_1fr_1.2fr_1.4fr_1fr] gap-md px-xl py-md border-b border-border">
            <Th>{tl(T.colOpened, locale)}</Th>
            <Th>{tl(T.colBooking, locale)}</Th>
            <Th>{tl(T.colCategory, locale)}</Th>
            <Th>{tl(T.colOpenedBy, locale)}</Th>
            <Th className="text-end">{tl(T.colStatus, locale)}</Th>
          </div>
          <ul>
            {rows.map((d) => (
              <li key={d.id} className="border-b border-border last:border-0">
                <a
                  href={`/disputes/${d.id}`}
                  className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1.2fr_1.4fr_1fr] gap-xs md:gap-md px-xl py-md hover:bg-bone-300 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset items-center"
                >
                  <span className="text-body-sm text-text-muted tabular-nums">
                    {formatDate(d.created_at, locale)}
                  </span>
                  <span className="text-body-sm font-semibold text-text-default tabular-nums" dir="ltr">
                    {d.bookings?.code ?? '—'}
                  </span>
                  <span className="text-body-sm text-text-default">
                    {DISPUTE_CATEGORY[d.category]?.[locale] ?? d.category}
                  </span>
                  <span className="text-body-sm text-text-muted truncate">
                    {d.opener?.display_name ?? '—'}
                  </span>
                  <span className="md:text-end">
                    <StatusPill {...statusOf(DISPUTE_STATUS, d.status, locale)} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </TableShell>
      )}
    </AdminAppShell>
  );
}
