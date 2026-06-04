/**
 * Admin overview — KPI dashboard backed by the analytics materialized views.
 *
 * Server Component, gated by `requireAdmin()`. Reads `mv_daily_metrics` and
 * `mv_conversion_funnel` over the selected time range (URL `?range=`), plus live
 * counts from base tables (active listings, pending queue). Renders KPI tiles +
 * dependency-free SVG charts. MVs refresh on a schedule, so we force-dynamic to
 * always reflect the latest refresh + range.
 */

import { requireAdmin } from '../lib/auth';
import { resolveLocale } from '../lib/i18n';
import { adminSupabase } from '../lib/supabase/server';
import { formatDZD, dir } from '@dyafa/i18n';
import type { Locale } from '@dyafa/i18n';
import { C, formatInt, formatPct, tl } from '../lib/admin-i18n';
import { AdminShell } from '../components/AdminShell';
import { Card, StatCard, LinkButton, ErrorState, ArrowRightIcon, type TrendDir } from '../components/ui';
import { BarChart, LineChart } from '../components/MiniChart';
import {
  BookingIcon,
  PaymentIcon,
  ListingIcon,
  UsersIcon,
  ReviewIcon,
  TrendUpIcon,
} from '../components/icons';
import { RangeSelector, rangeDays, isRangeKey, type RangeKey } from './RangeSelector';

export const dynamic = 'force-dynamic';

const T = {
  title: { ar: 'نظرة عامة', fr: "Vue d'ensemble", en: 'Overview' },
  subtitle: {
    ar: 'مؤشرات الأداء عبر المنصة',
    fr: 'Indicateurs de performance de la plateforme',
    en: 'Platform performance at a glance',
  },
  bookings: { ar: 'الحجوزات', fr: 'Réservations', en: 'Bookings' },
  gmv: { ar: 'إجمالي قيمة الحجوزات', fr: 'Volume brut (GMV)', en: 'Gross Booking Value' },
  commission: { ar: 'عمولة المنصة', fr: 'Commission plateforme', en: 'Platform Commission' },
  activeListings: { ar: 'إعلانات نشطة', fr: 'Annonces actives', en: 'Active Listings' },
  newUsers: { ar: 'مستخدمون جدد', fr: 'Nouveaux utilisateurs', en: 'New Users' },
  conversion: { ar: 'معدّل التحويل', fr: 'Taux de conversion', en: 'Conversion Rate' },
  pending: { ar: 'بانتظار المراجعة', fr: 'En attente de modération', en: 'Pending moderation' },
  completed: { ar: 'حجوزات مكتملة', fr: 'Réservations terminées', en: 'Completed bookings' },
  bookingsPerDay: { ar: 'الحجوزات يوميًا', fr: 'Réservations / jour', en: 'Bookings per day' },
  gmvTrend: { ar: 'اتجاه قيمة الحجوزات', fr: 'Tendance du GMV', en: 'GMV trend' },
  inRange: { ar: 'خلال الفترة', fr: 'sur la période', en: 'in range' },
  openQueue: {
    ar: 'فتح طابور المراجعة',
    fr: 'Ouvrir la file',
    en: 'Open queue',
  },
} as const;

interface DailyRow {
  day: string | null;
  bookings_count: number | null;
  gmv_dzd: number | null;
  commission_dzd: number | null;
  new_users: number | null;
  completed_bookings: number | null;
}

interface FunnelRow {
  booking_starts: number | null;
  bookings_paid: number | null;
  conversion_pct: number | null;
}

