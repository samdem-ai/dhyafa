/**
 * Search stack — the discovery search entry, results, and filters.
 * Presented over the tabs on the root stack. Each screen manages its own header.
 */

import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

export default function SearchLayout() {
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
      <Stack.Screen name="index" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="results" options={{ headerShown: false }} />
      <Stack.Screen name="filters" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}
