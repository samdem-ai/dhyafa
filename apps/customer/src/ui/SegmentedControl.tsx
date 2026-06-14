/**
 * SegmentedControl — 2–3 options on a sunken track with the active pill on a
 * raised surface. Powers Trips buckets, locale tabs, and the Travelling ↔
 * Hosting toggle. Fires a selection haptic on switch.
 */

import { View, Pressable, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { theme } from '@/theme';
import { Text } from './Text';
import { selection as hapticSelection } from './haptics';

export interface SegmentOption<T> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  style,
  testID,
}: SegmentedControlProps<T>) {
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      style={[styles.track, style]}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              if (!isActive) {
                hapticSelection();
                onChange(opt.value);
              }
            }}
            style={[styles.segment, isActive && styles.segmentActive]}
          >
            <Text
              variant="body-sm"
              weight={isActive ? 'semibold' : 'medium'}
              color={isActive ? 'text' : 'textMuted'}
              numberOfLines={1}
              center
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.pill,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.pill,
  },
  segmentActive: { backgroundColor: theme.color.surface, ...theme.shadow.xs },
});
