/**
 * Calendar & pricing.
 *
 * Server Component (RLS-scoped). Lets the host pick one of their room types,
 * shows a month grid of availability (with price overrides), and a bulk apply
 * panel (CalendarBoard, client) calling set_availability_range. Below the grid,
 * the room's rate plans (base/weekend/seasonal/long-stay) are listed read-only.
 */

import { requireHost, canManage } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { createUserClient } from '../../../lib/supabase/userServer';
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import {
  T,
  tl,
  localizedField,
  ratePlanKindLabel,
  formatDate,
} from '../../../lib/dashboard-i18n';
import { PageHeader, Section, EmptyState, Card, TableCard, THead, Th, Td } from '../../../components/ui';
import { CalendarIcon } from '../../../components/icons';
import { CalendarBoard, type AvailabilityCell } from './CalendarBoard';
import { monthRange, addMonths } from '../../../lib/calendar';
import type { Database } from '@dyafa/api-client';

export const dynamic = 'force-dynamic';

interface RoomTypeOption {
  id: string;
  property_id: string;
  name_ar: string | null;
  name_fr: string | null;
  name_en: string | null;
  base_price_dzd: number;
  properties: { title_ar: string | null; title_fr: string | null; title_en: string | null } | null;
}

interface AvailabilityRow {
  date: string;
  is_closed: boolean;
  price_override_dzd: number | null;
  min_stay: number | null;
}

interface RatePlanRow {
  id: string;
  kind: Database['public']['Enums']['rate_plan_kind'];
  label: string | null;
  price_dzd: number | null;
  adjust_type: Database['public']['Enums']['rate_adjust_type'] | null;
  adjust_value_dzd: number | null;
  date_start: string | null;
  date_end: string | null;
  weekday_mask: number | null;
  priority: number;
  is_active: boolean;
}

