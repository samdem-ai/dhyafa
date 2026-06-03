'use client';

/**
 * URL-driven search input. Submitting sets/clears the given query-param key and
 * navigates, so list pages stay server-rendered, shareable, and bookmarkable.
 */

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Locale } from '@dyafa/i18n';
import { C, tl } from '../lib/admin-i18n';

export function SearchBar({
  locale,
  paramKey = 'q',
  placeholder,
}: {
  locale: Locale;
  paramKey?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get(paramKey) ?? '');

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    const trimmed = value.trim();
    if (trimmed) next.set(paramKey, trimmed);
    else next.delete(paramKey);
    next.delete('page');
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex items-stretch gap-sm w-full sm:w-auto">
      <input
        type="search"
        value={value}
        onChange={(ev) => setValue(ev.target.value)}
        placeholder={placeholder ?? tl(C.search, locale)}
        className="flex-1 sm:w-72 rounded-md border border-border-strong bg-surface px-md py-sm text-body text-text-default outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      />
      <button
        type="submit"
        className="rounded-md bg-primary text-text-on-primary text-body-sm font-semibold px-lg py-sm transition-opacity duration-fast hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      >
        {tl(C.search, locale)}
      </button>
    </form>
  );
}
