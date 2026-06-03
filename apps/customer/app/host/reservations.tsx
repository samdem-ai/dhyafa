/**
 * Host reservations (M4).
 *
 * Two segments:
 *   - Requests  — incoming bookings (status='requested'); each card has
 *     Accept / Decline (accept_booking_request / decline_booking_request).
 *   - Upcoming  — confirmed / checked-in stays with guest name, dates, payout.
 *
 * Pull-to-refresh, designed skeletons, and empty/error states throughout. A row
 * action accepts/declines optimistically (removing the card on success) and
 * surfaces a localized error inline on failure. Both tabs deep-link to the
 * guest thread via the existing conversation flow.
 */

import { useCallback, useState } from 'react';
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
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import {
  listBookingRequests,
  listUpcomingStays,
  acceptBookingRequest,
  declineBookingRequest,
  type HostBooking,
} from '@/lib/host';
import { getOrCreateConversation } from '@/lib/messaging';
import { localizedName } from '@/lib/listings';
import { BookingStatusBadge } from '@/components/discovery';
import { PrimaryButton, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { L, pick, type LMessage } from '@/lib/copy';
import { formatRange } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

type Tab = 'requests' | 'upcoming';
const TABS: { key: Tab; label: LMessage }[] = [
  { key: 'requests', label: L.hostTabRequests },
  { key: 'upcoming', label: L.hostTabUpcoming },
];

export default function HostReservationsScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;

  const [tab, setTab] = useState<Tab>('requests');
  const [data, setData] = useState<HostBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (t: Tab) => {
      setError(null);
      try {
        const rows = t === 'requests' ? await listBookingRequests() : await listUpcomingStays();
        setData(rows);
      } catch {
        setError(pick(L.loadError, locale));
        setData([]);
      }
    },
    [locale],
  );

  useFocusEffect(
    useCallback(() => {
      setData(null);
      void load(tab);
    }, [tab, load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(tab);
    setRefreshing(false);
  }, [tab, load]);

  /** Drop a card after it's accepted/declined. */
  const removeBooking = useCallback((id: string) => {
    setData((prev) => (prev ?? []).filter((b) => b.id !== id));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.topBack}>{I18nManager.isRTL ? '→' : '←'}</Text>
        </Pressable>
        <Text style={styles.topTitle}>{pick(L.hostReservationsTitle, locale)}</Text>
        <View style={styles.topSpacer} />
      </View>

      <View style={styles.segment}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(t.key)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {pick(t.label, locale)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {data === null ? (
        <SkeletonList count={3} />
      ) : error && data.length === 0 ? (
        <ErrorState message={error} onRetry={() => void load(tab)} retryLabel={pick(L.search, locale)} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          ListEmptyComponent={
            tab === 'requests' ? (
              <EmptyState
                emoji="📥"
                title={pick(L.hostRequestsEmptyTitle, locale)}
                subtitle={pick(L.hostRequestsEmptyBody, locale)}
              />
            ) : (
              <EmptyState
                emoji="📅"
                title={pick(L.hostUpcomingEmptyTitle, locale)}
                subtitle={pick(L.hostUpcomingEmptyBody, locale)}
              />
            )
          }
          renderItem={({ item }) => (
            <ReservationCard
              booking={item}
              locale={locale}
              tab={tab}
              onResolved={removeBooking}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function ReservationCard({
  booking,
  locale,
  tab,
  onResolved,
}: {
  booking: HostBooking;
  locale: Locale;
  tab: Tab;
  onResolved: (id: string) => void;
}) {
  const [busy, setBusy] = useState<null | 'accept' | 'decline' | 'message'>(null);
  const [error, setError] = useState<string | null>(null);

  const title = booking.property
    ? localizedName(
        {
          name_ar: booking.property.title_ar,
          name_fr: booking.property.title_fr,
          name_en: booking.property.title_en,
        },
        locale,
      )
    : '';
  const room = booking.roomType
    ? localizedName(
        {
          name_ar: booking.roomType.name_ar,
          name_fr: booking.roomType.name_fr,
          name_en: booking.roomType.name_en,
        },
        locale,
      )
    : '';
  const range = formatRange(booking.check_in, booking.check_out, locale);
  const guestTotal = booking.adults + booking.children;

  async function onAccept() {
    setBusy('accept');
    setError(null);
    try {
      await acceptBookingRequest(booking.id);
      onResolved(booking.id);
    } catch {
      setError(pick(L.hostAcceptFailed, locale));
      setBusy(null);
    }
  }

  async function onDecline() {
    setBusy('decline');
    setError(null);
    try {
      await declineBookingRequest(booking.id);
      onResolved(booking.id);
    } catch {
      setError(pick(L.hostDeclineFailed, locale));
      setBusy(null);
    }
  }

  async function onMessage() {
    setBusy('message');
    setError(null);
    try {
      const conversationId = await getOrCreateConversation(booking.id);
      setBusy(null);
      router.push(`/conversation/${conversationId}`);
    } catch {
      setError(pick(L.conversationFailed, locale));
      setBusy(null);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
        <BookingStatusBadge status={booking.status} locale={locale} />
      </View>

      <Text style={styles.cardGuest}>
        {pick(L.hostGuest, locale)}: {booking.guestName || '—'}
      </Text>
      {room ? <Text style={styles.cardMeta}>{room}</Text> : null}
      <Text style={styles.cardMeta}>{range}</Text>
      <Text style={styles.cardMeta}>
        {pick(L.hostGuests, locale)}: {formatNumber(guestTotal, locale)}
        {booking.nights ? ` · ${formatNumber(booking.nights, locale)} ${pick(L.hostNights, locale)}` : ''}
      </Text>

      <View style={styles.payoutRow}>
        <Text style={styles.payoutLabel}>{pick(L.hostPayout, locale)}</Text>
        <Text style={styles.payoutValue}>{formatDZD(booking.host_payout_dzd, locale)}</Text>
      </View>

      {booking.special_requests ? (
        <Text style={styles.specialRequests} numberOfLines={3}>
          “{booking.special_requests}”
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {tab === 'requests' ? (
        <View style={styles.actionsRow}>
          <View style={styles.actionFlex}>
            <PrimaryButton
              label={pick(L.hostDecline, locale)}
              variant="danger"
              onPress={() => void onDecline()}
              loading={busy === 'decline'}
              disabled={busy !== null}
            />
          </View>
          <View style={styles.actionFlex}>
            <PrimaryButton
              label={pick(L.hostAccept, locale)}
              onPress={() => void onAccept()}
              loading={busy === 'accept'}
              disabled={busy !== null}
            />
          </View>
        </View>
      ) : (
        <View style={styles.messageRow}>
          <PrimaryButton
            label={pick(L.hostMessageGuest, locale)}
            variant="secondary"
            onPress={() => void onMessage()}
            loading={busy === 'message'}
            disabled={busy !== null}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },

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
  topSpacer: { width: 24 },

  segment: {
    flexDirection: 'row',
    marginHorizontal: theme.space.xl,
    marginTop: theme.space.md,
    marginBottom: theme.space.sm,
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.pill,
    padding: 4,
    gap: 4,
  },
  segmentItem: { flex: 1, paddingVertical: theme.space.sm, borderRadius: theme.radius.pill, alignItems: 'center' },
  segmentItemActive: { backgroundColor: theme.color.surface, ...theme.shadow.xs },
  segmentText: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
  },
  segmentTextActive: { color: theme.color.text, fontWeight: '600' },

  listContent: { padding: theme.space.xl, gap: theme.space.md, flexGrow: 1 },
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    gap: 2,
    ...theme.shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
    marginBottom: theme.space.xs,
  },
  cardTitle: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  cardGuest: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
    textAlign,
  },
  cardMeta: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.space.sm,
    paddingTop: theme.space.sm,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
  },
  payoutLabel: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
  },
  payoutValue: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize.body,
    fontWeight: '700',
    color: theme.color.text,
    writingDirection: 'ltr',
  },
  specialRequests: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    fontStyle: 'italic',
    marginTop: theme.space.sm,
    lineHeight: theme.lineHeight['body-sm'],
    textAlign,
  },
  error: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.error,
    marginTop: theme.space.sm,
    textAlign,
  },
  actionsRow: { flexDirection: 'row', gap: theme.space.md, marginTop: theme.space.md },
  actionFlex: { flex: 1 },
  messageRow: { marginTop: theme.space.md },
});
