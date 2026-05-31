/**
 * Auth route group — email + password sign-in / sign-up, presented as a stack.
 * Phone OTP is deferred (see docs/02-auth-and-rls.md).
 */

import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.color.surface },
        headerTintColor: theme.color.text,
        headerTitleStyle: {
          fontFamily: RN_FONTS.arabicSemiBold,
          color: theme.color.text,
        },
        headerBackTitleVisible: false,
        contentStyle: { backgroundColor: theme.color.bg },
        animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="sign-in" options={{ title: 'تسجيل الدخول' }} />
      <Stack.Screen name="sign-up" options={{ title: 'إنشاء حساب' }} />
    </Stack>
  );
}
