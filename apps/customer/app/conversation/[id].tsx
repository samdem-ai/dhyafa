/**
 * Message thread (P5b rework onto src/ui).
 *
 * Renders the conversation as bubbles aligned by sender — mine (teal, end-aligned)
 * vs theirs (surface, start-aligned, with the sender's Avatar + name) — with
 * per-bubble timestamps and a read indicator under my latest sent message.
 *
 * Read-state: on focus we call mark_conversation_read(id), then invalidate the
 * `conversations` + `unreadCounts` queries so the inbox row and tab badge clear.
 *
 * Sending: OPTIMISTIC — a temp bubble appends immediately (pending), then the
 * RPC resolves and we reconcile (swap the temp id for the real one) or roll back
 * on failure. Realtime INSERTs for THIS conversation append live; dedupe keys on
 * both the real id AND the optimistic body+sender so the echo of my own send
 * never double-renders.
 *
 * Keyboard-avoiding compose bar, auto-scroll to newest, signed-out guard via the
 * stack layout (this screen also no-ops cleanly without a user).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Send, Check, CheckCheck } from 'lucide-react-native';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import type { Locale } from '@dyafa/i18n';
import { supabaseClient } from '@/lib/supabase';
import { useSession } from '@/lib/auth';
import {
  getConversationHeader,
  listMessages,
  markConversationRead,
  sendMessage,
  type ConversationHeader,
  type MessageRow,
} from '@/lib/messaging';
import { queryKeys } from '@/lib/queries';
import { Screen, Text, Avatar, Skeleton, ErrorState, useToast, haptics } from '@/ui';
import { L, pick } from '@/lib/copy';
import { formatDateTime } from '@/lib/dateFormat';
import { theme } from '@/theme';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

/** A message in the UI list — a real row plus an optional optimistic flag. */
type UiMessage = MessageRow & { pending?: boolean; failed?: boolean };

