/**
 * Admin overview — KPI dashboard backed by LIVE base tables.
 *
 * Server Component, gated by `requireAdmin()`. Reads the cash-truth `transactions`
 * table (same realized-status set as the Payments page, so the two reconcile) plus
 * `bookings` and `properties` directly via the service-role client — NO materialized
 * views, so there is no refresh lag and revenue is always current. KPIs and the
 * daily series are aggregated in JS from the rows fetched within the selected
 * `?range=` window. Renders KPI tiles, dependency-free SVG charts and a recent
 * bookings table. force-dynamic so the range + latest rows always apply.
 */

import { requireAdmin } from '../lib/auth';
import { resolveLocale } from '../lib/i18n';
import { adminSupabase } from '../lib/supabase/server';
import { formatDZD, dir } from '@dyafa/i18n';
import type { Locale } from '@dyafa/i18n';
import {
  C,
  formatInt,
  formatPct,
  formatDate,
  localized,
  statusOf,
  BOOKING_STATUS,
  tl,
} from '../lib/admin-i18n';
import { AdminAppShell } from '../components/AdminAppShell';
import {
  Card,
  StatCard,
  StatusPill,
  TableShell,
  Th,
  EmptyState,
  ErrorState,
  type TrendDir,
} from '../components/ui';
import { BarChart, LineChart } from '../components/MiniChart';
import {
  BookingIcon,
  PaymentIcon,
  ListingIcon,
  ReviewIcon,
  TrendUpIcon,
} from '../components/icons';
import { RangeSelector } from './RangeSelector';
import { rangeDays, isRangeKey, type RangeKey } from './range';

export const dynamic = 'force-dynamic';

// Realized buckets — kept identical to apps/admin/app/payments/page.tsx so the
// two pages reconcile on the same cash-truth.
const REALIZED_TXN = ['paid', 'partially_refunded', 'refunded'] as const;
const REALIZED_BOOKING = ['confirmed', 'checked_in', 'completed'] as const;
const PENDING_BOOKING = ['requested', 'awaiting_payment'] as const;
const CANCELLED_BOOKING = ['declined', 'cancelled', 'no_show', 'expired'] as const;

const T = {
  title: { ar: 'نظرة عامة', fr: "Vue d'ensemble", en: 'Overview' },
  subtitle: {
    ar: 'مؤشرات الأداء عبر المنصة',
    fr: 'Indicateurs de performance de la plateforme',
    en: 'Platform performance at a glance',
  },
  collected: { ar: 'المدفوعات المُحصّلة', fr: 'Encaissé', en: 'Revenue collected' },
  commission: { ar: 'عمولة المنصة', fr: 'Commission plateforme', en: 'Platform commission' },
  refunds: { ar: 'إجمالي المُسترَد', fr: 'Total remboursé', en: 'Refunds' },
  bookings: { ar: 'الحجوزات', fr: 'Réservations', en: 'Bookings' },
  paidRate: { ar: 'معدّل الدفع', fr: 'Taux payé', en: 'Paid rate' },
  activeListings: { ar: 'إعلانات نشطة', fr: 'Annonces actives', en: 'Active listings' },
  avgBooking: { ar: 'متوسّط قيمة الحجز', fr: 'Valeur moy. réservation', en: 'Avg booking value' },
  netRevenue: { ar: 'صافي إيراد المنصة', fr: 'Revenu net plateforme', en: 'Net platform revenue' },
  revenuePerDay: { ar: 'الإيراد يوميًا', fr: 'Revenu / jour', en: 'Revenue per day' },
  bookingsPerDay: { ar: 'الحجوزات يوميًا', fr: 'Réservations / jour', en: 'Bookings per day' },
  recentBookings: { ar: 'أحدث الحجوزات', fr: 'Réservations récentes', en: 'Recent bookings' },
  inRange: { ar: 'خلال الفترة', fr: 'sur la période', en: 'in range' },
  confirmedSub: { ar: 'مؤكَّد', fr: 'confirmées', en: 'confirmed' },
  pendingSub: { ar: 'معلّق', fr: 'en attente', en: 'pending' },
  cancelledSub: { ar: 'ملغى', fr: 'annulées', en: 'cancelled' },
  realizedSub: { ar: 'حجز مدفوع', fr: 'rés. payées', en: 'paid bookings' },
  ofBookings: { ar: 'من الحجوزات', fr: 'des réservations', en: 'of bookings' },
  pendingModeration: { ar: 'بانتظار المراجعة', fr: 'en modération', en: 'pending moderation' },
  refundsSub: { ar: 'مُسترَد خلال الفترة', fr: 'remboursé sur la période', en: 'refunded in range' },
  colCode: { ar: 'الرمز', fr: 'Code', en: 'Code' },
  colProperty: { ar: 'العقار', fr: 'Logement', en: 'Property' },
  colAmount: { ar: 'المبلغ', fr: 'Montant', en: 'Amount' },
  colStatus: { ar: 'الحالة', fr: 'Statut', en: 'Status' },
  colDate: { ar: 'التاريخ', fr: 'Date', en: 'Date' },
  untitled: { ar: 'بدون عنوان', fr: 'Sans titre', en: 'Untitled' },
} as const;

