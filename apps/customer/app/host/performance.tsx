/**
 * Host performance (Phase 3 rework).
 *
 * Metric cards computed from the host's bookings + room types: listings, total
 * bookings, confirmed, completed, a 30-day occupancy estimate, and realized
 * revenue. No view-tracking table → "Views" renders an em-dash with a note.
 *
 * Built on @/ui (Screen/Header/Heading/Text/Skeleton/Empty/Error), full RTL,
 * pull-to-refresh.
 */

import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import { getHostPerformance, type HostPerformance } from '@/lib/host';
import { Screen, Header, Heading, Text, Skeleton, ErrorState, EmptyState } from '@/ui';
import { L, pick } from '@/lib/copy';
import { theme } from '@/theme';

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
      setStats(await getHostPerformance());
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
    <Screen>
      <Header title={pick(L.hostPerformanceTitle, locale)} />

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
          title={pick(L.hostPerfEmptyTitle, locale)}
          subtitle={pick(L.hostPerfEmptyBody, locale)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.color.primary} colors={[theme.color.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            <MetricCard label={pick(L.hostMetricListings, locale)} value={formatNumber(stats.listingCount, locale)} />
            <MetricCard label={pick(L.hostMetricBookings, locale)} value={formatNumber(stats.totalBookings, locale)} />
            <MetricCard label={pick(L.hostMetricConfirmed, locale)} value={formatNumber(stats.confirmedBookings, locale)} />
            <MetricCard label={pick(L.hostMetricCompleted, locale)} value={formatNumber(stats.completedBookings, locale)} />
            <MetricCard
              label={pick(L.hostMetricOccupancy, locale)}
              value={formatPercent(stats.occupancy, locale)}
              note={pick(L.hostOccupancyNote, locale)}
            />
            <MetricCard label={pick(L.hostMetricRevenue, locale)} value={formatDZD(stats.revenueDzd, locale)} money />
            <MetricCard label={pick(L.hostMetricViews, locale)} value="—" note={pick(L.hostViewsNote, locale)} muted />
          </View>
        </ScrollView>
      )}
    </Screen>
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
      <Text variant="body-sm" color="textMuted">
        {label}
      </Text>
      {money ? (
        <Text variant="title" weight="bold" color={muted ? 'ink300' : 'primary'} style={styles.ltr} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      ) : (
        <Heading level={2} color={muted ? 'ink300' : 'primary'} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Heading>
      )}
      {note ? (
        <Text variant="caption" color="textMuted">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ltr: { writingDirection: 'ltr' },
  scroll: { padding: theme.space.xl, paddingBottom: theme.space['3xl'] },
  gridPad: { padding: theme.space.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  metricCard: {
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
});
