/**
 * Onboarding / Language picker screen.
 *
 * Shown as a modal from the root navigator (or directly navigated to on first
 * launch). Lets the user pick AR / FR / EN; persisting the choice applies
 * I18nManager.forceRTL and triggers a native reload so RTL takes effect.
 *
 * Arabic is the PRIMARY locale and is presented first.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  I18nManager,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, isRTL, type Locale } from '@dyafa/i18n';
import { setLocale } from '@/lib/i18n';
import { RN_FONTS } from '@/lib/fonts';
import { theme } from '@/theme';

// Display labels for each locale — always shown in the locale's own language
// so the user can identify their language regardless of the current UI locale.
const LOCALE_LABELS: Record<Locale, { native: string; flag: string }> = {
  ar: { native: 'العربية', flag: '🇩🇿' },
  fr: { native: 'Français', flag: '🇫🇷' },
  en: { native: 'English', flag: '🌐' },
};

export default function OnboardingScreen() {
  const { i18n } = useTranslation('common');
  const currentLocale = (i18n.language ?? 'ar') as Locale;
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
        <Text style={styles.brand}>ضيافة</Text>
        <Text style={styles.subtitle}>
          اختر لغتك / Choisissez votre langue / Choose your language
        </Text>

        {/* Language cards */}
        <View style={styles.cardList}>
          {SUPPORTED_LOCALES.map((locale) => {
            const { native, flag } = LOCALE_LABELS[locale];
            const isSelected = locale === currentLocale;
            const isLoading = locale === applying;

            return (
              <TouchableOpacity
                key={locale}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => void handleSelect(locale)}
                accessibilityRole="button"
                accessibilityLabel={native}
                accessibilityState={{ selected: isSelected }}
                disabled={applying !== null}
              >
                <Text style={styles.flag}>{flag}</Text>
                <Text
                  style={[
                    styles.cardLabel,
                    isRTL(locale) && styles.cardLabelArabic,
                    isSelected && styles.cardLabelSelected,
                  ]}
                >
                  {native}
                </Text>
                {isLoading && (
                  <ActivityIndicator
                    size="small"
                    color={theme.color.textOnPrimary}
                    style={styles.spinner}
                  />
                )}
                {isSelected && !isLoading && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {applying !== null && (
          <Text style={styles.reloadHint}>
            {/* Shown in all three languages in case expo-updates isn't available */}
            يرجى إعادة تشغيل التطبيق · Redémarrez l'app · Restart the app
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.color.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space['3xl'],
    alignItems: 'center',
  },
  brand: {
    fontFamily: RN_FONTS.arabicBold,
    fontSize: theme.fontSize['display-lg'],
    fontWeight: '700',
    color: theme.color.primary,
    marginBottom: theme.space.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: RN_FONTS.bodyRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign: 'center',
    marginBottom: theme.space['3xl'],
    lineHeight: theme.lineHeight['body-sm'],
  },
  cardList: {
    width: '100%',
    gap: theme.space.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    paddingVertical: theme.space.lg,
    paddingHorizontal: theme.space.xl,
    ...theme.shadow.card,
  },
  cardSelected: {
    borderColor: theme.color.primary,
    backgroundColor: theme.color.primary,
  },
  flag: {
    fontSize: 28,
    marginEnd: theme.space.md,
  },
  cardLabel: {
    flex: 1,
    fontFamily: RN_FONTS.bodySemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
  },
  cardLabelArabic: {
    fontFamily: RN_FONTS.arabicSemiBold,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  cardLabelSelected: {
    color: theme.color.textOnPrimary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: theme.color.textOnPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  spinner: {
    marginStart: theme.space.sm,
  },
  reloadHint: {
    marginTop: theme.space.xl,
    fontFamily: RN_FONTS.bodyRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign: 'center',
    lineHeight: theme.lineHeight.caption,
  },
});
