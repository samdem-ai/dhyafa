/**
 * Property stack — the public detail screen (reachable from any tab/search).
 * The detail screen renders its own gallery header, so the native header is off.
 */

import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';
import { theme } from '@/theme';

export default function PropertyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.color.bg },
        animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="[id]" />
      <Stack.Screen name="reviews/[id]" />
    </Stack>
  );
}
