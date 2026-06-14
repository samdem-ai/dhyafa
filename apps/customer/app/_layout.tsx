/**
 * Root layout — the entry point for the entire customer app.
 *
 * Responsibilities:
 *  1. Load the three brand fonts (Fraunces, Plus Jakarta Sans, IBM Plex Sans Arabic)
 *     via @expo-google-fonts hooks; keep the splash screen visible until ready.
 *  2. Resolve + apply locale (persisted or device default) and set I18nManager
 *     RTL flag BEFORE first render to avoid a layout flash. English is the
 *     DEFAULT (LTR); Arabic (RTL) and French are user-selectable.
 *  3. Mount the provider stack (in order, outermost → innermost):
 *       GestureHandlerRootView → SafeAreaProvider → BottomSheetModalProvider
 *       → QueryClientProvider → ToastProvider → I18nextProvider
 *     plus a global ErrorBoundary so an uncaught throw shows a branded screen
 *     instead of white-screening the app.
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
import { I18nManager, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';

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
import { queryClient } from '@/lib/query';
import { RN_FONTS } from '@/lib/fonts';
import { theme } from '@/theme';
import { ErrorBoundary, Splash, ToastProvider } from '@/ui';

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

  // directionality is set on the native layer via I18nManager; the `direction`
  // style prop on the root View enforces it for any web-side rendering.
  const direction = I18nManager.isRTL ? 'rtl' : 'ltr';

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <I18nextProvider i18n={i18nInstance}>
                <ErrorBoundary>
                  <View style={[styles.root, { direction } as object]}>
                    <StatusBar style="dark" />
                    {!appReady ? (
                      // Branded splash while fonts + locale resolve.
                      <Splash />
                    ) : (
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
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
                        <Stack.Screen name="search" options={{ headerShown: false }} />
                        <Stack.Screen name="property" options={{ headerShown: false }} />
                        <Stack.Screen name="booking" options={{ headerShown: false }} />
                        <Stack.Screen name="review" options={{ headerShown: false }} />
                        <Stack.Screen name="conversation" options={{ headerShown: false }} />
                        <Stack.Screen name="notifications" options={{ headerShown: false }} />
                      </Stack>
                    )}
                  </View>
                </ErrorBoundary>
              </I18nextProvider>
            </ToastProvider>
          </QueryClientProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.bg,
  },
});
