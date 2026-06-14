/**
 * Host reservations (Phase 3 rework).
 *
 * Three segments:
 *   - Requests          — status='requested'; Accept / Decline (with reason) + message guest.
 *   - Awaiting payment   — status='awaiting_payment' (accepted, unpaid); shows the
 *                          payment deadline so these no longer vanish from view.
 *   - Upcoming           — confirmed / checked-in stays; message guest.
 *
 * Built on @/ui (Screen/Header/Text/Card/Button/StatusPill/SegmentedControl/
 * ConfirmSheet/Toast/Skeleton/Empty/Error). Optimistic accept/decline reconciled
 * with a refetch. Decline captures a reason via a ConfirmSheet + reason field.
 *
 * TODO(host-stay-lifecycle): the Upcoming tab will gain Check-in / Check-out /
 * No-show actions once the parent wires the host_check_in / host_check_out /
 * host_mark_no_show RPCs (migration 20260603130000 exists but the generated
 * Database types don't expose them yet, so calling them now wouldn't typecheck).
 */

import { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react-native';
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import {
  listBookingRequests,
  listAwaitingPaymentStays,
  listUpcomingStays,
  acceptBookingRequest,
  declineBookingRequest,
  type HostBooking,
} from '@/lib/host';
import { getOrCreateConversation } from '@/lib/messaging';
import { localizedName } from '@/lib/listings';
import {
  Screen,
  Header,
  Text,
  Card,
  Button,
  StatusPill,
  statusTone,
  SegmentedControl,
  BottomSheet,
  TextField,
  SkeletonList,
  ErrorState,
  EmptyState,
  useToast,
  haptics,
} from '@/ui';
import { L, pick, type LMessage } from '@/lib/copy';
import { formatRange, formatDateTime } from '@/lib/dateFormat';
import { theme } from '@/theme';

type Tab = 'requests' | 'awaiting' | 'upcoming';

const STATUS_LABEL: Record<string, LMessage> = {
  requested: L.st_requested,
  awaiting_payment: L.st_awaiting_payment,
  confirmed: L.st_confirmed,
  checked_in: L.st_checked_in,
  completed: L.st_completed,
};

function statusLabel(status: string, locale: Locale): string {
  const m = STATUS_LABEL[status];
  return m ? pick(m, locale) : status;
}

export default function HostReservationsScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('requests');
  const [data, setData] = useState<HostBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (t: Tab) => {
      setError(null);
      try {
        const rows =
          t === 'requests'
            ? await listBookingRequests()
            : t === 'awaiting'
              ? await listAwaitingPaymentStays()
              : await listUpcomingStays();
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

  // After an optimistic accept/decline, reconcile with a fresh fetch (a request
  // that became awaiting_payment should appear under the Awaiting tab).
  const reconcile = useCallback(() => {
    void load(tab);
  }, [tab, load]);

  const TABS: { value: Tab; label: string }[] = [
    { value: 'requests', label: pick(L.hostTabRequests, locale) },
    { value: 'awaiting', label: pick(L.hostTabAwaiting, locale) },
    { value: 'upcoming', label: pick(L.hostTabUpcoming, locale) },
  ];

  function emptyFor(t: Tab) {
    if (t === 'requests')
      return (
        <EmptyState
          title={pick(L.hostRequestsEmptyTitle, locale)}
          subtitle={pick(L.hostRequestsEmptyBody, locale)}
        />
      );
    if (t === 'awaiting')
      return (
        <EmptyState
          title={pick(L.hostAwaitingEmptyTitle, locale)}
          subtitle={pick(L.hostAwaitingEmptyBody, locale)}
        />
      );
    return (
      <EmptyState
        title={pick(L.hostUpcomingEmptyTitle, locale)}
        subtitle={pick(L.hostUpcomingEmptyBody, locale)}
      />
    );
  }

  return (
    <Screen>
      <Header title={pick(L.hostReservationsTitle, locale)} />

      <View style={styles.segmentWrap}>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </View>

      {data === null ? (
        <SkeletonList count={3} />
      ) : error && data.length === 0 ? (
        <ErrorState
          message={error}
          onRetry={() => void load(tab)}
          retryLabel={pick(L.search, locale)}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={theme.color.primary}
              colors={[theme.color.primary]}
            />
          }
          ListEmptyComponent={emptyFor(tab)}
          renderItem={({ item }) => (
            <ReservationCard
              booking={item}
              locale={locale}
              tab={tab}
              onReconcile={reconcile}
              toastShow={toast.show}
            />
          )}
        />
      )}
    </Screen>
  );
}

function ReservationCard({
  booking,
  locale,
  tab,
  onReconcile,
  toastShow,
}: {
  booking: HostBooking;
  locale: Locale;
  tab: Tab;
  onReconcile: () => void;
  toastShow: (opts: { message: string; tone?: 'success' | 'error' }) => void;
}) {
  const [busy, setBusy] = useState<null | 'accept' | 'decline' | 'message'>(null);
  const [error, setError] = useState<string | null>(null);
  const [declineSheet, setDeclineSheet] = useState(false);
  const [reason, setReason] = useState('');

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
      haptics.success();
      toastShow({ message: statusLabel('awaiting_payment', locale), tone: 'success' });
      onReconcile();
    } catch {
      setError(pick(L.hostAcceptFailed, locale));
      setBusy(null);
    }
  }

  async function onDecline() {
    setBusy('decline');
    setError(null);
    try {
      await declineBookingRequest(booking.id, reason.trim() || undefined);
      setDeclineSheet(false);
      haptics.warning();
      toastShow({ message: pick(L.st_declined, locale), tone: 'success' });
      onReconcile();
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
    <Card>
      <View style={styles.cardHeader}>
        <Text variant="title" weight="semibold" numberOfLines={1} style={styles.flex}>
          {title}
        </Text>
        <StatusPill label={statusLabel(booking.status, locale)} tone={statusTone(booking.status)} />
      </View>

      <Text variant="body" weight="medium">
        {pick(L.hostGuest, locale)}: {booking.guestName || '—'}
      </Text>
      {room ? (
        <Text variant="body-sm" color="textMuted">
          {room}
        </Text>
      ) : null}
      <Text variant="body-sm" color="textMuted">
        {range}
      </Text>
      <Text variant="body-sm" color="textMuted">
        {pick(L.hostGuests, locale)}: {formatNumber(guestTotal, locale)}
        {booking.nights
          ? ` · ${formatNumber(booking.nights, locale)} ${pick(L.hostNights, locale)}`
          : ''}
      </Text>

      {/* Awaiting-payment deadline */}
      {tab === 'awaiting' && booking.payment_deadline ? (
        <View style={styles.deadlineRow}>
          <Text variant="body-sm" color="warning" weight="semibold">
            {pick(L.hostPayBy, locale)}: {formatDateTime(booking.payment_deadline, locale)}
          </Text>
        </View>
      ) : null}

      <View style={styles.payoutRow}>
        <Text variant="body-sm" color="textMuted">
          {pick(L.hostPayout, locale)}
        </Text>
        <Text variant="body" weight="bold" style={styles.ltr}>
          {formatDZD(booking.host_payout_dzd, locale)}
        </Text>
      </View>

      {booking.special_requests ? (
        <Text variant="body-sm" color="textMuted" style={styles.italic} numberOfLines={3}>
          “{booking.special_requests}”
        </Text>
      ) : null}

      {error ? (
        <Text variant="body-sm" color="error">
          {error}
        </Text>
      ) : null}

      {tab === 'requests' ? (
        <>
          <View style={styles.actionsRow}>
            <View style={styles.actionFlex}>
              <Button
                label={pick(L.hostDecline, locale)}
                variant="danger"
                onPress={() => setDeclineSheet(true)}
                disabled={busy !== null}
              />
            </View>
            <View style={styles.actionFlex}>
              <Button
                label={pick(L.hostAccept, locale)}
                onPress={() => void onAccept()}
                loading={busy === 'accept'}
                disabled={busy !== null}
              />
            </View>
          </View>
          <View style={styles.messageRow}>
            <Button
              label={pick(L.hostMessageGuest, locale)}
              variant="ghost"
              icon={MessageCircle}
              onPress={() => void onMessage()}
              loading={busy === 'message'}
              disabled={busy !== null}
            />
          </View>
        </>
      ) : (
        <View style={styles.messageRow}>
          <Button
            label={pick(L.hostMessageGuest, locale)}
            variant="secondary"
            icon={MessageCircle}
            onPress={() => void onMessage()}
            loading={busy === 'message'}
            disabled={busy !== null}
          />
        </View>
      )}

      {/* TODO(host-stay-lifecycle): Check-in / Check-out / No-show buttons go
          here on the Upcoming tab once host_check_in/out/no_show RPCs are wired. */}

      {/* Decline-with-reason sheet */}
      <BottomSheet visible={declineSheet} onClose={() => setDeclineSheet(false)} dismissible={busy === null}>
        <View style={styles.sheetBody}>
          <Text variant="title" weight="semibold">
            {pick(L.hostDeclineTitle, locale)}
          </Text>
          <TextField
            label={pick(L.hostDecline, locale)}
            hint={pick(L.hostDeclineReasonHint, locale)}
            value={reason}
            onChangeText={setReason}
            placeholder={pick(L.hostDeclineReasonHint, locale)}
            multiline
          />
          <View style={styles.sheetActions}>
            <Button
              label={pick(L.hostDeclineConfirm, locale)}
              variant="danger"
              onPress={() => void onDecline()}
              loading={busy === 'decline'}
            />
            <Button
              label={pick(L.cancel, locale)}
              variant="ghost"
              onPress={() => setDeclineSheet(false)}
              disabled={busy === 'decline'}
            />
          </View>
        </View>
      </BottomSheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  ltr: { writingDirection: 'ltr' },
  italic: { fontStyle: 'italic', marginTop: theme.space.sm },

  segmentWrap: { paddingHorizontal: theme.space.xl, paddingVertical: theme.space.md },
  listContent: { padding: theme.space.xl, gap: theme.space.md, flexGrow: 1 },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
    marginBottom: theme.space.xs,
  },
  deadlineRow: {
    marginTop: theme.space.sm,
    padding: theme.space.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.warningBg,
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
  actionsRow: { flexDirection: 'row', gap: theme.space.md, marginTop: theme.space.md },
  actionFlex: { flex: 1 },
  messageRow: { marginTop: theme.space.sm },
  sheetBody: { gap: theme.space.md, paddingTop: theme.space.sm },
  sheetActions: { gap: theme.space.sm },
});
