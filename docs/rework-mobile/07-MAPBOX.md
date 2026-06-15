# Phase 7 — Real Mapbox (graceful fallback)

The customer app's map is real **@rnmapbox/maps** when the native module + a public
token are present, and falls back to a branded **stub** (an accessible list of
price pins) otherwise. This means:

- **Expo Go keeps working** — the native module is absent there, so `src/ui/Map.tsx`
  detects that and renders the stub. No token needed for Expo Go.
- **A dev-client / production build shows the real interactive map** — once you
  supply the tokens and run an EAS build.

There is **no one-way door**: the same JS runs in both, branching at runtime on
`NativeModules.RNMBXModule` presence + `EXPO_PUBLIC_MAPBOX_TOKEN`.

## What's already wired

- `@rnmapbox/maps` (^10.3.1) installed in `apps/customer`.
- `app.config.js` adds the `@rnmapbox/maps` config plugin and injects the secret
  **download token** from `RNMAPBOX_DOWNLOAD_TOKEN` (never committed). It also
  exposes the public token to the app via `expo.extra.mapboxToken`.
- `src/ui/Map.tsx` — real `MapView`/`Camera`/`MarkerView` with price-pin markers,
  centered/fitted to the result pins; stub fallback when native/token absent.
- `src/lib/discovery.ts` → `fetchApproxCoords(ids)` reads **privacy-safe** rounded
  coordinates (`approx_lat`/`approx_lng`, ~110 m) from the `properties_public`
  view — exact lat/lng are deliberately withheld from clients (§9).
- `app/search/results.tsx` — the Map toggle now plots real markers (lazily fetches
  coords when the map opens).
- `eas.json` — `development` (dev client), `preview`, `production` build profiles.

## Tokens you need (from your Mapbox account → Tokens)

| Token | Prefix | Where it's used | How to provide |
| --- | --- | --- | --- |
| **Public access token** | `pk.…` | App runtime (loads tiles) | `EXPO_PUBLIC_MAPBOX_TOKEN` env var (inlined by Metro at build) |
| **Secret download token** | `sk.…` (scope: `Downloads:Read`) | Native build only (fetches the iOS/Android SDK) | `RNMAPBOX_DOWNLOAD_TOKEN` — set as an **EAS secret** |

> Keep both out of git. The public token is embedded in the app bundle (that's
> expected for Mapbox); restrict it by URL/usage in the Mapbox dashboard.

## One-time setup

```bash
cd apps/customer

# 1. Log in + link the EAS project (fills extra.eas.projectId in app.json).
eas login
eas init           # or set the existing projectId in app.json

# 2. Store the SECRET download token as an EAS secret (used at build time).
eas secret:create --scope project --name RNMAPBOX_DOWNLOAD_TOKEN --value sk.YOUR_DOWNLOAD_TOKEN

# 3. Make the PUBLIC token available to builds. Either add it to the build
#    profile env in eas.json, or also store it as a secret:
eas secret:create --scope project --name EXPO_PUBLIC_MAPBOX_TOKEN --value pk.YOUR_PUBLIC_TOKEN
```

## Build the dev client (gets the real map)

```bash
# iOS simulator dev client:
eas build --profile development --platform ios

# Android dev client:
eas build --profile development --platform android
```

Install the resulting dev client on your device/simulator, then run the JS:

```bash
pnpm --filter @dyafa/customer start   # press i / a to open in the dev client
```

The map view in **Search → Map** now renders real Mapbox tiles with price pins.

## Local development

- For everyday work, **Expo Go still works** (`expo start`) — you just see the
  stub map. No tokens required.
- To test the real map locally without EAS, you can `npx expo run:ios` /
  `run:android` after `export EXPO_PUBLIC_MAPBOX_TOKEN=pk....` and setting
  `RNMAPBOX_DOWNLOAD_TOKEN` in your shell (a local prebuild also reads them).

## Privacy note

The map only ever receives **approximate** coordinates (rounded ~110 m via
`properties_public.approx_lat/approx_lng`). Exact `lat`/`lng` and `geo` remain
revoked from `anon`/`authenticated` at the RLS layer.
