'use client';

/**
 * Availability board for a single room type.
 *
 * Month grid (navigable) where the host selects a date RANGE (click start, then
 * click end) and applies a bulk action via `set_availability_range`:
 *   • Close / Open the range
 *   • Set a price override (manager/owner only)
 *   • Set a min-stay
 *
 * `availability` is a map of YYYY-MM-DD → cell state, provided by the server for
 * the visible window. After a successful apply we `router.refresh()` to re-read.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDZD, type Locale } from '@dyafa/i18n';
import { T, tl } from '../../../lib/dashboard-i18n';
import {
  addMonths,
  buildMonthGrid,
  monthHeading,
  weekdayLabels,
  isInRange,
  todayIso,
} from '../../../lib/calendar';
import { setAvailabilityRange, type CalendarResult } from './actions';

export interface AvailabilityCell {
  isClosed: boolean;
  priceOverrideDzd: number | null;
  minStay: number | null;
}

export interface CalendarBoardProps {
  locale: Locale;
  canManage: boolean;
  roomTypeId: string;
  basePriceDzd: number;
  /** YYYY-MM-DD → cell state (only dates with an availability row are present). */
  availability: Record<string, AvailabilityCell>;
  initialYear: number;
  initialMonth0: number;
}

function errorMessage(result: Extract<CalendarResult, { ok: false }>, locale: Locale): string {
  switch (result.code) {
    case 'forbidden_price':
      return tl(T.readOnlyNotice, locale);
    case 'not_authorized':
      return tl(T.accessDenied, locale);
    case 'invalid_input':
      return tl(T.calRangeRequired, locale);
    default:
      return `${tl(T.errorTitle, locale)}${result.message ? ` — ${result.message}` : ''}`;
  }
}

