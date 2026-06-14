/**
 * RatingStars — terracotta stars (never yellow), with half-star display support.
 *
 * Display mode (no onChange): renders filled / half / empty stars for a 0–5
 * fractional score. Interactive mode (onChange): tappable whole-star selection
 * with a selection haptic per tap (review form).
 */

import { View, Pressable, StyleSheet } from 'react-native';
import { Star, StarHalf } from 'lucide-react-native';
import { theme } from '@/theme';
import { selection as hapticSelection } from './haptics';

const STARS = [1, 2, 3, 4, 5] as const;

export interface RatingStarsProps {
  /** Score 0–5 (fractional allowed in display mode). */
  value: number;
  /** When provided, stars are tappable (whole-star selection). */
  onChange?: (v: number) => void;
  size?: number;
  accessibilityLabel?: string;
  testID?: string;
}

export function RatingStars({
  value,
  onChange,
  size = 24,
  accessibilityLabel,
  testID,
}: RatingStarsProps) {
  const interactive = typeof onChange === 'function';
  const fill = theme.color.ratingStar;
  const empty = theme.color.borderStrong;

  function renderStar(n: number) {
    const diff = value - (n - 1);
    if (diff >= 1) {
      return <Star size={size} color={fill} fill={fill} />;
    }
    if (diff >= 0.5 && !interactive) {
      return <StarHalf size={size} color={fill} fill={fill} />;
    }
    return <Star size={size} color={empty} fill="transparent" />;
  }

  return (
    <View
      testID={testID}
      style={styles.row}
      accessibilityRole={interactive ? 'adjustable' : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 5, now: Math.round(value) }}
    >
      {STARS.map((n) => {
        if (!interactive) {
          return (
            <View key={n} style={styles.star}>
              {renderStar(n)}
            </View>
          );
        }
        return (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${accessibilityLabel ?? 'Rate'} ${n}`}
            onPress={() => {
              hapticSelection();
              onChange?.(n);
            }}
            hitSlop={6}
            style={styles.star}
          >
            {renderStar(n)}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  star: { paddingHorizontal: 1 },
});
