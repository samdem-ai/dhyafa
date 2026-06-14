/**
 * Card — a surface container with the brand card shadow and rounded corners.
 * `flat` variant drops the shadow for a border-only look in dense lists.
 */

import type { ReactNode } from 'react';
import { View, Pressable, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { theme } from '@/theme';
import { tap } from './haptics';

export interface CardProps {
  children: ReactNode;
  variant?: 'elevated' | 'flat';
  /** Makes the whole card pressable. */
  onPress?: () => void;
  /** Inner padding. Default 'lg'. Pass 'none' for media-edge cards. */
  padding?: keyof typeof theme.space | 'none';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Card({
  children,
  variant = 'elevated',
  onPress,
  padding = 'lg',
  style,
  accessibilityLabel,
  testID,
}: CardProps) {
  const pad = padding === 'none' ? 0 : theme.space[padding];
  const base: StyleProp<ViewStyle> = [
    styles.card,
    variant === 'elevated' ? styles.elevated : styles.flat,
    { padding: pad },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
          tap();
          onPress();
        }}
        style={({ pressed }) => [base, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={base}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
  },
  elevated: { ...theme.shadow.card },
  flat: { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.color.border },
  pressed: { opacity: 0.9 },
});