/** Stable id for an optimistic bubble before the server assigns one. */
function tempId(): string {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function ConversationScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const myUid = user?.id ?? null;
  const qc = useQueryClient();
  const toast = useToast();

  const [header, setHeader] = useState<ConversationHeader | null>(null);
  const [messages, setMessages] = useState<UiMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<UiMessage>>(null);
  // Bodies of in-flight optimistic sends, to dedupe the realtime echo.
  const pendingBodies = useRef<Set<string>>(new Set());

  /** Append a server/realtime message, deduping by id AND optimistic echo. */
  const appendIncoming = useCallback((m: MessageRow) => {
    setMessages((prev) => {
      const list = prev ?? [];
      if (list.some((x) => x.id === m.id)) return list;
      // If this is the echo of one of my optimistic sends still showing as a
      // temp bubble, replace that temp bubble in place rather than appending.
      if (m.sender_id === myUid && pendingBodies.current.has(m.body ?? '')) {
        pendingBodies.current.delete(m.body ?? '');
        const idx = list.findIndex(
          (x) => x.pending && x.sender_id === m.sender_id && x.body === m.body,
        );
        if (idx >= 0) {
          const next = [...list];
          next[idx] = m;
          return next;
        }
      }
      return [...list, m];
    });
  }, [myUid]);

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

  // On focus: mark the counterparty's messages read, then clear the inbox row +
  // tab badge. Guarded so it runs once per focus, not on every render.
  useFocusEffect(
    useCallback(() => {
      if (!id || !myUid) return;
      let active = true;
      void (async () => {
        try {
          const n = await markConversationRead(id);
          if (!active) return;
          if (n > 0) {
            void qc.invalidateQueries({ queryKey: queryKeys.conversations(myUid) });
            void qc.invalidateQueries({ queryKey: ['unreadCounts', myUid] });
          }
        } catch {
          // Read-marking is best-effort; never surface an error for it.
        }
      })();
      return () => {
        active = false;
      };
    }, [id, myUid, qc]),
  );

  // Realtime: live-append INSERTs for this conversation only.
  useEffect(() => {
    if (!id) return;
    const channel = supabaseClient
      .channel(`conv:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload: RealtimePostgresInsertPayload<MessageRow>) => {
          appendIncoming(payload.new);
          // An incoming message from the other party while we're viewing the
          // thread → mark it read immediately so it never lands as unread.
          if (myUid && payload.new.sender_id !== myUid) {
            void markConversationRead(id).catch(() => undefined);
          }
        },
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [id, appendIncoming, myUid]);

  // Keep the newest message in view as the list grows.
  useEffect(() => {
    if (messages && messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages]);

  const onSend = useCallback(async () => {
    const body = draft.trim();
    if (!body || !id || !myUid || sending) return;

    const temp: UiMessage = {
      id: tempId(),
      conversation_id: id,
      sender_id: myUid,
      body,
      read_at: null,
      created_at: new Date().toISOString(),
      deleted_at: null,
      attachment_path: null,
      pending: true,
    };
    const tmpKey = temp.id;
    pendingBodies.current.add(body);
    setMessages((prev) => [...(prev ?? []), temp]);
    setDraft('');
    setSending(true);
    haptics.tap();

    try {
      const newId = await sendMessage(id, body);
      // Reconcile: stamp the real id + clear pending. If the realtime echo
      // already landed (same body), it removed our pendingBodies entry and may
      // have replaced the temp — handle both by id-keying the swap.
      setMessages((prev) => {
        const list = prev ?? [];
        if (list.some((x) => x.id === newId)) {
          // Echo already inserted the real row; drop the temp if still present.
          return list.filter((x) => x.id !== tmpKey);
        }
        return list.map((x) => (x.id === tmpKey ? { ...x, id: newId, pending: false } : x));
      });
      pendingBodies.current.delete(body);
    } catch {
      // Roll back: mark the temp bubble as failed, restore the draft.
      pendingBodies.current.delete(body);
      setMessages((prev) =>
        (prev ?? []).map((x) => (x.id === tmpKey ? { ...x, pending: false, failed: true } : x)),
      );
      haptics.error();
      toast.show({ message: pick(L.messageFailed, locale), tone: 'error' });
    } finally {
      setSending(false);
    }
  }, [draft, id, myUid, sending, locale, toast]);

  const title = header?.otherPartyName || pick(L.messages, locale);
  const BackIcon = I18nManager.isRTL ? ArrowRight : ArrowLeft;

  // Index of my last non-failed sent message — only it shows the read indicator.
  const lastMineIndex = useMemo(() => {
    if (!messages) return -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m && m.sender_id === myUid && !m.failed) return i;
    }
    return -1;
  }, [messages, myUid]);

  return (
    <Screen edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pick(L.goBack, locale)}
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backBtn}
        >
          <BackIcon size={24} color={theme.color.text} />
        </Pressable>
        <View style={styles.topTitleWrap}>
          <Text variant="title" weight="semibold" numberOfLines={1} style={styles.topTitle}>
            {title}
          </Text>
          {header?.propertyTitle ? (
            <Text variant="caption" color="textMuted" numberOfLines={1} style={styles.topSubtitle}>
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
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text variant="body" color="textMuted" style={styles.emptyText}>
                  {pick(L.noMessagesYet, locale)}
                </Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                mine={item.sender_id === myUid}
                showReadIndicator={index === lastMineIndex}
                otherPartyName={header?.otherPartyName ?? ''}
                locale={locale}
              />
            )}
          />
        )}

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
            <Send
              size={18}
              color={theme.color.textOnPrimary}
              style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function MessageBubble({
  message,
  mine,
  showReadIndicator,
  otherPartyName,
  locale,
}: {
  message: UiMessage;
  mine: boolean;
  showReadIndicator: boolean;
  otherPartyName: string;
  locale: Locale;
}) {
  const read = message.read_at != null;
  return (
    <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      {!mine ? <Avatar name={otherPartyName} size="sm" /> : null}
      <View style={styles.bubbleCol}>
        <View
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleTheirs,
            message.failed && styles.bubbleFailed,
            message.pending && styles.bubblePending,
          ]}
        >
          <Text variant="body" color={mine ? 'textOnPrimary' : 'text'} style={styles.bubbleText}>
            {message.body ?? ''}
          </Text>
        </View>
        <View style={[styles.metaRow, mine ? styles.metaRowMine : styles.metaRowTheirs]}>
          <Text variant="overline" color="textMuted">
            {message.pending
              ? '…'
              : message.failed
                ? pick(L.messageFailed, locale)
                : formatDateTime(message.created_at, locale)}
          </Text>
          {mine && showReadIndicator && !message.pending && !message.failed ? (
            read ? (
              <CheckCheck size={13} color={theme.color.accent} />
            ) : (
              <Check size={13} color={theme.color.textMuted} />
            )
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    gap: theme.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
  backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  topTitleWrap: { flex: 1 },
  topTitle: { textAlign },
  topSubtitle: { textAlign },
  topSpacer: { width: 28 },

  loading: { padding: theme.space.xl, gap: theme.space.md },
  skBubbleL: { height: 48, width: '70%', borderRadius: theme.radius.card, alignSelf: 'flex-start' },
  skBubbleR: { height: 48, width: '60%', borderRadius: theme.radius.card, alignSelf: 'flex-end' },

  listContent: { padding: theme.space.lg, gap: theme.space.md, flexGrow: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.space['2xl'] },
  emptyText: { textAlign: 'center' },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.space.sm },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubbleCol: { maxWidth: '80%', gap: 2 },
  bubble: {
    borderRadius: theme.radius.card,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  bubbleMine: { backgroundColor: theme.color.primary, borderBottomRightRadius: theme.radius.sm },
  bubbleTheirs: { backgroundColor: theme.color.surface, borderBottomLeftRadius: theme.radius.sm, ...theme.shadow.xs },
  bubblePending: { opacity: 0.7 },
  bubbleFailed: { backgroundColor: theme.color.errorBg },
  bubbleText: { lineHeight: theme.lineHeight.body, textAlign },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaRowMine: { justifyContent: 'flex-end' },
  metaRowTheirs: { justifyContent: 'flex-start' },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
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
});
