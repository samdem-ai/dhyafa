/**
 * Root layout — the entry point for the entire customer app.
 *
 * Responsibilities:
 *  1. Load the three brand fonts (Fraunces, Plus Jakarta Sans, IBM Plex Sans Arabic)
 *     via @expo-google-fonts hooks; keep the splash screen visible until ready.
 *  2. Resolve + apply locale (persisted or device default) and set I18nManager
 *     RTL flag BEFORE first render to avoid a layout flash.
 *  3. Wrap the navigator tree with <I18nextProvider> so every screen has t().
 *  4. Expose a <Stack> as the root navigator; individual groups add their own
 *     navigators (tabs, stacks) as nested layouts.
 *
 * Font loading note:
 *   @expo-google-fonts registers each weight under its full name
 *   (e.g. "Fraunces_600SemiBold", "PlusJakartaSans_400Regular").
 *   The RN fontFamily prop in StyleSheet must use those exact strings.
 *   src/lib/fonts.ts exports the canonical name constants so every screen
 *   references the same strings without hard-coding them.
 */

import { useEffect, useState } from 'react';
import { I18nManager, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';

// Brand fonts via @expo-google-fonts
import {
  useFonts as useFraunces,
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  useFonts as usePlusJakarta,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  useFonts as useIBMPlexArabic,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';

import { i18nInstance, initLocale } from '@/lib/i18n';
import { RN_FONTS } from '@/lib/fonts';
import { theme } from '@/theme';

// Keep the splash visible while we load fonts + locale.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [localeReady, setLocaleReady] = useState(false);

  // Load all three brand font families in parallel.
  const [frauncesLoaded] = useFraunces({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });
  const [jakartaLoaded] = usePlusJakarta({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [arabicLoaded] = useIBMPlexArabic({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  const fontsReady = frauncesLoaded && jakartaLoaded && arabicLoaded;

  // Resolve stored locale + set I18nManager.forceRTL before first content render.
  useEffect(() => {
    initLocale().then(() => setLocaleReady(true)).catch(() => setLocaleReady(true));
  }, []);

  const appReady = fontsReady && localeReady;

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => null);
    }
  }, [appReady]);

  // Show nothing until fonts + locale are ready (splash is still visible).
  if (!appReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={theme.color.primary} />
      </View>
    );
  }

  // directionality is set on the native layer via I18nManager; the `direction`
  // style prop on the root View enforces it for any web-side rendering.
  const direction = I18nManager.isRTL ? 'rtl' : 'ltr';

  return (
    <I18nextProvider i18n={i18nInstance}>
      <View style={[styles.root, { direction } as object]}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.color.surface },
            headerTintColor: theme.color.text,
            headerTitleStyle: {
              fontFamily: RN_FONTS.bodyBold,
              fontSize: theme.fontSize['heading-3'],
              color: theme.color.text,
            },
            contentStyle: { backgroundColor: theme.color.bg },
            animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
          }}
        >
          {/* Screens registered by expo-router via the app/ directory */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="onboarding"
            options={{
              title: '',
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="host" options={{ headerShown: false }} />
        </Stack>
      </View>
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.bg,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.bg,
  },
});
