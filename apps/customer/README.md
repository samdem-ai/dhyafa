# @dyafa/customer — Expo Customer App

The guest-facing mobile app for the Dyafa platform. Built with Expo SDK 51, expo-router v3 (file-based), React Native, and TypeScript.

## Running locally

### 1. Install dependencies (from the monorepo root)

```sh
pnpm install
```

All workspace packages (`@dyafa/design-tokens`, `@dyafa/i18n`, `@dyafa/api-client`) are resolved from the monorepo root by pnpm. Do not run `pnpm install` inside `apps/customer` directly.

### 2. Set environment variables

Copy `.env.example` in the monorepo root and create `.env.local`:

```sh
cp .env.example .env.local
```

Fill in the Expo-specific values:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

**Never** set `SUPABASE_SERVICE_ROLE_KEY` as an `EXPO_PUBLIC_*` variable — the service role key bypasses Row Level Security and must never ship to a device.

### 3. Start the dev server

```sh
pnpm --filter @dyafa/customer start
```

Or target a specific platform:

```sh
pnpm --filter @dyafa/customer android
pnpm --filter @dyafa/customer ios
```

### 4. Type-check

```sh
pnpm --filter @dyafa/customer typecheck
```

Or run across the whole monorepo:

```sh
pnpm typecheck
```

---

## Architecture notes (M0 skeleton)

| Area | Implementation |
|---|---|
| Navigation | `expo-router` v3 file-based; `app/_layout.tsx` is the root layout |
| Fonts | `@expo-google-fonts/fraunces`, `@expo-google-fonts/plus-jakarta-sans`, `@expo-google-fonts/ibm-plex-sans-arabic` loaded via `useFonts` hooks; splash held until ready |
| i18n | `@dyafa/i18n` (`createI18n`, `isRTL`, `formatDZD`); device locale auto-detected, persisted in `expo-secure-store` |
| RTL | `I18nManager.forceRTL` applied before first render; language change triggers `expo-updates` reload |
| Design tokens | `@dyafa/design-tokens/rn` (`rnTheme`); re-exported from `src/theme.ts` |
| Supabase | `@dyafa/api-client` `createBrowserClient` + `AsyncStorage` auth storage; `AppState` token refresh |
| Map | **Stubbed** as a placeholder `View` in M0 |

## Map (M1+)

The map view is stubbed in M0 (`app/index.tsx`) as a plain `View` placeholder. In M1 it will be wired to `@rnmapbox/maps`, which:

- Requires the Mapbox secret token (`MAPBOX_SECRET_TOKEN`) in the EAS build environment
- Is **not compatible with Expo Go** — you must build a custom dev client:
  ```sh
  eas build --profile development --platform ios
  eas build --profile development --platform android
  ```
- Supports native GL clustering, data-driven price pins, and RTL Arabic labels via `mapbox-gl-rtl-text`.

## Monorepo conventions

- Package scope: `@dyafa/*`
- Workspace deps: `"workspace:*"` in `package.json`
- Metro is configured in `metro.config.js` to watch the monorepo root and resolve from both `apps/customer/node_modules` and the root `node_modules` — this is required for pnpm's non-hoisted layout.
- Path alias `@/*` maps to `src/*` (configured in `tsconfig.json` and resolved by Babel/Metro via `babel-preset-expo`).