/** Decode a 7-bit weekday mask (bit 0 = Sunday) into short labels. */
function weekdayMaskLabels(mask: number | null, locale: Locale): string | null {
  if (mask == null || mask === 0) return null;
  const bcp47 = locale === 'ar' ? 'ar-DZ' : locale;
  const fmt = new Intl.DateTimeFormat(bcp47, { weekday: 'short' });
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    if (mask & (1 << i)) labels.push(fmt.format(new Date(Date.UTC(2023, 0, 1 + i))));
  }
  return labels.length ? labels.join('، ') : null;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { room?: string };
}) {
  const session = await requireHost('/calendar');
  const locale = resolveLocale();
  const supabase = createUserClient(session.accessToken);
  const manage = canManage(session);

  // Load room types (with their property title) the caller can manage.
  const { data: roomData } = await supabase
    .from('room_types')
    .select(
      `id, property_id, name_ar, name_fr, name_en, base_price_dzd,
       properties ( title_ar, title_fr, title_en )`,
    )
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  const rooms = (roomData ?? []) as unknown as RoomTypeOption[];

  if (rooms.length === 0) {
    return (
      <>
        <PageHeader title={tl(T.calTitle, locale)} subtitle={tl(T.calSubtitle, locale)} />
        <EmptyState
          title={tl(T.calTitle, locale)}
          body={tl(T.calNoRoomTypes, locale)}
          icon={<CalendarIcon size={24} />}
        />
      </>
    );
  }

  const selectedId =
    searchParams.room && rooms.some((r) => r.id === searchParams.room)
      ? searchParams.room
      : rooms[0]!.id;
  const selected = rooms.find((r) => r.id === selectedId)!;

  // Availability window: current month through +3 months (covers the board nav).
  const now = new Date();
  const startYear = now.getUTCFullYear();
  const startMonth0 = now.getUTCMonth();
  const { from: windowFrom } = monthRange(startYear, startMonth0);
  const end = addMonths(startYear, startMonth0, 4);
  const { to: windowTo } = monthRange(end.year, end.month0);

  const [availRes, rateRes] = await Promise.all([
    supabase
      .from('availability')
      .select('date, is_closed, price_override_dzd, min_stay')
      .eq('room_type_id', selectedId)
      .gte('date', windowFrom)
      .lte('date', windowTo),
    supabase
      .from('rate_plans')
      .select(
        'id, kind, label, price_dzd, adjust_type, adjust_value_dzd, date_start, date_end, weekday_mask, priority, is_active',
      )
      .eq('room_type_id', selectedId)
      .order('priority', { ascending: false }),
  ]);

  const availability: Record<string, AvailabilityCell> = {};
  for (const row of (availRes.data ?? []) as AvailabilityRow[]) {
    availability[row.date] = {
      isClosed: row.is_closed,
      priceOverrideDzd: row.price_override_dzd,
      minStay: row.min_stay,
    };
  }

  const ratePlans = (rateRes.data ?? []) as RatePlanRow[];

  const roomLabel = (r: RoomTypeOption): string => {
    const room = localizedField({ ar: r.name_ar, fr: r.name_fr, en: r.name_en }, locale);
    const prop = localizedField(
      {
        ar: r.properties?.title_ar ?? null,
        fr: r.properties?.title_fr ?? null,
        en: r.properties?.title_en ?? null,
      },
      locale,
    );
    return [prop, room].filter(Boolean).join(' · ') || (room ?? '—');
  };

  return (
    <>
      <PageHeader title={tl(T.calTitle, locale)} subtitle={tl(T.calSubtitle, locale)} />

      {/* Room-type picker — links keep it server-driven (no client state needed) */}
      <Card className="flex flex-col gap-sm">
        <span className="text-overline font-semibold uppercase tracking-wider text-text-muted">
          {tl(T.calPickRoomType, locale)}
        </span>
        <div className="flex flex-wrap gap-sm">
          {rooms.map((r) => {
            const active = r.id === selectedId;
            return (
              <a
                key={r.id}
                href={`/calendar?room=${r.id}`}
                aria-current={active ? 'true' : undefined}
                className={`rounded-pill px-lg py-xs text-body-sm font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ${
                  active
                    ? 'bg-primary text-text-on-primary'
                    : 'border border-border text-text-default hover:border-border-strong hover:bg-surface-sunken'
                }`}
              >
                {roomLabel(r)}
              </a>
            );
          })}
        </div>
      </Card>

      <CalendarBoard
        locale={locale}
        canManage={manage}
        roomTypeId={selected.id}
        basePriceDzd={selected.base_price_dzd}
        availability={availability}
        initialYear={startYear}
        initialMonth0={startMonth0}
      />

      {/* Rate plans (read-only summary) */}
      <Section title={tl(T.calRatePlans, locale)}>
        <p className="text-body-sm text-text-muted">{tl(T.calRatePlansHint, locale)}</p>
        {ratePlans.length === 0 ? (
          <div className="rounded-card bg-surface shadow-card px-lg py-md text-body-sm text-text-muted">
            {tl(T.calNoRatePlans, locale)}
          </div>
        ) : (
          <div className="rounded-card bg-surface shadow-card overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-border text-caption font-semibold uppercase tracking-wide text-text-muted">
                  <th className="text-start px-lg py-md font-semibold">{tl(T.calKind, locale)}</th>
                  <th className="text-start px-lg py-md font-semibold">{tl(T.calLabel, locale)}</th>
                  <th className="text-start px-lg py-md font-semibold">{tl(T.calPrice, locale)}</th>
                  <th className="text-start px-lg py-md font-semibold">{tl(T.calWeekdays, locale)}</th>
                  <th className="text-start px-lg py-md font-semibold">{tl(T.calDates, locale)}</th>
                  <th className="text-end px-lg py-md font-semibold">{tl(T.calPriority, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {ratePlans.map((rp) => {
                  const weekdays = weekdayMaskLabels(rp.weekday_mask, locale);
                  const dates =
                    rp.date_start || rp.date_end
                      ? `${formatDate(rp.date_start, locale)} → ${formatDate(rp.date_end, locale)}`
                      : '—';
                  const priceLabel =
                    rp.price_dzd != null
                      ? formatDZD(rp.price_dzd, locale)
                      : rp.adjust_value_dzd != null
                        ? rp.adjust_type === 'percent'
                          ? `${rp.adjust_value_dzd > 0 ? '+' : ''}${rp.adjust_value_dzd}%`
                          : `${rp.adjust_value_dzd > 0 ? '+' : ''}${formatDZD(rp.adjust_value_dzd, locale)}`
                        : '—';
                  return (
                    <tr
                      key={rp.id}
                      className={`border-b border-border last:border-0 ${
                        rp.is_active ? '' : 'opacity-50'
                      }`}
                    >
                      <td className="px-lg py-md text-text-default font-medium">
                        {ratePlanKindLabel(rp.kind, locale)}
                      </td>
                      <td className="px-lg py-md text-text-muted">{rp.label ?? '—'}</td>
                      <td className="px-lg py-md text-accent font-semibold">
                        <bdi className="tabular-nums">{priceLabel}</bdi>
                      </td>
                      <td className="px-lg py-md text-text-muted">{weekdays ?? '—'}</td>
                      <td className="px-lg py-md text-text-muted tabular-nums">{dates}</td>
                      <td className="px-lg py-md text-end text-text-muted tabular-nums">
                        {formatNumber(rp.priority, locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
