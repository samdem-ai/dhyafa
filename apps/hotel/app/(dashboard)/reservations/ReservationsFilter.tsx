'use client';

/**
 * Status filter + guest/code search for the reservations list. Drives the list
 * via URL search params (`?status=&q=`) so the Server Component re-queries.
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { type Locale } from '@dyafa/i18n';
import { T, tl, bookingStatusLabel } from '../../../lib/dashboard-i18n';
import { inputClass, selectClass, buttonClass } from '../../../components/ui';
import { SearchIcon, ChevronDownIcon } from '../../../components/icons';
import type { Database } from '@dyafa/api-client';

type BookingStatus = Database['public']['Enums']['booking_status'];

const STATUS_OPTIONS: readonly BookingStatus[] = [
  'requested',
  'awaiting_payment',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'declined',
  'no_show',
  'expired',
] as const;

export function ReservationsFilter({
  locale,
  status,
  query,
}: {
  locale: Locale;
  status: string;
  query: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(query);

  function pushParams(next: { status?: string; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextStatus = next.status ?? status;
    const nextQ = next.q ?? q;
    if (nextStatus && nextStatus !== 'all') params.set('status', nextStatus);
    else params.delete('status');
    if (nextQ.trim()) params.set('q', nextQ.trim());
    else params.delete('q');
    router.replace(`${pathname}?${params.toString()}`);
  }

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    pushParams({ q });
  }

  return (
    <div className="card-surface flex flex-col gap-md p-md sm:flex-row sm:items-center sm:justify-between">
      <form onSubmit={onSearch} className="flex items-center gap-sm">
        <div className="relative flex-1 sm:w-72">
          <span className="pointer-events-none absolute inset-y-0 start-0 grid w-10 place-items-center text-text-muted">
            <SearchIcon size={18} />
          </span>
          <input
            type="search"
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            placeholder={tl(T.resSearch, locale)}
            aria-label={tl(T.search, locale)}
            className={`${inputClass} ps-10`}
          />
        </div>
        <button type="submit" className={buttonClass('primary', 'md')}>
          {tl(T.search, locale)}
        </button>
      </form>

      <label className="flex items-center gap-sm">
        <span className="text-caption font-semibold text-text-muted whitespace-nowrap">
          {tl(T.resStatus, locale)}
        </span>
        <div className="relative">
          <select
            value={status || 'all'}
            onChange={(ev) => pushParams({ status: ev.target.value })}
            className={`${selectClass} sm:w-48`}
          >
            <option value="all">{tl(T.all, locale)}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {bookingStatusLabel(s, locale)}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            size={16}
            className="pointer-events-none absolute inset-y-0 end-3 my-auto text-text-muted"
          />
        </div>
      </label>
    </div>
  );
}
