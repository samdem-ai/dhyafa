/**
 * Pure calendar helpers (no React, no I/O) used by the availability board.
 * Dates are handled as `YYYY-MM-DD` strings in UTC to avoid TZ drift.
 */

import type { Locale } from '@dyafa/i18n';

export interface DayCell {
  /** YYYY-MM-DD or null for leading/trailing blanks in the grid. */
  iso: string | null;
  /** Day-of-month (1–31) when iso is present. */
  day: number | null;
  /** True when this date is before "today" (not editable). */
  isPast: boolean;
}

/** Today as a YYYY-MM-DD string (UTC). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add `n` months to a {year, month0} pair, normalizing. */
export function addMonths(
  year: number,
  month0: number,
  n: number,
): { year: number; month0: number } {
  const total = year * 12 + month0 + n;
  return { year: Math.floor(total / 12), month0: ((total % 12) + 12) % 12 };
}

/** First/last ISO date of a given month. */
export function monthRange(year: number, month0: number): { from: string; to: string } {
  const first = new Date(Date.UTC(year, month0, 1));
  const last = new Date(Date.UTC(year, month0 + 1, 0));
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

/**
 * Build a 6-row week grid for a month. Week starts on Sunday (index 0) to keep
 * the implementation locale-agnostic; weekday headers are provided separately.
 */
export function buildMonthGrid(year: number, month0: number, today: string): DayCell[] {
  const first = new Date(Date.UTC(year, month0, 1));
  const startWeekday = first.getUTCDay(); // 0=Sun
  const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();

  const cells: DayCell[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ iso: null, day: null, isPast: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(Date.UTC(year, month0, d)).toISOString().slice(0, 10);
    cells.push({ iso, day: d, isPast: iso < today });
  }
  // Pad to a multiple of 7.
  while (cells.length % 7 !== 0) cells.push({ iso: null, day: null, isPast: false });
  return cells;
}

/** Localized weekday short labels, Sunday-first (matches buildMonthGrid). */
export function weekdayLabels(locale: Locale): string[] {
  const bcp47 = locale === 'ar' ? 'ar-DZ' : locale;
  const fmt = new Intl.DateTimeFormat(bcp47, { weekday: 'short' });
  // 2023-01-01 is a Sunday.
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(Date.UTC(2023, 0, 1 + i))),
  );
}

/** Localized "Month YYYY" heading, Latin digits. */
export function monthHeading(year: number, month0: number, locale: Locale): string {
  const bcp47 = locale === 'ar' ? 'ar-DZ-u-nu-latn' : `${locale}-u-nu-latn`;
  return new Intl.DateTimeFormat(bcp47, { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(year, month0, 1)),
  );
}

/** True when `iso` falls within [from, to] inclusive (string compare is safe for ISO). */
export function isInRange(iso: string, from: string | null, to: string | null): boolean {
  if (!from) return false;
  const lo = to && to < from ? to : from;
  const hi = to && to < from ? from : to ?? from;
  return iso >= lo && iso <= hi;
}
