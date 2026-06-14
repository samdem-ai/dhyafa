/**
 * Host earnings (Phase 3 rework).
 *
 * Two segments:
 *   - Payouts     — rows from `payouts` (gross → commission → net), with two
 *     headline summaries: "Upcoming" (not-yet-paid net) vs "Paid total".
 *   - Per booking — money-committed bookings (confirmed / checked-in / completed)
 *     with total → commission → host payout. Confirmed/checked-in bookings get a
 *     host-side "Cancel booking" action with a refund preview (quote_refund).
 *
 * Built on @/ui (Screen/Header/Text/Card/SegmentedControl/Button/ConfirmSheet/
 * Toast/Skeleton/Empty/Error). All amounts use formatDZD (server-finalized).
 */

import { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDZD, type Locale } from '@dyafa/i18n';
import {
  listPayouts,
  listEarningBookings,
  cancelBooking,
  quoteRefund,
  type PayoutRow,
  type PayoutStatus,
  type EarningBooking,
} from '@/lib/host';
import { localizedName } from '@/lib/listings';
import {
  Screen,
  Header,
  Text,
  Card,
  Button,
  StatusPill,
  BottomSheet,
  TextField,
  SegmentedControl,
  SkeletonList,
  ErrorState,
  EmptyState,
  useToast,
  haptics,
} from '@/ui';
import type { Tone } from '@/ui';
import { L, pick, type LMessage } from '@/lib/copy';
import { formatRange } from '@/lib/dateFormat';
import { theme } from '@/theme';

type Tab = 'payouts' | 'bookings';

const PAYOUT_STATUS_LABEL: Record<PayoutStatus, LMessage> = {
  pending: L.payoutPending,
  processing: L.payoutProcessing,
  paid: L.payoutPaid,
  failed: L.payoutFailed,
  on_hold: L.payoutOnHold,
};

const PAYOUT_STATUS_TONE: Record<PayoutStatus, Tone> = {
  pending: 'warning',
  processing: 'info',
  paid: 'success',
  failed: 'error',
  on_hold: 'neutral',
};

function isPaid(status: PayoutStatus): boolean {
  return status === 'paid';
}

export default function HostEarningsScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('payouts');
  const [payouts, setPayouts] = useState<PayoutRow[] | null>(null);
  const [bookings, setBookings] = useState<EarningBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, b] = await Promise.all([listPayouts(), listEarningBookings()]);
      setPayouts(p);
      setBookings(b);
    } catch {
      setError(pick(L.loadError, locale));
      setPayouts([]);
      setBookings([]);
    }
  }, [locale]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const loading = payouts === null || bookings === null;

  const upcomingTotal = (payouts ?? [])
    .filter((p) => !isPaid(p.status))
    .reduce((sum, p) => sum + p.net_dzd, 0);
  const paidTotal = (payouts ?? [])
    .filter((p) => isPaid(p.status))
    .reduce((sum, p) => sum + p.net_dzd, 0);

  const TABS: { value: Tab; label: string }[] = [
    { value: 'payouts', label: pick(L.hostPayouts, locale) },
    { value: 'bookings', label: pick(L.hostPerBooking, locale) },
  ];

  return (
    <Screen>
      <Header title={pick(L.hostEarningsTitle, locale)} />

      <View style={styles.summaryRow}>
        <SummaryCard
          label={pick(L.hostEarnUpcoming, locale)}
          value={loading ? '—' : formatDZD(upcomingTotal, locale)}
          tone="info"
        />
        <SummaryCard
          label={pick(L.hostEarnPaid, locale)}
          value={loading ? '—' : formatDZD(paidTotal, locale)}
          tone="success"
        />
      </View>

      <View style={styles.segmentWrap}>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </View>

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.search, locale)} />
      ) : tab === 'payouts' ? (
        <FlatList
          data={payouts ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.color.primary} colors={[theme.color.primary]} />
          }
          ListFooterComponent={<Text variant="caption" color="textMuted" center style={styles.note}>{pick(L.hostEarningsNote, locale)}</Text>}
          ListEmptyComponent={
            <EmptyState
              title={pick(L.hostPayoutsEmptyTitle, locale)}
              subtitle={pick(L.hostPayoutsEmptyBody, locale)}
            />
          }
          renderItem={({ item }) => <PayoutCard payout={item} locale={locale} />}
        />
      ) : (
        <FlatList
          data={bookings ?? []}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.color.primary} colors={[theme.color.primary]} />
          }
          ListFooterComponent={<Text variant="caption" color="textMuted" center style={styles.note}>{pick(L.hostEarningsNote, locale)}</Text>}
          ListEmptyComponent={
            <EmptyState
              title={pick(L.hostEarnBookingsEmptyTitle, locale)}
              subtitle={pick(L.hostEarnBookingsEmptyBody, locale)}
            />
          }
          renderItem={({ item }) => (
            <EarningBookingCard
              booking={item}
              locale={locale}
              onCancelled={() => void load()}
              toastShow={toast.show}
            />
          )}
        />
      )}
    </Screen>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'info' | 'success' }) {
  return (
    <View style={[styles.summaryCard, tone === 'success' && styles.summaryCardSuccess]}>
      <Text variant="body-sm" color="textMuted">
        {label}
      </Text>
      <Text variant="title" weight="bold" style={styles.ltr}>
        {value}
      </Text>
    </View>
  );
}

function MoneyRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.moneyRow}>
      <Text variant="body-sm" weight={strong ? 'semibold' : 'regular'} color={strong ? 'text' : 'textMuted'}>
        {label}
      </Text>
      <Text variant={strong ? 'body' : 'body-sm'} weight={strong ? 'bold' : 'medium'} color={strong ? 'primary' : 'text'} style={styles.ltr}>
        {value}
      </Text>
    </View>
  );
}

function PayoutCard({ payout, locale }: { payout: PayoutRow; locale: Locale }) {
  return (
    <Card>
      <View style={styles.cardHeader}>
        <Text variant="body" weight="semibold" style={[styles.flex, styles.ltr]}>
          {formatRange(payout.period_start, payout.period_end, locale)}
        </Text>
        <StatusPill label={pick(PAYOUT_STATUS_LABEL[payout.status], locale)} tone={PAYOUT_STATUS_TONE[payout.status]} />
      </View>
      <MoneyRow label={pick(L.hostGross, locale)} value={formatDZD(payout.gross_dzd, locale)} />
      <MoneyRow label={pick(L.hostCommission, locale)} value={`− ${formatDZD(payout.commission_amount_dzd, locale)}`} />
      <View style={styles.divider} />
      <MoneyRow label={pick(L.hostNet, locale)} value={formatDZD(payout.net_dzd, locale)} strong />
    </Card>
  );
}

function EarningBookingCard({
  booking,
  locale,
  onCancelled,
  toastShow,
}: {
  booking: EarningBooking;
  locale: Locale;
  onCancelled: () => void;
  toastShow: (opts: { message: string; tone?: 'success' | 'error' }) => void;
}) {
  const [sheet, setSheet] = useState(false);
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState<number | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
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

  // Only confirmed/checked-in stays can be host-cancelled (not completed).
  const cancellable = booking.status === 'confirmed' || booking.status === 'checked_in';

  async function openCancel() {
    setError(null);
    setReason('');
    setRefund(null);
    setSheet(true);
    setQuoting(true);
    try {
      setRefund(await quoteRefund(booking.id));
    } catch {
      setRefund(null);
    } finally {
      setQuoting(false);
    }
  }

  async function onConfirmCancel() {
    setCancelling(true);
    setError(null);
    try {
      await cancelBooking(booking.id, reason.trim() || '—');
      haptics.warning();
      setSheet(false);
      toastShow({ message: pick(L.hostCancelDone, locale), tone: 'success' });
      onCancelled();
    } catch {
      setError(pick(L.hostCancelFailed, locale));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Card>
      <View style={styles.cardHeader}>
        <Text variant="title" weight="semibold" numberOfLines={1} style={styles.flex}>
          {title || booking.code}
        </Text>
        <Text variant="caption" weight="medium" color="textMuted">
          {booking.code}
        </Text>
      </View>
      <Text variant="body-sm" color="textMuted">
        {formatRange(booking.check_in, booking.check_out, locale)}
      </Text>
      <View style={styles.divider} />
      <MoneyRow label={pick(L.total, locale)} value={formatDZD(booking.total_dzd, locale)} />
      <MoneyRow label={pick(L.hostCommission, locale)} value={`− ${formatDZD(booking.commission_amount_dzd, locale)}`} />
      <MoneyRow label={pick(L.hostPayout, locale)} value={formatDZD(booking.host_payout_dzd, locale)} strong />

      {cancellable ? (
        <View style={styles.cancelRow}>
          <Button
            label={pick(L.hostCancelBooking, locale)}
            variant="danger"
            size="sm"
            fullWidth={false}
            onPress={() => void openCancel()}
          />
        </View>
      ) : null}

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} dismissible={!cancelling}>
        <View style={styles.sheetBody}>
          <Text variant="title" weight="semibold">
            {pick(L.hostCancelTitle, locale)}
          </Text>

          <View style={styles.refundRow}>
            <Text variant="body-sm" color="textMuted">
              {pick(L.hostRefundPreview, locale)}
            </Text>
            <Text variant="body" weight="bold" color="accent" style={styles.ltr}>
              {quoting ? '…' : refund != null ? formatDZD(refund, locale) : '—'}
            </Text>
          </View>

          <TextField
            label={pick(L.hostCancelBooking, locale)}
            hint={pick(L.hostCancelReasonHint, locale)}
            value={reason}
            onChangeText={setReason}
            placeholder={pick(L.hostCancelReasonHint, locale)}
            multiline
          />

          {error ? (
            <Text variant="body-sm" color="error">
              {error}
            </Text>
          ) : null}

          <View style={styles.sheetActions}>
            <Button
              label={pick(L.hostCancelConfirm, locale)}
              variant="danger"
              onPress={() => void onConfirmCancel()}
              loading={cancelling}
            />
            <Button
              label={pick(L.cancel, locale)}
              variant="ghost"
              onPress={() => setSheet(false)}
              disabled={cancelling}
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

  summaryRow: {
    flexDirection: 'row',
    gap: theme.space.md,
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.color.infoBg,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    gap: theme.space.xs,
  },
  summaryCardSuccess: { backgroundColor: theme.color.successBg },

  segmentWrap: { paddingHorizontal: theme.space.xl, paddingVertical: theme.space.md },
  listContent: { padding: theme.space.xl, gap: theme.space.md, flexGrow: 1 },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
    marginBottom: theme.space.xs,
  },
  divider: { height: 1, backgroundColor: theme.color.border, marginVertical: theme.space.xs },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  cancelRow: { marginTop: theme.space.md, alignItems: 'flex-start' },
  note: { marginTop: theme.space.sm },

  sheetBody: { gap: theme.space.md, paddingTop: theme.space.sm },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
  },
  sheetActions: { gap: theme.space.sm },
});
