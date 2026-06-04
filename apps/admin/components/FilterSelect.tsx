'use client';

/**
 * URL-driven <select> filter. Changing the value updates the given query-param
 * and navigates; the empty option clears it. Keeps list pages server-rendered.
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDownIcon } from './icons';

export interface FilterOption {
  value: string;
  label: string;
}

export function FilterSelect({
  paramKey,
  options,
  allLabel,
  current,
}: {
  paramKey: string;
  options: readonly FilterOption[];
  /** Label for the "no filter" option. */
  allLabel: string;
  current: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(paramKey, value);
    else next.delete(paramKey);
    next.delete('page');
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="relative">
      <select
        value={current ?? ''}
        onChange={(ev) => onChange(ev.target.value)}
        className={`h-10 cursor-pointer appearance-none rounded-md border bg-surface ps-md pe-9 text-body-sm shadow-xs outline-none transition-[box-shadow,border-color] duration-fast focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring/60 ${
          current ? 'border-accent/40 text-text-default' : 'border-border-strong text-text-default'
        }`}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute inset-y-0 end-md my-auto h-4 w-4 text-text-muted" />
    </div>
  );
}
