/**
 * Message thread (M3).
 *
 * Loads the conversation header (other party + property title) and its messages,
 * renders them as bubbles aligned by sender, and lets the participant send a
 * message via send_message (which auto-notifies the other party).
 *
 * Realtime: subscribes to INSERTs on `messages` filtered to this conversation and
 * appends new rows live (deduped by id, so the optimistic insert from our own
 * send doesn't double up). The channel is torn down on unmount.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import type { Locale } from '@dyafa/i18n';
import { supabaseClient } from '@/lib/supabase';
import { useSession } from '@/lib/auth';
import {
  getConversationHeader,
  listMessages,
  sendMessage,
  type ConversationHeader,
  type MessageRow,
} from '@/lib/messaging';
import { Skeleton, ErrorState } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { formatDateTime } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

export default function ConversationScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const myUid = user?.id ?? null;

  const [header, setHeader] = useState<ConversationHeader | null>(null);
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<MessageRow>>(null);

  /** Append a message if it isn't already present (dedupe by id). */
  const appendMessage = useCallback((m: MessageRow) => {
    setMessages((prev) => {
      const list = prev ?? [];
      if (list.some((x) => x.id === m.id)) return list;
      return [...list, m];
    });
  }, []);

  const load = useCallback(async () => {
    if (!id || !myUid) return;
    setError(null);
    try {
      const [h, msgs] = await Promise.all([
        getConversationHeader(id, myUid, locale),
        listMessages(id),
      ]);
      setHeader(h);
      setMessages(msgs);
    } catch {
      setError(pick(L.conversationFailed, locale));
      setMessages([]);
    }
  }, [id, myUid, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: live-append inserts for this conversation.
  useEffect(() => {
    if (!id) return;
    const channel = supabaseClient
      .channel(`conv:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload: RealtimePostgresInsertPayload<MessageRow>) => {
          appendMessage(payload.new);
        },
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [id, appendMessage]);

  // Keep the newest message in view.
  useEffect(() => {
    if (messages && messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages]);

  async function onSend() {
    const body = draft.trim();
    if (!body || !id) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(id, body);
      setDraft('');
      // The realtime INSERT will append it; refresh as a fallback in case the
      // socket is delayed/unavailable.
      const msgs = await listMessages(id);
      setMessages(msgs);
    } catch {
      setError(pick(L.messageFailed, locale));
    } finally {
      setSending(false);
    }
  }

  const title = header?.otherPartyName || pick(L.messages, locale);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.topBack}>{I18nManager.isRTL ? '→' : '←'}</Text>
        </Pressable>
        <View style={styles.topTitleWrap}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {title}
          </Text>
          {header?.propertyTitle ? (
            <Text style={styles.topSubtitle} numberOfLines={1}>
              {header.propertyTitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.topSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {messages === null ? (
          <View style={styles.loading}>
            <Skeleton style={styles.skBubbleL} />
            <Skeleton style={styles.skBubbleR} />
            <Skeleton style={styles.skBubbleL} />
          </View>
        ) : error && messages.length === 0 ? (
          <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.goBack, locale)} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>{pick(L.noMessagesYet, locale)}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <MessageBubble message={item} mine={item.sender_id === myUid} locale={locale} />
            )}
          />
        )}

        {error && messages && messages.length > 0 ? (
          <Text style={styles.inlineError}>{error}</Text>
        ) : null}

        {/* Composer */}
        <View style={styles.composer}>
          <TextInput
            style={[styles.input, { textAlign }]}
            value={draft}
            onChangeText={setDraft}
            placeholder={pick(L.messagePlaceholder, locale)}
            placeholderTextColor={theme.color.textMuted}
            multiline
            accessibilityLabel={pick(L.messagePlaceholder, locale)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={pick(L.send, locale)}
            accessibilityState={{ disabled: sending || draft.trim().length === 0 }}
            onPress={() => void onSend()}
            disabled={sending || draft.trim().length === 0}
            style={({ pressed }) => [
              styles.sendBtn,
              (sending || draft.trim().length === 0) && styles.sendBtnDisabled,
              pressed && styles.sendBtnPressed,
            ]}
          >
            <Text style={styles.sendGlyph}>{I18nManager.isRTL ? '➤' : '➤'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  message,
  mine,
  locale,
}: {
  message: MessageRow;
  mine: boolean;
  locale: Locale;
}) {
  return (
    <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.body ?? ''}</Text>
        <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
          {formatDateTime(message.created_at, locale)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  flex: { flex: 1 },

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
  topTitleWrap: { flex: 1 },
  topTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  topSubtitle: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign,
  },
  topSpacer: { width: 24 },

  loading: { padding: theme.space.xl, gap: theme.space.md },
  skBubbleL: { height: 48, width: '70%', borderRadius: theme.radius.card, alignSelf: 'flex-start' },
  skBubbleR: { height: 48, width: '60%', borderRadius: theme.radius.card, alignSelf: 'flex-end' },

  listContent: { padding: theme.space.lg, gap: theme.space.sm, flexGrow: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.space['2xl'] },
  emptyText: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.textMuted,
    textAlign: 'center',
  },

  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: theme.radius.card,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    gap: 2,
  },
  bubbleMine: { backgroundColor: theme.color.primary },
  bubbleTheirs: { backgroundColor: theme.color.surface, ...theme.shadow.xs },
  bubbleText: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
    lineHeight: theme.lineHeight.body,
    textAlign,
  },
  bubbleTextMine: { color: theme.color.textOnPrimary },
  bubbleTime: {
    fontFamily: RN_FONTS.bodyRegular,
    fontSize: theme.fontSize.overline,
    color: theme.color.textMuted,
    textAlign,
  },
  bubbleTimeMine: { color: theme.color.teal100 },

  inlineError: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize.caption,
    color: theme.color.error,
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.xs,
    textAlign,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnPressed: { opacity: 0.85 },
  sendGlyph: {
    fontSize: 18,
    color: theme.color.textOnPrimary,
    transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }],
  },
});
