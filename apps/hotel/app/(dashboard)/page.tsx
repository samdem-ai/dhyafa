/**
 * Overview — the dashboard landing page.
 *
 * Server Component. All reads use the per-request user-token client so RLS
 * scopes everything to the caller's host. Shows:
 *   • Today's check-ins / check-outs
 *   • Occupancy % (this month) + revenue (net, this month)
 *   • Pending-action queue: booking requests + unread guest messages
 *   • Upcoming reservations
 */

import { requireHost } from '../../lib/auth';
import { resolveLocale } from '../../lib/i18n';
import { createUserClient } from '../../lib/supabase/userServer';
import { formatDZD } from '@dyafa/i18n';
import { formatPercent } from '../../lib/format';
import {
  T,
  tl,
  formatDate,
  bookingStatusLabel,
  bookingStatusColor,
  localizedField,
} from '../../lib/dashboard-i18n';
import { KpiCard, Section, EmptyState, StatusPill, Price } from '../../components/ui';
import type { Database } from '@dyafa/api-client';

export const dynamic = 'force-dynamic';

type BookingRow = Pick<
  Database['public']['Tables']['bookings']['Row'],
  | 'id'
  | 'code'
  | 'status'
  | 'check_in'
  | 'check_out'
  | 'total_dzd'
  | 'host_payout_dzd'
  | 'adults'
  | 'children'
  | 'guest_id'
  | 'property_id'
>;

/** First/last day of the current month as ISO date strings (YYYY-MM-DD). */
function monthBounds(now: Date): { start: string; end: string; daysInMonth: number } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end), daysInMonth: end.getUTCDate() };
}

