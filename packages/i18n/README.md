# `@dyafa/i18n`

Shared localization + RTL helpers for the Dyafa monorepo.
Consumed by the Expo mobile app and both Next.js web apps.

---

## Design decisions

- **Arabic is primary.** RTL is the design default, not an afterthought.
- **Fallback chain:** `ar → fr → en` — a missing Arabic key shows French before English, matching the Algerian audience.
- **Western Arabic (Latin) numerals everywhere** — even in `ar` locale. Algeria (`ar-DZ`) already defaults to Latin digits; we pin `nu-latn` explicitly via `Intl.NumberFormat` for safety across all platforms.
- **DZD currency symbol** is post-processed: `دج` for Arabic, `DZD` for French/English. No decimal places (DZD has no everyday minor unit in v1).
- **Price numerals must be wrapped** in `<bdi>` (web) or `unicodeBidi: 'isolate'` (RN) at the component level to prevent RTL bidi reordering of the currency symbol.

---

## Public API

```ts
import {
  // Types & constants
  type Locale,          // 'ar' | 'fr' | 'en'
  SUPPORTED_LOCALES,    // readonly ['ar', 'fr', 'en']
  DEFAULT_LOCALE,       // 'ar'

  // RTL helpers
  isRTL,               // isRTL('ar') === true
  dir,                 // dir('ar') === 'rtl'

  // i18next factory
  createI18n,          // (initialLocale?: Locale) => i18n

  // Formatting
  formatDZD,           // formatDZD(12000, 'ar') → '12 000 دج'
  formatNumber,        // formatNumber(1234, 'fr') → '1 234'
} from '@dyafa/i18n';
```

### `createI18n(initialLocale?)`

Returns a fully configured, synchronously initialized i18next instance with all
bundled locale resources.

- **Namespaces:** `common` | `auth` | `booking`
- **Default NS:** `common`
- **fallbackLng:** `'fr'`

```ts
// Expo — call once at app boot, pass to <I18nextProvider>
const i18n = createI18n(storedLocale ?? 'ar');

// Next.js App Router — call per request in a server component
const i18n = createI18n(resolvedLocale);
const t = i18n.getFixedT(resolvedLocale);
```

Each call returns a **fresh** i18next instance (via `createInstance()`), making
it safe for SSR (per-request) and Expo (single shared instance).

### `formatDZD(amount, locale)`

```ts
formatDZD(12000, 'ar'); // '12 000 دج'
formatDZD(12000, 'fr'); // '12 000 DZD'
formatDZD(12000, 'en'); // '12,000 DZD'
```

### RTL in Expo

```ts
import { isRTL } from '@dyafa/i18n';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';

async function applyLocale(locale: Locale) {
  const rtl = isRTL(locale);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  // RN only applies layout direction at app start — a reload is required.
  await Updates.reloadAsync();
}
```

### RTL on the web (Next.js App Router)

```tsx
// app/[locale]/layout.tsx
import { dir } from '@dyafa/i18n';

export default function RootLayout({ params: { locale } }) {
  return <html lang={locale} dir={dir(locale)}>...</html>;
}
```

---

## Locale files

```
src/locales/
  ar/  common.json  auth.json  booking.json   ← PRIMARY (RTL)
  fr/  common.json  auth.json  booking.json   ← fallback 1
  en/  common.json  auth.json  booking.json   ← fallback 2
```

### Key conventions

- Keys are **semantic, not literal** English: `booking.price_breakdown.service_fee`, not `"Service Fee"`.
- Plurals use i18next suffix conventions: `_one` / `_other` (+ `_zero` / `_few` / `_many` for Arabic CLDR categories when needed).
- Arabic strings are **never** uppercased or letter-spaced — only Latin scripts get `overline`-style transforms.
- Interpolation: `{{variable}}` for values; format functions (`{{price, dzd}}`) are wired in at the app level via `i18next.services.formatter.addCached`.

---

## Building

```sh
pnpm --filter @dyafa/i18n build
```

Output lands in `dist/` (ES module, `.d.ts` declarations, source maps).
