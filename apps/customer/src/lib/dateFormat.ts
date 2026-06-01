/**
 * Lightweight date formatting (no date-fns dependency).
 *
 * Uses Intl.DateTimeFormat with the locale's CLDR base. Western Arabic (Latin)
 * digits are forced via the `-u-nu-latn` extension to match the price/number
 * convention used across the app.
 */

import type { Locale } from '@dyafa/i18n';

function bcp47(locale: Locale): string {
  return `${locale === 'ar' ? 'ar-DZ' : locale}-u-nu-latn`;
}

/** Parse a yyyy-mm-dd (or ISO) string into a local Date. */
function parse(dateStr: string): Date {
  // bookings.check_in is a `date` → 'YYYY-MM-DD'; build a local Date to avoid TZ shifts.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(dateStr);
}

/** Format a single date like "12 Jun 2026" (locale-aware, Latin digits). */
export function formatDate(dateStr: string | Date, locale: Locale): string {
  const d = typeof dateStr === 'string' ? parse(dateStr) : dateStr;
  return new Intl.DateTimeFormat(bcp47(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Format a short date (no year) like "12 Jun". */
export function formatDateShort(dateStr: string | Date, locale: Locale): string {
  const d = typeof dateStr === 'string' ? parse(dateStr) : dateStr;
  return new Intl.DateTimeFormat(bcp47(locale), {
    day: 'numeric',
    month: 'short',
  }).format(d);
}

/** Format a check-in → check-out range, collapsing the year when shared. */
export function formatRange(checkIn: string | Date, checkOut: string | Date, locale: Locale): string {
  const a = typeof checkIn === 'string' ? parse(checkIn) : checkIn;
  const b = typeof checkOut === 'string' ? parse(checkOut) : checkOut;
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = sameYear ? formatDateShort(a, locale) : formatDate(a, locale);
  const right = formatDate(b, locale);
  // Use an en-dash; LTR isolation handled by the rendering Text under RTL.
  return `${left} – ${right}`;
}

/** Format a time-of-day string "14:00" (drops seconds if present). */
export function formatTime(time: string): string {
  const m = /^(\d{2}):(\d{2})/.exec(time);
  return m ? `${m[1]}:${m[2]}` : time;
}

/** Format a timestamp (ISO) as a date for deadlines/receipts. */
export function formatDateTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(bcp47(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
