/**
 * Chip — a selectable / filter pill. Selected = teal border + info tint.
 * Optional Lucide icon, a count badge, and a removable × for active filters.
 */

import type { ComponentType } from 'react';
import { Pressable, View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { X } from 'lucide-react-native';
import { theme } from '@/theme';
import { Text } from './Text';
import { selection as hapticSelection } from './haptics';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ComponentType<LucideProps>;
  /** Optional count shown after the label. */
  count?: number;
  /** When set, renders a × that calls this instead of toggling. */
  onRemove?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon: Icon,
  count,
  onRemove,
  style,
  testID,
}: ChipProps) {
  const fg = selected ? theme.color.primary : theme.color.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        if (onPress) {
          hapticSelection();
          onPress();
        }
      }}
      style={[styles.chip, selected && styles.chipActive, style]}
    >
      {Icon ? <Icon size={16} color={fg} /> : null}
      <Text variant="body-sm" weight={selected ? 'semibold' : 'medium'} color={fg}>
        {label}
        {typeof count === 'number' ? ` (${count})` : ''}
      </Text>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          hitSlop={8}
          onPress={onRemove}
        >
          <View style={styles.removeWrap}>
            <X size={14} color={fg} />
          </View>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    minHeight: 36,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  chipActive: { borderColor: theme.color.primary, backgroundColor: theme.color.infoBg },
  removeWrap: { marginStart: 2 },
});
