'use client';

/**
 * Language switcher for the admin top bar.
 *
 * Sets the `dyafa_locale` cookie (read server-side in layout.tsx / lib/i18n.ts)
 * and reloads so every Server Component re-renders in the chosen language +
 * direction. Kept as a small client island so AdminShell stays a Server
 * Component. Segmented control: en / ar / fr.
 */

import { SUPPORTED_LOCALES, type Locale } from '@dyafa/i18n';
import { GlobeIcon } from './icons';

const LABEL: Record<Locale, string> = { en: 'EN', ar: 'ع', fr: 'FR' };

function setLocale(next: Locale) {
  // 1 year, site-wide; SameSite=Lax is fine for a same-origin reload.
  document.cookie = `dyafa_locale=${next}; path=/; max-age=31536000; samesite=lax`;
  // Full reload so server components re-read the cookie + flip dir.
  window.location.reload();
}

export function LocaleSwitcher({ current }: { current: Locale }) {
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center gap-px rounded-pill border border-teal-700 bg-teal-900/40 p-px"
    >
      <GlobeIcon className="ms-sm h-3.5 w-3.5 text-teal-200" />
      {SUPPORTED_LOCALES.map((loc) => {
        const active = loc === current;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            aria-pressed={active}
            lang={loc}
            className={`min-w-[30px] rounded-pill px-sm py-xs text-caption font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 focus-visible:ring-offset-primary ${
              active
                ? 'bg-accent text-text-on-primary'
                : 'text-teal-200 hover:bg-teal-700/60 hover:text-text-on-primary'
            }`}
          >
            {LABEL[loc]}
          </button>
        );
      })}
    </div>
  );
}
