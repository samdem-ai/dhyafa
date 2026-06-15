/**
 * TanStack Query hooks for the customer app (Phase 2 data layer).
 *
 * These wrap the existing typed fetchers in `src/lib/{discovery,bookings,
 * messaging,notifications}.ts` so remote reads are cached, deduped, and refreshed
 * under one stale-while-revalidate policy (see src/lib/query.ts) — replacing the
 * per-screen `useFocusEffect` refetch storms.
 *
 * Design notes:
 *  - `useApprovedProperties()` does ONE cached read of the approved summary set.
 *    Explore derives every rail from it client-side (kills the ~6 full-table
 *    reads the old Explore performed). Search can also build on the same cache.
 *  - Auth-scoped queries (bookings/conversations/unread/notifications) key on the
 *    current user id and are disabled while signed out, so a sign-out naturally
 *    drops the cached rows for the previous user.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useSession } from './auth';
import {
  searchProperties,
  type PropertySummary,
} from './discovery';
import {
  listMyBookings,
  type BookingWithProperty,
  type TripBucket,
} from './bookings';
import { listConversations, type ConversationListItem } from './messaging';
import { listNotifications, unreadNotificationCount, type NotificationRow } from './notifications';
import {
  listSavedProperties,
  listWishlistPropertyIds,
  toggleWishlist,
} from './wishlist';

// ---------------------------------------------------------------------------
// Query keys — centralized so invalidation stays consistent.
// ---------------------------------------------------------------------------
export const queryKeys = {
  approvedProperties: ['approvedProperties'] as const,
  myBookings: (uid: string, bucket?: TripBucket) =>
    ['myBookings', uid, bucket ?? 'all'] as const,
  conversations: (uid: string) => ['conversations', uid] as const,
  notifications: (uid: string) => ['notifications', uid] as const,
  unreadNotifications: (uid: string) => ['unreadNotifications', uid] as const,
  wishlistIds: (uid: string) => ['wishlistIds', uid] as const,
  savedProperties: (uid: string) => ['savedProperties', uid] as const,
};

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

/**
 * The full approved-property summary set, fetched ONCE and cached. Explore's
 * rails + the search base both derive from this client-side. `searchProperties()`
 * with no filters returns every approved listing (recommended sort).
 */
export function useApprovedProperties(): UseQueryResult<PropertySummary[]> {
  return useQuery({
    queryKey: queryKeys.approvedProperties,
    queryFn: () => searchProperties(),
    // Approved inventory changes slowly; keep it fresh a little longer than the
    // global default so rapid tab switches never refetch.
    staleTime: 5 * 60_000,
  });
}

// ---------------------------------------------------------------------------
// Wishlists (auth-scoped)
// ---------------------------------------------------------------------------

/**
 * The set of property_ids the signed-in user has saved. Returns an empty Set
 * while signed out (the query is disabled, so cards just render an outline
 * heart). Powers the heart's filled/outline state everywhere.
 */
export function useWishlistIds(): UseQueryResult<Set<string>> {
  const { user } = useSession();
  const uid = user?.id ?? null;
  return useQuery({
    queryKey: queryKeys.wishlistIds(uid ?? 'anon'),
    queryFn: async () => new Set(await listWishlistPropertyIds()),
    enabled: uid != null,
    // Wishlist membership changes only by the user's own taps (optimistically
    // applied), so it can stay fresh a while without refetching.
    staleTime: 60_000,
  });
}

/**
 * Toggle a property in/out of the user's default wishlist with an OPTIMISTIC
 * update of the ids set (instant heart feedback), rollback on error, and a
 * settle-time invalidate of both the ids set and the saved-properties list.
 */
