'use client';

/**
 * URL-driven from/to date filter. Each input writes its own query-param on
 * change and navigates, keeping the list server-rendered and shareable.
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Locale } from '@dyafa/i18n';

const LABELS = {
  from: { ar: 'من', fr: 'Du', en: 'From' },
  to: { ar: 'إلى', fr: 'Au', en: 'To' },
} as const;

export function DateRangeFilter({
  locale,
  fromKey = 'from',
  toKey = 'to',
  from,
  to,
}: {
  locale: Locale;
  fromKey?: string;
  toKey?: string;
  from: string | null;
  to: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    router.replace(`${pathname}?${next.toString()}`);
  }

  const inputCls =
    'rounded-md border border-border-strong bg-surface px-md py-sm text-body-sm text-text-default outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2';

  return (
    <div className="flex items-center gap-xs">
      <label className="flex items-center gap-xs text-caption text-text-muted">
        {LABELS.from[locale]}
        <input
          type="date"
          value={from ?? ''}
          onChange={(ev) => set(fromKey, ev.target.value)}
          className={inputCls}
        />
      </label>
      <label className="flex items-center gap-xs text-caption text-text-muted">
        {LABELS.to[locale]}
        <input
          type="date"
          value={to ?? ''}
          onChange={(ev) => set(toKey, ev.target.value)}
          className={inputCls}
        />
      </label>
    </div>
  );
}
