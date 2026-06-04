/**
 * Bottom-tab layout (guest mode): Explore / Trips / Wishlists / Profile.
 *
 * Implemented with <Slot/> + a custom <TabBar/> rather than expo-router's
 * <Tabs> because @react-navigation/bottom-tabs is not installed (and we must
 * not add native deps). The active child route renders above the bar.
 *
 * Onboarding/auth/host/property/booking routes live OUTSIDE this group and keep
 * working — they are pushed on the root stack over the tabs.
 */

import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { TabBar } from '@/components/TabBar';
import { usePushRegistration } from '@/lib/push';
import { theme } from '@/theme';

export default function TabsLayout() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;

  // Register for push (foreground handler + token) once signed in.
  // In-app + realtime is the M3 deliverable; device-token storage is a follow-up.
  usePushRegistration();

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Slot />
      </View>
      <TabBar locale={locale} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  content: { flex: 1 },
});
