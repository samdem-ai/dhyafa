/**
 * Server-side i18n helper for the hotel dashboard app.
 *
 * Reads the locale from the `dyafa_locale` cookie (set by the locale switcher)
 * and returns a bound translation function `t`.
 *
 * Usage in a Server Component:
 *   const { t, locale } = getI18n();
 *   return <h1>{t('host.dashboard.title')}</h1>;
 */

import { cookies } from 'next/headers';
import { createI18n, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@dyafa/i18n';
import type { Locale } from '@dyafa/i18n';

/**
 * Resolve the active locale from the request cookie.
 * Falls back to Arabic (DEFAULT_LOCALE) if the cookie is absent or invalid.
 */
export function resolveLocale(): Locale {
  const cookieStore = cookies();
  const raw = cookieStore.get('dyafa_locale')?.value;
  if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
    return raw as Locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Build a per-request i18n instance and return a bound `t` function
 * along with the resolved locale.
 *
 * Each Server Component call gets a fresh i18next instance (safe for SSR;
 * no shared mutable state across requests).
 */
export function getI18n() {
  const locale = resolveLocale();
  const i18n = createI18n(locale);
  const t = i18n.getFixedT(locale);
  return { t, locale, i18n };
}
