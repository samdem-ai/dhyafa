/**
 * RTL helpers for Dyafa.
 *
 * Arabic is the PRIMARY locale and the design default — RTL is not an afterthought.
 * Fallback chain: ar → fr → en (matches the Algerian audience).
 */

export type Locale = 'ar' | 'fr' | 'en';

export const SUPPORTED_LOCALES: readonly Locale[] = ['ar', 'fr', 'en'] as const;

export const DEFAULT_LOCALE: Locale = 'ar';

/**
 * Returns true only for Arabic — the single RTL locale in this app.
 * Used by Expo callers to drive I18nManager.forceRTL and by web to set dir="rtl".
 */
export function isRTL(locale: Locale): boolean {
  return locale === 'ar';
}

/**
 * Returns the CSS / HTML `dir` attribute value for the given locale.
 * Use on <html dir={dir(locale)}> (web) and as a data prop for direction-aware
 * Tailwind logical utilities.
 */
export function dir(locale: Locale): 'rtl' | 'ltr' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}
