/**
 * Booking stack.
 *
 * Routes:
 *   confirm           → confirm dates/guests + price preview + guest details → create_booking
 *   [id]/index        → booking / trip detail
 *   [id]/pay          → payment screen (Chargily + dev simulation)
 *
 * Auth is NOT gated at the layout level: a blanket <Redirect> to bare sign-in
 * would drop the booking context (dates/room/guests). Instead each screen
 * self-guards and, when signed out, navigates to
 * `/(auth)/sign-in?next=<the full in-progress path>` so the user RESUMES the
 * booking on return (confirm builds + preserves that path; detail/pay encode
 * their own route).
 */

import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';
import { theme } from '@/theme';

export default function BookingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.color.bg },
        animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="confirm" />
      <Stack.Screen name="[id]/index" />
      {/* Disable the iOS swipe-back mid-transaction on the pay screen. */}
      <Stack.Screen name="[id]/pay" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