export function useToggleWishlist(): UseMutationResult<boolean, Error, string, { previous?: Set<string> }> {
  const { user } = useSession();
  const uid = user?.id ?? null;
  const qc = useQueryClient();
  const idsKey = queryKeys.wishlistIds(uid ?? 'anon');

  return useMutation<boolean, Error, string, { previous?: Set<string> }>({
    mutationFn: (propertyId: string) => toggleWishlist(propertyId),
    onMutate: async (propertyId) => {
      await qc.cancelQueries({ queryKey: idsKey });
      const previous = qc.getQueryData<Set<string>>(idsKey);
      const next = new Set(previous ?? []);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      qc.setQueryData<Set<string>>(idsKey, next);
      return { previous };
    },
    onError: (_err, _propertyId, ctx) => {
      if (ctx?.previous) qc.setQueryData(idsKey, ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: idsKey });
      if (uid) void qc.invalidateQueries({ queryKey: queryKeys.savedProperties(uid) });
    },
  });
}

/** Full PropertySummary[] for the signed-in user's saved properties (cards). */
export function useSavedProperties(): UseQueryResult<PropertySummary[]> {
  const { user } = useSession();
  const uid = user?.id ?? null;
  return useQuery({
    queryKey: queryKeys.savedProperties(uid ?? 'anon'),
    queryFn: () => listSavedProperties(),
    enabled: uid != null,
  });
}

// ---------------------------------------------------------------------------
// Bookings (auth-scoped)
// ---------------------------------------------------------------------------

/** The signed-in guest's bookings, optionally scoped to a trip bucket. */
export function useMyBookings(bucket?: TripBucket): UseQueryResult<BookingWithProperty[]> {
  const { user } = useSession();
  const uid = user?.id ?? null;
  return useQuery({
    queryKey: queryKeys.myBookings(uid ?? 'anon', bucket),
    queryFn: () => listMyBookings(bucket),
    enabled: uid != null,
  });
}

// ---------------------------------------------------------------------------
// Messaging (auth-scoped)
// ---------------------------------------------------------------------------

/** The signed-in user's conversations (guest or host side). */
export function useConversations(): UseQueryResult<ConversationListItem[]> {
  const { user } = useSession();
  const uid = user?.id ?? null;
  return useQuery({
    queryKey: queryKeys.conversations(uid ?? 'anon'),
    queryFn: () => listConversations(uid as string),
    enabled: uid != null,
  });
}

// ---------------------------------------------------------------------------
// Notifications (auth-scoped)
// ---------------------------------------------------------------------------

/** The signed-in user's newest notifications. */
export function useNotifications(): UseQueryResult<NotificationRow[]> {
  const { user } = useSession();
  const uid = user?.id ?? null;
  return useQuery({
    queryKey: queryKeys.notifications(uid ?? 'anon'),
    queryFn: () => listNotifications(),
    enabled: uid != null,
  });
}

// ---------------------------------------------------------------------------
// Unread counts — lightweight, drives the tab badges.
// ---------------------------------------------------------------------------

export interface UnreadCounts {
  /** Unread inbox conversations (newest message from the other party, unread). */
  inbox: number;
  /** Actionable trips: requests/awaiting-payment that need the guest's attention. */
  trips: number;
  /** Unread in-app notifications. */
  notifications: number;
}

/**
 * A single lightweight query that powers the tab-bar unread badges (Inbox +
 * Trips) and the notification bell. Reuses the conversation + notification
 * fetchers and derives the trips count from upcoming bookings that still need
 * the guest to act (requested / awaiting_payment). Disabled while signed out.
 */
export function useUnreadCounts(): UseQueryResult<UnreadCounts> {
  const { user } = useSession();
  const uid = user?.id ?? null;
  return useQuery({
    queryKey: ['unreadCounts', uid ?? 'anon'] as const,
    enabled: uid != null,
    // Badges should feel live but never hammer the network.
    staleTime: 30_000,
    queryFn: async (): Promise<UnreadCounts> => {
      const [conversations, notifUnread, upcoming] = await Promise.all([
        listConversations(uid as string),
        unreadNotificationCount(),
        listMyBookings('upcoming'),
      ]);
      const inbox = conversations.filter((c) => c.unread).length;
      // Trips needing attention: a host response is pending, or payment is due.
      const trips = upcoming.filter(
        (b) => b.status === 'requested' || b.status === 'awaiting_payment',
      ).length;
      return { inbox, trips, notifications: notifUnread };
    },
  });
}
