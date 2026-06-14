/**
 * Avatar — expo-image photo with a deterministic initials fallback.
 */

import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '@/theme';
import { Text } from './Text';

const SIZES = { sm: 32, md: 44, lg: 64 } as const;
export type AvatarSize = keyof typeof SIZES;

/** Deterministic tint from a string so the same name always gets the same color. */
const TINTS = [theme.color.teal600, theme.color.terracotta600, theme.color.sand700, theme.color.teal700];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '?').slice(0, 1).toUpperCase();
  return `${(parts[0] ?? '').slice(0, 1)}${(parts[parts.length - 1] ?? '').slice(0, 1)}`.toUpperCase();
}

function tintFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length] as string;
}

export interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  testID?: string;
}

export function Avatar({ uri, name = '', size = 'md', testID }: AvatarProps) {
  const dim = SIZES[size];
  const tint = useMemo(() => tintFor(name || 'guest'), [name]);

  if (uri) {
    return (
      <Image
        testID={testID}
        source={{ uri }}
        accessibilityLabel={name || undefined}
        style={[styles.base, { width: dim, height: dim, borderRadius: dim / 2 }]}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <View
      testID={testID}
      accessibilityLabel={name || undefined}
      style={[styles.base, styles.fallback, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: tint }]}
    >
      <Text
        weight="semibold"
        color="textOnPrimary"
        style={{ fontSize: dim * 0.4, lineHeight: dim * 0.45 }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: theme.color.surfaceSunken },
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
