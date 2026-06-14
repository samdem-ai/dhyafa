/**
 * Booking oversight — all bookings, filterable by status / wilaya / date and
 * searchable by booking code or guest name.
 *
 * Server Component, gated by `requireAdmin()`. Filters live in URL search params
 * (?status= ?wilaya= ?from= ?to= ?q=) so views are shareable. Joins property
 * (title + wilaya) and guest profile.
 */

import { requireAdmin } from '../../lib/auth';
import { resolveLocale } from '../../lib/i18n';
import { adminSupabase } from '../../lib/supabase/server';
import { formatDZD } from '@dyafa/i18n';
import type { Locale } from '@dyafa/i18n';
import {
  BOOKING_STATUS,
  C,
  formatDate,
  localized,
  statusOf,
  tl,
} from '../../lib/admin-i18n';
import { AdminAppShell } from '../../components/AdminAppShell';
import { PageHeader, StatusPill, TableShell, Th, EmptyState, ErrorState } from '../../components/ui';
import { SearchBar } from '../../components/SearchBar';
import { FilterSelect, type FilterOption } from '../../components/FilterSelect';
import { DateRangeFilter } from '../../components/DateRangeFilter';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

const T = {
  title: { ar: 'الحجوزات', fr: 'Réservations', en: 'Bookings' },
  subtitle: {
    ar: 'كل الحجوزات عبر المنصة',
    fr: 'Toutes les réservations de la plateforme',
    en: 'All bookings across the platform',
  },
  searchPlaceholder: { ar: 'رمز الحجز…', fr: 'Code de réservation…', en: 'Booking code…' },
  colCode: { ar: 'الرمز', fr: 'Code', en: 'Code' },
  colProperty: { ar: 'العقار', fr: 'Logement', en: 'Property' },
  colWilaya: { ar: 'الولاية', fr: 'Wilaya', en: 'Wilaya' },
  colDates: { ar: 'التواريخ', fr: 'Dates', en: 'Dates' },
  colTotal: { ar: 'الإجمالي', fr: 'Total', en: 'Total' },
  colStatus: { ar: 'الحالة', fr: 'Statut', en: 'Status' },
  statusAll: { ar: 'كل الحالات', fr: 'Tous les statuts', en: 'All statuses' },
  wilayaAll: { ar: 'كل الولايات', fr: 'Toutes wilayas', en: 'All wilayas' },
} as const;

interface BookingListRow {
  id: string;
  code: string;
  check_in: string;
  check_out: string;
  total_dzd: number;
  status: string;
  created_at: string;
  properties: {
    title_ar: string | null;
    title_fr: string | null;
    title_en: string | null;
    wilaya_code: number | null;
    wilayas: { name_ar: string | null; name_fr: string | null; name_en: string | null } | null;
  } | null;
}

interface WilayaRow {
  code: number;
  name_ar: string;
  name_fr: string;
  name_en: string | null;
}

