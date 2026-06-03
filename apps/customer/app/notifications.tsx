/**
 * Notifications screen (M3).
 *
 * Lists the caller's notifications (localized title/body), newest first. Tapping
 * one marks it read and routes by `type` + `data` (booking → /booking,
 * message → /conversation, review → /property). A "mark all read" action calls
 * mark_notifications_read(null). Realtime subscribes to the caller's notification
 * inserts so new ones appear live. Signed-out users see a sign-in prompt.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  I18nManager,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import type { Locale } from '@dyafa/i18n';
import { supabaseClient } from '@/lib/supabase';
import { useSession } from '@/lib/auth';
import {
  listNotifications,
  markNotificationsRead,
  notificationTitle,
  notificationBody,
  notificationRoute,
  notificationGlyph,
  type NotificationRow,
} from '@/lib/notifications';
import { SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { formatDateTime } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

export default function NotificationsScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;
  const { user, loading: sessionLoading } = useSession();
  const myUid = user?.id ?? null;

  const [data, setData] = useState<NotificationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!myUid) return;
    setError(null);
    try {
      const rows = await listNotifications();
      setData(rows);
    } catch {
      setError(pick(L.loadError, locale));
      setData([]);
    }
  }, [myUid, locale]);

  useFocusEffect(
    useCallback(() => {
      if (myUid) void load();
    }, [myUid, load]),
  );

  // Realtime: prepend new notifications live.
  useEffect(() => {
    if (!myUid) return;
    const channel = supabaseClient
      .channel(`notif:${myUid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${myUid}` },
        (payload: RealtimePostgresInsertPayload<NotificationRow>) => {
          setData((prev) => {
            const list = prev ?? [];
            if (list.some((n) => n.id === payload.new.id)) return list;
            return [payload.new, ...list];
          });
        },
      )
      .subscribe();
    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [myUid]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const hasUnread = (data ?? []).some((n) => n.read_at == null);

  async function onMarkAll() {
    // Optimistic: stamp everything read locally, then persist.
    const now = new Date().toISOString();
    setData((prev) => (prev ?? []).map((n) => (n.read_at ? n : { ...n, read_at: now })));
    try {
      await markNotificationsRead(null);
    } catch {
      void load();
    }
  }

  async function onTap(n: NotificationRow) {
    // Mark this one read (optimistic) then route.
    if (n.read_at == null) {
      const now = new Date().toISOString();
      setData((prev) => (prev ?? []).map((x) => (x.id === n.id ? { ...x, read_at: now } : x)));
      void markNotificationsRead([n.id]).catch(() => undefined);
    }
    const route = notificationRoute(n);
    if (route) router.push(route);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.topBack}>{I18nManager.isRTL ? '→' : '←'}</Text>
        </Pressable>
        <Text style={styles.topTitle}>{pick(L.notifications, locale)}</Text>
        {hasUnread ? (
          <Pressable accessibilityRole="button" onPress={() => void onMarkAll()} hitSlop={8}>
            <Text style={styles.markAll}>{pick(L.markAllRead, locale)}</Text>
          </Pressable>
        ) : (
          <View style={styles.topSpacer} />
        )}
      </View>

      {!user && !sessionLoading ? (
        <EmptyState
          emoji="🔔"
          title={pick(L.notifications, locale)}
          subtitle={pick(L.signInToSeeNotifications, locale)}
        />
      ) : data === null ? (
        <SkeletonList count={5} />
      ) : error && data.length === 0 ? (
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.search, locale)} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          ListEmptyComponent={
            <EmptyState
              emoji="🔔"
              title={pick(L.notificationsEmptyTitle, locale)}
              subtitle={pick(L.notificationsEmptyBody, locale)}
            />
          }
          renderItem={({ item }) => (
            <NotificationCard notification={item} locale={locale} onPress={() => void onTap(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function NotificationCard({
  notification,
  locale,
  onPress,
}: {
  notification: NotificationRow;
  locale: Locale;
  onPress: () => void;
}) {
  const unread = notification.read_at == null;
  const title = notificationTitle(notification, locale);
  const body = notificationBody(notification, locale);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, unread && styles.cardUnread, pressed && styles.pressed]}
    >
      <Text style={styles.glyph}>{notificationGlyph(notification)}</Text>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, unread && styles.cardTitleUnread]} numberOfLines={2}>
          {title}
        </Text>
        {body ? (
          <Text style={styles.cardText} numberOfLines={3}>
            {body}
          </Text>
        ) : null}
        <Text style={styles.cardTime}>{formatDateTime(notification.created_at, locale)}</Text>
      </View>
      {unread ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  pressed: { opacity: 0.92 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    gap: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
  topBack: { fontFamily: RN_FONTS.bodyBold, fontSize: theme.fontSize['heading-3'], color: theme.color.text },
  topTitle: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-3'],
    fontWeight: '600',
    color: theme.color.text,
    textAlign: 'center',
  },
  markAll: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['body-sm'],
    fontWeight: '600',
    color: theme.color.accent,
  },
  topSpacer: { width: 24 },

  listContent: { padding: theme.space.xl, gap: theme.space.md, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    gap: theme.space.md,
    alignItems: 'flex-start',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    ...theme.shadow.card,
  },
  cardUnread: { backgroundColor: theme.color.infoBg },
  glyph: { fontSize: 22, marginTop: 2 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  cardTitleUnread: { color: theme.color.text },
  cardText: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    lineHeight: theme.lineHeight['body-sm'],
    textAlign,
  },
  cardTime: {
    fontFamily: RN_FONTS.bodyRegular,
    fontSize: theme.fontSize.overline,
    color: theme.color.textMuted,
    marginTop: theme.space.xs,
    textAlign,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
    marginTop: 6,
  },
});
