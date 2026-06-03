/**
 * Host area layout. Gates the whole `host/` group behind auth — if there's no
 * session once it resolves, redirect to sign-in (with a redirect back to host).
 */

import { Redirect, Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, I18nManager } from 'react-native';
import { useSession } from '@/lib/auth';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

export default function HostLayout() {
  const { loading, user } = useSession();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.color.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={{ pathname: '/(auth)/sign-in', params: { next: 'host' } }} />;
  }

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
      <Stack.Screen name="index" options={{ title: 'استضافتي' }} />
      <Stack.Screen name="new" options={{ headerShown: false }} />
      <Stack.Screen name="reviews" options={{ headerShown: false }} />
    </Stack>
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
