/**
 * Notifications screen (Phase 5a rework onto src/ui).
 *
 * Lists the caller's notifications (localized title/body, newest first) on the
 * TanStack useNotifications() cache. Unread rows (read_at null) are visually
 * distinct (tinted surface + an accent dot + a "New" badge). On focus we mark
 * every unread row read via mark_notifications_read, and on tap we mark that one
 * read too — then invalidate useNotifications + useUnreadCounts so the bell + tab
 * badges clear immediately. Tapping routes by `type` + `data`:
 *   booking_*       → /booking/<booking_id>
 *   message_*       → /conversation/<conversation_id>
 *   property_*      → /property/<property_id>
 *   host_verified   → /host
 *   review_*        → /property | /booking
 * Realtime keeps the list live; the row's title_ar/fr/en drive localization.
 * Built on Screen/Header/ListItem/Badge with a skeleton, empty state, and
 * pull-to-refresh. Signed-out users see a sign-in prompt.
 */

import { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Bell } from 'lucide-react-native';
import type { Locale } from '@dyafa/i18n';
import { supabaseClient } from '@/lib/supabase';
import { useSession } from '@/lib/auth';
import { useNotifications, queryKeys } from '@/lib/queries';
import {
  markNotificationsRead,
  notificationTitle,
  notificationBody,
  notificationRoute,
  notificationGlyph,
  type NotificationRow,
} from '@/lib/notifications';
import {
  Screen,
  Header,
  Text,
  ListItem,
  Badge,
  List,
  ConversationSkeleton,
  EmptyState,
  ErrorState,
} from '@/ui';
import { L, pick } from '@/lib/copy';
import { formatDateTime } from '@/lib/dateFormat';
import { theme } from '@/theme';

export default function NotificationsScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { user, loading: sessionLoading } = useSession();
  const myUid = user?.id ?? null;
  const qc = useQueryClient();

  const { data, isPending, isError, refetch, isRefetching } = useNotifications();

  /** Invalidate the notifications list + the unread badge sources. */
  const invalidateReadState = useCallback(() => {
    if (!myUid) return;
    void qc.invalidateQueries({ queryKey: queryKeys.notifications(myUid) });
    void qc.invalidateQueries({ queryKey: ['unreadCounts', myUid] });
  }, [qc, myUid]);

  // Mark every unread row read on focus (once per fresh unread set), so the bell
  // + tab badge clear when the screen is seen. Guard against re-marking the same
  // ids on every focus tick.
  const markedRef = useRef<string>('');
  useFocusEffect(
    useCallback(() => {
      if (!myUid || !data) return;
      const unreadIds = data.filter((n) => n.read_at == null).map((n) => n.id);
      if (unreadIds.length === 0) return;
      const sig = unreadIds.join(',');
      if (markedRef.current === sig) return;
      markedRef.current = sig;
      markNotificationsRead(unreadIds)
        .then(() => invalidateReadState())
        .catch(() => {
          markedRef.current = '';
        });
    }, [myUid, data, invalidateReadState]),
  );

  // Realtime: refresh the list on any change to the caller's notifications.
  useEffect(() => {
    if (!myUid) return;
    const channel = supabaseClient
      .channel(`notif:${myUid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${myUid}` },
        (_payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          void refetch();
        },
      )
      .subscribe();
    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [myUid, refetch]);

  const onTap = useCallback(
    (n: NotificationRow) => {
      if (n.read_at == null) {
        markNotificationsRead([n.id])
          .then(() => invalidateReadState())
          .catch(() => undefined);
      }
      const route = notificationRoute(n);
      if (route) router.push(route as Href);
    },
    [invalidateReadState],
  );

  return (
    <Screen edges={['top']}>
      <Header title={pick(L.notifications, locale)} onBack={() => router.back()} />

      {!user && !sessionLoading ? (
        <EmptyState
          icon={Bell}
          title={pick(L.notifications, locale)}
          subtitle={pick(L.signInToSeeNotifications, locale)}
        />
      ) : isPending ? (
        <ConversationSkeleton count={6} />
      ) : isError ? (
        <ErrorState
          message={pick(L.loadError, locale)}
          onRetry={() => void refetch()}
          retryLabel={pick(L.search, locale)}
        />
      ) : (
        <List<NotificationRow>
          data={data ?? []}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          emptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon={Bell}
                title={pick(L.notificationsEmptyTitle, locale)}
                subtitle={pick(L.notificationsEmptyBody, locale)}
              />
            </View>
          }
          renderItem={({ item }) => (
            <NotificationRowItem notification={item} locale={locale} onPress={() => onTap(item)} />
          )}
        />
      )}
    </Screen>
  );
}

function NotificationRowItem({
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
  const time = formatDateTime(notification.created_at, locale);

  return (
    <ListItem
      title={title}
      subtitle={[body, time].filter(Boolean).join('\n')}
      onPress={onPress}
      chevron={false}
      style={[styles.row, unread && styles.rowUnread]}
      leading={
        <View style={styles.glyphWrap}>
          <Text style={styles.glyph}>{notificationGlyph(notification)}</Text>
        </View>
      }
      trailing={
        unread ? <Badge label={pick(L.unreadBadge, locale)} tone="info" /> : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: { paddingVertical: theme.space.sm, flexGrow: 1 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: theme.color.border },
  row: { alignItems: 'flex-start' },
  rowUnread: { backgroundColor: theme.color.infoBg },
  glyphWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 20 },
  emptyWrap: { flex: 1, paddingTop: theme.space['4xl'] },
});
