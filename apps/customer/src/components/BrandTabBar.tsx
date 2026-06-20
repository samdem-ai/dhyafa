/**
 * BrandTabBar — the custom-styled bottom tab bar, rendered by expo-router's
 * <Tabs> via its `tabBar={}` render prop.
 *
 * We keep the brand look (surface bar, teal active tint, terracotta accent dot,
 * safe-area bottom inset) of the previous custom TabBar but drive it off the
 * React Navigation tab state — so we get lazy mount, per-tab state preservation,
 * and accessibility for free instead of the old <Slot/> + router.replace() bar
 * that destroyed per-tab state and triggered useFocusEffect refetch storms.
 *
 * Icons are real Lucide glyphs: active = teal, slightly heavier stroke + a
 * filled tint; inactive = muted ink. Inbox + Trips carry unread badges wired to
 * the lightweight useUnreadCounts() query.
 */

import type { ComponentType } from 'react';
import { View, Pressable, StyleSheet, I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  Compass,
  Heart,
  Briefcase,
  MessageCircle,
  User,
  type LucideProps,
} from 'lucide-react-native';
import { formatNumber, type Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { Text } from '@/ui';
import { useUnreadCounts } from '@/lib/queries';

/** Which unread count (if any) decorates a given route. */
type BadgeKind = 'inbox' | 'trips' | null;

interface TabMeta {
  icon: ComponentType<LucideProps>;
  badge: BadgeKind;
}

// Keyed by the route name (file name under app/(tabs)).
const TAB_META: Record<string, TabMeta> = {
  index: { icon: Compass, badge: null },
  wishlists: { icon: Heart, badge: null },
  trips: { icon: Briefcase, badge: 'trips' },
  inbox: { icon: MessageCircle, badge: 'inbox' },
  profile: { icon: User, badge: null },
};

export function BrandTabBar({ state, descriptors, navigation, locale }: BottomTabBarProps & { locale: Locale }) {
  const insets = useSafeAreaInsets();
  const { data: unread } = useUnreadCounts();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, theme.space.sm) }]}>
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name] ?? { icon: Compass, badge: null };
        const { options } = descriptors[route.key]!;
        const focused = state.index === index;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : (options.title ?? route.name);

        const Icon = meta.icon;
        const count =
          meta.badge === 'inbox' ? (unread?.inbox ?? 0)
          : meta.badge === 'trips' ? (unread?.trips ?? 0)
          : 0;
        const showBadge = count > 0;
        const badgeText = count > 9 ? '9+' : formatNumber(count, locale);

        function onPress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        function onLongPress() {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.item}
            hitSlop={4}
          >
            <View style={styles.iconWrap}>
              <Icon
                size={24}
                color={focused ? theme.color.primary : theme.color.textMuted}
                strokeWidth={focused ? 2.4 : 2}
                fill={focused ? theme.color.teal100 : 'transparent'}
              />
              {showBadge ? (
                <View style={styles.badge}>
                  <Text variant="overline" weight="bold" color="textOnPrimary" center style={styles.badgeText}>
                    {badgeText}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              variant="overline"
              weight={focused ? 'semibold' : 'medium'}
              color={focused ? 'primary' : 'textMuted'}
              numberOfLines={1}
            >
              {label}
            </Text>
            {focused ? <View style={styles.activeDot} /> : <View style={styles.dotSpacer} />}
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
  iconWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -4,
    right: I18nManager.isRTL ? undefined : -8,
    left: I18nManager.isRTL ? -8 : undefined,
    minWidth: 16,
    height: 16,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: theme.color.surface,
  },
  badgeText: { fontSize: 9, lineHeight: 12 },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
    marginTop: 2,
  },
  dotSpacer: { width: 5, height: 5, marginTop: 2 },
});
