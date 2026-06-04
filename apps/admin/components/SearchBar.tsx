'use client';

/**
 * URL-driven search input. Submitting sets/clears the given query-param key and
 * navigates, so list pages stay server-rendered, shareable, and bookmarkable.
 */

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Locale } from '@dyafa/i18n';
import { C, tl } from '../lib/admin-i18n';
import { SearchIcon } from './icons';

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
    <form onSubmit={onSubmit} className="flex w-full items-stretch gap-sm sm:w-auto">
      <div className="relative flex-1 sm:w-72">
        <SearchIcon className="pointer-events-none absolute inset-y-0 start-md my-auto h-4 w-4 text-text-muted" />
        <input
          type="search"
          value={value}
          onChange={(ev) => setValue(ev.target.value)}
          placeholder={placeholder ?? tl(C.search, locale)}
          className="h-10 w-full rounded-md border border-border-strong bg-surface ps-9 pe-md text-body-sm text-text-default shadow-xs outline-none transition-[box-shadow,border-color] duration-fast placeholder:text-text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring/60"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-lg text-body-sm font-semibold text-text-on-primary shadow-xs transition-colors duration-fast hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        {tl(C.search, locale)}
      </button>
    </form>
  );
}
