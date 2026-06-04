/**
 * Host earnings (M4).
 *
 * Two segments:
 *   - Payouts     — rows from `payouts` (gross → commission → net), grouped by
 *     status, with headline summaries (upcoming vs paid).
 *   - Per booking — the host's money-committed bookings (confirmed / checked-in
 *     / completed) with total → commission → host payout.
 *
 * All amounts use formatDZD and are server-finalized (never client-computed).
 * Designed skeleton + empty + error states; pull-to-refresh.
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
import { formatDZD, type Locale } from '@dyafa/i18n';
import {
  listPayouts,
  listEarningBookings,
  type PayoutRow,
  type PayoutStatus,
  type EarningBooking,
} from '@/lib/host';
import { localizedName } from '@/lib/listings';
import { SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { L, pick, type LMessage } from '@/lib/copy';
import { formatRange } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

type Tab = 'payouts' | 'bookings';
const TABS: { key: Tab; label: LMessage }[] = [
  { key: 'payouts', label: L.hostPayouts },
  { key: 'bookings', label: L.hostPerBooking },
];

const PAYOUT_STATUS_LABEL: Record<PayoutStatus, LMessage> = {
  pending: L.payoutPending,
  processing: L.payoutProcessing,
  paid: L.payoutPaid,
  failed: L.payoutFailed,
  on_hold: L.payoutOnHold,
};

const PAYOUT_STATUS_TONE: Record<PayoutStatus, { bg: string; fg: string }> = {
  pending: { bg: theme.color.warningBg, fg: theme.color.warning },
  processing: { bg: theme.color.infoBg, fg: theme.color.info },
  paid: { bg: theme.color.successBg, fg: theme.color.success },
  failed: { bg: theme.color.errorBg, fg: theme.color.error },
  on_hold: { bg: theme.color.surfaceSunken, fg: theme.color.textMuted },
};

/** A payout counts as "paid" only when its status is paid; everything else is upcoming. */
function isPaid(status: PayoutStatus): boolean {
  return status === 'paid';
}

export default function HostEarningsScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;

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

  // Headline summaries from payouts: upcoming (not-yet-paid) vs paid net DZD.
  const upcomingTotal = (payouts ?? [])
    .filter((p) => !isPaid(p.status))
    .reduce((sum, p) => sum + p.net_dzd, 0);
  const paidTotal = (payouts ?? [])
    .filter((p) => isPaid(p.status))
    .reduce((sum, p) => sum + p.net_dzd, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.topBack}>{I18nManager.isRTL ? '→' : '←'}</Text>
        </Pressable>
        <Text style={styles.topTitle}>{pick(L.hostEarningsTitle, locale)}</Text>
        <View style={styles.topSpacer} />
      </View>

      {/* Headline summaries */}
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

      {/* Segmented control */}
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

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.search, locale)} />
      ) : tab === 'payouts' ? (
        <FlatList
          data={payouts ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          ListFooterComponent={<Text style={styles.note}>{pick(L.hostEarningsNote, locale)}</Text>}
          ListEmptyComponent={
            <EmptyState
              emoji="💸"
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          ListFooterComponent={<Text style={styles.note}>{pick(L.hostEarningsNote, locale)}</Text>}
          ListEmptyComponent={
            <EmptyState
              emoji="🧾"
              title={pick(L.hostEarnBookingsEmptyTitle, locale)}
              subtitle={pick(L.hostEarnBookingsEmptyBody, locale)}
            />
          }
          renderItem={({ item }) => <EarningBookingCard booking={item} locale={locale} />}
        />
      )}
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'info' | 'success';
}) {
  return (
    <View style={[styles.summaryCard, tone === 'success' && styles.summaryCardSuccess]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function MoneyRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.moneyRow}>
      <Text style={[styles.moneyLabel, strong && styles.moneyLabelStrong]}>{label}</Text>
      <Text style={[styles.moneyValue, strong && styles.moneyValueStrong]}>{value}</Text>
    </View>
  );
}

function PayoutCard({ payout, locale }: { payout: PayoutRow; locale: Locale }) {
  const tone = PAYOUT_STATUS_TONE[payout.status];
  const label = pick(PAYOUT_STATUS_LABEL[payout.status], locale);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardPeriod}>
          {formatRange(payout.period_start, payout.period_end, locale)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
          <Text style={[styles.statusBadgeText, { color: tone.fg }]}>{label}</Text>
        </View>
      </View>
      <MoneyRow label={pick(L.hostGross, locale)} value={formatDZD(payout.gross_dzd, locale)} />
      <MoneyRow
        label={pick(L.hostCommission, locale)}
        value={`− ${formatDZD(payout.commission_amount_dzd, locale)}`}
      />
      <View style={styles.divider} />
      <MoneyRow label={pick(L.hostNet, locale)} value={formatDZD(payout.net_dzd, locale)} strong />
    </View>
  );
}

function EarningBookingCard({ booking, locale }: { booking: EarningBooking; locale: Locale }) {
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
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title || booking.code}
        </Text>
        <Text style={styles.cardCode}>{booking.code}</Text>
      </View>
      <Text style={styles.cardMeta}>
        {formatRange(booking.check_in, booking.check_out, locale)}
      </Text>
      <View style={styles.divider} />
      <MoneyRow label={pick(L.total, locale)} value={formatDZD(booking.total_dzd, locale)} />
      <MoneyRow
        label={pick(L.hostCommission, locale)}
        value={`− ${formatDZD(booking.commission_amount_dzd, locale)}`}
      />
      <MoneyRow label={pick(L.hostPayout, locale)} value={formatDZD(booking.host_payout_dzd, locale)} strong />
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
  summaryLabel: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
  },
  summaryValue: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize['heading-3'],
    fontWeight: '700',
    color: theme.color.text,
    textAlign,
    writingDirection: 'ltr',
  },

  segment: {
    flexDirection: 'row',
    marginHorizontal: theme.space.xl,
    marginTop: theme.space.lg,
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
    gap: theme.space.xs,
    ...theme.shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
    marginBottom: theme.space.xs,
  },
  cardPeriod: {
    flex: 1,
    fontFamily: RN_FONTS.bodySemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
    writingDirection: 'ltr',
  },
  cardTitle: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  cardCode: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
  },
  cardMeta: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
  },
  statusBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: theme.color.border,
    marginVertical: theme.space.xs,
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  moneyLabel: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
  },
  moneyLabelStrong: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontWeight: '600',
    color: theme.color.text,
  },
  moneyValue: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.text,
    writingDirection: 'ltr',
  },
  moneyValueStrong: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize.body,
    fontWeight: '700',
    color: theme.color.primary,
  },
  note: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign: 'center',
    marginTop: theme.space.sm,
    lineHeight: theme.lineHeight.caption,
  },
});
