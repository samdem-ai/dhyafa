/**
 * @dyafa/i18n — shared localization package
 *
 * Public API surface (all apps depend on these exact exports):
 *
 *   type Locale
 *   SUPPORTED_LOCALES
 *   DEFAULT_LOCALE
 *   isRTL(locale)
 *   dir(locale)
 *   createI18n(initialLocale?)
 *   formatDZD(amount, locale)
 *   formatNumber(value, locale)          ← bonus, not in contract but useful
 */

// Re-export RTL helpers & locale constants
export { type Locale, SUPPORTED_LOCALES, DEFAULT_LOCALE, isRTL, dir } from './rtl.js';

// Re-export formatting helpers
export { formatDZD, formatNumber } from './format.js';

// i18next instance factory
export { createI18n } from './createI18n.js';
