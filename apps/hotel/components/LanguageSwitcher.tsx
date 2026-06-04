'use client';

/**
 * Language switcher — sets the `dyafa_locale` cookie (en / ar / fr) and reloads
 * so Server Components re-render in the chosen locale + direction.
 *
 * Pure UX affordance; no auth state. A lightweight popover toggled by a button
 * (closes on outside click / Escape). Keeps keyboard focus visible.
 */

import { useEffect, useRef, useState } from 'react';
import { type Locale, SUPPORTED_LOCALES } from '@dyafa/i18n';
import { GlobeIcon, ChevronDownIcon } from './icons';

const LABELS: Record<Locale, { native: string; en: string }> = {
  en: { native: 'English', en: 'English' },
  ar: { native: 'العربية', en: 'Arabic' },
  fr: { native: 'Français', en: 'French' },
};

const ORDER: Locale[] = ['en', 'ar', 'fr'].filter((l): l is Locale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(l),
) as Locale[];

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function choose(next: Locale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    // 1 year, root path, lax — same cookie the server reads in resolveLocale().
    document.cookie = `dyafa_locale=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change language"
        className="inline-flex items-center gap-xs rounded-md border border-border bg-surface px-md h-9 text-body-sm font-semibold text-text-default transition-colors duration-fast hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1"
      >
        <GlobeIcon size={17} className="text-text-muted" />
        <span className="uppercase">{locale}</span>
        <ChevronDownIcon size={14} className={`text-text-muted transition-transform duration-fast ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 mt-xs z-dropdown w-44 rounded-card border border-border bg-surface p-xs shadow-raised"
        >
          {ORDER.map((l) => {
            const active = l === locale;
            return (
              <button
                key={l}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(l)}
                className={`flex w-full items-center justify-between gap-md rounded-md px-md py-sm text-body-sm transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  active
                    ? 'bg-accent/12 text-accent-hover font-semibold'
                    : 'text-text-default hover:bg-surface-sunken'
                }`}
              >
                <span>{LABELS[l].native}</span>
                <span className="text-overline uppercase text-text-muted">{l}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
