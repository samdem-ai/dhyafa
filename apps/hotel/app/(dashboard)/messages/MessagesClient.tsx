'use client';

/**
 * Inbox + thread pane with realtime.
 *
 * • Conversation list comes pre-loaded from the server (RLS-scoped).
 * • Selecting a conversation loads its messages via the browser (anon) client —
 *   RLS restricts rows to conversations the user participates in.
 * • A realtime channel on `messages` filtered by `conversation_id` appends new
 *   messages live.
 * • Sending goes through the `sendMessage` Server Action (SECURITY DEFINER RPC).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { dir, type Locale } from '@dyafa/i18n';
import { supabase } from '../../../lib/supabase/client';
import { T, tl, formatDateTime } from '../../../lib/dashboard-i18n';
import { sendMessage } from './actions';

export interface ConversationListItem {
  id: string;
  guestName: string;
  propertyTitle: string | null;
  lastMessageAt: string | null;
}

interface MessageItem {
  id: string;
  body: string | null;
  sender_id: string;
  created_at: string;
}

export function MessagesClient({
  locale,
  currentUserId,
  conversations,
}: {
  locale: Locale;
  currentUserId: string;
  conversations: ConversationListItem[];
}) {
  const direction = dir(locale);
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from('messages')
      .select('id, body, sender_id, created_at')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(200);
    if (loadError) {
      setError(tl(T.errorBody, locale));
      setMessages([]);
    } else {
      setMessages((data ?? []) as MessageItem[]);
    }
    setLoading(false);
  }, [locale]);

  // Load + subscribe when the active conversation changes.
  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);

    const channel = supabase
      .channel(`messages:${activeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const row = payload.new as MessageItem;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeId, loadMessages]);

  // Keep the thread scrolled to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  async function onSend() {
    if (!activeId) return;
    const trimmed = body.trim();
    if (trimmed.length === 0) return;
    setSending(true);
    setError(null);
    try {
      const result = await sendMessage(activeId, trimmed);
      if (result.ok) {
        setBody('');
        // Optimistic append (realtime will dedupe by id).
        setMessages((prev) => [
          ...prev,
          {
            id: result.id || `tmp-${Date.now()}`,
            body: trimmed,
            sender_id: currentUserId,
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        setError(
          result.code === 'not_authorized'
            ? tl(T.accessDenied, locale)
            : tl(T.errorBody, locale),
        );
      }
    } finally {
      setSending(false);
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-card px-xl py-3xl flex flex-col items-center text-center gap-sm">
        <span className="font-display text-heading-3 font-semibold text-primary">
          {tl(T.msgTitle, locale)}
        </span>
        <p className="text-body-sm text-text-muted">{tl(T.msgEmpty, locale)}</p>
      </div>
    );
  }

  return (
    <div
      dir={direction}
      className="grid grid-cols-1 gap-lg md:grid-cols-[280px_1fr] rounded-card bg-surface shadow-card overflow-hidden min-h-[28rem]"
    >
      {/* Conversation list */}
      <ul className="border-b md:border-b-0 md:border-e border-border max-h-[28rem] overflow-y-auto">
        {conversations.map((c) => {
          const active = c.id === activeId;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setActiveId(c.id)}
                aria-current={active ? 'true' : undefined}
                className={`w-full text-start px-lg py-md border-b border-border last:border-0 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset ${
                  active ? 'bg-bone-300' : 'hover:bg-surface-sunken'
                }`}
              >
                <span className="block text-title font-semibold text-text-default truncate">
                  {c.guestName}
                </span>
                {c.propertyTitle && (
                  <span className="block text-body-sm text-text-muted truncate">
                    {c.propertyTitle}
                  </span>
                )}
                {c.lastMessageAt && (
                  <span className="block text-caption text-text-muted tabular-nums mt-xs">
                    {formatDateTime(c.lastMessageAt, locale)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Thread */}
      <div className="flex flex-col min-h-[28rem]">
        <div className="flex-1 overflow-y-auto px-lg py-md flex flex-col gap-sm max-h-[24rem]">
          {loading && <p className="text-body-sm text-text-muted">{tl(T.loading, locale)}</p>}
          {!loading && messages.length === 0 && (
            <p className="text-body-sm text-text-muted">{tl(T.msgNoMessages, locale)}</p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[80%] gap-xs ${mine ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <div
                  className={`rounded-card px-md py-sm text-body-sm ${
                    mine
                      ? 'bg-primary text-text-on-primary'
                      : 'bg-surface-sunken text-text-default'
                  }`}
                >
                  {m.body}
                </div>
                <span className="text-overline text-text-muted tabular-nums">
                  {mine ? tl(T.msgYou, locale) : tl(T.msgGuest, locale)} ·{' '}
                  {formatDateTime(m.created_at, locale)}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div role="alert" className="mx-lg rounded-md bg-error-bg text-error text-body-sm px-md py-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSend();
          }}
          className="flex items-end gap-sm border-t border-border p-md"
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={1}
            placeholder={tl(T.msgPlaceholder, locale)}
            className="flex-1 rounded-md border border-border-strong bg-surface px-md py-sm text-body-sm text-text-default outline-none resize-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          />
          <button
            type="submit"
            disabled={sending || body.trim().length === 0}
            className="rounded-md bg-accent text-text-on-primary text-body-sm font-semibold px-lg py-sm transition-opacity duration-fast hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          >
            {sending ? tl(T.sending, locale) : tl(T.send, locale)}
          </button>
        </form>
      </div>
    </div>
  );
}
