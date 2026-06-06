'use client';

/**
 * Dashboard time-range selector.
 *
 * Writes the chosen range to the `range` URL search param so the dashboard
 * Server Component can re-query the materialized views server-side (views are
 * shareable/bookmarkable). Pure UX — no data fetching here.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import type { Locale } from '@dyafa/i18n';
import { tl } from '../lib/admin-i18n';
import { RANGES, RANGE_LABEL, type RangeKey } from './range';

export function RangeSelector({ locale, current }: { locale: Locale; current: RangeKey }) {
  const router = useRouter();
  const params = useSearchParams();

  function select(range: RangeKey) {
    const next = new URLSearchParams(params.toString());
    next.set('range', range);
    router.replace(`/?${next.toString()}`);
  }

  return (
    <div
      role="group"
      className="inline-flex items-center gap-xs rounded-md border border-border bg-surface p-xs shadow-xs"
    >
      {RANGES.map((r) => {
        const active = r === current;
        return (
          <button
            key={r}
            type="button"
            onClick={() => select(r)}
            aria-pressed={active}
            className={`h-8 rounded-sm px-md text-caption font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface ${
              active
                ? 'bg-primary text-text-on-primary shadow-xs'
                : 'text-text-muted hover:bg-surface-sunken hover:text-text-default'
            }`}
          >
            {tl(RANGE_LABEL[r], locale)}
          </button>
        );
      })}
    </div>
  );
}
