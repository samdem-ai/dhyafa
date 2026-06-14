/**
 * WizardProgress + WizardNav — the listing-wizard chrome.
 *
 * WizardProgress: a segmented progress bar (filled terracotta segments on a
 * sunken track) + a "Step N of M" label + a Fraunces step title.
 *
 * WizardNav: a sticky, keyboard-aware bottom bar with Back (ghost) + Next/Publish
 * (primary). Pads the bottom safe-area inset.
 */

import { View, StyleSheet } from 'react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { Heading, Text } from './Text';
import { Button } from './Button';

export interface WizardProgressProps {
  /** 1-based current step. */
  step: number;
  total: number;
  title: string;
  /** "Step {n} of {m}" — pass a localized formatter. */
  stepLabel?: string;
  testID?: string;
}

export function WizardProgress({ step, total, title, stepLabel, testID }: WizardProgressProps) {
  return (
    <View testID={testID} style={styles.progressWrap}>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: total, now: step }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.segment, i < step ? styles.segmentFilled : null]} />
        ))}
      </View>
      <Text variant="caption" color="textMuted">
        {stepLabel ?? `Step ${step} of ${total}`}
      </Text>
      <Heading level={2}>{title}</Heading>
    </View>
  );
}

export interface WizardNavProps {
  onNext: () => void;
  nextLabel: string;
  onBack?: () => void;
  backLabel?: string;
  nextLoading?: boolean;
  nextDisabled?: boolean;
  testID?: string;
}

export function WizardNav({
  onNext,
  nextLabel,
  onBack,
  backLabel,
  nextLoading = false,
  nextDisabled = false,
  testID,
}: WizardNavProps) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID={testID}
    >
      <View style={[styles.navBar, { paddingBottom: Math.max(insets.bottom, theme.space.md) }]}>
        {onBack && backLabel ? (
          <View style={styles.navBack}>
            <Button label={backLabel} variant="ghost" onPress={onBack} disabled={nextLoading} />
          </View>
        ) : null}
        <View style={styles.navNext}>
          <Button
            label={nextLabel}
            variant="primary"
            onPress={onNext}
            loading={nextLoading}
            disabled={nextDisabled}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  progressWrap: { gap: theme.space.sm, paddingHorizontal: theme.space.xl, paddingVertical: theme.space.lg },
  track: { flexDirection: 'row', gap: 4 },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceSunken,
  },
  segmentFilled: { backgroundColor: theme.color.accent },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    backgroundColor: theme.color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
    paddingTop: theme.space.md,
    paddingHorizontal: theme.space.xl,
    ...theme.shadow.raised,
  },
  navBack: { flex: 1 },
  navNext: { flex: 2 },
});
