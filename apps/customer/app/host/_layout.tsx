/**
 * Host area layout. Gates the whole `host/` group behind auth — if there's no
 * session once it resolves, redirect to sign-in (with a redirect back to host).
 *
 * Every host screen renders its own <Header> (localized, with a persistent
 * "Switch to Travelling" affordance on the dashboard), so the stack itself is
 * headerless. The hardcoded Arabic native title is gone.
 */

import { Redirect, Stack } from 'expo-router';
import { View, StyleSheet, I18nManager } from 'react-native';
import { useSession } from '@/lib/auth';
import { Splash } from '@/ui';
import { theme } from '@/theme';

export default function HostLayout() {
  const { loading, user } = useSession();

  if (loading) {
    return (
      <View style={styles.center}>
        <Splash />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={{ pathname: '/(auth)/sign-in', params: { next: 'host' } }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.color.bg },
        animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.bg,
  },
});
