/**
 * Inbox tab (M3) — unified conversations list.
 *
 * Shows every conversation the signed-in user participates in, whether they are
 * the guest (conversations.guest_id = me) or the host (a host_profile they own).
 * RLS already scopes the rows; we render the other party, property title, the
 * last message + time, and an unread hint. Tapping opens the thread.
 *
 * Realtime: subscribes to message INSERTs across the caller's conversations and
 * refreshes the list so previews + ordering stay live. Signed-out users see a
 * sign-in prompt.
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
  listConversations,
  conversationCoverUrl,
  type ConversationListItem,
  type MessageRow,
} from '@/lib/messaging';
import { localizedName } from '@/lib/discovery';
import { RemoteImage } from '@/components/RemoteImage';
import { SkeletonList, ErrorState, EmptyState } from '@/components/ui';
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

  const [data, setData] = useState<ConversationListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!myUid) return;
    setError(null);
    try {
      const rows = await listConversations(myUid);
      setData(rows);
    } catch {
      setError(pick(L.loadError, locale));
      setData([]);
    }
  }, [myUid, locale]);

  useFocusEffect(
    useCallback(() => {
      if (myUid) {
        void load();
      }
    }, [myUid, load]),
  );

  // Realtime: any new message refreshes the inbox previews + ordering.
  useEffect(() => {
    if (!myUid) return;
    const channel = supabaseClient
      .channel(`inbox:${myUid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (_payload: RealtimePostgresInsertPayload<MessageRow>) => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [myUid, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{pick(L.inbox, locale)}</Text>
        <NotificationBell locale={locale} />
      </View>

      {!user && !sessionLoading ? (
        <EmptyState emoji="💬" title={pick(L.inbox, locale)} subtitle={pick(L.signInToSeeInbox, locale)} />
      ) : data === null ? (
        <SkeletonList count={4} />
      ) : error && data.length === 0 ? (
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.search, locale)} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
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
  const preview = item.lastMessage?.body ?? '';
  const time = item.lastMessage ? formatDateTime(item.lastMessage.created_at, locale) : '';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/conversation/${item.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <RemoteImage uri={cover} alt={propertyTitle} radius={theme.radius.md} style={styles.thumb} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, item.unread && styles.unreadName]} numberOfLines={1}>
            {item.otherPartyName || pick(L.messages, locale)}
          </Text>
          {time ? <Text style={styles.time}>{time}</Text> : null}
        </View>
        {propertyTitle ? (
          <Text style={styles.property} numberOfLines={1}>
            {propertyTitle}
          </Text>
        ) : null}
        <View style={styles.rowBottom}>
          <Text style={[styles.preview, item.unread && styles.unreadPreview]} numberOfLines={1}>
            {preview}
          </Text>
          {item.unread ? <View style={styles.unreadDot} /> : null}
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
    color: theme.color.primary,
    textAlign,
  },

  listContent: { padding: theme.space.xl, gap: theme.space.md, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    gap: theme.space.md,
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
  name: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  unreadName: { color: theme.color.text },
  time: { fontFamily: RN_FONTS.bodyRegular, fontSize: theme.fontSize.overline, color: theme.color.textMuted },
  property: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign,
  },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  preview: {
    flex: 1,
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
  },
  unreadPreview: { color: theme.color.text, fontFamily: RN_FONTS.arabicSemiBold, fontWeight: '600' },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
  },
});
