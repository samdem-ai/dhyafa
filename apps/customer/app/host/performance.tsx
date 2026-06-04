/**
 * Host performance (M4).
 *
 * Lightweight metric cards computed from the host's bookings + room types:
 * listing count, total bookings, confirmed, completed, a 30-day occupancy
 * estimate (booked nights ÷ available room-nights), and realized revenue.
 *
 * There is NO view-tracking table, so "Views" renders an em-dash with a small
 * note rather than a fabricated number. Designed skeleton + empty + error
 * states; pull-to-refresh.
 */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  SafeAreaView,
  I18nManager,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import { getHostPerformance, type HostPerformance } from '@/lib/host';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

/** Format a 0–1 ratio as a whole-percent string with Latin digits. */
function formatPercent(ratio: number, locale: Locale): string {
  const pct = Math.round(ratio * 100);
  return `${formatNumber(pct, locale)}%`;
}

export default function HostPerformanceScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;

  const [stats, setStats] = useState<HostPerformance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await getHostPerformance();
      setStats(s);
    } catch {
      setError(pick(L.loadError, locale));
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.topBack}>{I18nManager.isRTL ? '→' : '←'}</Text>
        </Pressable>
        <Text style={styles.topTitle}>{pick(L.hostPerformanceTitle, locale)}</Text>
        <View style={styles.topSpacer} />
      </View>

      {stats === null && error ? (
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.search, locale)} />
      ) : stats === null ? (
        <View style={styles.gridPad}>
          <View style={styles.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} style={styles.metricSkeleton} />
            ))}
          </View>
        </View>
      ) : stats.listingCount === 0 && stats.totalBookings === 0 ? (
        <EmptyState
          emoji="📊"
          title={pick(L.hostPerfEmptyTitle, locale)}
          subtitle={pick(L.hostPerfEmptyBody, locale)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            <MetricCard
              label={pick(L.hostMetricListings, locale)}
              value={formatNumber(stats.listingCount, locale)}
            />
            <MetricCard
              label={pick(L.hostMetricBookings, locale)}
              value={formatNumber(stats.totalBookings, locale)}
            />
            <MetricCard
              label={pick(L.hostMetricConfirmed, locale)}
              value={formatNumber(stats.confirmedBookings, locale)}
            />
            <MetricCard
              label={pick(L.hostMetricCompleted, locale)}
              value={formatNumber(stats.completedBookings, locale)}
            />
            <MetricCard
              label={pick(L.hostMetricOccupancy, locale)}
              value={formatPercent(stats.occupancy, locale)}
              note={pick(L.hostOccupancyNote, locale)}
            />
            <MetricCard
              label={pick(L.hostMetricRevenue, locale)}
              value={formatDZD(stats.revenueDzd, locale)}
              money
            />
            {/* No view-tracking table: render em-dash with an explanatory note. */}
            <MetricCard
              label={pick(L.hostMetricViews, locale)}
              value="—"
              note={pick(L.hostViewsNote, locale)}
              muted
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MetricCard({
  label,
  value,
  note,
  money = false,
  muted = false,
}: {
  label: string;
  value: string;
  note?: string;
  money?: boolean;
  muted?: boolean;
}) {
  return (
    <View style={[styles.metricCard, muted && styles.metricCardMuted]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[styles.metricValue, money && styles.metricValueMoney, muted && styles.metricValueMuted]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {note ? <Text style={styles.metricNote}>{note}</Text> : null}
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

  scroll: { padding: theme.space.xl, paddingBottom: theme.space['3xl'] },
  gridPad: { padding: theme.space.xl },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.md,
  },
  metricCard: {
    // Two per row: (100% − gap) / 2. flexBasis with grow keeps RTL-safe wrapping.
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    gap: theme.space.xs,
    ...theme.shadow.card,
  },
  metricCardMuted: { backgroundColor: theme.color.surfaceSunken, ...theme.shadow.xs },
  metricSkeleton: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
    height: 96,
    borderRadius: theme.radius.card,
  },
  metricLabel: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
  },
  metricValue: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['heading-2'],
    color: theme.color.primary,
    textAlign,
  },
  metricValueMoney: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize['heading-3'],
    fontWeight: '700',
    writingDirection: 'ltr',
  },
  metricValueMuted: { color: theme.color.ink300 },
  metricNote: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign,
    lineHeight: theme.lineHeight.caption,
  },
});
