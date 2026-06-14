/**
 * Bottom-tab layout (Travelling mode): Explore · Wishlists · Trips · Inbox · Profile.
 *
 * Migrated to expo-router's <Tabs> (built on @react-navigation/bottom-tabs, which
 * ships transitively via expo-router). This replaces the old <Slot/> +
 * router.replace() tab system that destroyed per-tab scroll/nav/data state and
 * forced useFocusEffect refetch storms. We keep the brand look by passing a
 * custom-styled <BrandTabBar> via the `tabBar={}` render prop, but get lazy
 * mount, per-tab state preservation, and accessibility for free.
 *
 * Onboarding/auth/host/property/booking routes live OUTSIDE this group and keep
 * working — they are pushed on the root stack over the tabs.
 */

import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { BrandTabBar } from '@/components/BrandTabBar';
import { usePushRegistration } from '@/lib/push';
import { L, pick } from '@/lib/copy';

export default function TabsLayout() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;

  // Register for push (foreground handler + token) once signed in.
  // In-app + realtime is the M3 deliverable; device-token storage is a follow-up.
  usePushRegistration();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BrandTabBar {...props} locale={locale} />}
    >
      <Tabs.Screen name="index" options={{ title: pick(L.exploreGreeting, locale) }} />
      <Tabs.Screen name="wishlists" options={{ title: pick(L.wishlists, locale) }} />
      <Tabs.Screen name="trips" options={{ title: pick(L.tripsTitle, locale) }} />
      <Tabs.Screen name="inbox" options={{ title: pick(L.inbox, locale) }} />
      <Tabs.Screen name="profile" options={{ title: pick(L.profileTitle, locale) }} />
    </Tabs>
  );
}
