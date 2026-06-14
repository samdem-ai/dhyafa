/**
 * Badge + StatusPill — decoupled status indicators.
 *
 * StatusPill takes a `tone` + a localized `label` (the screen owns the i18n).
 * `statusTone()` maps every known booking + listing status string onto a tone
 * so callers don't repeat the switch. This replaces the old hardcoded
 * 4-status STATUS_BADGE.
 */

import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { theme } from '@/theme';
import { Text } from './Text';

export type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'info';

const TONE: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: theme.color.surfaceSunken, fg: theme.color.textMuted },
  success: { bg: theme.color.successBg, fg: theme.color.success },
  warning: { bg: theme.color.warningBg, fg: theme.color.warning },
  error: { bg: theme.color.errorBg, fg: theme.color.error },
  info: { bg: theme.color.infoBg, fg: theme.color.info },
};

export interface BadgeProps {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Badge({ label, tone = 'neutral', style, testID }: BadgeProps) {
  const { bg, fg } = TONE[tone];
  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text variant="caption" weight="semibold" color={fg}>
        {label}
      </Text>
    </View>
  );
}

/** StatusPill is a Badge with an explicit status semantic. */
export function StatusPill({ label, tone = 'neutral', style, testID }: BadgeProps) {
  return <Badge label={label} tone={tone} style={style} testID={testID} />;
}

/**
 * Map a booking or listing status string onto a tone. Covers all booking
 * lifecycle states plus the host listing states (draft/pending/approved/
 * rejected). Unknown statuses fall back to neutral.
 */
export function statusTone(status: string): Tone {
  switch (status) {
    // Booking lifecycle
    case 'confirmed':
    case 'checked_in':
    case 'completed':
    case 'approved': // listing
      return 'success';
    case 'requested':
    case 'awaiting_payment':
    case 'pending': // listing in review
      return 'warning';
    case 'declined':
    case 'cancelled':
    case 'no_show':
    case 'expired':
    case 'rejected': // listing
      return 'error';
    case 'draft': // listing
    default:
      return 'neutral';
  }
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
  },
});
