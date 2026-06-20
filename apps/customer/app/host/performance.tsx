/**
 * Host performance (Phase 3 rework; redesigned Phase 8).
 *
 * Metric cards computed from the host's bookings + room types: listings, total
 * bookings, confirmed, completed, a 30-day occupancy estimate, and realized
 * revenue. No view-tracking table → "Views" renders an em-dash with a note.
 *
 * Built on @/ui (Screen/Header/Heading/Text/Skeleton/Empty/Error), full RTL,
 * pull-to-refresh. Borderless photo-first design language: metric tiles are
 * plain (no surface box / shadow), a lucide outline icon + big serif value.
 */

import type { ComponentType } from 'react';
import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Home,
  CalendarCheck,
  CheckCircle2,
  Flag,
  PieChart,
  Wallet,
  Eye,
  type LucideProps,
} from 'lucide-react-native';
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
        <View style={styles.centerFill}>
          <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.tryAgain, locale)} />
        </View>
      ) : stats === null ? (
        <View style={styles.scroll}>
          <View style={styles.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} style={styles.metricSkeleton} />
            ))}
          </View>
        </View>
      ) : stats.listingCount === 0 && stats.totalBookings === 0 ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon={Home}
            title={pick(L.hostPerfEmptyTitle, locale)}
            subtitle={pick(L.hostPerfEmptyBody, locale)}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.color.primary} colors={[theme.color.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            <MetricCard icon={Home} label={pick(L.hostMetricListings, locale)} value={formatNumber(stats.listingCount, locale)} />
            <MetricCard icon={CalendarCheck} label={pick(L.hostMetricBookings, locale)} value={formatNumber(stats.totalBookings, locale)} />
            <MetricCard icon={CheckCircle2} label={pick(L.hostMetricConfirmed, locale)} value={formatNumber(stats.confirmedBookings, locale)} />
            <MetricCard icon={Flag} label={pick(L.hostMetricCompleted, locale)} value={formatNumber(stats.completedBookings, locale)} />
            <MetricCard
              icon={PieChart}
              label={pick(L.hostMetricOccupancy, locale)}
              value={formatPercent(stats.occupancy, locale)}
              note={pick(L.hostOccupancyNote, locale)}
            />
            <MetricCard icon={Wallet} label={pick(L.hostMetricRevenue, locale)} value={formatDZD(stats.revenueDzd, locale)} money />
            <MetricCard icon={Eye} label={pick(L.hostMetricViews, locale)} value="—" note={pick(L.hostViewsNote, locale)} muted />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  money = false,
  muted = false,
}: {
  icon: ComponentType<LucideProps>;
  label: string;
  value: string;
  note?: string;
  money?: boolean;
  muted?: boolean;
}) {
  const accentColor = muted ? theme.color.ink300 : theme.color.primary;
  return (
    <View style={styles.metricCard}>
      <Icon size={22} color={accentColor} strokeWidth={2} />
      {money ? (
        <Text variant="title" weight="bold" color={muted ? 'ink300' : 'primary'} style={styles.ltr} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      ) : (
        <Heading level={2} color={muted ? 'ink300' : 'primary'} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Heading>
      )}
      <Text variant="body-sm" weight="medium" color="textMuted">
        {label}
      </Text>
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
  centerFill: { flex: 1, justifyContent: 'center' },
  scroll: { padding: theme.space.xl, paddingBottom: theme.space['3xl'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.space.lg, rowGap: theme.space['2xl'] },
  metricCard: {
    flexGrow: 1,
    flexBasis: '42%',
    minWidth: 140,
    gap: theme.space.xs,
  },
  metricSkeleton: {
    flexGrow: 1,
    flexBasis: '42%',
    minWidth: 140,
    height: 96,
    borderRadius: theme.radius.lg,
  },
});