function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export default async function OverviewPage() {
  const session = await requireHost('/');
  const locale = resolveLocale();
  const supabase = createUserClient(session.accessToken);

  const now = new Date();
  const today = todayIso(now);
  const { start: monthStart, end: monthEnd, daysInMonth } = monthBounds(now);

  // ── Queries (RLS-scoped to the host) ──────────────────────────────────────
  const [
    checkinsRes,
    checkoutsRes,
    requestsRes,
    monthBookingsRes,
    upcomingRes,
    inventoryRes,
    convoRes,
  ] = await Promise.all([
    // Today's arrivals (confirmed/checked-in arriving today)
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('check_in', today)
      .in('status', ['confirmed', 'checked_in']),
    // Today's departures
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('check_out', today)
      .in('status', ['checked_in', 'completed', 'confirmed']),
    // Booking requests awaiting host response
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'requested'),
    // This month's bookings contributing to revenue + occupancy
    supabase
      .from('bookings')
      .select('id, nights, host_payout_dzd, status, check_in, units')
      .gte('check_in', monthStart)
      .lte('check_in', monthEnd)
      .in('status', ['confirmed', 'checked_in', 'completed']),
    // Upcoming reservations (next arrivals)
    supabase
      .from('bookings')
      .select(
        'id, code, status, check_in, check_out, total_dzd, host_payout_dzd, adults, children, guest_id, property_id',
      )
      .gte('check_in', today)
      .in('status', ['confirmed', 'checked_in', 'requested', 'awaiting_payment'])
      .order('check_in', { ascending: true })
      .limit(6),
    // Total active inventory across room types (for occupancy denominator)
    supabase.from('room_types').select('inventory_count').eq('is_active', true),
    // Conversations to compute unread guest messages
    supabase.from('conversations').select('id').limit(500),
  ]);

  const checkinsToday = checkinsRes.count ?? 0;
  const checkoutsToday = checkoutsRes.count ?? 0;
  const pendingRequests = requestsRes.count ?? 0;

  // Revenue (net host payout) this month
  const monthRows = (monthBookingsRes.data ?? []) as {
    nights: number | null;
    host_payout_dzd: number;
    units: number;
  }[];
  const monthRevenue = monthRows.reduce((sum, r) => sum + (r.host_payout_dzd ?? 0), 0);

  // Occupancy = booked room-nights / available room-nights this month
  const bookedRoomNights = monthRows.reduce(
    (sum, r) => sum + (r.nights ?? 0) * (r.units ?? 1),
    0,
  );
  const inventoryRows = (inventoryRes.data ?? []) as { inventory_count: number }[];
  const totalUnits = inventoryRows.reduce((sum, r) => sum + (r.inventory_count ?? 0), 0);
  const availableRoomNights = totalUnits * daysInMonth;
  const occupancyPct =
    availableRoomNights > 0
      ? Math.min(100, Math.round((bookedRoomNights / availableRoomNights) * 100))
      : 0;

  // Unread guest messages: count messages not sent by this user and unread,
  // within the host's conversations.
  const convoIds = ((convoRes.data ?? []) as { id: string }[]).map((c) => c.id);
  let unreadMessages = 0;
  if (convoIds.length > 0) {
    const unreadRes = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', convoIds)
      .is('read_at', null)
      .neq('sender_id', session.userId);
    unreadMessages = unreadRes.count ?? 0;
  }

  const upcoming = (upcomingRes.data ?? []) as BookingRow[];

  // Resolve guest names + property titles for the upcoming list.
  const guestIds = Array.from(new Set(upcoming.map((b) => b.guest_id)));
  const propIds = Array.from(new Set(upcoming.map((b) => b.property_id)));
  const [guestsRes, propsRes] = await Promise.all([
    guestIds.length
      ? supabase.from('profiles').select('id, display_name').in('id', guestIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
    propIds.length
      ? supabase.from('properties').select('id, title_ar, title_fr, title_en').in('id', propIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            title_ar: string | null;
            title_fr: string | null;
            title_en: string | null;
          }[],
        }),
  ]);
  const guestName = new Map(
    ((guestsRes.data ?? []) as { id: string; display_name: string }[]).map((g) => [
      g.id,
      g.display_name,
    ]),
  );
  const propTitle = new Map(
    (
      (propsRes.data ?? []) as {
        id: string;
        title_ar: string | null;
        title_fr: string | null;
        title_en: string | null;
      }[]
    ).map((p) => [
      p.id,
      localizedField({ ar: p.title_ar, fr: p.title_fr, en: p.title_en }, locale) ?? '—',
    ]),
  );

  const pendingActions: { text: string; href: string }[] = [];
  if (pendingRequests > 0) {
    pendingActions.push({
      text: `${pendingRequests} ${tl(T.ovBookingRequests, locale)}`,
      href: '/reservations?status=requested',
    });
  }
  if (unreadMessages > 0) {
    pendingActions.push({
      text: `${unreadMessages} ${tl(T.ovUnreadMessages, locale)}`,
      href: '/messages',
    });
  }

  return (
    <>
      <h1 className="font-display text-heading-1 font-semibold text-primary">
        {tl(T.ovTitle, locale)}
      </h1>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={tl(T.ovCheckinsToday, locale)}
          value={String(checkinsToday)}
          sub={tl(T.ovConfirmedBookings, locale)}
        />
        <KpiCard
          label={tl(T.ovCheckoutsToday, locale)}
          value={String(checkoutsToday)}
          sub={tl(T.ovRoomsReturning, locale)}
        />
        <KpiCard label={tl(T.ovOccupancy, locale)} value={formatPercent(occupancyPct, locale)} />
        <KpiCard
          label={tl(T.ovRevenue, locale)}
          value={formatDZD(monthRevenue, locale)}
          sub={tl(T.ovRevenueSub, locale)}
          accent
        />
      </div>

      {/* Pending actions */}
      <Section
        title={tl(T.ovPendingActions, locale)}
        action={
          pendingActions.length > 0 ? (
            <span className="rounded-pill bg-accent text-text-on-primary text-caption font-semibold px-md py-xs tabular-nums">
              {pendingActions.length}
            </span>
          ) : undefined
        }
      >
        {pendingActions.length === 0 ? (
          <div className="rounded-card bg-surface shadow-card px-xl py-lg text-body-sm text-text-muted">
            {tl(T.ovNoPending, locale)}
          </div>
        ) : (
          <div className="rounded-card bg-surface shadow-card px-xl py-md flex flex-col gap-md">
            {pendingActions.map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex items-center gap-md text-body text-primary hover:text-accent transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 rounded-sm"
              >
                <span aria-hidden className="text-accent">
                  •
                </span>
                <span>{action.text}</span>
              </a>
            ))}
          </div>
        )}
      </Section>

      {/* Upcoming reservations */}
      <Section
        title={tl(T.ovUpcoming, locale)}
        action={
          <a
            href="/reservations"
            className="text-body-sm font-medium text-accent hover:text-accent-hover transition-colors duration-fast"
          >
            {tl(T.viewAll, locale)}
          </a>
        }
      >
        {upcoming.length === 0 ? (
          <EmptyState title={tl(T.ovNoUpcoming, locale)} />
        ) : (
          <div className="rounded-card bg-surface shadow-card px-xl">
            <ul>
              {upcoming.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-col gap-xs py-md border-b border-border last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-xs">
                    <span className="text-title font-semibold text-text-default">
                      {guestName.get(b.guest_id) ?? tl(T.msgGuest, locale)}
                    </span>
                    <span className="text-body-sm text-text-muted">
                      {propTitle.get(b.property_id) ?? '—'} · {formatDate(b.check_in, locale)} →{' '}
                      {formatDate(b.check_out, locale)}
                    </span>
                  </div>
                  <div className="flex items-center gap-md">
                    <Price amount={b.total_dzd} locale={locale} className="text-body font-semibold text-accent" />
                    <StatusPill
                      label={bookingStatusLabel(b.status, locale)}
                      colorClass={bookingStatusColor(b.status)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>
    </>
  );
}
