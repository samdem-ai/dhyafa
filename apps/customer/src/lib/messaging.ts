/**
 * Typed data layer for the unified inbox + threads (M3).
 *
 * A signed-in user may participate in a conversation as the GUEST
 * (conversations.guest_id = my uid) or as the HOST (conversations.host_profile_id
 * is a host_profile I own). RLS already returns only the conversations I'm part
 * of, so listConversations() does a plain read and we derive "the other party"
 * locally from whichever side I'm not on.
 *
 * get_or_create_conversation + send_message are NOT in the generated Database
 * type yet (same gap as become_host in src/lib/listings.ts), so they go through a
 * narrowly loosened rpc signature; table reads stay fully typed. No `as any`.
 */

import type { Database } from '@dyafa/api-client';
import type { Locale } from '@dyafa/i18n';
import { supabaseClient } from './supabase';
import { localizedName, resolvePhotoUrl } from './discovery';

type Tables = Database['public']['Tables'];

export type ConversationRow = Tables['conversations']['Row'];
export type MessageRow = Tables['messages']['Row'];

// ---------------------------------------------------------------------------
// Loosened rpc surface (matches src/lib/listings.ts).
// ---------------------------------------------------------------------------
type LooseRpc = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};
const rpcClient = supabaseClient as unknown as LooseRpc;

// ---------------------------------------------------------------------------
// RPCs
// ---------------------------------------------------------------------------

/** Get (or lazily create) the conversation for a booking. Returns its id. */
export async function getOrCreateConversation(bookingId: string): Promise<string> {
  const { data, error } = await rpcClient.rpc('get_or_create_conversation', {
    p_booking_id: bookingId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Send a message in a conversation. Returns the new message id. */
export async function sendMessage(conversationId: string, body: string): Promise<string> {
  const { data, error } = await rpcClient.rpc('send_message', {
    p_conversation_id: conversationId,
    p_body: body,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

interface PropertyLite {
  id: string;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  cover_photo_path: string | null;
}

/** A conversation shaped for the inbox list. */
export interface ConversationListItem {
  id: string;
  kind: ConversationRow['kind'];
  booking_id: string | null;
  property_id: string | null;
  last_message_at: string | null;
  /** Display name of whoever is NOT the current user. */
  otherPartyName: string;
  property: PropertyLite | null;
  /** The most recent message in the thread (preview). */
  lastMessage: Pick<MessageRow, 'id' | 'body' | 'sender_id' | 'created_at' | 'read_at'> | null;
  /** True when the newest message was sent by the other party and is unread. */
  unread: boolean;
}

type LastMessageLite = Pick<MessageRow, 'id' | 'body' | 'sender_id' | 'created_at' | 'read_at'>;

interface RawConversation extends ConversationRow {
  guest: { id: string; display_name: string } | null;
  host_profile: { id: string; display_name: string } | null;
  property: PropertyLite | null;
  messages: LastMessageLite[] | null;
}

const CONVERSATION_SELECT = `
  id, kind, booking_id, property_id, guest_id, host_profile_id, last_message_at, created_at,
  guest:profiles ( id, display_name ),
  host_profile:host_profiles ( id, display_name ),
  property:properties ( id, title_ar, title_fr, title_en, cover_photo_path ),
  messages ( id, body, sender_id, created_at, read_at )
`;

/**
 * List every conversation the caller participates in (guest OR host), newest
 * activity first. RLS scopes the rows; we resolve the other party + last message
 * locally. `myUid` decides which side "I" am on.
 */
export async function listConversations(myUid: string): Promise<ConversationListItem[]> {
  const { data, error } = await supabaseClient
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) throw error;

  const raws = (data ?? []) as unknown as RawConversation[];
  return raws.map((raw) => {
    const iAmGuest = raw.guest_id === myUid;
    // The other party is the host when I'm the guest, else the guest.
    const otherPartyName = iAmGuest
      ? (raw.host_profile?.display_name ?? '')
      : (raw.guest?.display_name ?? '');

    const messages = [...(raw.messages ?? [])].sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1,
    );
    const last = messages[0] ?? null;
    const unread = last != null && last.sender_id !== myUid && last.read_at == null;

    return {
      id: raw.id,
      kind: raw.kind,
      booking_id: raw.booking_id,
      property_id: raw.property_id,
      last_message_at: raw.last_message_at,
      otherPartyName,
      property: raw.property,
      lastMessage: last,
      unread,
    };
  });
}

/** Header context for a single thread: other party + property title. */
export interface ConversationHeader {
  id: string;
  otherPartyName: string;
  propertyTitle: string;
  bookingId: string | null;
}

/** Load the header context for one conversation (the other party + property). */
export async function getConversationHeader(
  conversationId: string,
  myUid: string,
  locale: Locale,
): Promise<ConversationHeader | null> {
  const { data, error } = await supabaseClient
    .from('conversations')
    .select(
      `
      id, booking_id, guest_id, host_profile_id,
      guest:profiles ( id, display_name ),
      host_profile:host_profiles ( id, display_name ),
      property:properties ( id, title_ar, title_fr, title_en )
      `,
    )
    .eq('id', conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const raw = data as unknown as {
    id: string;
    booking_id: string | null;
    guest_id: string;
    host_profile_id: string;
    guest: { id: string; display_name: string } | null;
    host_profile: { id: string; display_name: string } | null;
    property: { id: string; title_ar: string | null; title_fr: string | null; title_en: string | null } | null;
  };

  const iAmGuest = raw.guest_id === myUid;
  const otherPartyName = iAmGuest
    ? (raw.host_profile?.display_name ?? '')
    : (raw.guest?.display_name ?? '');
  const propertyTitle = raw.property
    ? localizedName(
        { name_ar: raw.property.title_ar, name_fr: raw.property.title_fr, name_en: raw.property.title_en },
        locale,
      )
    : '';

  return { id: raw.id, otherPartyName, propertyTitle, bookingId: raw.booking_id };
}

/** All messages in a conversation, oldest first. RLS scopes to participants. */
export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Cover URL for a conversation's property (or null). */
export function conversationCoverUrl(item: Pick<ConversationListItem, 'property'>): string | null {
  return item.property?.cover_photo_path ? resolvePhotoUrl(item.property.cover_photo_path) : null;
}

/**
 * The caller's most relevant booking id for a property, for opening a thread
 * from the property screen (messaging requires a booking context). Returns the
 * newest of the caller's own bookings on that property, or null when none.
 * RLS scopes bookings to the caller.
 */
export async function findMyBookingForProperty(propertyId: string): Promise<string | null> {
  const { data, error } = await supabaseClient
    .from('bookings')
    .select('id, created_at')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