/**
 * Period-over-period trend for the hero tiles: compares the second half of the
 * range to the first half (purely derived from the already-fetched daily rows —
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
  const sinceDate = since.toISOString().slice(0, 10);

  // Daily metrics over the range (ordered ascending for charting).
  const dailyQuery = adminSupabase
    .from('mv_daily_metrics')
    .select('day, bookings_count, gmv_dzd, commission_dzd, new_users, completed_bookings')
    .gte('day', sinceDate)
    .order('day', { ascending: true });

  // Conversion funnel over the same range (aggregate client-side).
  const funnelQuery = adminSupabase
    .from('mv_conversion_funnel')
    .select('booking_starts, bookings_paid, conversion_pct')
    .gte('day', sinceDate);

  // Live count: currently-active (approved) listings.
  const activeListingsQuery = adminSupabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved');

  // Live count: listings awaiting moderation.
  const pendingQuery = adminSupabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  const [dailyRes, funnelRes, activeRes, pendingRes] = await Promise.all([
    dailyQuery,
    funnelQuery,
    activeListingsQuery,
    pendingQuery,
  ]);

  const error =
    dailyRes.error ?? funnelRes.error ?? activeRes.error ?? pendingRes.error ?? null;

  const daily = (dailyRes.data ?? []) as DailyRow[];
  const funnel = (funnelRes.data ?? []) as FunnelRow[];

  // Aggregate totals across the range.
  const totals = daily.reduce(
    (acc, r) => {
      acc.bookings += r.bookings_count ?? 0;
      acc.gmv += r.gmv_dzd ?? 0;
      acc.commission += r.commission_dzd ?? 0;
      acc.newUsers += r.new_users ?? 0;
      acc.completed += r.completed_bookings ?? 0;
      return acc;
    },
    { bookings: 0, gmv: 0, commission: 0, newUsers: 0, completed: 0 },
  );

  const funnelTotals = funnel.reduce(
    (acc, r) => {
      acc.starts += r.booking_starts ?? 0;
      acc.paid += r.bookings_paid ?? 0;
      return acc;
    },
    { starts: 0, paid: 0 },
  );
  const conversionPct = funnelTotals.starts > 0 ? (funnelTotals.paid / funnelTotals.starts) * 100 : 0;

  const activeListings = activeRes.count ?? 0;
  const pendingCount = pendingRes.count ?? 0;

  const dayLabel = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : String(d.getUTCDate());
  };

  const bookingsSeries = daily.map((r) => ({ label: dayLabel(r.day), value: r.bookings_count ?? 0 }));
  const gmvSeries = daily.map((r) => ({ label: dayLabel(r.day), value: r.gmv_dzd ?? 0 }));

  // Period-over-period trends (derived from the same daily rows).
  const bookingsTrend = trendOf(daily.map((r) => r.bookings_count ?? 0), locale);
  const gmvTrend = trendOf(daily.map((r) => r.gmv_dzd ?? 0), locale);
  const commissionTrend = trendOf(daily.map((r) => r.commission_dzd ?? 0), locale);
  const newUsersTrend = trendOf(daily.map((r) => r.new_users ?? 0), locale);

  const rangeSuffix = tl(T.inRange, locale);

  return (
    <AdminShell locale={locale} pathname="/">
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
          label={tl(T.bookings, locale)}
          value={formatInt(totals.bookings, locale)}
          sub={rangeSuffix}
          icon={<BookingIcon className="h-5 w-5" />}
          trend={bookingsTrend ?? undefined}
        />
        <StatCard
          label={tl(T.gmv, locale)}
          value={formatDZD(totals.gmv, locale)}
          sub={rangeSuffix}
          accent
          icon={<PaymentIcon className="h-5 w-5" />}
          trend={gmvTrend ?? undefined}
        />
        <StatCard
          label={tl(T.commission, locale)}
          value={formatDZD(totals.commission, locale)}
          sub={rangeSuffix}
          icon={<TrendUpIcon className="h-5 w-5" />}
          trend={commissionTrend ?? undefined}
        />
        <StatCard
          label={tl(T.conversion, locale)}
          value={formatPct(conversionPct, locale)}
          sub={`${formatInt(totals.completed, locale)} ${tl(T.completed, locale)}`}
          icon={<ReviewIcon className="h-5 w-5" />}
        />
      </section>

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <Card title={tl(T.bookingsPerDay, locale)}>
          {bookingsSeries.length === 0 ? (
            <p className="py-2xl text-center text-body-sm italic text-text-muted">
              {tl(C.emptyBody, locale)}
            </p>
          ) : (
            <BarChart points={bookingsSeries} rtl={rtl} ariaLabel={tl(T.bookingsPerDay, locale)} />
          )}
        </Card>
        <Card title={tl(T.gmvTrend, locale)}>
          {gmvSeries.length === 0 ? (
            <p className="py-2xl text-center text-body-sm italic text-text-muted">
              {tl(C.emptyBody, locale)}
            </p>
          ) : (
            <LineChart points={gmvSeries} rtl={rtl} ariaLabel={tl(T.gmvTrend, locale)} />
          )}
        </Card>
      </section>

      {/* ── Secondary KPIs + moderation shortcut ────────────────────────── */}
      <section className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={tl(T.activeListings, locale)}
          value={formatInt(activeListings, locale)}
          sub={`${formatInt(pendingCount, locale)} ${tl(T.pending, locale)}`}
          icon={<ListingIcon className="h-5 w-5" />}
        />
        <StatCard
          label={tl(T.newUsers, locale)}
          value={formatInt(totals.newUsers, locale)}
          sub={rangeSuffix}
          icon={<UsersIcon className="h-5 w-5" />}
          trend={newUsersTrend ?? undefined}
        />
        <Card className="flex" bodyClassName="flex flex-1 flex-col justify-between gap-md">
          <div className="flex items-start gap-md">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent/12 text-accent">
              <ListingIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-heading-3 font-semibold text-primary">
                {formatInt(pendingCount, locale)} {tl(T.pending, locale)}
              </p>
              <p className="mt-xs text-caption text-text-muted">{tl(T.subtitle, locale)}</p>
            </div>
          </div>
          <LinkButton href="/moderation" variant="accent" size="sm" className="self-start">
            {tl(T.openQueue, locale)}
            <ArrowRightIcon className="h-4 w-4 rtl:-scale-x-100" />
          </LinkButton>
        </Card>
      </section>
    </AdminShell>
  );
}
