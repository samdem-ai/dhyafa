/**
 * Dynamic Expo config — augments the static app.json.
 *
 * Expo loads this file when present and passes the resolved app.json as `config`.
 * Used to disable expo-updates in the Expo Go dev workflow (see below). The map
 * now uses OpenStreetMap via a WebView (src/ui/Map.tsx) — no native map SDK, no
 * tokens, no config plugin required.
 */

module.exports = ({ config }) => ({
  ...config,
  // Disable expo-updates so the dev server (Expo Go) does NOT invoke
  // expo-updates' `runtimeversion:resolve` subprocess, which crashes on this
  // Windows host (exit 0xC0000142) and 500s the dev manifest. OTA updates aren't
  // used in the Expo Go dev workflow; re-enable for an EAS production build.
  updates: { ...(config.updates ?? {}), enabled: false },
});