const BOOKING_STATUS_KEYS = [
  'requested',
  'awaiting_payment',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
  'declined',
  'expired',
] as const;

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { status?: string; wilaya?: string; from?: string; to?: string; q?: string };
}) {
  await requireAdmin('/bookings');
  const locale: Locale = resolveLocale();

  const status = searchParams.status ?? null;
  const wilaya = searchParams.wilaya ?? null;
  const from = searchParams.from ?? null;
  const to = searchParams.to ?? null;
  const q = searchParams.q?.trim() ?? '';

  // Wilayas for the filter dropdown.
  const { data: wilayaData } = await adminSupabase
    .from('wilayas')
    .select('code, name_ar, name_fr, name_en')
    .eq('is_active', true)
    .order('code', { ascending: true });
  const wilayas = (wilayaData ?? []) as WilayaRow[];

  let query = adminSupabase
    .from('bookings')
    .select(
      `id, code, check_in, check_out, total_dzd, status, created_at,
       properties!inner ( title_ar, title_fr, title_en, wilaya_code, wilayas ( name_ar, name_fr, name_en ) )`,
    )
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (status && (BOOKING_STATUS_KEYS as readonly string[]).includes(status)) {
    query = query.eq('status', status as (typeof BOOKING_STATUS_KEYS)[number]);
  }
  if (wilaya) {
    const code = Number(wilaya);
    if (!Number.isNaN(code)) query = query.eq('properties.wilaya_code', code);
  }
  if (from) query = query.gte('check_in', from);
  if (to) query = query.lte('check_in', to);
  if (q) query = query.ilike('code', `%${q}%`);

  const { data, error } = await query;
  const rows = (data ?? []) as unknown as BookingListRow[];

  const statusOptions: FilterOption[] = BOOKING_STATUS_KEYS.map((k) => ({
    value: k,
    label: statusOf(BOOKING_STATUS, k, locale).text,
  }));
  const wilayaOptions: FilterOption[] = wilayas.map((w) => ({
    value: String(w.code),
    label:
      localized({ ar: w.name_ar, fr: w.name_fr, en: w.name_en }, locale) ?? String(w.code),
  }));

  return (
    <AdminAppShell locale={locale}>
      <PageHeader title={tl(T.title, locale)} subtitle={tl(T.subtitle, locale)} />

      {/* Filter bar */}
      <section className="flex flex-wrap items-center gap-sm">
        <SearchBar locale={locale} placeholder={tl(T.searchPlaceholder, locale)} />
        <FilterSelect
          paramKey="status"
          options={statusOptions}
          allLabel={tl(T.statusAll, locale)}
          current={status}
        />
        <FilterSelect
          paramKey="wilaya"
          options={wilayaOptions}
          allLabel={tl(T.wilayaAll, locale)}
          current={wilaya}
        />
        <DateRangeFilter locale={locale} fromKey="from" toKey="to" from={from} to={to} />
      </section>

      {error && <ErrorState locale={locale} message={error.message} />}

      {!error && rows.length === 0 && <EmptyState locale={locale} />}

      {!error && rows.length > 0 && (
        <TableShell>
          <div className="hidden md:grid grid-cols-[1fr_2fr_1fr_1.4fr_1fr_1fr] gap-md px-xl py-md border-b border-border">
            <Th>{tl(T.colCode, locale)}</Th>
            <Th>{tl(T.colProperty, locale)}</Th>
            <Th>{tl(T.colWilaya, locale)}</Th>
            <Th>{tl(T.colDates, locale)}</Th>
            <Th className="text-end">{tl(T.colTotal, locale)}</Th>
            <Th className="text-end">{tl(T.colStatus, locale)}</Th>
          </div>
          <ul>
            {rows.map((b) => {
              const title =
                localized(
                  {
                    ar: b.properties?.title_ar ?? null,
                    fr: b.properties?.title_fr ?? null,
                    en: b.properties?.title_en ?? null,
                  },
                  locale,
                ) ?? '—';
              const wilayaName =
                localized(
                  {
                    ar: b.properties?.wilayas?.name_ar ?? null,
                    fr: b.properties?.wilayas?.name_fr ?? null,
                    en: b.properties?.wilayas?.name_en ?? null,
                  },
                  locale,
                ) ?? '—';
              return (
                <li key={b.id} className="border-b border-border last:border-0">
                  <a
                    href={`/bookings/${b.id}`}
                    className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr_1.4fr_1fr_1fr] gap-xs md:gap-md px-xl py-md hover:bg-bone-300 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset items-center"
                  >
                    <span className="text-body-sm font-semibold text-text-default tabular-nums" dir="ltr">
                      {b.code}
                    </span>
                    <span className="text-body-sm text-text-default truncate">{title}</span>
                    <span className="text-body-sm text-text-muted">{wilayaName}</span>
                    <span className="text-body-sm text-text-muted tabular-nums">
                      {formatDate(b.check_in, locale)} → {formatDate(b.check_out, locale)}
                    </span>
                    <span className="text-body-sm text-text-default md:text-end">
                      <bdi className="tabular-nums">{formatDZD(b.total_dzd, locale)}</bdi>
                    </span>
                    <span className="md:text-end">
                      <StatusPill {...statusOf(BOOKING_STATUS, b.status, locale)} />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </TableShell>
      )}

      {!error && rows.length === PAGE_SIZE && (
        <p className="text-caption text-text-muted text-center">
          {tl(C.filters, locale)} — {PAGE_SIZE}
        </p>
      )}
    </AdminAppShell>
  );
}
