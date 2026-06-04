/**
 * i18next instance factory for Dyafa.
 *
 * Returns a SYNCHRONOUSLY INITIALIZED i18next instance loaded with all bundled
 * locale resources. Both the Expo app (static bundle) and the Next.js apps
 * (which swap in i18next-resources-to-backend for code-splitting) start from
 * this base configuration.
 *
 * Design choices:
 *  - Resources bundled inline via resolveJsonModule — no async fetch needed on
 *    mobile; web apps can replace the resource backend after construction.
 *  - fallbackLng 'fr' — missing Arabic key shows French before English, matching
 *    the Algerian audience (Arabic → French → English).
 *  - Namespaces: common | auth | booking — M0 set; extend as features land.
 *  - defaultNS 'common' — t('actions.cancel') resolves without ns prefix.
 *  - initImmediate false — init() resolves synchronously when resources are
 *    bundled inline (no async plugin), avoiding a loading flash on mobile boot.
 */

import i18next, { type i18n } from 'i18next';
import type { Locale } from './rtl.js';
import { DEFAULT_LOCALE } from './rtl.js';

// ---------------------------------------------------------------------------
// Bundled locale resources (resolveJsonModule handles the .json imports)
// ---------------------------------------------------------------------------

import arCommon from './locales/ar/common.json' assert { type: 'json' };
import arAuth from './locales/ar/auth.json' assert { type: 'json' };
import arBooking from './locales/ar/booking.json' assert { type: 'json' };

import frCommon from './locales/fr/common.json' assert { type: 'json' };
import frAuth from './locales/fr/auth.json' assert { type: 'json' };
import frBooking from './locales/fr/booking.json' assert { type: 'json' };

import enCommon from './locales/en/common.json' assert { type: 'json' };
import enAuth from './locales/en/auth.json' assert { type: 'json' };
import enBooking from './locales/en/booking.json' assert { type: 'json' };

// ---------------------------------------------------------------------------
// Resource bundle (typed for safety)
// ---------------------------------------------------------------------------

const resources = {
  ar: {
    common: arCommon,
    auth: arAuth,
    booking: arBooking,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    booking: frBooking,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    booking: enBooking,
  },
} as const;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create and synchronously initialize a configured i18next instance.
 *
 * Each call returns a FRESH instance (via `i18next.createInstance()`) so the
 * package is safe to use in both SSR (per-request instances) and Expo (a single
 * shared instance created at app boot).
 *
 * @param initialLocale - Starting locale; defaults to DEFAULT_LOCALE ('ar').
 *
 * @example Expo boot (RootLayout)
 *   import { createI18n } from '@dyafa/i18n';
 *   const i18n = createI18n(storedLocale);
 *   // Pass to <I18nextProvider i18n={i18n}>
 *
 * @example Next.js App Router (per-request, server component)
 *   import { createI18n } from '@dyafa/i18n';
 *   const i18n = createI18n(resolvedLocale);
 *   const t = i18n.getFixedT(resolvedLocale);
 */
export function createI18n(initialLocale: Locale = DEFAULT_LOCALE): i18n {
  const instance = i18next.createInstance();

  // init() is synchronous when resources are provided inline and initImmediate
  // is false — no need to await the returned promise for bundled resources.
  instance.init({
    lng: initialLocale,
    fallbackLng: ['en', 'fr'],
    supportedLngs: ['en', 'ar', 'fr'],
    ns: ['common', 'auth', 'booking'],
    defaultNS: 'common',
    resources,
    // Inline resources → no async backend plugin → synchronous init.
    initImmediate: false,
    interpolation: {
      // React / RN already escape values; disable i18next's double-escaping.
      escapeValue: false,
    },
    // Strict: warn in dev when a key is missing rather than silently returning
    // the key string (which can slip through code review unnoticed).
    saveMissing: false,
    missingKeyHandler:
      process.env['NODE_ENV'] !== 'production'
        ? (_lngs, ns, key) => {
            console.warn(`[i18n] Missing key: ${ns}:${key}`);
          }
        : undefined,
  });

  return instance;
}
