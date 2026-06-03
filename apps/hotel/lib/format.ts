/**
 * Small formatting helpers specific to the hotel dashboard, complementing
 * `@dyafa/i18n`'s `formatDZD` / `formatNumber`. All numbers use Latin digits.
 */

import type { Locale } from '@dyafa/i18n';

function bcp47(locale: Locale): string {
  return locale === 'ar' ? 'ar-DZ-u-nu-latn' : `${locale}-u-nu-latn`;
}

/** Format a 0–100 percentage (rounded) with a trailing `%`, Latin digits. */
export function formatPercent(value: number, locale: Locale, fractionDigits = 0): string {
  const n = new Intl.NumberFormat(bcp47(locale), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
  return `${n}%`;
}

/**
 * Best-effort rendering of a `room_types.bed_config` JSON value into a short,
 * localized summary. The column is free-form JSON; we handle the common shapes
 * (object of bedType→count, or array of {type,count}) and otherwise return null.
 */
export function describeBedConfig(
  bedConfig: unknown,
  locale: Locale,
): string | null {
  const bedLabels: Record<string, Record<Locale, string>> = {
    king: { ar: 'سرير كبير', fr: 'lit king', en: 'king bed' },
    queen: { ar: 'سرير مزدوج كبير', fr: 'lit queen', en: 'queen bed' },
    double: { ar: 'سرير مزدوج', fr: 'lit double', en: 'double bed' },
    single: { ar: 'سرير مفرد', fr: 'lit simple', en: 'single bed' },
    twin: { ar: 'سريران مفردان', fr: 'lits jumeaux', en: 'twin beds' },
    sofa: { ar: 'أريكة سرير', fr: 'canapé-lit', en: 'sofa bed' },
    bunk: { ar: 'سرير بطابقين', fr: 'lits superposés', en: 'bunk bed' },
  };

  const labelFor = (key: string, count: number): string => {
    const entry = bedLabels[key.toLowerCase()];
    const name = entry ? entry[locale] : key;
    return count > 1 ? `${count} × ${name}` : name;
  };

  const parts: string[] = [];

  if (Array.isArray(bedConfig)) {
    for (const item of bedConfig) {
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const type = typeof rec.type === 'string' ? rec.type : null;
        const count = typeof rec.count === 'number' ? rec.count : 1;
        if (type) parts.push(labelFor(type, count));
      }
    }
  } else if (bedConfig && typeof bedConfig === 'object') {
    for (const [key, raw] of Object.entries(bedConfig as Record<string, unknown>)) {
      const count = typeof raw === 'number' ? raw : 1;
      if (count > 0) parts.push(labelFor(key, count));
    }
  }

  return parts.length > 0 ? parts.join('، ') : null;
}

/** Render an integer rating average to one decimal (e.g. 4.7), Latin digits. */
export function formatRating(value: number, locale: Locale): string {
  return new Intl.NumberFormat(bcp47(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}
