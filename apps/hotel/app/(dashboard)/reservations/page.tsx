/**
 * Reservations — filterable / searchable list with row actions.
 *
 * Server Component (RLS-scoped). Filters via `?status=` and search via `?q=`
 * (guest name OR booking code). Each row shows guest, property/room, dates,
 * guests, total, status, special requests, and the appropriate actions.
 */

import { requireHost, canManage } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { createUserClient } from '../../../lib/supabase/userServer';
import { formatNumber } from '@dyafa/i18n';
import {
  T,
  tl,
  formatDate,
  localizedField,
  bookingStatusLabel,
  bookingStatusColor,
} from '../../../lib/dashboard-i18n';
import { PageHeader, EmptyState, ErrorState, StatusPill, Price } from '../../../components/ui';
import { ReservationsFilter } from './ReservationsFilter';
import { ReservationActions } from './ReservationActions';
import type { Database } from '@dyafa/api-client';

export const dynamic = 'force-dynamic';

type BookingStatus = Database['public']['Enums']['booking_status'];

interface BookingRow {
  id: string;
  code: string;
  status: BookingStatus;
  check_in: string;
  check_out: string;
  nights: number | null;
  adults: number;
  children: number;
  units: number;
  total_dzd: number;
  special_requests: string | null;
  guest_id: string;
  property_id: string;
  room_type_id: string;
}

const VALID_STATUSES = new Set<BookingStatus>([
  'requested',
  'declined',
  'awaiting_payment',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
  'expired',
]);

function narrowStatus(status: BookingRow['status']): 'requested' | 'confirmed' | 'checked_in' | 'awaiting_payment' | 'other' {
  if (
    status === 'requested' ||
    status === 'confirmed' ||
    status === 'checked_in' ||
    status === 'awaiting_payment'
  ) {
    return status;
  }
  return 'other';
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const session = await requireHost('/reservations');
  const locale = resolveLocale();
  const supabase = createUserClient(session.accessToken);
  const manage = canManage(session);

  const statusParam = searchParams.status ?? '';
  const q = (searchParams.q ?? '').trim();

  let queryBuilder = supabase
    .from('bookings')
    .select(
      'id, code, status, check_in, check_out, nights, adults, children, units, total_dzd, special_requests, guest_id, property_id, room_type_id',
    )
    .order('check_in', { ascending: false })
    .limit(100);

  if (statusParam && VALID_STATUSES.has(statusParam as BookingStatus)) {
    queryBuilder = queryBuilder.eq('status', statusParam as BookingStatus);
  }
  // Code search is exact-ish (case-insensitive prefix). Guest-name search is
  // resolved client-side after we have profiles (RLS-safe).
  if (q) {
    queryBuilder = queryBuilder.ilike('code', `%${q}%`);
  }

  const { data, error } = await queryBuilder;
  let rows = (data ?? []) as BookingRow[];

  // Resolve guest names + property/room titles.
  const guestIds = Array.from(new Set(rows.map((b) => b.guest_id)));
  const propIds = Array.from(new Set(rows.map((b) => b.property_id)));
  const roomIds = Array.from(new Set(rows.map((b) => b.room_type_id)));

  const [guestsRes, propsRes, roomsRes] = await Promise.all([
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
    roomIds.length
      ? supabase.from('room_types').select('id, name_ar, name_fr, name_en').in('id', roomIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            name_ar: string | null;
            name_fr: string | null;
            name_en: string | null;
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
      localizedField({ ar: r.name_ar, fr: r.name_fr, en: r.name_en }, locale) ?? '',
    ]),
  );

  // If searching, also match guest names (the code-only DB filter above may have
  // excluded name matches; refine here for the rows we already see).
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (b) =>
        b.code.toLowerCase().includes(needle) ||
        (guestName.get(b.guest_id) ?? '').toLowerCase().includes(needle),
    );
  }

  return (
    <>
      <PageHeader title={tl(T.resTitle, locale)} subtitle={tl(T.resSubtitle, locale)} />

      <ReservationsFilter locale={locale} status={statusParam} query={q} />

      {error && <ErrorState title={tl(T.errorTitle, locale)} message={error.message} />}

      {!error && rows.length === 0 && (
        <EmptyState title={tl(T.resTitle, locale)} body={tl(T.resEmpty, locale)} />
      )}

      {!error && rows.length > 0 && (
        <ul className="flex flex-col gap-md">
          {rows.map((b) => {
            const guest = guestName.get(b.guest_id) ?? tl(T.msgGuest, locale);
            const prop = propTitle.get(b.property_id) ?? '—';
            const room = roomName.get(b.room_type_id) ?? '';
            const narrowed = narrowStatus(b.status);
            const showActions =
              narrowed === 'requested' ||
              (manage &&
                (narrowed === 'confirmed' ||
                  narrowed === 'checked_in' ||
                  narrowed === 'awaiting_payment'));

            return (
              <li key={b.id} className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-md">
                <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-xs">
                    <div className="flex items-center gap-sm flex-wrap">
                      <span className="text-title font-semibold text-text-default">{guest}</span>
                      <span className="text-caption text-text-muted font-mono" dir="ltr">
                        {b.code}
                      </span>
                    </div>
                    <span className="text-body-sm text-text-muted">
                      {prop}
                      {room ? ` · ${room}` : ''}
                    </span>
                    <span className="text-body-sm text-text-muted">
                      {formatDate(b.check_in, locale)} → {formatDate(b.check_out, locale)}
                      {b.nights != null ? ` · ${formatNumber(b.nights, locale)} ${tl(T.resNights, locale)}` : ''}
                      {' · '}
                      {formatNumber(b.adults, locale)} {tl(T.resAdults, locale)}
                      {b.children > 0
                        ? ` · ${formatNumber(b.children, locale)} ${tl(T.resChildren, locale)}`
                        : ''}
                    </span>
                  </div>
                  <div className="flex flex-col items-start gap-sm sm:items-end">
                    <Price amount={b.total_dzd} locale={locale} className="text-body-lg font-semibold text-accent" />
                    <StatusPill
                      label={bookingStatusLabel(b.status, locale)}
                      colorClass={bookingStatusColor(b.status)}
                    />
                  </div>
                </div>

                {b.special_requests && (
                  <div className="rounded-md bg-surface-sunken px-md py-sm">
                    <span className="text-caption font-semibold text-text-muted">
                      {tl(T.resSpecialRequests, locale)}
                    </span>
                    <p className="text-body-sm text-text-default whitespace-pre-line mt-xs">
                      {b.special_requests}
                    </p>
                  </div>
                )}

                {showActions && (
                  <ReservationActions
                    bookingId={b.id}
                    status={narrowed}
                    canManage={manage}
                    locale={locale}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
