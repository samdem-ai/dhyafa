/**
 * WishlistHeart (Phase 5a) — a reusable save toggle.
 *
 * A filled/outline Lucide heart that:
 *  - reflects the user's saved state from useWishlistIds() (filled = saved),
 *  - toggles OPTIMISTICALLY via useToggleWishlist() with a selection haptic,
 *  - routes a signed-out user to /(auth)/sign-in?next=<current path> instead of
 *    toggling (so they return where they were and can then save).
 *
 * Two visual variants: `overlay` (a translucent scrim chip for the top-right of a
 * card photo) and `plain` (a bare icon for the property-detail header, where it
 * sits on the gallery scrim). RTL-safe: callers position it with logical props.
 */

import { useCallback } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react-native';
import type { Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { useSession } from '@/lib/auth';
import { useToggleWishlist, useWishlistIds } from '@/lib/queries';
import { L, pick } from '@/lib/copy';
import { selection } from './haptics';

export type WishlistHeartVariant = 'overlay' | 'plain';

export interface WishlistHeartProps {
  propertyId: string;
  locale: Locale;
  variant?: WishlistHeartVariant;
  /** Icon size; defaults to 20 for overlay, 24 for plain. */
  size?: number;
  /** White heart for dark/photo backdrops (plain over a gallery scrim). */
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function WishlistHeart({
  propertyId,
  locale,
  variant = 'overlay',
  size,
  onDark = false,
  style,
  testID,
}: WishlistHeartProps) {
  const { user } = useSession();
  const pathname = usePathname();
  const { data: ids } = useWishlistIds();
  const toggle = useToggleWishlist();
  // Keep i18n subscribed so RTL/locale changes re-render the label.
  useTranslation('common');

  const saved = ids?.has(propertyId) ?? false;
  const iconSize = size ?? (variant === 'plain' ? 24 : 20);

  const onPress = useCallback(() => {
    if (!user) {
      const next = encodeURIComponent(pathname || '/');
      router.push(`/(auth)/sign-in?next=${next}`);
      return;
    }
    selection();
    toggle.mutate(propertyId);
  }, [user, pathname, toggle, propertyId]);

  const fill = saved ? theme.color.accent : 'transparent';
  const stroke = saved ? theme.color.accent : onDark ? theme.color.white : theme.color.text;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={pick(saved ? L.removeFromWishlist : L.saveToWishlist, locale)}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        variant === 'overlay' && styles.overlay,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Heart size={iconSize} color={stroke} fill={fill} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  },
  overlay: {
    backgroundColor: theme.color.overlay,
  },
  pressed: { opacity: 0.7 },
});
