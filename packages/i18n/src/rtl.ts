/**
 * RTL helpers for Dyafa.
 *
 * Default UI locale is ENGLISH (LTR); Arabic (RTL) and French are fully supported
 * and user-selectable. RTL is applied only when the user is actually in Arabic.
 * Fallback chain: en → fr → ar.
 */

export type Locale = 'ar' | 'fr' | 'en';

// English first (default + display order in pickers); Arabic + French selectable.
export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'ar', 'fr'] as const;

export const DEFAULT_LOCALE: Locale = 'en';

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
