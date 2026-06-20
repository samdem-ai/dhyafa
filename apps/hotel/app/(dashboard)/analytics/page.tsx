/**
 * Analytics.
 *
 * Server Component (RLS-scoped). Everything is derived DIRECTLY from base tables
 * the host owns — `mv_host_performance` is NOT used (it has no SELECT grant to
 * `authenticated`, so reading it errored and silently blanked the tiles).
 *
 * From the host's bookings over the last 6 months (RLS scopes them via
 * host_profile_id=my_host_id()):
 *   • Net revenue (Σ host_payout_dzd) + Gross revenue (Σ total_dzd), realized
 *   • Bookings count + Completed count
 *   • Avg nightly = net revenue / room-nights
 *   • Occupancy (approx) = booked room-nights / available room-nights, where
 *     available = Σ(room_types.inventory_count) × days-in-window
 *   • Revenue-over-time + bookings-over-time columns, top room types
 *
 * Query errors are SURFACED via <ErrorState> (no longer swallowed).
 *
 * Reception sees occupancy only (capability matrix); managers/owners see all.
 */

import { requireHost, canManage } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { createUserClient } from '../../../lib/supabase/userServer';
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import { formatPercent } from '../../../lib/format';
import { T, tl, localizedField, monthLabel } from '../../../lib/dashboard-i18n';
import { PageHeader, KpiCard, EmptyState, ErrorState } from '../../../components/ui';
import { ChartCard, ColumnChart, BarList, type BarDatum } from '../../../components/charts';
import {
  WalletIcon,
  ChartIcon,
  BookingIcon,
  CheckCircleIcon,
} from '../../../components/icons';

export const dynamic = 'force-dynamic';

interface BookingAnalyticsRow {
  check_in: string;
  nights: number | null;
  units: number;
  total_dzd: number;
  host_payout_dzd: number;
  status: string;
  room_type_id: string;
}

const MONTHS_BACK = 6;

