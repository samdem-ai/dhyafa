'use client';

/**
 * Route-level error boundary for dashboard pages. Client Component (required by
 * Next.js). Resolves locale from the cookie for localized copy.
 */

import { useEffect } from 'react';
import { dir, type Locale, DEFAULT_LOCALE } from '@dyafa/i18n';
import { T, tl } from '../../lib/dashboard-i18n';

function resolveLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const m = document.cookie.match(/(?:^|;\s*)dyafa_locale=([^;]+)/);
  const raw = m?.[1];
  if (raw === 'ar' || raw === 'fr' || raw === 'en') return raw;
  return DEFAULT_LOCALE;
}

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = resolveLocaleFromCookie();

  useEffect(() => {
    // Surface to the console for diagnostics (no PII).
    console.error('Dashboard route error:', error.message);
  }, [error]);

  return (
    <div dir={dir(locale)} className="rounded-card bg-surface shadow-card p-xl flex flex-col items-center gap-md text-center">
      <h2 className="font-display text-heading-2 font-semibold text-primary">
        {tl(T.errorTitle, locale)}
      </h2>
      <p className="text-body-sm text-text-muted max-w-md">{tl(T.errorBody, locale)}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-accent text-text-on-primary text-body font-semibold px-lg py-sm transition-opacity duration-fast hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      >
        {tl(T.retry, locale)}
      </button>
    </div>
  );
}
