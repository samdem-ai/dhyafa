/**
 * Custom bottom tab bar.
 *
 * We render our own tab bar (instead of expo-router's <Tabs>) because
 * @react-navigation/bottom-tabs is NOT a dependency of this app and we must not
 * add native deps. The (tabs) layout renders the active child via <Slot/> and
 * this bar switches between the tab routes with router.replace(), highlighting
 * the active one from usePathname(). RTL-aware + safe-area padded; brand teal
 * active tint, terracotta accent dot.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';
import { L, pick } from '@/lib/copy';

export interface TabDef {
  /** Absolute route path for this tab. */
  href: string;
  /** Emoji glyph (no vector-icons dependency available). */
  glyph: string;
  label: string;
}

export function useTabDefs(locale: Locale): TabDef[] {
  return [
    { href: '/(tabs)', glyph: '🔍', label: pick(L.exploreGreeting, locale) },
    { href: '/(tabs)/trips', glyph: '🧳', label: pick(L.tripsTitle, locale) },
    { href: '/(tabs)/inbox', glyph: '💬', label: pick(L.inbox, locale) },
    { href: '/(tabs)/wishlists', glyph: '🤍', label: pick(L.wishlists, locale) },
    { href: '/(tabs)/profile', glyph: '👤', label: pick(L.profileTitle, locale) },
  ];
}

/** Does the current pathname belong to this tab? */
function isActive(pathname: string, href: string): boolean {
  // Normalize the Explore index: pathname is '/' (or '') when on (tabs)/index.
  if (href === '/(tabs)') {
    return pathname === '/' || pathname === '' || pathname === '/(tabs)';
  }
  const leaf = href.replace('/(tabs)', '');
  return pathname === leaf || pathname.startsWith(`${leaf}/`);
}

export function TabBar({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const tabs = useTabDefs(locale);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, theme.space.sm) }]}>
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Pressable
            key={tab.href}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (!active) router.replace(tab.href as Href);
            }}
            style={styles.item}
            hitSlop={4}
          >
            <Text style={[styles.glyph, active && styles.glyphActive]}>{tab.glyph}</Text>
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
            {active ? <View style={styles.activeDot} /> : <View style={styles.dotSpacer} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: theme.color.surface,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    paddingTop: theme.space.sm,
    ...theme.shadow.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  glyph: { fontSize: 22, opacity: 0.55 },
  glyphActive: { opacity: 1 },
  label: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.overline,
    color: theme.color.textMuted,
  },
  labelActive: {
    fontFamily: RN_FONTS.bodySemiBold,
    color: theme.color.primary,
    fontWeight: '600',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
    marginTop: 2,
  },
  dotSpacer: { width: 5, height: 5, marginTop: 2 },
});
