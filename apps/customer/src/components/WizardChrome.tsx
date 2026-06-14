/**
 * Wizard chrome: a progress header (step N of M + bar) and a sticky footer
 * with Back / Next (or Submit) actions. Steps render their body in between.
 * RTL-aware. Used by every step screen under app/host/new/.
 */

import { useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
} from 'react-native';
import { router } from 'expo-router';
import type { Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';
import { PrimaryButton } from './ui';
import { BottomSheet } from '@/ui';
import { useWizard } from '@/lib/wizard';
import { L, pick as pickL } from '@/lib/copy';

export const WIZARD_TOTAL_STEPS = 9;

const COPY = {
  step: { ar: 'الخطوة', fr: 'Étape', en: 'Step' },
  of: { ar: 'من', fr: 'sur', en: 'of' },
  back: { ar: 'رجوع', fr: 'Retour', en: 'Back' },
  next: { ar: 'التالي', fr: 'Suivant', en: 'Next' },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

export interface WizardChromeProps {
  locale: Locale;
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Disable the Next/Submit button. */
  nextDisabled?: boolean;
  /** Show a spinner on the Next/Submit button. */
  nextLoading?: boolean;
  /** Override the Next button label (e.g. Submit on the last step). */
  nextLabel?: string;
  onNext: () => void;
  /** Override back behaviour; defaults to router.back(). */
  onBack?: () => void;
}

export function WizardChrome({
  locale,
  step,
  title,
  subtitle,
  children,
  nextDisabled = false,
  nextLoading = false,
  nextLabel,
  onNext,
  onBack,
}: WizardChromeProps) {
  const progress = step / WIZARD_TOTAL_STEPS;
  const { reset } = useWizard();
  const [exitSheet, setExitSheet] = useState(false);

  // The draft auto-persists, so closing saves progress. The sheet lets the host
  // explicitly discard (clearing the persisted draft) instead.
  async function onDiscard() {
    await reset();
    setExitSheet(false);
    router.replace('/host');
  }
  function onSaveExit() {
    setExitSheet(false);
    router.replace('/host');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progressHeader}>
        <View style={styles.progressRow}>
          <Text style={styles.stepText}>
            {pick(COPY.step, locale)} {step} {pick(COPY.of, locale)} {WIZARD_TOTAL_STEPS}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setExitSheet(true)}
            hitSlop={8}
          >
            <Text style={styles.backInline}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.bodyInner}>{children}</View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.backBtn}>
            <PrimaryButton
              label={pick(COPY.back, locale)}
              variant="secondary"
              onPress={() => (onBack ? onBack() : router.back())}
            />
          </View>
          <View style={styles.nextBtn}>
            <PrimaryButton
              label={nextLabel ?? pick(COPY.next, locale)}
              onPress={onNext}
              disabled={nextDisabled}
              loading={nextLoading}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      <BottomSheet visible={exitSheet} onClose={() => setExitSheet(false)}>
        <View style={styles.exitBody}>
          <Text style={styles.exitTitle}>{pickL(L.wizardDiscardTitle, locale)}</Text>
          <Text style={styles.exitMsg}>{pickL(L.wizardDiscardBody, locale)}</Text>
          <View style={styles.exitActions}>
            <PrimaryButton label={pickL(L.wizardSaveExit, locale)} onPress={onSaveExit} />
            <PrimaryButton
              label={pickL(L.wizardDiscard, locale)}
              variant="danger"
              onPress={() => void onDiscard()}
            />
            <PrimaryButton
              label={pickL(L.wizardKeepEditing, locale)}
              variant="secondary"
              onPress={() => setExitSheet(false)}
            />
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  flex: { flex: 1 },
  progressHeader: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space.sm,
  },
  stepText: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
  },
  backInline: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.title,
    color: theme.color.textMuted,
  },
  track: {
    height: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceSunken,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
  },
  body: {
    padding: theme.space.xl,
    paddingBottom: theme.space['2xl'],
  },
  bodyInner: { marginTop: theme.space.lg, gap: theme.space.lg },
  title: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['heading-1'],
    color: theme.color.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  subtitle: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.textMuted,
    marginTop: theme.space.xs,
    lineHeight: theme.lineHeight.body,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  footer: {
    flexDirection: 'row',
    gap: theme.space.md,
    padding: theme.space.xl,
    paddingTop: theme.space.md,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
  exitBody: { gap: theme.space.sm, paddingTop: theme.space.sm },
  exitTitle: {
    fontFamily: I18nManager.isRTL ? RN_FONTS.arabicBold : RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['heading-3'],
    color: theme.color.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  exitMsg: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.textMuted,
    lineHeight: theme.lineHeight.body,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  exitActions: { gap: theme.space.sm, marginTop: theme.space.md },
});
