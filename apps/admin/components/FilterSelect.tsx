'use client';

/**
 * URL-driven <select> filter. Changing the value updates the given query-param
 * and navigates; the empty option clears it. Keeps list pages server-rendered.
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

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
    <select
      value={current ?? ''}
      onChange={(ev) => onChange(ev.target.value)}
      className="rounded-md border border-border-strong bg-surface px-md py-sm text-body-sm text-text-default outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
