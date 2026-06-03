/**
 * Analytics.
 *
 * Server Component (RLS-scoped). Combines the host-performance materialized view
 * with computed-from-`bookings` series (the MVs don't carry per-host occupancy /
 * ADR / monthly revenue, so we derive those):
 *   • Occupancy %, ADR (KPI tiles)
 *   • Revenue over time (monthly net), Bookings over time
 *   • Views → bookings conversion (host-scoped: confirmed / requested+ )
 *   • Top room types (by bookings)
 *   • Review-rating trend
 *
 * Reception sees occupancy only (capability matrix); managers/owners see all.
 */

import { requireHost, canManage } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { createUserClient } from '../../../lib/supabase/userServer';
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import { formatPercent, formatRating } from '../../../lib/format';
import { T, tl, localizedField, monthLabel } from '../../../lib/dashboard-i18n';
import { PageHeader, KpiCard, EmptyState } from '../../../components/ui';
import { ChartCard, ColumnChart, BarList, LineChart, type BarDatum } from '../../../components/charts';

export const dynamic = 'force-dynamic';

interface HostPerfRow {
  avg_rating: number | null;
  bookings: number | null;
  cancellation_rate: number | null;
  gmv_dzd: number | null;
  response_rate: number | null;
  listings_active: number | null;
}

interface BookingAnalyticsRow {
  check_in: string;
  nights: number | null;
  units: number;
  host_payout_dzd: number;
  nightly_subtotal_dzd: number;
  status: string;
  room_type_id: string;
}

const MONTHS_BACK = 6;

