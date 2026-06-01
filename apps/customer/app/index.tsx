/**
 * Root index — redirects into the bottom-tab group (Explore tab).
 *
 * The discovery/home UI now lives in app/(tabs)/index.tsx. Onboarding/auth/host
 * routes remain reachable on the root stack; this just sends the initial route
 * into the tabs.
 */

import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)" />;
}
