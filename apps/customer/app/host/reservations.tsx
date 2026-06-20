/**
 * Host reservations (Phase 3 rework; redesigned Phase 8 — Airbnb design language).
 *
 * Three segments:
 *   - Requests          — status='requested'; Accept / Decline (with reason) + message guest.
 *   - Awaiting payment   — status='awaiting_payment' (accepted, unpaid); shows the
 *                          payment deadline so these no longer vanish from view.
 *   - Upcoming           — confirmed / checked-in stays; check-in / check-out /
 *                          no-show front-desk actions + message guest.
 *
 * Built on @/ui (Screen/Header/Text/Heading/Button/SegmentedControl/BottomSheet/
 * TextField/Toast/SkeletonList/EmptyState/ErrorState). Rows are BORDERLESS — no
 * surface box or shadow — separated by hairline dividers, with outline Lucide
 * meta icons, the shared BookingStatusBadge, and a single terracotta primary
 * action per row. Optimistic accept/decline reconciled with a refetch. Decline
 * captures a reason via a BottomSheet + reason field.
 *
 * All host_check_in / host_check_out / host_mark_no_show + reconcile logic is
 * preserved exactly — this change is presentational only.
 */

import { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
  CalendarRange,
  Users,
  Wallet,
  Clock,
  Check,
  LogOut,
  UserX,
  CalendarClock,
  type LucideProps,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import {
  listBookingRequests,
  listAwaitingPaymentStays,
  listUpcomingStays,
  checkInBooking,
  checkOutBooking,
  markNoShow,
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
  Heading,
  Button,
  SegmentedControl,
  BottomSheet,
  TextField,
  SkeletonList,
  ErrorState,
  EmptyState,
  useToast,
  haptics,
} from '@/ui';
import { BookingStatusBadge } from '@/components/discovery';
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
  no_show: L.st_no_show,
};

