/**
 * Inbox tab (P5b rework onto src/ui).
 *
 * Every conversation the signed-in user is part of (guest OR host side; RLS
 * scopes the rows). Each row uses src/ui Avatar + a two-line ListItem-style
 * layout: other party + property, last-message preview + time, and a real unread
 * treatment — bold preview + a count badge when the thread has incoming messages
 * with read_at null (derived per-conversation from useConversations()).
 *
 * Reads from the shared `conversations` TanStack query so the thread's
 * mark-read invalidation refreshes this list (clears the badge). Realtime message
 * INSERTs invalidate the same query so previews + ordering stay live. Empty +
 * signed-out states.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  I18nManager,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { formatNumber, type Locale } from '@dyafa/i18n';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase';
import { useSession } from '@/lib/auth';
import { useConversations, queryKeys } from '@/lib/queries';
import { conversationCoverUrl, type ConversationListItem, type MessageRow } from '@/lib/messaging';
import { localizedName } from '@/lib/discovery';
import { RemoteImage } from '@/components/RemoteImage';
import { Text, Avatar, SkeletonList, ErrorState, EmptyState } from '@/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { L, pick } from '@/lib/copy';
import { formatDateTime } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

export default function InboxScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { user, loading: sessionLoading } = useSession();
  const myUid = user?.id ?? null;
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useConversations();

  const [refreshing, setRefreshing] = useState(false);

  // Realtime: any new message refreshes the inbox previews + ordering + unread.
  useEffect(() => {
    if (!myUid) return;
    const channel = supabaseClient
      .channel(`inbox:${myUid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (_payload: RealtimePostgresInsertPayload<MessageRow>) => {
          void qc.invalidateQueries({ queryKey: queryKeys.conversations(myUid) });
          void qc.invalidateQueries({ queryKey: ['unreadCounts', myUid] });
        },
      )
      .subscribe();
    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [myUid, qc]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text variant="title" weight="semibold" color="primary" style={styles.title}>
          {pick(L.inbox, locale)}
        </Text>
        <NotificationBell locale={locale} />
      </View>

      {!user && !sessionLoading ? (
        <EmptyState emoji="💬" title={pick(L.inbox, locale)} subtitle={pick(L.signInToSeeInbox, locale)} />
      ) : isLoading || data === undefined ? (
        <SkeletonList count={4} />
      ) : isError ? (
        <ErrorState message={pick(L.loadError, locale)} onRetry={() => void refetch()} retryLabel={pick(L.tryAgain, locale)} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing || isRefetching} onRefresh={() => void onRefresh()} />
          }
          ListEmptyComponent={
            <EmptyState emoji="💬" title={pick(L.inboxEmptyTitle, locale)} subtitle={pick(L.inboxEmptyBody, locale)} />
          }
          renderItem={({ item }) => <ConversationRow item={item} locale={locale} />}
        />
      )}
    </SafeAreaView>
  );
}

function ConversationRow({ item, locale }: { item: ConversationListItem; locale: Locale }) {
  const propertyTitle = item.property
    ? localizedName(
        { name_ar: item.property.title_ar, name_fr: item.property.title_fr, name_en: item.property.title_en },
        locale,
      )
    : '';
  const cover = conversationCoverUrl(item);
  const name = item.otherPartyName || pick(L.messages, locale);
  const preview = item.lastMessage?.body ?? pick(L.noMessagesYet, locale);
  const time = item.lastMessage ? formatDateTime(item.lastMessage.created_at, locale) : '';
  const unread = item.unread;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => router.push(`/conversation/${item.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {cover ? (
        <RemoteImage uri={cover} alt={propertyTitle} radius={theme.radius.md} style={styles.thumb} />
      ) : (
        <Avatar name={name} size="lg" />
      )}
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text
            variant="body"
            weight={unread ? 'bold' : 'semibold'}
            numberOfLines={1}
            style={styles.name}
          >
            {name}
          </Text>
          {time ? (
            <Text variant="overline" color={unread ? 'accent' : 'textMuted'}>
              {time}
            </Text>
          ) : null}
        </View>
        {propertyTitle ? (
          <Text variant="caption" color="textMuted" numberOfLines={1} style={styles.property}>
            {propertyTitle}
          </Text>
        ) : null}
        <View style={styles.rowBottom}>
          <Text
            variant="body-sm"
            weight={unread ? 'semibold' : 'regular'}
            color={unread ? 'text' : 'textMuted'}
            numberOfLines={1}
            style={styles.preview}
          >
            {preview}
          </Text>
          {unread ? (
            <View style={styles.unreadBadge}>
              <Text variant="overline" weight="bold" color="textOnPrimary">
                {formatNumber(item.unreadCount, locale)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  pressed: { opacity: 0.92 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.sm,
    gap: theme.space.md,
  },
  title: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['heading-1'],
    textAlign,
  },

  listContent: { padding: theme.space.xl, gap: theme.space.md, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    gap: theme.space.md,
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.md,
    ...theme.shadow.card,
  },
  thumb: { width: 56, height: 56 },
  rowBody: { flex: 1, gap: 2, justifyContent: 'center' },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  name: { flex: 1, textAlign },
  property: { textAlign },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  preview: { flex: 1, textAlign },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 6,
    backgroundColor: theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