export function CalendarBoard({
  locale,
  canManage,
  roomTypeId,
  basePriceDzd,
  availability,
  initialYear,
  initialMonth0,
}: CalendarBoardProps) {
  const router = useRouter();
  const today = todayIso();

  const [{ year, month0 }, setMonth] = useState({ year: initialYear, month0: initialMonth0 });
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  const [priceOverride, setPriceOverride] = useState('');
  const [minStay, setMinStay] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);
  const grid = useMemo(() => buildMonthGrid(year, month0, today), [year, month0, today]);

  function onDayClick(iso: string) {
    setNotice(null);
    setError(null);
    if (!rangeStart || (rangeStart && rangeEnd)) {
      // start a new selection
      setRangeStart(iso);
      setRangeEnd(null);
    } else {
      // complete the selection (normalize order)
      if (iso < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(iso);
      } else {
        setRangeEnd(iso);
      }
    }
  }

  function gotoMonth(delta: number) {
    setMonth((m) => addMonths(m.year, m.month0, delta));
  }

  const from = rangeStart;
  const to = rangeEnd ?? rangeStart;

  async function apply(isClosed: boolean) {
    if (!from || !to) {
      setError(tl(T.calRangeRequired, locale));
      return;
    }
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const result = await setAvailabilityRange({
        roomTypeId,
        from,
        to,
        isClosed,
        priceOverrideDzd:
          priceOverride.trim() === '' ? null : Number(priceOverride),
        minStay: minStay.trim() === '' ? null : Number(minStay),
      });
      if (result.ok) {
        setNotice(tl(T.calApplied, locale).replace('{n}', String(result.updated)));
        setRangeStart(null);
        setRangeEnd(null);
        setPriceOverride('');
        setMinStay('');
        router.refresh();
      } else {
        setError(errorMessage(result, locale));
        if (result.code === 'not_authorized') router.replace('/sign-in?next=/calendar');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-xl lg:grid-cols-[1fr_320px]">
      {/* Month grid */}
      <div className="rounded-card bg-surface shadow-card p-lg">
        <div className="flex items-center justify-between mb-md">
          <button
            type="button"
            onClick={() => gotoMonth(-1)}
            aria-label={tl(T.calPrevMonth, locale)}
            className="rounded-md border border-border-strong px-md py-xs text-body-sm text-text-default hover:bg-bone-300 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          >
            <span className="rtl:hidden" aria-hidden>←</span>
            <span className="hidden rtl:inline" aria-hidden>→</span>
          </button>
          <span className="font-display text-heading-3 font-semibold text-primary">
            {monthHeading(year, month0, locale)}
          </span>
          <button
            type="button"
            onClick={() => gotoMonth(1)}
            aria-label={tl(T.calNextMonth, locale)}
            className="rounded-md border border-border-strong px-md py-xs text-body-sm text-text-default hover:bg-bone-300 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          >
            <span className="rtl:hidden" aria-hidden>→</span>
            <span className="hidden rtl:inline" aria-hidden>←</span>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-xs">
          {weekdays.map((w, i) => (
            <div
              key={`${w}-${i}`}
              className="text-center text-caption font-semibold text-text-muted py-xs"
            >
              {w}
            </div>
          ))}
          {grid.map((cell, i) => {
            if (!cell.iso) return <div key={`blank-${i}`} />;
            const state = availability[cell.iso];
            const closed = state?.isClosed ?? false;
            const override = state?.priceOverrideDzd ?? null;
            const selected = isInRange(cell.iso, from, rangeEnd ?? rangeStart);
            const disabled = cell.isPast;

            const base =
              'relative flex flex-col items-center justify-center rounded-md py-sm min-h-[3rem] text-body-sm transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1';
            const tone = disabled
              ? 'bg-surface-sunken/50 text-text-muted cursor-not-allowed'
              : selected
                ? 'bg-accent text-text-on-primary'
                : closed
                  ? 'bg-error-bg text-error'
                  : 'bg-surface-sunken text-text-default hover:bg-bone-300';

            return (
              <button
                key={cell.iso}
                type="button"
                disabled={disabled}
                onClick={() => onDayClick(cell.iso!)}
                aria-pressed={selected}
                className={`${base} ${tone}`}
              >
                <span className="tabular-nums font-medium">{cell.day}</span>
                {override != null && !selected && (
                  <span className="text-overline tabular-nums text-accent">
                    {override.toLocaleString('en-US')}
                  </span>
                )}
                {override != null && (
                  <span
                    aria-hidden
                    className="absolute top-px end-px h-1.5 w-1.5 rounded-full bg-accent"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-md mt-md text-caption text-text-muted">
          <span className="flex items-center gap-xs">
            <span className="h-3 w-3 rounded-sm bg-surface-sunken border border-border" />
            {tl(T.calLegendOpen, locale)}
          </span>
          <span className="flex items-center gap-xs">
            <span className="h-3 w-3 rounded-sm bg-error-bg border border-error/30" />
            {tl(T.calLegendClosed, locale)}
          </span>
          <span className="flex items-center gap-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {tl(T.calLegendOverride, locale)}
          </span>
        </div>
      </div>

      {/* Apply panel */}
      <div className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-md h-fit lg:sticky lg:top-lg">
        <h3 className="font-display text-heading-3 font-semibold text-primary">
          {tl(T.calApply, locale)}
        </h3>

        <div className="rounded-md bg-surface-sunken px-md py-sm text-body-sm">
          <div className="flex justify-between gap-sm">
            <span className="text-text-muted">{tl(T.calRangeFrom, locale)}</span>
            <span className="tabular-nums text-text-default" dir="ltr">
              {from ?? '—'}
            </span>
          </div>
          <div className="flex justify-between gap-sm">
            <span className="text-text-muted">{tl(T.calRangeTo, locale)}</span>
            <span className="tabular-nums text-text-default" dir="ltr">
              {to ?? '—'}
            </span>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-md bg-error-bg text-error text-body-sm px-md py-sm">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-md bg-success-bg text-success text-body-sm px-md py-sm">
            {notice}
          </div>
        )}

        {canManage && (
          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">
              {tl(T.calPriceOverride, locale)}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              dir="ltr"
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)}
              placeholder={formatDZD(basePriceDzd, locale)}
              className="rounded-md border border-border-strong bg-surface px-md py-sm text-body-sm text-text-default tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            />
          </label>
        )}

        <label className="flex flex-col gap-xs">
          <span className="text-caption font-semibold text-text-default">
            {tl(T.calMinStay, locale)}
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            step={1}
            dir="ltr"
            value={minStay}
            onChange={(e) => setMinStay(e.target.value)}
            className="rounded-md border border-border-strong bg-surface px-md py-sm text-body-sm text-text-default tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          />
        </label>

        <div className="flex flex-col gap-sm pt-xs">
          <button
            type="button"
            onClick={() => apply(true)}
            disabled={pending || !from}
            className="rounded-md border border-error/40 text-error text-body font-semibold px-lg py-sm transition-colors duration-fast hover:bg-error-bg disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          >
            {pending ? tl(T.calApplying, locale) : tl(T.calClose, locale)}
          </button>
          <button
            type="button"
            onClick={() => apply(false)}
            disabled={pending || !from}
            className="rounded-md bg-accent text-text-on-primary text-body font-semibold px-lg py-sm transition-opacity duration-fast hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          >
            {pending ? tl(T.calApplying, locale) : tl(T.calOpen, locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