/** Plain status string for toasts (the visual badge uses BookingStatusBadge). */
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
        <View style={styles.centerFill}>
          <EmptyState
            icon={CalendarClock}
            title={pick(L.hostRequestsEmptyTitle, locale)}
            subtitle={pick(L.hostRequestsEmptyBody, locale)}
          />
        </View>
      );
    if (t === 'awaiting')
      return (
        <View style={styles.centerFill}>
          <EmptyState
            icon={Clock}
            title={pick(L.hostAwaitingEmptyTitle, locale)}
            subtitle={pick(L.hostAwaitingEmptyBody, locale)}
          />
        </View>
      );
    return (
      <View style={styles.centerFill}>
        <EmptyState
          icon={CalendarRange}
          title={pick(L.hostUpcomingEmptyTitle, locale)}
          subtitle={pick(L.hostUpcomingEmptyBody, locale)}
        />
      </View>
    );
  }

  return (
    <Screen>
      <Header title={pick(L.hostReservationsTitle, locale)} />

      <View style={styles.segmentWrap}>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </View>

      {data === null ? (
        <View style={styles.skeletonWrap}>
          <SkeletonList count={3} />
        </View>
      ) : error && data.length === 0 ? (
        <View style={styles.centerFill}>
          <ErrorState
            message={error}
            onRetry={() => void load(tab)}
            retryLabel={pick(L.tryAgain, locale)}
          />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.rowSep} />}
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
            <ReservationRow
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

/** A single meta line: outline Lucide icon + label text. */
function MetaRow({
  icon: Icon,
  children,
}: {
  icon: ComponentType<LucideProps>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.metaRow}>
      <Icon size={16} color={theme.color.textMuted} strokeWidth={2} />
      <Text variant="body-sm" color="textMuted" style={styles.flex} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

function ReservationRow({
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
  const [busy, setBusy] = useState<
    null | 'accept' | 'decline' | 'message' | 'checkin' | 'checkout' | 'noshow'
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [declineSheet, setDeclineSheet] = useState(false);
  const [noShowSheet, setNoShowSheet] = useState(false);
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

  async function onCheckIn() {
    setBusy('checkin');
    setError(null);
    try {
      await checkInBooking(booking.id);
      haptics.success();
      toastShow({ message: statusLabel('checked_in', locale), tone: 'success' });
      onReconcile();
    } catch {
      setError(pick(L.hostCheckInFailed, locale));
      setBusy(null);
    }
  }

  async function onCheckOut() {
    setBusy('checkout');
    setError(null);
    try {
      await checkOutBooking(booking.id);
      haptics.success();
      toastShow({ message: statusLabel('completed', locale), tone: 'success' });
      onReconcile();
    } catch {
      setError(pick(L.hostCheckOutFailed, locale));
      setBusy(null);
    }
  }

  async function onNoShow() {
    setBusy('noshow');
    setError(null);
    try {
      await markNoShow(booking.id);
      setNoShowSheet(false);
      haptics.warning();
      toastShow({ message: statusLabel('no_show', locale), tone: 'success' });
      onReconcile();
    } catch {
      setError(pick(L.hostNoShowFailed, locale));
      setBusy(null);
    }
  }

  return (
    <View style={styles.row}>
      {/* Title + status */}
      <View style={styles.rowHeader}>
        <Text variant="title" weight="bold" numberOfLines={1} style={styles.flex}>
          {title}
        </Text>
        <BookingStatusBadge status={booking.status} locale={locale} />
      </View>

      {/* Guest */}
      <Text variant="body" weight="semibold" numberOfLines={1} style={styles.guest}>
        {booking.guestName || '—'}
      </Text>

      {/* Meta */}
      <View style={styles.meta}>
        {room ? <MetaRow icon={Users}>{room}</MetaRow> : null}
        <MetaRow icon={CalendarRange}>{range}</MetaRow>
        <MetaRow icon={Users}>
          {pick(L.hostGuests, locale)}: {formatNumber(guestTotal, locale)}
          {booking.nights
            ? ` · ${formatNumber(booking.nights, locale)} ${pick(L.hostNights, locale)}`
            : ''}
        </MetaRow>
      </View>

      {/* Awaiting-payment deadline */}
      {tab === 'awaiting' && booking.payment_deadline ? (
        <View style={styles.deadlineRow}>
          <Clock size={16} color={theme.color.warning} strokeWidth={2} />
          <Text variant="body-sm" color="warning" weight="semibold" style={styles.flex}>
            {pick(L.hostPayBy, locale)}: {formatDateTime(booking.payment_deadline, locale)}
          </Text>
        </View>
      ) : null}

      {/* Payout */}
      <View style={styles.payoutRow}>
        <View style={styles.payoutLabel}>
          <Wallet size={16} color={theme.color.textMuted} strokeWidth={2} />
          <Text variant="body-sm" color="textMuted">
            {pick(L.hostPayout, locale)}
          </Text>
        </View>
        <Text variant="body" weight="bold" style={styles.ltr}>
          {formatDZD(booking.host_payout_dzd, locale)}
        </Text>
      </View>

      {booking.special_requests ? (
        <Text variant="body-sm" color="textMuted" style={styles.quote} numberOfLines={3}>
          “{booking.special_requests}”
        </Text>
      ) : null}

      {error ? (
        <Text variant="body-sm" weight="medium" color="error">
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
                variant="tertiary"
                icon={Check}
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

      {/* Front-desk lifecycle actions (Upcoming tab) */}
      {tab === 'upcoming' && booking.status === 'confirmed' ? (
        <View style={styles.actionsRow}>
          <View style={styles.actionFlex}>
            <Button
              label={pick(L.hostNoShow, locale)}
              variant="danger"
              icon={UserX}
              onPress={() => setNoShowSheet(true)}
              disabled={busy !== null}
            />
          </View>
          <View style={styles.actionFlex}>
            <Button
              label={pick(L.hostCheckIn, locale)}
              variant="tertiary"
              icon={Check}
              onPress={() => void onCheckIn()}
              loading={busy === 'checkin'}
              disabled={busy !== null}
            />
          </View>
        </View>
      ) : null}
      {tab === 'upcoming' && booking.status === 'checked_in' ? (
        <View style={styles.messageRow}>
          <Button
            label={pick(L.hostCheckOut, locale)}
            variant="tertiary"
            icon={LogOut}
            onPress={() => void onCheckOut()}
            loading={busy === 'checkout'}
            disabled={busy !== null}
          />
        </View>
      ) : null}

      {/* Decline-with-reason sheet */}
      <BottomSheet visible={declineSheet} onClose={() => setDeclineSheet(false)} dismissible={busy === null}>
        <View style={styles.sheetBody}>
          <Heading level={3}>{pick(L.hostDeclineTitle, locale)}</Heading>
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

      {/* No-show confirm sheet */}
      <BottomSheet visible={noShowSheet} onClose={() => setNoShowSheet(false)} dismissible={busy === null}>
        <View style={styles.sheetBody}>
          <Heading level={3}>{pick(L.hostNoShowTitle, locale)}</Heading>
          <Text variant="body" color="textMuted">
            {pick(L.hostNoShowBody, locale)}
          </Text>
          <View style={styles.sheetActions}>
            <Button
              label={pick(L.hostNoShowConfirm, locale)}
              variant="danger"
              onPress={() => void onNoShow()}
              loading={busy === 'noshow'}
            />
            <Button
              label={pick(L.cancel, locale)}
              variant="ghost"
              onPress={() => setNoShowSheet(false)}
              disabled={busy === 'noshow'}
            />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  ltr: { writingDirection: 'ltr' },

  segmentWrap: { paddingHorizontal: theme.space.xl, paddingVertical: theme.space.md },
  skeletonWrap: { padding: theme.space.xl, gap: theme.space.xl },
  listContent: { padding: theme.space.xl, flexGrow: 1 },
  centerFill: { flex: 1, justifyContent: 'center' },

  // Borderless row — no surface box, no shadow.
  row: { gap: theme.space.xs },
  rowSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.color.border,
    marginVertical: theme.space.xl,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  guest: { marginTop: theme.space.xs },

  meta: { gap: theme.space.xs, marginTop: theme.space.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },

  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    marginTop: theme.space.sm,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.warningBg,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    marginTop: theme.space.md,
  },
  payoutLabel: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },

  quote: { fontStyle: 'italic', marginTop: theme.space.sm },

  actionsRow: { flexDirection: 'row', gap: theme.space.md, marginTop: theme.space.md },
  actionFlex: { flex: 1 },
  messageRow: { marginTop: theme.space.sm },

  sheetBody: { gap: theme.space.md, paddingTop: theme.space.sm },
  sheetActions: { gap: theme.space.sm, marginTop: theme.space.xs },
});
