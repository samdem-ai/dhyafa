/**
 * i18n bootstrap for the customer Expo app.
 *
 * - Detects device locale via expo-localization, falls back to DEFAULT_LOCALE ('en').
 * - Persists the user's language choice in expo-secure-store (key: 'app.language').
 * - setLocale() applies forceRTL and triggers an app reload so RN picks up the
 *   new layout direction (RTL requires a native restart to take effect).
 *
 * USAGE
 *   // In app/_layout.tsx, before first render:
 *   import { i18nInstance } from '@/lib/i18n';
 *   // wrap tree with <I18nextProvider i18n={i18nInstance}>
 *
 *   // To change language (e.g. from the language picker):
 *   import { setLocale } from '@/lib/i18n';
 *   await setLocale('ar');  // persists, forces RTL, reloads
 */

import { createI18n, isRTL, DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@dyafa/i18n';
import * as SecureStore from 'expo-secure-store';
import { I18nManager } from 'react-native';

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------
const LOCALE_STORE_KEY = 'app.language';

// ---------------------------------------------------------------------------
// Resolve initial locale (synchronous — called at module load).
// Order: persisted user choice → device locale → DEFAULT_LOCALE ('en').
// SecureStore.getItem is async, but we can't await at module top-level, so we
// resolve synchronously from the device locale first; the stored value is
// applied via initLocale() which _must_ be awaited in RootLayout.
// ---------------------------------------------------------------------------
// Module-level i18n instance; mutated by initLocale() before first render.
// First launch defaults to English (DEFAULT_LOCALE); the user can switch to
// Arabic (RTL) or French, and that choice is persisted (see initLocale/setLocale).
export let i18nInstance = createI18n(DEFAULT_LOCALE);

/**
 * Async init: reads the stored locale, updates the i18n instance, and applies
 * the RTL flag *before* the first render so there's no layout flash.
 *
 * Call this in RootLayout before rendering children (await before showing app).
 */
export async function initLocale(): Promise<Locale> {
  let locale: Locale = DEFAULT_LOCALE;

  try {
    const stored = await SecureStore.getItemAsync(LOCALE_STORE_KEY);
    if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
      locale = stored as Locale;
    }
    // else: keep DEFAULT_LOCALE (English) on first launch — user opts into AR/FR.
  } catch {
    // ignore read errors; keep DEFAULT_LOCALE.
  }

  // Rebuild the i18n instance with the resolved locale.
  i18nInstance = createI18n(locale);

  // Apply RTL flag — must happen BEFORE first render. On cold start this is
  // fine because RN reads I18nManager.isRTL during the initial layout pass.
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(isRTL(locale));

  return locale;
}

/**
 * Persist a new locale selection, apply RTL, and reload the app.
 *
 * The reload is intentional UX: RN's layout direction is read at startup and
 * cannot flip mid-session (especially on iOS). The language picker UI should
 * show an "Applying…" state before calling this so the restart isn't a surprise.
 */
export async function setLocale(locale: Locale): Promise<void> {
  await SecureStore.setItemAsync(LOCALE_STORE_KEY, locale);

  I18nManager.allowRTL(true);
  I18nManager.forceRTL(isRTL(locale));

  // Reload to apply the new layout direction natively.
  // expo-updates reloadAsync is the recommended way in Expo SDK 54.
  // In development (Expo Go / dev client) a manual reload achieves the same.
  try {
    // Dynamic import so the bundle doesn't hard-depend on expo-updates
    // in environments where it isn't available (e.g. web).
    const Updates = await import('expo-updates');
    await Updates.reloadAsync();
  } catch {
    // expo-updates not available (e.g. dev mode without EAS Update) —
    // the caller should prompt the user to restart manually.
    console.warn(
      '[i18n] expo-updates not available. Please restart the app to apply the new language.',
    );
  }
}