/** YYYY-MM key for a date. */
function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export default async function AnalyticsPage() {
  const session = await requireHost('/analytics');
  const locale: Locale = resolveLocale();
  const supabase = createUserClient(session.accessToken);
  const manage = canManage(session);

  const now = new Date();
  const windowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_BACK - 1), 1),
  );
  const windowStartIso = windowStart.toISOString().slice(0, 10);

  // Build the ordered list of months in the window.
  const months: { key: string; label: string }[] = [];
  for (let i = 0; i < MONTHS_BACK; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_BACK - 1) + i, 1),
    );
    months.push({ key: d.toISOString().slice(0, 7), label: monthLabel(d.getUTCMonth(), locale) });
  }

  // ── Direct base-table reads (RLS-scoped to the host) ───────────────────────
  const [bookingsRes, roomsRes, inventoryRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('check_in, nights, units, total_dzd, host_payout_dzd, status, room_type_id')
      .gte('check_in', windowStartIso)
      .limit(2000),
    supabase.from('room_types').select('id, name_ar, name_fr, name_en'),
    // Occupancy denominator: scope to the HOST'S OWN active rooms. room_types is
    // public-read for every approved property, so without the host_profile_id
    // filter this would sum the whole platform's inventory (occupancy → ~0%).
    supabase
      .from('room_types')
      .select('inventory_count, property:properties!inner(host_profile_id)')
      .eq('is_active', true)
      .eq('property.host_profile_id', session.hostProfileId),
  ]);

  // Surface (don't swallow) any query error.
  const queryError = bookingsRes.error ?? roomsRes.error ?? inventoryRes.error ?? null;
  if (queryError) {
    return (
      <>
        <PageHeader title={tl(T.anTitle, locale)} subtitle={tl(T.anSubtitle, locale)} />
        <ErrorState title={tl(T.errorTitle, locale)} message={queryError.message} />
      </>
    );
  }

  const bookings = (bookingsRes.data ?? []) as BookingAnalyticsRow[];

  const revenueStatuses = new Set(['confirmed', 'checked_in', 'completed']);

  const revenueByMonth = new Map<string, number>(); // net per month
  const bookingsByMonth = new Map<string, number>();
  const roomNightsByMonth = new Map<string, number>();
  const bookingsByRoom = new Map<string, number>();

  let netRevenue = 0;
  let grossRevenue = 0;
  let bookingsCount = 0;
  let completedCount = 0;
  let totalRoomNights = 0;

  for (const b of bookings) {
    if (!revenueStatuses.has(b.status)) continue;
    const key = monthKey(b.check_in);
    const rn = (b.nights ?? 0) * (b.units ?? 1);

    netRevenue += b.host_payout_dzd ?? 0;
    grossRevenue += b.total_dzd ?? 0;
    bookingsCount += 1;
    if (b.status === 'completed') completedCount += 1;
    totalRoomNights += rn;

    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + (b.host_payout_dzd ?? 0));
    bookingsByMonth.set(key, (bookingsByMonth.get(key) ?? 0) + 1);
    roomNightsByMonth.set(key, (roomNightsByMonth.get(key) ?? 0) + rn);
    bookingsByRoom.set(b.room_type_id, (bookingsByRoom.get(b.room_type_id) ?? 0) + 1);
  }

  // Avg nightly = net revenue / room-nights (best-effort, net basis).
  const avgNightly = totalRoomNights > 0 ? Math.round(netRevenue / totalRoomNights) : 0;

  // Occupancy (approx) = booked room-nights / available room-nights over window.
  const inventoryRows = (inventoryRes.data ?? []) as { inventory_count: number }[];
  const totalUnits = inventoryRows.reduce((sum, r) => sum + (r.inventory_count ?? 0), 0);
  const daysInWindow = Math.max(
    1,
    Math.round((now.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const availableRoomNights = totalUnits * daysInWindow;
  const occupancyPct =
    availableRoomNights > 0
      ? Math.min(100, Math.round((totalRoomNights / availableRoomNights) * 100))
      : 0;

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

  // Top room types (by bookings).
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

  // ── Reception: occupancy only ──────────────────────────────────────────────
  if (!manage) {
    return (
      <>
        <PageHeader title={tl(T.anTitle, locale)} subtitle={tl(T.anReceptionLimited, locale)} />
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
          <KpiCard
            label={tl(T.anOccupancyApprox, locale)}
            value={formatPercent(occupancyPct, locale)}
            sub={tl(T.anWindowLabel, locale)}
            icon={<ChartIcon size={18} />}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={tl(T.anTitle, locale)} subtitle={tl(T.anSubtitle, locale)} />

      {/* Revenue KPIs — NET is the single accented (hero) figure. */}
      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={tl(T.anNetRevenue, locale)}
          value={formatDZD(netRevenue, locale)}
          sub={tl(T.anNetRevenueSub, locale)}
          accent
          icon={<WalletIcon size={18} />}
        />
        <KpiCard
          label={tl(T.anGrossRevenue, locale)}
          value={formatDZD(grossRevenue, locale)}
          sub={tl(T.anWindowLabel, locale)}
          icon={<ChartIcon size={18} />}
        />
        <KpiCard
          label={tl(T.anBookings, locale)}
          value={formatNumber(bookingsCount, locale)}
          sub={tl(T.anWindowLabel, locale)}
          icon={<BookingIcon size={18} />}
        />
        <KpiCard
          label={tl(T.anCompleted, locale)}
          value={formatNumber(completedCount, locale)}
          icon={<CheckCircleIcon size={18} />}
        />
      </div>

      {/* Operating KPIs — derived rates. */}
      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
        <KpiCard
          label={tl(T.anAdr, locale)}
          value={formatDZD(avgNightly, locale)}
          sub={tl(T.anNetRevenueSub, locale)}
        />
        <KpiCard
          label={tl(T.anOccupancyApprox, locale)}
          value={formatPercent(occupancyPct, locale)}
          sub={tl(T.anWindowLabel, locale)}
        />
      </div>

      {bookingsCount === 0 ? (
        <EmptyState title={tl(T.anTitle, locale)} body={tl(T.anNoData, locale)} />
      ) : (
        <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
          <ChartCard title={tl(T.anRevenueOverTime, locale)}>
            <ColumnChart
              data={revenueSeries}
              emptyLabel={tl(T.anNoData, locale)}
              barClass="bg-accent"
            />
          </ChartCard>
          <ChartCard title={tl(T.anBookings, locale)}>
            <ColumnChart data={bookingsSeries} emptyLabel={tl(T.anNoData, locale)} />
          </ChartCard>
          <ChartCard title={tl(T.anTopRoomTypes, locale)}>
            <BarList data={topRooms} emptyLabel={tl(T.anNoData, locale)} />
          </ChartCard>
        </div>
      )}
    </>
  );
}
