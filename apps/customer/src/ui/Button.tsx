/**
 * Button — the action primitive.
 *
 * Variants:
 *   primary    teal fill / bone text — structural primary action
 *   secondary  surface + strong border — neutral
 *   tertiary   terracotta fill — the ONE rationed commit CTA per screen
 *              (Reserve / Pay / Confirm)
 *   danger     error text on errorBg
 *   ghost      text only
 *
 * Sizes sm/md/lg (all ≥44 effective via hitSlop). `loading` shows an inline
 * spinner in the foreground color, hides the label, and HOLDS the button width
 * stable. Fires a haptic on press and exposes accessibilityState.busy/disabled.
 */

import type { ComponentType } from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { theme } from '@/theme';
import { Text } from './Text';
import { tap as hapticTap, success as hapticSuccess } from './haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Leading Lucide icon component. */
  icon?: ComponentType<LucideProps>;
  /** Haptic to fire on press. Default 'tap'. */
  haptic?: 'tap' | 'success' | null;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const SIZE: Record<ButtonSize, { minHeight: number; paddingH: number; fontVariant: 'body-sm' | 'body' | 'body-lg' }> = {
  sm: { minHeight: 40, paddingH: theme.space.md, fontVariant: 'body-sm' },
  md: { minHeight: 48, paddingH: theme.space.lg, fontVariant: 'body' },
  lg: { minHeight: 52, paddingH: theme.space.xl, fontVariant: 'body-lg' },
};

function colorsFor(variant: ButtonVariant): { bg: string; fg: string; border?: string } {
  switch (variant) {
    case 'secondary':
      return { bg: theme.color.surface, fg: theme.color.text, border: theme.color.borderStrong };
    case 'tertiary':
      return { bg: theme.color.accent, fg: theme.color.textOnPrimary };
    case 'danger':
      return { bg: theme.color.errorBg, fg: theme.color.error };
    case 'ghost':
      return { bg: 'transparent', fg: theme.color.primary };
    case 'primary':
    default:
      return { bg: theme.color.primary, fg: theme.color.textOnPrimary };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  fullWidth = true,
  icon: Icon,
  haptic = 'tap',
  accessibilityLabel,
  style,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const { bg, fg, border } = colorsFor(variant);
  const dims = SIZE[size];

  function handlePress() {
    if (isDisabled) return;
    if (haptic === 'tap') hapticTap();
    else if (haptic === 'success') hapticSuccess();
    onPress();
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={handlePress}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? 6 : 0}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: dims.minHeight,
          paddingHorizontal: dims.paddingH,
          backgroundColor: bg,
        },
        variant !== 'ghost' && variant !== 'danger' && styles.shadow,
        border ? { borderWidth: 1.5, borderColor: border } : null,
        fullWidth ? styles.fullWidth : styles.auto,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {/* Keep the label in the tree while loading (visibility:hidden) so the
          button width never collapses; overlay the spinner. */}
      <View style={[styles.row, loading && styles.hidden]}>
        {Icon ? <Icon size={18} color={fg} style={styles.icon} /> : null}
        <Text variant={dims.fontVariant} weight="semibold" color={fg}>
          {label}
        </Text>
      </View>
      {loading ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.center}>
            <ActivityIndicator color={fg} />
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: { ...theme.shadow.xs },
  fullWidth: { alignSelf: 'stretch' },
  auto: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  icon: { marginEnd: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hidden: { opacity: 0 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.88 },
});
