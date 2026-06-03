'use client';

/**
 * Status filter + guest/code search for the reservations list. Drives the list
 * via URL search params (`?status=&q=`) so the Server Component re-queries.
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { type Locale } from '@dyafa/i18n';
import { T, tl, bookingStatusLabel } from '../../../lib/dashboard-i18n';
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
    <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
      <form onSubmit={onSearch} className="flex items-end gap-sm">
        <label className="flex flex-col gap-xs">
          <span className="text-caption font-semibold text-text-default">{tl(T.search, locale)}</span>
          <input
            type="search"
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            placeholder={tl(T.resSearch, locale)}
            className="w-64 max-w-full rounded-md border border-border-strong bg-surface px-md py-sm text-body-sm text-text-default outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-primary text-text-on-primary text-body-sm font-semibold px-lg py-sm transition-opacity duration-fast hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          {tl(T.search, locale)}
        </button>
      </form>

      <label className="flex flex-col gap-xs">
        <span className="text-caption font-semibold text-text-default">{tl(T.resStatus, locale)}</span>
        <select
          value={status || 'all'}
          onChange={(ev) => pushParams({ status: ev.target.value })}
          className="rounded-md border border-border-strong bg-surface px-md py-sm text-body-sm text-text-default outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          <option value="all">{tl(T.all, locale)}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {bookingStatusLabel(s, locale)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
