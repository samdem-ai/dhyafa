/**
 * Formatting utilities for Dyafa.
 *
 * KEY DESIGN DECISIONS (from docs/07-design-system-and-i18n.md §6):
 *
 * 1. Western Arabic numerals (Latin digit system) are ALWAYS used — even for the
 *    Arabic locale. Algeria (ar-DZ) already defaults to Latin digits, but we pin
 *    `nu-latn` explicitly so behaviour is guaranteed regardless of platform/ICU version.
 *
 * 2. DZD has no everyday minor unit in v1 → maximumFractionDigits: 0.
 *
 * 3. The currency SYMBOL is post-processed: Intl outputs the ISO code "DZD"
 *    (or locale-specific forms), which we replace with "دج" (ar) or "DZD" (fr/en).
 *    This keeps digits grouped per locale while giving the correct visual symbol.
 *
 * 4. Price numerals must be wrapped in <bdi>/unicodeBidi:'isolate' at the call site
 *    to prevent currency-symbol reordering bugs under the Unicode bidi algorithm.
 *    That is the component's responsibility, not this function's.
 */

import type { Locale } from './rtl.js';

/**
 * Build an Intl.NumberFormat that forces Western Arabic (Latin) digits.
 * Pinning `nu-latn` is the safest cross-platform guarantee.
 *
 * @param locale - The UI locale ('ar' | 'fr' | 'en')
 * @param options - Extra Intl.NumberFormat options merged in
 */
function latinNumberFormat(
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  // Use the locale's CLDR base with the `u-nu-latn` extension to force Latin digits.
  // ar-DZ already defaults to Latin, but pinning makes it explicit and safe.
  const bcp47 = `${locale === 'ar' ? 'ar-DZ' : locale}-u-nu-latn`;
  return new Intl.NumberFormat(bcp47, options);
}

/**
 * Format an amount in Algerian Dinars (DZD) with:
 * - Western Arabic (Latin) digit numerals, grouped with locale-appropriate separators
 * - No decimal places
 * - "دج" suffix for Arabic, "DZD" suffix for French / English
 *
 * Examples:
 *   formatDZD(12000, 'ar') → "12 000 دج"
 *   formatDZD(12000, 'fr') → "12 000 DZD"
 *   formatDZD(12000, 'en') → "12,000 DZD"
 *
 * The returned string should be rendered inside a <bdi>/unicodeBidi:'isolate'
 * wrapper at the component level to prevent RTL reordering of the symbol.
 */
export function formatDZD(amount: number, locale: Locale): string {
  // Format as plain number (grouped, no decimals) with Latin digits.
  const formatted = latinNumberFormat(locale, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    useGrouping: true,
  }).format(amount);

  // Append the locale-appropriate currency symbol.
  const symbol = locale === 'ar' ? 'دج' : 'DZD';

  // Arabic reads RTL so the suffix is appended after a space; for LTR locales
  // the same pattern holds visually ("12 000 DZD" / "12,000 DZD").
  return `${formatted} ${symbol}`;
}

/**
 * Format a plain number with Latin digits and locale-appropriate grouping.
 * Useful for guest counts, review counts, distances, etc.
 */
export function formatNumber(value: number, locale: Locale): string {
  return latinNumberFormat(locale, {
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value);
}
