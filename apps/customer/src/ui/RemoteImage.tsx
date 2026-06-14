/**
 * RemoteImage — expo-image with blur-up placeholder + disk/memory cache.
 *
 * Replacement for the legacy RemoteImage (raw <Image> + infinite pulse loop).
 * Pass an already-resolved URL (see resolvePhotoUrl in lib/discovery.ts). On a
 * null/empty source it renders a branded sunken tile.
 */

import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageContentFit, type ImageStyle } from 'expo-image';
import { theme } from '@/theme';

const BLURHASH = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4';

export interface RemoteImageProps {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  radius?: number;
  alt?: string;
  contentFit?: ImageContentFit;
}

export function RemoteImage({ uri, style, radius = 0, alt, contentFit = 'cover' }: RemoteImageProps) {
  if (!uri) {
    return <View style={[styles.fallback, { borderRadius: radius }, style as StyleProp<ViewStyle>]} />;
  }
  return (
    <Image
      source={{ uri }}
      accessibilityLabel={alt}
      accessible={Boolean(alt)}
      placeholder={{ blurhash: BLURHASH }}
      contentFit={contentFit}
      transition={250}
      cachePolicy="memory-disk"
      style={[styles.img, { borderRadius: radius }, style]}
    />
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: theme.color.surfaceSunken },
  fallback: { backgroundColor: theme.color.surfaceSunken },
});
