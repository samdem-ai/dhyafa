/**
 * StarRating — a tappable 1-5 star segmented control (M3 reviews).
 *
 * Interactive when `onChange` is provided (review form); otherwise a static
 * display of a score. Terracotta star to match the brand (never yellow), in
 * line with the rating row in src/components/discovery.tsx. RTL-aware: the row
 * follows the ambient writing direction so star 1 sits on the leading edge.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const STARS = [1, 2, 3, 4, 5] as const;

export function StarRating({
  value,
  onChange,
  size = 28,
  accessibilityLabel,
}: {
  /** Current score 0-5 (0 = unrated). */
  value: number;
  /** When provided, stars are tappable. */
  onChange?: (v: number) => void;
  size?: number;
  accessibilityLabel?: string;
}) {
  const interactive = typeof onChange === 'function';

  return (
    <View
      style={styles.row}
      accessibilityRole={interactive ? 'adjustable' : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 5, now: value }}
    >
      {STARS.map((n) => {
        const filled = n <= value;
        const glyph = (
          <Text style={[styles.star, { fontSize: size }, filled ? styles.filled : styles.empty]}>
            {filled ? '★' : '☆'}
          </Text>
        );
        if (!interactive) {
          return (
            <View key={n} style={styles.starWrap}>
              {glyph}
            </View>
          );
        }
        return (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${accessibilityLabel ?? ''} ${n}`}
            onPress={() => onChange?.(n)}
            hitSlop={4}
            style={styles.starWrap}
          >
            {glyph}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  starWrap: { paddingHorizontal: 1 },
  star: { lineHeight: undefined },
  filled: { color: theme.color.ratingStar },
  empty: { color: theme.color.borderStrong },
});
