/**
 * Review stack — auth-gated (mirrors the booking layout's gate).
 *
 * Route:
 *   [bookingId] → leave a review for a completed booking (guest only).
 *
 * A signed-out user hitting the route is redirected to sign-in.
 */

import { Redirect, Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, I18nManager } from 'react-native';
import { useSession } from '@/lib/auth';
import { theme } from '@/theme';

export default function ReviewLayout() {
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
        headerShown: false,
        contentStyle: { backgroundColor: theme.color.bg },
        animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="[bookingId]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.bg },
});
