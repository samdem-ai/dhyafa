/**
 * Not-found state for a property detail page (triggered via notFound() when the
 * id doesn't resolve to a property the caller can see).
 */

import { cookies } from 'next/headers';
import { dir, type Locale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@dyafa/i18n';
import { T, tl } from '../../../../lib/dashboard-i18n';

function resolveLocale(): Locale {
  const raw = cookies().get('dyafa_locale')?.value;
  if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) return raw as Locale;
  return DEFAULT_LOCALE;
}

export default function PropertyNotFound() {
  const locale = resolveLocale();
  return (
    <div
      dir={dir(locale)}
      className="rounded-card bg-surface shadow-card px-xl py-3xl flex flex-col items-center text-center gap-md"
    >
      <span className="font-display text-heading-2 font-semibold text-primary">
        {tl(T.propTitle, locale)}
      </span>
      <p className="text-body-sm text-text-muted">{tl(T.errorBody, locale)}</p>
      <a
        href="/properties"
        className="rounded-md bg-accent text-text-on-primary text-body font-semibold px-lg py-sm hover:opacity-90 transition-opacity duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      >
        {tl(T.back, locale)}
      </a>
    </div>
  );
}
