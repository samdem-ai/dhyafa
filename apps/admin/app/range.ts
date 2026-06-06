/**
 * Dashboard time-range helpers — PURE module (no 'use client').
 *
 * Safe to import from both the Server Component (app/page.tsx) and the client
 * RangeSelector. Keeping these out of the 'use client' file is required: a
 * non-component export imported from a client module into a Server Component
 * becomes a client *reference* (not the real function) and throws at runtime
 * ("isRangeKey is not a function").
 */

import type { L10n } from '../lib/admin-i18n';

export const RANGES = ['7d', '30d', '90d', 'qtr'] as const;
export type RangeKey = (typeof RANGES)[number];

export const RANGE_LABEL: Record<RangeKey, L10n> = {
  '7d': { ar: '٧ أيام', fr: '7 j', en: '7d' },
  '30d': { ar: '٣٠ يوم', fr: '30 j', en: '30d' },
  '90d': { ar: '٩٠ يوم', fr: '90 j', en: '90d' },
  qtr: { ar: 'الربع', fr: 'Trimestre', en: 'Quarter' },
};

/** Map a range key to a number of days (used by the page query). */
export function rangeDays(range: RangeKey): number {
  switch (range) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case 'qtr':
      return 90;
  }
}

export function isRangeKey(v: string | null | undefined): v is RangeKey {
  return v === '7d' || v === '30d' || v === '90d' || v === 'qtr';
}
