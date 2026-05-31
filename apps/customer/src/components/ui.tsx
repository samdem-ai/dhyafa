/**
 * Small shared UI primitives for the host flow: buttons, skeleton blocks,
 * status badges, section headers, and a screen-state wrapper (loading / error /
 * empty). Keeps the wizard + host screens visually consistent and avoids bare
 * spinners per the design brief.
 *
 * All spacing/colors come from the design tokens (`theme`); fonts from RN_FONTS.
 * Direction-aware (logical margins) so the same components work in RTL.
 */

import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

// ---------------------------------------------------------------------------
// Primary / secondary buttons
// ---------------------------------------------------------------------------
export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const isDisabled = disabled || loading;
  const bg =
    variant === 'secondary'
      ? theme.color.surface
      : variant === 'danger'
        ? theme.color.errorBg
        : theme.color.primary;
  const fg =
    variant === 'secondary'
      ? theme.color.text
      : variant === 'danger'
        ? theme.color.error
        : theme.color.textOnPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg },
        variant === 'secondary' && styles.btnSecondaryBorder,
        isDisabled && styles.btnDisabled,
        pressed && !isDisabled && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.btnLabel, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Skeleton (pulse) block
// ---------------------------------------------------------------------------
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: theme.motion.duration.slow,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: theme.motion.duration.slow,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeleton, style, { opacity }]} />;
}

/** A stack of skeleton card placeholders. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <Skeleton style={styles.skeletonThumb} />
          <View style={styles.skeletonLines}>
            <Skeleton style={styles.skeletonLineWide} />
            <Skeleton style={styles.skeletonLineNarrow} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
type Status = 'draft' | 'pending' | 'approved' | 'rejected';

const STATUS_LABELS: Record<Status, { ar: string; fr: string; en: string }> = {
  draft: { ar: 'مسودة', fr: 'Brouillon', en: 'Draft' },
  pending: { ar: 'قيد المراجعة', fr: 'En révision', en: 'In review' },
  approved: { ar: 'منشور', fr: 'Publié', en: 'Published' },
  rejected: { ar: 'مرفوض', fr: 'Rejeté', en: 'Rejected' },
};

export function StatusBadge({ status, locale }: { status: string; locale: string }) {
  const key = (['draft', 'pending', 'approved', 'rejected'].includes(status)
    ? status
    : 'draft') as Status;
  const palette: Record<Status, { bg: string; fg: string }> = {
    draft: { bg: theme.color.surfaceSunken, fg: theme.color.textMuted },
    pending: { bg: theme.color.warningBg, fg: theme.color.warning },
    approved: { bg: theme.color.successBg, fg: theme.color.success },
    rejected: { bg: theme.color.errorBg, fg: theme.color.error },
  };
  const { bg, fg } = palette[key];
  const labels = STATUS_LABELS[key];
  const label = locale === 'fr' ? labels.fr : locale === 'en' ? labels.en : labels.ar;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Error + empty states
// ---------------------------------------------------------------------------
export function ErrorState({
  message,
  onRetry,
  retryLabel,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel: string;
}) {
  return (
    <View style={styles.centerState}>
      <Text style={styles.stateEmoji}>⚠️</Text>
      <Text style={styles.stateText}>{message}</Text>
      {onRetry && (
        <View style={styles.stateAction}>
          <PrimaryButton label={retryLabel} onPress={onRetry} variant="secondary" />
        </View>
      )}
    </View>
  );
}

export function EmptyState({
  emoji = '🏠',
  title,
  subtitle,
}: {
  emoji?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.centerState}>
      <Text style={styles.stateEmoji}>{emoji}</Text>
      <Text style={styles.stateTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stateText}>{subtitle}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section header (label + optional hint)
// ---------------------------------------------------------------------------
export function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <View style={styles.fieldLabelWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.xl,
    ...theme.shadow.xs,
  },
  btnSecondaryBorder: {
    borderWidth: 1.5,
    borderColor: theme.color.borderStrong,
  },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },
  btnLabel: {
    fontFamily: RN_FONTS.bodySemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },

  skeleton: {
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.sm,
  },
  skeletonList: { gap: theme.space.md, padding: theme.space.xl },
  skeletonCard: {
    flexDirection: 'row',
    gap: theme.space.md,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.md,
    ...theme.shadow.card,
  },
  skeletonThumb: { width: 84, height: 84, borderRadius: theme.radius.md },
  skeletonLines: { flex: 1, justifyContent: 'center', gap: theme.space.sm },
  skeletonLineWide: { height: 16, width: '80%' },
  skeletonLineNarrow: { height: 12, width: '50%' },

  badge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space['2xl'],
    gap: theme.space.sm,
  },
  stateEmoji: { fontSize: 40, marginBottom: theme.space.xs },
  stateTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-3'],
    color: theme.color.text,
    textAlign: 'center',
  },
  stateText: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.textMuted,
    textAlign: 'center',
    lineHeight: theme.lineHeight.body,
  },
  stateAction: { marginTop: theme.space.md, minWidth: 160 },

  fieldLabelWrap: { marginBottom: theme.space.sm },
  fieldLabel: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
  },
  fieldHint: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    marginTop: 2,
    lineHeight: theme.lineHeight.caption,
  },
});
