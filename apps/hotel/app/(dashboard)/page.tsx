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
import {
  PageHeader,
  KpiCard,
  Section,
  Card,
  EmptyState,
  StatusPill,
  Price,
  Pill,
  ViewAllLink,
} from '../../components/ui';
import {
  LoginIcon,
  LogoutIcon,
  ChartIcon,
  WalletIcon,
  BellIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  CalendarIcon,
} from '../../components/icons';
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
      <PageHeader title={tl(T.ovTitle, locale)} subtitle={tl(T.dashboardLabel, locale)} />

      {/* Hero KPI tiles */}
      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={tl(T.ovCheckinsToday, locale)}
          value={String(checkinsToday)}
          sub={tl(T.ovConfirmedBookings, locale)}
          icon={<LoginIcon size={18} />}
        />
        <KpiCard
          label={tl(T.ovCheckoutsToday, locale)}
          value={String(checkoutsToday)}
          sub={tl(T.ovRoomsReturning, locale)}
          icon={<LogoutIcon size={18} />}
        />
        <KpiCard
          label={tl(T.ovOccupancy, locale)}
          value={formatPercent(occupancyPct, locale)}
          icon={<ChartIcon size={18} />}
        />
        <KpiCard
          label={tl(T.ovRevenue, locale)}
          value={formatDZD(monthRevenue, locale)}
          sub={tl(T.ovRevenueSub, locale)}
          accent
          icon={<WalletIcon size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-2xl lg:grid-cols-5">
        {/* Pending actions */}
        <div className="lg:col-span-2">
          <Section
            title={tl(T.ovPendingActions, locale)}
            action={
              pendingActions.length > 0 ? (
                <Pill label={String(pendingActions.length)} tone="accent" />
              ) : undefined
            }
          >
            {pendingActions.length === 0 ? (
              <Card className="flex items-center gap-md">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success-bg text-success">
                  <CheckCircleIcon size={20} />
                </span>
                <span className="text-body-sm text-text-muted">{tl(T.ovNoPending, locale)}</span>
              </Card>
            ) : (
              <Card padded={false} className="divide-y divide-border">
                {pendingActions.map((action) => (
                  <a
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-md px-lg py-md transition-colors duration-fast hover:bg-surface-sunken/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-warning-bg text-warning">
                      <BellIcon size={18} />
                    </span>
                    <span className="flex-1 text-body-sm font-medium text-text-default">
                      {action.text}
                    </span>
                    <ChevronRightIcon size={16} className="text-text-muted rtl:rotate-180" />
                  </a>
                ))}
              </Card>
            )}
          </Section>
        </div>

        {/* Upcoming reservations */}
        <div className="lg:col-span-3">
          <Section
            title={tl(T.ovUpcoming, locale)}
            action={<ViewAllLink href="/reservations" label={tl(T.viewAll, locale)} />}
          >
            {upcoming.length === 0 ? (
              <EmptyState
                title={tl(T.ovNoUpcoming, locale)}
                icon={<CalendarIcon size={24} />}
              />
            ) : (
              <Card padded={false} className="divide-y divide-border">
                {upcoming.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col gap-sm px-lg py-md transition-colors duration-fast hover:bg-surface-sunken/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-md min-w-0">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-body-sm font-semibold text-primary">
                        {(guestName.get(b.guest_id) ?? 'G').charAt(0).toUpperCase()}
                      </span>
                      <div className="flex min-w-0 flex-col gap-px">
                        <span className="truncate text-body font-semibold text-text-default">
                          {guestName.get(b.guest_id) ?? tl(T.msgGuest, locale)}
                        </span>
                        <span className="truncate text-body-sm text-text-muted">
                          {propTitle.get(b.property_id) ?? '—'} · {formatDate(b.check_in, locale)} →{' '}
                          {formatDate(b.check_out, locale)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-md ps-[52px] sm:ps-0">
                      <Price
                        amount={b.total_dzd}
                        locale={locale}
                        className="text-body font-semibold text-accent-hover"
                      />
                      <StatusPill
                        label={bookingStatusLabel(b.status, locale)}
                        colorClass={bookingStatusColor(b.status)}
                      />
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
