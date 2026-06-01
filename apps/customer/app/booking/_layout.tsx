/**
 * Booking stack — auth-gated (mirrors the host layout's gate).
 *
 * Routes:
 *   confirm           → confirm dates/guests + price preview + guest details → create_booking
 *   [id]/index        → booking / trip detail
 *   [id]/pay          → payment stub (Chargily integration pending)
 *
 * A signed-out guest hitting any booking route is redirected to sign-in and
 * returned afterwards (router.back from sign-in).
 */

import { Redirect, Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, I18nManager } from 'react-native';
import { useSession } from '@/lib/auth';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

export default function BookingLayout() {
  const { loading, user } = useSession();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.color.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.color.surface },
        headerTintColor: theme.color.text,
        headerTitleStyle: { fontFamily: RN_FONTS.arabicSemiBold, color: theme.color.text },
        headerBackTitleVisible: false,
        contentStyle: { backgroundColor: theme.color.bg },
        animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="confirm" options={{ headerShown: false }} />
      <Stack.Screen name="[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]/pay" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.bg },
});