/** YYYY-MM key + month index for a date. */
function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export default async function AnalyticsPage() {
  const session = await requireHost('/analytics');
  const locale: Locale = resolveLocale();
  const supabase = createUserClient(session.accessToken);
  const manage = canManage(session);

  const now = new Date();
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_BACK - 1), 1));
  const windowStartIso = windowStart.toISOString().slice(0, 10);

  // Build the ordered list of months in the window.
  const months: { key: string; label: string }[] = [];
  for (let i = 0; i < MONTHS_BACK; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_BACK - 1) + i, 1));
    months.push({ key: d.toISOString().slice(0, 7), label: monthLabel(d.getUTCMonth(), locale) });
  }

  const [perfRes, bookingsRes, roomsRes, reviewsRes, inventoryRes] = await Promise.all([
    supabase
      .from('mv_host_performance')
      .select('avg_rating, bookings, cancellation_rate, gmv_dzd, response_rate, listings_active')
      .eq('host_profile_id', session.hostProfileId)
      .maybeSingle(),
    supabase
      .from('bookings')
      .select('check_in, nights, units, host_payout_dzd, nightly_subtotal_dzd, status, room_type_id')
      .gte('check_in', windowStartIso)
      .limit(2000),
    supabase.from('room_types').select('id, name_ar, name_fr, name_en'),
    supabase
      .from('reviews')
      .select('overall, created_at')
      .eq('status', 'published')
      .gte('created_at', windowStartIso)
      .limit(2000),
    supabase.from('room_types').select('inventory_count').eq('is_active', true),
  ]);

  const perf = (perfRes.data ?? null) as HostPerfRow | null;
  const bookings = (bookingsRes.data ?? []) as BookingAnalyticsRow[];

  const revenueByMonth = new Map<string, number>();
  const bookingsByMonth = new Map<string, number>();
  const roomNightsByMonth = new Map<string, number>();
  const adrNumeratorByMonth = new Map<string, number>(); // sum nightly_subtotal of realized
  const adrRoomNights = new Map<string, number>();

  let confirmedish = 0;
  let totalStarts = 0;
  const bookingsByRoom = new Map<string, number>();

  const revenueStatuses = new Set(['confirmed', 'checked_in', 'completed']);

  for (const b of bookings) {
    const key = monthKey(b.check_in);
    totalStarts += 1;
    if (revenueStatuses.has(b.status)) {
      confirmedish += 1;
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + (b.host_payout_dzd ?? 0));
      bookingsByMonth.set(key, (bookingsByMonth.get(key) ?? 0) + 1);
      const rn = (b.nights ?? 0) * (b.units ?? 1);
      roomNightsByMonth.set(key, (roomNightsByMonth.get(key) ?? 0) + rn);
      adrNumeratorByMonth.set(
        key,
        (adrNumeratorByMonth.get(key) ?? 0) + (b.nightly_subtotal_dzd ?? 0),
      );
      adrRoomNights.set(key, (adrRoomNights.get(key) ?? 0) + rn);
      bookingsByRoom.set(b.room_type_id, (bookingsByRoom.get(b.room_type_id) ?? 0) + 1);
    }
  }

  // Occupancy / ADR over the window.
  const inventoryRows = (inventoryRes.data ?? []) as { inventory_count: number }[];
  const totalUnits = inventoryRows.reduce((sum, r) => sum + (r.inventory_count ?? 0), 0);
  const totalRoomNights = Array.from(roomNightsByMonth.values()).reduce((a, b) => a + b, 0);
  // Approx available nights = units * days in window.
  const daysInWindow = Math.max(
    1,
    Math.round((now.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const availableRoomNights = totalUnits * daysInWindow;
  const occupancyPct =
    availableRoomNights > 0
      ? Math.min(100, Math.round((totalRoomNights / availableRoomNights) * 100))
      : 0;

  const adrNumeratorTotal = Array.from(adrNumeratorByMonth.values()).reduce((a, b) => a + b, 0);
  const adrRoomNightsTotal = Array.from(adrRoomNights.values()).reduce((a, b) => a + b, 0);
  const adr = adrRoomNightsTotal > 0 ? Math.round(adrNumeratorTotal / adrRoomNightsTotal) : 0;

  const conversionPct = totalStarts > 0 ? Math.round((confirmedish / totalStarts) * 100) : 0;

  // Chart series.
  const revenueSeries: BarDatum[] = months.map((m) => ({
    label: m.label,
    value: revenueByMonth.get(m.key) ?? 0,
    display: formatDZD(revenueByMonth.get(m.key) ?? 0, locale),
  }));
  const bookingsSeries: BarDatum[] = months.map((m) => ({
    label: m.label,
    value: bookingsByMonth.get(m.key) ?? 0,
    display: formatNumber(bookingsByMonth.get(m.key) ?? 0, locale),
  }));

  // Top room types.
  const roomName = new Map(
    (
      (roomsRes.data ?? []) as {
        id: string;
        name_ar: string | null;
        name_fr: string | null;
        name_en: string | null;
      }[]
    ).map((r) => [
      r.id,
      localizedField({ ar: r.name_ar, fr: r.name_fr, en: r.name_en }, locale) ?? '—',
    ]),
  );
  const topRooms: BarDatum[] = Array.from(bookingsByRoom.entries())
    .map(([id, count]) => ({
      label: roomName.get(id) ?? '—',
      value: count,
      display: formatNumber(count, locale),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Review trend (avg overall per month).
  const reviewSum = new Map<string, { sum: number; n: number }>();
  for (const r of (reviewsRes.data ?? []) as { overall: number; created_at: string }[]) {
    const key = monthKey(r.created_at);
    const cur = reviewSum.get(key) ?? { sum: 0, n: 0 };
    cur.sum += r.overall;
    cur.n += 1;
    reviewSum.set(key, cur);
  }
  const reviewPoints = months
    .map((m) => {
      const agg = reviewSum.get(m.key);
      return agg && agg.n > 0 ? { label: m.label, value: agg.sum / agg.n } : null;
    })
    .filter((p): p is { label: string; value: number } => p !== null);

  // ── Reception: occupancy only ──────────────────────────────────────────────
  if (!manage) {
    return (
      <>
        <PageHeader title={tl(T.anTitle, locale)} subtitle={tl(T.anReceptionLimited, locale)} />
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
          <KpiCard label={tl(T.anOccupancy, locale)} value={formatPercent(occupancyPct, locale)} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={tl(T.anTitle, locale)} subtitle={tl(T.anSubtitle, locale)} />

      {/* KPI tiles from MV + computed */}
      <div className="grid grid-cols-2 gap-lg lg:grid-cols-4">
        <KpiCard label={tl(T.anOccupancy, locale)} value={formatPercent(occupancyPct, locale)} />
        <KpiCard label={tl(T.anAdr, locale)} value={formatDZD(adr, locale)} accent />
        <KpiCard
          label={tl(T.anConversion, locale)}
          value={formatPercent(conversionPct, locale)}
        />
        <KpiCard
          label={tl(T.anAvgRating, locale)}
          value={perf?.avg_rating != null ? formatRating(perf.avg_rating, locale) : '—'}
        />
      </div>

      {/* Secondary MV stats */}
      <div className="grid grid-cols-2 gap-lg lg:grid-cols-4">
        <KpiCard
          label={tl(T.anGmv, locale)}
          value={perf?.gmv_dzd != null ? formatDZD(perf.gmv_dzd, locale) : '—'}
        />
        <KpiCard
          label={tl(T.anBookings, locale)}
          value={perf?.bookings != null ? formatNumber(perf.bookings, locale) : '—'}
        />
        <KpiCard
          label={tl(T.anResponseRate, locale)}
          value={
            perf?.response_rate != null ? formatPercent(perf.response_rate * 100, locale) : '—'
          }
        />
        <KpiCard
          label={tl(T.anCancelRate, locale)}
          value={
            perf?.cancellation_rate != null
              ? formatPercent(perf.cancellation_rate * 100, locale)
              : '—'
          }
        />
      </div>

      {bookings.length === 0 ? (
        <EmptyState title={tl(T.anTitle, locale)} body={tl(T.anNoData, locale)} />
      ) : (
        <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
          <ChartCard title={tl(T.anRevenueOverTime, locale)}>
            <ColumnChart data={revenueSeries} emptyLabel={tl(T.anNoData, locale)} barClass="bg-accent" />
          </ChartCard>
          <ChartCard title={tl(T.anBookings, locale)}>
            <ColumnChart data={bookingsSeries} emptyLabel={tl(T.anNoData, locale)} />
          </ChartCard>
          <ChartCard title={tl(T.anTopRoomTypes, locale)}>
            <BarList data={topRooms} emptyLabel={tl(T.anNoData, locale)} />
          </ChartCard>
          <ChartCard title={tl(T.anReviewTrend, locale)}>
            <LineChart points={reviewPoints} emptyLabel={tl(T.anNoData, locale)} min={0} max={5} />
          </ChartCard>
        </div>
      )}
    </>
  );
}
