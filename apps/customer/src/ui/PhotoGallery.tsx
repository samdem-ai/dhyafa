/**
 * Carousel + PhotoGallery — horizontally paged expo-image viewers.
 *
 * Carousel is the generic paged container with page dots. PhotoGallery is the
 * property-hero specialization: paged photos with a "3 / 12" counter overlay.
 *
 * RTL: paging mirrors so a swipe toward the writing-direction start advances.
 */

import { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  I18nManager,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { theme } from '@/theme';
import { Text } from './Text';

export interface CarouselProps {
  /** Image URIs in logical order. */
  uris: string[];
  /** Height of the carousel. Width = screen width. */
  height: number;
  /** Accessibility label prefix per image (e.g. "Photo"). */
  altPrefix?: string;
  /** Show the dot indicators. Default true. */
  showDots?: boolean;
  testID?: string;
}

export function Carousel({ uris, height, altPrefix = 'Photo', showDots = true, testID }: CarouselProps) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  // Under RTL, content is laid out start-to-end (right-to-left); reverse the
  // visual order so logical index 0 is the first page shown.
  const ordered = I18nManager.isRTL ? [...uris].reverse() : uris;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      const logical = I18nManager.isRTL ? uris.length - 1 - idx : idx;
      setPage(Math.max(0, Math.min(uris.length - 1, logical)));
    },
    [width, uris.length],
  );

  return (
    <View testID={testID} style={{ width, height }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {ordered.map((uri, i) => (
          <Image
            key={`${uri}-${i}`}
            source={{ uri }}
            accessibilityLabel={`${altPrefix} ${i + 1}`}
            style={{ width, height }}
            contentFit="cover"
            transition={200}
          />
        ))}
      </ScrollView>
      {showDots && uris.length > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {uris.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export interface PhotoGalleryProps {
  uris: string[];
  height: number;
  altPrefix?: string;
  testID?: string;
}

export function PhotoGallery({ uris, height, altPrefix = 'Photo', testID }: PhotoGalleryProps) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const ordered = I18nManager.isRTL ? [...uris].reverse() : uris;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      const logical = I18nManager.isRTL ? uris.length - 1 - idx : idx;
      setPage(Math.max(0, Math.min(uris.length - 1, logical)));
    },
    [width, uris.length],
  );

  return (
    <View testID={testID} style={{ width, height }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {ordered.map((uri, i) => (
          <Image
            key={`${uri}-${i}`}
            source={{ uri }}
            accessibilityLabel={`${altPrefix} ${i + 1}`}
            style={{ width, height }}
            contentFit="cover"
            transition={200}
          />
        ))}
      </ScrollView>
      {uris.length > 1 ? (
        <View style={styles.counter} pointerEvents="none">
          <Text variant="caption" weight="semibold" color="textOnPrimary">
            {page + 1} / {uris.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    position: 'absolute',
    bottom: theme.space.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.color.overlay,
  },
  dotActive: { backgroundColor: theme.color.white, width: 16 },
  counter: {
    position: 'absolute',
    bottom: theme.space.md,
    end: theme.space.md,
    backgroundColor: theme.color.overlay,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
  },
});
