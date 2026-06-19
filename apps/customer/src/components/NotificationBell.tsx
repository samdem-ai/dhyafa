/**
 * NotificationBell (M3) — a header bell with an unread badge.
 *
 * Polls the unread count on focus and subscribes to realtime INSERTs on the
 * caller's notifications so the badge stays live while the app is foregrounded.
 * Tapping opens the notifications screen. Renders nothing meaningful for
 * signed-out users (still a bell, but count 0 / no badge).
 *
 * Redesign (Airbnb-style): outline lucide `Bell` glyph (never emoji), badge text
 * through the locale-aware <Text> primitive (never hand-rolled RN_FONTS).
 */

import { useCallback, useEffect, useId, useState } from 'react';
import { View, Pressable, StyleSheet, I18nManager } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Bell } from 'lucide-react-native';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Locale } from '@dyafa/i18n';
import { formatNumber } from '@dyafa/i18n';
import { supabaseClient } from '@/lib/supabase';
import { useSession } from '@/lib/auth';
import { unreadNotificationCount, type NotificationRow } from '@/lib/notifications';
import { L, pick } from '@/lib/copy';
import { theme } from '@/theme';
import { Text } from '@/ui';

export function NotificationBell({ locale }: { locale: Locale }) {
  const { user } = useSession();
  const myUid = user?.id ?? null;
  const [count, setCount] = useState(0);
  // Unique per component instance so two mounted bells (inbox + trips tabs, both
  // kept alive by the Tabs navigator) don't collide on the same channel topic —
  // supabase-js dedupes by topic, which would make the second .on() throw and
  // either bell's unmount tear down the shared channel.
  const instanceId = useId();

  const refresh = useCallback(async () => {
    if (!myUid) {
      setCount(0);
      return;
    }
    try {
      setCount(await unreadNotificationCount());
    } catch {
      // Non-fatal: leave the last known count.
    }
  }, [myUid]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  // Realtime: keep the badge live for inserts + read-state updates.
  useEffect(() => {
    if (!myUid) return;
    const channel = supabaseClient
      .channel(`notif-bell:${myUid}:${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${myUid}` },
        (_payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          void refresh();
        },
      )
      .subscribe();
    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [myUid, instanceId, refresh]);

  const showBadge = count > 0;
  const badgeText = count > 9 ? '9+' : formatNumber(count, locale);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pick(L.notifications, locale)}
      onPress={() => router.push('/notifications')}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Bell size={22} color={theme.color.text} strokeWidth={2} />
      {showBadge ? (
        <View style={styles.badge}>
          <Text variant="overline" weight="bold" color="white" center style={styles.badgeText}>
            {badgeText}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: 2,
    // Leading-corner badge in both directions.
    right: I18nManager.isRTL ? undefined : 2,
    left: I18nManager.isRTL ? 2 : undefined,
    minWidth: 18,
    height: 18,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: theme.color.surface,
  },
  badgeText: { lineHeight: 14 },
});
