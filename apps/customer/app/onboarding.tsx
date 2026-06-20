/**
 * Onboarding / Language picker screen (redesigned Phase 8).
 *
 * Shown as a modal from the root navigator (or directly navigated to on first
 * launch). Lets the user pick EN / FR / AR; persisting the choice applies
 * I18nManager.forceRTL and triggers a native reload so RTL takes effect.
 *
 * The app is English-first, so locales are presented in a neutral EN/FR/AR
 * order. Each option is a borderless row (no surface box/shadow) showing the
 * language in its own script, with a lucide Check on the active locale.
 */

import { useState } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import type { Locale } from '@dyafa/i18n';
import { setLocale } from '@/lib/i18n';
import { Heading, Text } from '@/ui';
import { theme } from '@/theme';

// Neutral EN/FR/AR order (English-first app). Each label is shown in the
// locale's OWN language so the user can identify their language regardless of
// the current UI locale.
const LOCALE_ORDER: Locale[] = ['en', 'fr', 'ar'];
const LOCALE_NATIVE: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
};

export default function OnboardingScreen() {
  const { i18n } = useTranslation('common');
  const currentLocale = (i18n.language ?? 'en') as Locale;
  const [applying, setApplying] = useState<Locale | null>(null);

  async function handleSelect(locale: Locale) {
    if (applying !== null || locale === currentLocale) return;
    setApplying(locale);
    // setLocale persists, applies forceRTL, and calls reloadAsync.
    // The app will restart — this screen won't unmount cleanly, that's expected.
    await setLocale(locale);
    // If we reach here, expo-updates wasn't available. Show a fallback message.
    setApplying(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Brand heading */}
        <Heading level="display-lg" color="primary" center>
          ضيافة
        </Heading>
        <Text variant="body-sm" color="textMuted" center style={styles.subtitle}>
          Choose your language · Choisissez votre langue · اختر لغتك
        </Text>

        {/* Language options — borderless rows */}
        <View style={styles.optionList}>
          {LOCALE_ORDER.map((locale) => {
            const native = LOCALE_NATIVE[locale];
            const isSelected = locale === currentLocale;
            const isLoading = locale === applying;

            return (
              <Pressable
                key={locale}
                onPress={() => void handleSelect(locale)}
                accessibilityRole="button"
                accessibilityLabel={native}
                accessibilityState={{ selected: isSelected }}
                disabled={applying !== null}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              >
                <Text
                  variant="title"
                  weight={isSelected ? 'bold' : 'medium'}
                  color={isSelected ? 'primary' : 'text'}
                  style={styles.optionLabel}
                  // Each label renders in its own script direction.
                  numberOfLines={1}
                >
                  {native}
                </Text>
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.color.primary} />
                ) : isSelected ? (
                  <Check size={22} color={theme.color.accent} strokeWidth={2.5} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {applying !== null ? (
          <Text variant="caption" color="textMuted" center style={styles.reloadHint}>
            {/* Shown in all three languages in case expo-updates isn't available */}
            Restart the app · Redémarrez l'app · يرجى إعادة تشغيل التطبيق
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  container: {
    flex: 1,
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space['3xl'],
  },
  subtitle: { marginTop: theme.space.sm, marginBottom: theme.space['2xl'] },

  optionList: { gap: theme.space.xs },
  // Borderless option row (no surface box, no shadow, no border).
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingVertical: theme.space.lg,
  },
  optionLabel: { flex: 1 },
  pressed: { opacity: 0.6 },

  reloadHint: { marginTop: theme.space.xl },
});