interface TxnRow {
  amount_dzd: number | null;
  commission_amount_dzd: number | null;
  refunded_dzd: number | null;
  status: string;
  paid_at: string | null;
}

interface BookingRow {
  status: string;
  created_at: string;
}

interface RecentBookingRow {
  id: string;
  code: string;
  total_dzd: number | null;
  status: string;
  created_at: string;
  properties: { title_ar: string | null; title_fr: string | null; title_en: string | null } | null;
}

/**
 * Period-over-period trend for the hero tiles: compares the second half of the
 * range to the first half (purely derived from an already-fetched daily series —
 * no extra query). Returns null when there isn't enough data to be meaningful.
 */
function trendOf(values: number[], locale: Locale): { dir: TrendDir; text: string } | null {
  if (values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const prev = sum(values.slice(0, mid));
  const curr = sum(values.slice(mid));
  if (prev <= 0) return curr > 0 ? { dir: 'up', text: '+100%' } : null;
  const pct = ((curr - prev) / prev) * 100;
  const dir: TrendDir = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'neutral';
  const sign = pct > 0 ? '+' : '';
  return { dir, text: `${sign}${formatPct(pct, locale)}` };
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  await requireAdmin('/');
  const locale: Locale = resolveLocale();
  const rtl = dir(locale) === 'rtl';

  const range: RangeKey = isRangeKey(searchParams.range) ? searchParams.range : '30d';
  const days = rangeDays(range);
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  // ── Cash-truth: realized transactions paid within the window (bucket by paid_at).
  const txnQuery = adminSupabase
    .from('transactions')
    .select('amount_dzd, commission_amount_dzd, refunded_dzd, status, paid_at')
    .in('status', [...REALIZED_TXN])
    .gte('paid_at', sinceIso)
    .order('paid_at', { ascending: true });

  // ── Bookings created within the window (for counts + paid-rate + bookings/day).
  const bookingsQuery = adminSupabase
    .from('bookings')
    .select('status, created_at')
    .gte('created_at', sinceIso);

  // ── Recent bookings (latest 8, any status) joined to the property for a title.
  const recentQuery = adminSupabase
    .from('bookings')
    .select('id, code, total_dzd, status, created_at, properties ( title_ar, title_fr, title_en )')
    .order('created_at', { ascending: false })
    .limit(8);

  // ── Live count: currently-active (approved) listings + moderation queue size.
  const activeListingsQuery = adminSupabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved');
  const pendingListingsQuery = adminSupabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  const [txnRes, bookingsRes, recentRes, activeRes, pendingRes] = await Promise.all([
    txnQuery,
    bookingsQuery,
    recentQuery,
    activeListingsQuery,
    pendingListingsQuery,
  ]);

  const error =
    txnRes.error ??
    bookingsRes.error ??
    recentRes.error ??
    activeRes.error ??
    pendingRes.error ??
    null;

  const txns = (txnRes.data ?? []) as TxnRow[];
  const bookings = (bookingsRes.data ?? []) as BookingRow[];
  const recent = (recentRes.data ?? []) as unknown as RecentBookingRow[];
  const activeListings = activeRes.count ?? 0;
  const pendingListings = pendingRes.count ?? 0;

  // ── Transaction totals (collected / commission / refunds).
  const txnTotals = txns.reduce(
    (acc, t) => {
      acc.collected += t.amount_dzd ?? 0;
      acc.commission += t.commission_amount_dzd ?? 0;
      acc.refunds += t.refunded_dzd ?? 0;
      return acc;
    },
    { collected: 0, commission: 0, refunds: 0 },
  );
  const netRevenue = txnTotals.commission - txnTotals.refunds;

  // ── Booking counts + paid-rate.
  const bookingCounts = bookings.reduce(
    (acc, b) => {
      acc.total += 1;
      if ((REALIZED_BOOKING as readonly string[]).includes(b.status)) acc.realized += 1;
      else if ((PENDING_BOOKING as readonly string[]).includes(b.status)) acc.pending += 1;
      else if ((CANCELLED_BOOKING as readonly string[]).includes(b.status)) acc.cancelled += 1;
      return acc;
    },
    { total: 0, realized: 0, pending: 0, cancelled: 0 },
  );
  const paidRate = bookingCounts.total > 0 ? (bookingCounts.realized / bookingCounts.total) * 100 : 0;
  const avgBookingValue = bookingCounts.realized > 0 ? txnTotals.collected / bookingCounts.realized : 0;

  // ── Daily series: one bucket per day across the whole range so charts are dense
  // even on zero-activity days. Keys are local-date ISO (YYYY-MM-DD).
  const dayKeys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const revenueByDay = new Map<string, number>(dayKeys.map((k) => [k, 0]));
  const commissionByDay = new Map<string, number>(dayKeys.map((k) => [k, 0]));
  const bookingsByDay = new Map<string, number>(dayKeys.map((k) => [k, 0]));

  for (const t of txns) {
    if (!t.paid_at) continue;
    const key = new Date(t.paid_at).toISOString().slice(0, 10);
    if (revenueByDay.has(key)) {
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + (t.amount_dzd ?? 0));
      commissionByDay.set(key, (commissionByDay.get(key) ?? 0) + (t.commission_amount_dzd ?? 0));
    }
  }
  for (const b of bookings) {
    const key = new Date(b.created_at).toISOString().slice(0, 10);
    if (bookingsByDay.has(key)) bookingsByDay.set(key, (bookingsByDay.get(key) ?? 0) + 1);
  }

  const dayLabel = (iso: string): string => String(new Date(iso).getUTCDate());
  const revenueSeries = dayKeys.map((k) => ({ label: dayLabel(k), value: revenueByDay.get(k) ?? 0 }));
  const bookingsSeries = dayKeys.map((k) => ({ label: dayLabel(k), value: bookingsByDay.get(k) ?? 0 }));

  // ── Trends (derived from the same daily series — no extra query).
  const revenueTrend = trendOf(revenueSeries.map((p) => p.value), locale);
  const commissionTrend = trendOf(dayKeys.map((k) => commissionByDay.get(k) ?? 0), locale);
  const bookingsTrend = trendOf(bookingsSeries.map((p) => p.value), locale);

  const rangeSuffix = tl(T.inRange, locale);
  const bookingsSub = `${formatInt(bookingCounts.realized, locale)} ${tl(T.confirmedSub, locale)} · ${formatInt(
    bookingCounts.pending,
    locale,
  )} ${tl(T.pendingSub, locale)} · ${formatInt(bookingCounts.cancelled, locale)} ${tl(T.cancelledSub, locale)}`;

  return (
    <AdminAppShell locale={locale}>
      {/* ── Title + range selector ──────────────────────────────────────── */}
      <section className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <h2 className="font-display text-heading-1 font-semibold tracking-tight text-primary">
            {tl(T.title, locale)}
          </h2>
          <p className="mt-xs text-body-sm text-text-muted">{tl(T.subtitle, locale)}</p>
        </div>
        <RangeSelector locale={locale} current={range} />
      </section>

      {error && <ErrorState locale={locale} message={error.message} />}

      {/* ── Hero KPI tiles ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-lg sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={tl(T.collected, locale)}
          value={formatDZD(txnTotals.collected, locale)}
          sub={rangeSuffix}
          accent
          icon={<PaymentIcon className="h-5 w-5" />}
          trend={revenueTrend ?? undefined}
        />
        <StatCard
          label={tl(T.commission, locale)}
          value={formatDZD(txnTotals.commission, locale)}
          sub={`${tl(T.netRevenue, locale)}: ${formatDZD(netRevenue, locale)}`}
          icon={<TrendUpIcon className="h-5 w-5" />}
          trend={commissionTrend ?? undefined}
        />
        <StatCard
          label={tl(T.bookings, locale)}
          value={formatInt(bookingCounts.total, locale)}
          sub={bookingsSub}
          icon={<BookingIcon className="h-5 w-5" />}
          trend={bookingsTrend ?? undefined}
        />
        <StatCard
          label={tl(T.paidRate, locale)}
          value={formatPct(paidRate, locale)}
          sub={`${formatInt(bookingCounts.realized, locale)} ${tl(T.realizedSub, locale)}`}
          icon={<ReviewIcon className="h-5 w-5" />}
        />
      </section>

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <Card title={tl(T.revenuePerDay, locale)}>
          {revenueSeries.length === 0 ? (
            <p className="py-2xl text-center text-body-sm italic text-text-muted">
              {tl(C.emptyBody, locale)}
            </p>
          ) : (
            <LineChart points={revenueSeries} rtl={rtl} ariaLabel={tl(T.revenuePerDay, locale)} />
          )}
        </Card>
        <Card title={tl(T.bookingsPerDay, locale)}>
          {bookingsSeries.length === 0 ? (
            <p className="py-2xl text-center text-body-sm italic text-text-muted">
              {tl(C.emptyBody, locale)}
            </p>
          ) : (
            <BarChart points={bookingsSeries} rtl={rtl} ariaLabel={tl(T.bookingsPerDay, locale)} />
          )}
        </Card>
      </section>

      {/* ── Secondary KPIs ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={tl(T.avgBooking, locale)}
          value={formatDZD(avgBookingValue, locale)}
          sub={`${formatInt(bookingCounts.realized, locale)} ${tl(T.realizedSub, locale)}`}
          icon={<PaymentIcon className="h-5 w-5" />}
        />
        <StatCard
          label={tl(T.refunds, locale)}
          value={formatDZD(txnTotals.refunds, locale)}
          sub={tl(T.refundsSub, locale)}
          icon={<TrendUpIcon className="h-5 w-5" />}
        />
        <StatCard
          label={tl(T.activeListings, locale)}
          value={formatInt(activeListings, locale)}
          sub={`${formatInt(pendingListings, locale)} ${tl(T.pendingModeration, locale)}`}
          icon={<ListingIcon className="h-5 w-5" />}
        />
        <StatCard
          label={tl(T.netRevenue, locale)}
          value={formatDZD(netRevenue, locale)}
          sub={`${tl(T.commission, locale)} − ${tl(T.refunds, locale)}`}
          icon={<TrendUpIcon className="h-5 w-5" />}
        />
      </section>

      {/* ── Recent bookings ─────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-md font-display text-heading-2 font-semibold text-primary">
          {tl(T.recentBookings, locale)}
        </h2>
        {recent.length === 0 ? (
          <EmptyState locale={locale} />
        ) : (
          <TableShell>
            <div className="hidden gap-md border-b border-border px-xl py-md md:grid md:grid-cols-[1fr_1.8fr_1fr_1fr_1fr]">
              <Th>{tl(T.colCode, locale)}</Th>
              <Th>{tl(T.colProperty, locale)}</Th>
              <Th className="text-end">{tl(T.colAmount, locale)}</Th>
              <Th className="text-end">{tl(T.colStatus, locale)}</Th>
              <Th className="text-end">{tl(T.colDate, locale)}</Th>
            </div>
            <ul>
              {recent.map((b) => {
                const title =
                  (b.properties &&
                    localized(
                      { ar: b.properties.title_ar, fr: b.properties.title_fr, en: b.properties.title_en },
                      locale,
                    )) ||
                  tl(T.untitled, locale);
                return (
                  <li
                    key={b.id}
                    className="grid grid-cols-1 items-center gap-xs border-b border-border px-xl py-md last:border-0 md:grid-cols-[1fr_1.8fr_1fr_1fr_1fr] md:gap-md"
                  >
                    <span className="text-body-sm font-semibold tabular-nums text-text-default" dir="ltr">
                      <a href={`/bookings/${b.id}`} className="text-primary hover:underline">
                        {b.code}
                      </a>
                    </span>
                    <span className="truncate text-body-sm text-text-default">{title}</span>
                    <span className="text-body-sm text-text-default md:text-end">
                      <bdi className="tabular-nums font-semibold">{formatDZD(b.total_dzd ?? 0, locale)}</bdi>
                    </span>
                    <span className="md:text-end">
                      <StatusPill {...statusOf(BOOKING_STATUS, b.status, locale)} />
                    </span>
                    <span className="text-body-sm tabular-nums text-text-muted md:text-end">
                      {formatDate(b.created_at, locale)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </TableShell>
        )}
      </section>
    </AdminAppShell>
  );
}
