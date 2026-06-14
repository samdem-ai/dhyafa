/**
 * Skeleton — a placeholder block with a Reanimated shimmer sweep, plus presets
 * mirroring real layouts. Honors reduce-motion: falls back to a static block.
 *
 * Presets: PropertyCardSkeleton, DetailSkeleton, RowSkeleton, ConversationSkeleton.
 * Legacy-compatible: <Skeleton style={...} /> and <SkeletonList count={n} />.
 */

import { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { theme } from '@/theme';
import { useReducedMotion } from './motion';

export interface SkeletonProps {
  style?: StyleProp<ViewStyle>;
  /** Border radius override. */
  radius?: number;
}

export function Skeleton({ style, radius }: SkeletonProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    progress.value = withRepeat(withTiming(1, { duration: theme.motion.duration.slow * 2 }), -1, true);
  }, [reduced, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reduced ? 0.6 : interpolate(progress.value, [0, 1], [0.45, 0.9]),
  }));

  return (
    <Animated.View
      style={[
        styles.block,
        radius != null ? { borderRadius: radius } : null,
        style,
        animatedStyle,
      ]}
    />
  );
}

/** A stack of property-card placeholders (legacy SkeletonList shape). */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </View>
  );
}

export function PropertyCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton style={styles.thumb} />
      <View style={styles.lines}>
        <Skeleton style={styles.lineWide} />
        <Skeleton style={styles.lineNarrow} />
        <Skeleton style={styles.linePrice} />
      </View>
    </View>
  );
}

export function RowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton style={styles.avatar} />
      <View style={styles.rowLines}>
        <Skeleton style={styles.lineWide} />
        <Skeleton style={styles.lineNarrow} />
      </View>
    </View>
  );
}

export function ConversationSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </View>
  );
}

export function DetailSkeleton() {
  return (
    <View>
      <Skeleton style={styles.hero} radius={0} />
      <View style={styles.detailBody}>
        <Skeleton style={styles.lineTitle} />
        <Skeleton style={styles.lineWide} />
        <Skeleton style={styles.lineNarrow} />
        <Skeleton style={styles.detailBlock} />
        <Skeleton style={styles.detailBlock} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.sm,
  },
  list: { gap: theme.space.md, padding: theme.space.xl },
  card: {
    flexDirection: 'row',
    gap: theme.space.md,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.md,
    ...theme.shadow.card,
  },
  thumb: { width: 84, height: 84, borderRadius: theme.radius.md },
  lines: { flex: 1, justifyContent: 'center', gap: theme.space.sm },
  lineWide: { height: 16, width: '80%' },
  lineNarrow: { height: 12, width: '50%' },
  linePrice: { height: 14, width: '35%' },
  lineTitle: { height: 24, width: '70%' },
  row: {
    flexDirection: 'row',
    gap: theme.space.md,
    alignItems: 'center',
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  rowLines: { flex: 1, gap: theme.space.sm },
  hero: { width: '100%', height: 280 },
  detailBody: { padding: theme.space.xl, gap: theme.space.md },
  detailBlock: { height: 80, width: '100%', borderRadius: theme.radius.md },
});
