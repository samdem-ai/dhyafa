/**
 * Auth route group — email + password sign-in / sign-up, presented as a stack.
 * Phone OTP is deferred (see docs/02-auth-and-rls.md).
 *
 * The native stack header is hidden (matching every other route group): each
 * screen renders its own `<Header>` from `@/ui`, so we never hand-roll fonts or
 * double up nav bars here.
 */

import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';
import { theme } from '@/theme';

export default function AuthLayout() {
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
