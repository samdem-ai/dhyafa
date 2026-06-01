/**
 * RemoteImage — a photography-forward image with a "blur-up" placeholder and a
 * branded fallback for failed/empty sources.
 *
 * We use React Native's built-in <Image> (expo-image is not a dependency of
 * this app, and we must not add native deps). The blur-up is approximated with
 * a tinted skeleton-pulse placeholder shown until the image loads; on error we
 * render a branded fallback tile.
 *
 * Source resolution is the caller's job: pass an already-resolved URL (see
 * resolvePhotoUrl in src/lib/discovery.ts) which renders http(s) URLs directly
 * and builds a public URL from a bucket key otherwise.
 */

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from 'react-native';
import { theme } from '@/theme';

export interface RemoteImageProps {
  uri: string | null | undefined;
  style?: StyleProp<ViewStyle>;
  /** borderRadius applied to the image + placeholder. */
  radius?: number;
  /** Accessibility label for the image. */
  alt?: string;
  resizeMode?: 'cover' | 'contain';
}

export function RemoteImage({ uri, style, radius = 0, alt, resizeMode = 'cover' }: RemoteImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.5)).current;

  // Reset state when the source changes.
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    fade.setValue(0);
  }, [uri, fade]);

  // Placeholder pulse while loading.
  useEffect(() => {
    if (loaded || failed) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: theme.motion.duration.slow,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: theme.motion.duration.slow,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [loaded, failed, pulse]);

  function onLoad() {
    setLoaded(true);
    Animated.timing(fade, {
      toValue: 1,
      duration: theme.motion.duration.base,
      useNativeDriver: true,
    }).start();
  }

  const imageStyle: ImageStyle = { borderRadius: radius };

  return (
    <View style={[styles.wrap, { borderRadius: radius }, style]}>
      {/* Placeholder / fallback layer (always behind the image). */}
      {!loaded || failed ? (
        failed || !uri ? (
          <View style={[styles.fallback, { borderRadius: radius }]}>
            <Text style={styles.fallbackGlyph}>🏚️</Text>
          </View>
        ) : (
          <Animated.View style={[styles.placeholder, { borderRadius: radius, opacity: pulse }]} />
        )
      ) : null}

      {uri && !failed ? (
        <Animated.Image
          source={{ uri }}
          accessibilityLabel={alt}
          accessible={!!alt}
          resizeMode={resizeMode}
          onLoad={onLoad}
          onError={() => setFailed(true)}
          style={[StyleSheet.absoluteFill, imageStyle, { opacity: fade }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: theme.color.surfaceSunken,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.surfaceSunken,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackGlyph: {
    fontSize: 32,
    opacity: 0.5,
  },
});

// Plain raw Image re-export (kept so callers needing the built-in directly can
// import from one place if ever required).
export { Image as RawImage };
