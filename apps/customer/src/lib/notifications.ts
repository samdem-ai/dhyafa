/**
 * Typed data layer for in-app notifications (M3).
 *
 * Reads the caller's own notification rows (RLS-scoped), exposes the localized
 * title/body, computes the unread count (read_at IS NULL), and routes a tapped
 * notification by `type` + `data` to the right screen.
 *
 * mark_notifications_read isn't in the BUILT @dyafa/api-client Database type yet
 * (same gap as become_host in src/lib/listings.ts), so it goes through a narrowly
 * loosened rpc signature; table reads stay fully typed. Passing null marks ALL of
 * the caller's notifications read. No `as any`.
 */

import type { Database } from '@dyafa/api-client';
import type { Locale } from '@dyafa/i18n';
import { supabaseClient } from './supabase';

type Tables = Database['public']['Tables'];

export type NotificationRow = Tables['notifications']['Row'];

// Loosened rpc surface (matches src/lib/listings.ts).
type LooseRpc = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};
const rpcClient = supabaseClient as unknown as LooseRpc;

/** Newest-first list of the caller's notifications. */
export async function listNotifications(limit = 50): Promise<NotificationRow[]> {
  const { data, error } = await supabaseClient
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Count of the caller's unread notifications (read_at IS NULL). */
export async function unreadNotificationCount(): Promise<number> {
  const { count, error } = await supabaseClient
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Mark notifications read. Pass specific ids, or omit/null to mark ALL read.
 * Returns the number of rows updated.
 */
export async function markNotificationsRead(ids?: string[] | null): Promise<number> {
  const { data, error } = await rpcClient.rpc('mark_notifications_read', {
    p_ids: ids ?? null,
  });
  if (error) throw new Error(error.message);
  return typeof data === 'number' ? data : 0;
}

/** Localized title for a notification (ar → fr → en fallback). */
export function notificationTitle(n: NotificationRow, locale: Locale): string {
  const chain =
    locale === 'fr'
      ? [n.title_fr, n.title_ar, n.title_en]
      : locale === 'en'
        ? [n.title_en, n.title_fr, n.title_ar]
        : [n.title_ar, n.title_fr, n.title_en];
  for (const v of chain) if (v && v.trim().length > 0) return v;
  return '';
}

/** Localized body for a notification (ar → fr → en fallback). */
export function notificationBody(n: NotificationRow, locale: Locale): string {
  const chain =
    locale === 'fr'
      ? [n.body_fr, n.body_ar, n.body_en]
      : locale === 'en'
        ? [n.body_en, n.body_fr, n.body_ar]
        : [n.body_ar, n.body_fr, n.body_en];
  for (const v of chain) if (v && v.trim().length > 0) return v;
  return '';
}

/**
 * Resolve a tapped notification to a route, using its `type` + `data` payload.
 * Returns null when there's no sensible target (the row is still marked read).
 *
 * Recognized types:
 *   booking_*            → /booking/<booking_id>
 *   message_*            → /conversation/<conversation_id>
 *   review_*             → /property/<property_id> (falls back to /booking)
 *   property_*           → /property/<property_id> (listing approved/rejected/…)
 *   host_verified        → /host (the host dashboard)
 */
export function notificationRoute(n: NotificationRow): string | null {
  const data = (n.data ?? {}) as Record<string, unknown>;
  const str = (k: string): string | null => {
    const v = data[k];
    return typeof v === 'string' && v.length > 0 ? v : null;
  };

  const bookingId = str('booking_id');
  const conversationId = str('conversation_id');
  const propertyId = str('property_id');

  if (n.type.startsWith('message')) {
    if (conversationId) return `/conversation/${conversationId}`;
  }
  if (n.type.startsWith('review')) {
    if (propertyId) return `/property/${propertyId}`;
    if (bookingId) return `/booking/${bookingId}`;
  }
  if (n.type.startsWith('booking')) {
    if (bookingId) return `/booking/${bookingId}`;
  }
  if (n.type.startsWith('property')) {
    if (propertyId) return `/property/${propertyId}`;
  }
  if (n.type === 'host_verified' || n.type.startsWith('host')) {
    return '/host';
  }

  // Generic fallbacks by whatever id is present.
  if (conversationId) return `/conversation/${conversationId}`;
  if (bookingId) return `/booking/${bookingId}`;
  if (propertyId) return `/property/${propertyId}`;
  return null;
}

/** A glyph hint for a notification row, by type prefix. */
export function notificationGlyph(n: NotificationRow): string {
  if (n.type.startsWith('message')) return '💬';
  if (n.type.startsWith('review')) return '⭐';
  if (n.type.startsWith('booking')) return '🧳';
  if (n.type.startsWith('payment')) return '💳';
  return '🔔';
}
