/**
 * Dynamic Expo config — augments the static app.json.
 *
 * Expo loads this file when present and passes the resolved app.json as `config`.
 * We use it only to inject Mapbox configuration from the environment, so no
 * secrets live in version control:
 *
 *   RNMAPBOX_DOWNLOAD_TOKEN  — SECRET (sk.…) download token, needed ONLY at native
 *                              build time (EAS) to fetch the Mapbox SDK. Set it as
 *                              an EAS secret: `eas secret:create --name
 *                              RNMAPBOX_DOWNLOAD_TOKEN --value sk....`.
 *   EXPO_PUBLIC_MAPBOX_TOKEN — PUBLIC (pk.…) access token used by the app at
 *                              runtime to load tiles. Exposed via expo extra.
 *
 * The @rnmapbox/maps native module is only present in a dev-client / production
 * build. In Expo Go it is absent and src/ui/Map.tsx falls back to the branded
 * stub, so the app keeps running in Expo Go without any Mapbox token. See
 * docs/rework-mobile/07-MAPBOX.md for the full build steps.
 */

const DOWNLOAD_TOKEN = process.env.RNMAPBOX_DOWNLOAD_TOKEN || '';
const PUBLIC_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      '@rnmapbox/maps',
      {
        // Empty token is fine for `expo export` / Expo Go (JS-only); the native
        // EAS build requires RNMAPBOX_DOWNLOAD_TOKEN to be set in the environment.
        RNMapboxMapsDownloadToken: DOWNLOAD_TOKEN,
      },
    ],
  ],
  extra: {
    ...(config.extra ?? {}),
    // Read at runtime by src/ui/Map.tsx (via expo-constants). Public pk.… token.
    mapboxToken: PUBLIC_TOKEN,
  },
});
