/**
 * Explore landing (Phase 2 — single-fetch rework; redesigned Phase 8).
 *
 * A search-entry bar (opens the search modal) + curated rails over the approved
 * listings. ALL rails are derived CLIENT-SIDE from ONE cached
 * useApprovedProperties() result (TanStack Query). Pull-to-refresh refetches the
 * single cached query.
 *
 * Each rail's "see all" + its context (wilaya / property type) is wired into
 * /search/results via typed params so the results screen scopes correctly.
 */

import { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable, I18nManager } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search, ChevronRight } from 'lucide-react-native';
import type { Locale } from '@dyafa/i18n';
import {
  localizedName,
  type PropertySummary,
  type WilayaLite,
} from '@/lib/discovery';
import { useApprovedProperties } from '@/lib/queries';
import { RailCard } from '@/components/discovery';
import { Screen, Heading, Text, Skeleton, ErrorState } from '@/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { L, pick } from '@/lib/copy';
import { toParams, type SearchState } from '@/lib/searchParams';
import { theme } from '@/theme';

const RAIL_LIMIT = 8;

/** Coastal + Saharan wilaya code buckets used only to label/scope curated rails. */
const COASTAL_WILAYAS = [2, 6, 13, 15, 16, 18, 21, 23, 27, 31, 35, 36, 42, 46];
const SAHARA_WILAYAS = [1, 3, 7, 8, 11, 17, 30, 33, 37, 39, 47];

interface RailData {
  key: string;
  title: string;
  items: PropertySummary[];
  params: SearchState;
}

function byRatingDesc(a: PropertySummary, b: PropertySummary): number {
  return b.rating_avg - a.rating_avg || b.review_count - a.review_count;
}

/** Build every rail from the single approved set — no extra network reads. */
function buildRails(all: PropertySummary[], locale: Locale): RailData[] {
  const rails: RailData[] = [];

  const countByWilaya = new Map<number, number>();
  const wilayaByCode = new Map<number, WilayaLite>();
  for (const p of all) {
    countByWilaya.set(p.wilaya_code, (countByWilaya.get(p.wilaya_code) ?? 0) + 1);
    if (p.wilaya && !wilayaByCode.has(p.wilaya_code)) wilayaByCode.set(p.wilaya_code, p.wilaya);
  }
  let topWilaya: number | null = null;
  let topCount = 0;
  for (const [code, n] of countByWilaya) {
    if (n > topCount) {
      topCount = n;
      topWilaya = code;
    }
  }
  if (topWilaya != null) {
    const wilaya = wilayaByCode.get(topWilaya);
    const name = wilaya ? localizedName(wilaya, locale) : '';
    const items = all.filter((p) => p.wilaya_code === topWilaya).sort(byRatingDesc).slice(0, RAIL_LIMIT);
    if (items.length > 0 && name) {
      rails.push({
        key: 'popular',
        title: `${pick(L.railPopular, locale)} ${name}`,
        items,
        params: { wilayaCode: topWilaya, sort: 'rating' },
      });
    }
  }

  const topRated = all.filter((p) => p.rating_avg >= 4).sort(byRatingDesc).slice(0, RAIL_LIMIT);
  if (topRated.length > 0) {
    rails.push({
      key: 'top',
      title: pick(L.railTopRated, locale),
      items: topRated,
      params: { minRating: 4, sort: 'rating' },
    });
  }

  const beachfront = all
    .filter((p) => COASTAL_WILAYAS.includes(p.wilaya_code))
    .sort(byRatingDesc)
    .slice(0, RAIL_LIMIT);
  if (beachfront.length > 0) {
    rails.push({
      key: 'beach',
      title: pick(L.railBeachfront, locale),
      items: beachfront,
      params: { sort: 'rating' },
    });
  }

  const sahara = all
    .filter((p) => SAHARA_WILAYAS.includes(p.wilaya_code))
    .sort(byRatingDesc)
    .slice(0, RAIL_LIMIT);
  if (sahara.length > 0) {
    rails.push({
      key: 'sahara',
      title: pick(L.railSahara, locale),
      items: sahara,
      params: { sort: 'rating' },
    });
  }

  return rails;
}

export default function ExploreScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;

  const { data, isPending, isError, refetch, isRefetching } = useApprovedProperties();

  const rails = useMemo(() => (data ? buildRails(data, locale) : null), [data, locale]);

  return (
    <Screen
      scroll
      edges={['top']}
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.flex}>
          <Heading level="display-lg" color="primary">
            {pick(L.exploreGreeting, locale)}
          </Heading>
          <Text variant="body-lg" color="textMuted" style={styles.tagline}>
            {pick(L.searchTitle, locale)}
          </Text>
        </View>
        <NotificationBell locale={locale} />
      </View>

      {/* Search entry */}
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={pick(L.search, locale)}
        onPress={() => router.push('/search')}
        style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
      >
        <Search size={20} color={theme.color.primary} strokeWidth={2.25} />
        <View style={styles.flex}>
          <Text variant="body" weight="semibold" numberOfLines={1}>
            {pick(L.anyDestination, locale)}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {pick(L.anyDates, locale)} · {pick(L.guests, locale)}
          </Text>
        </View>
      </Pressable>

      {/* Content states */}
      {isPending || rails === null ? (
        <RailsSkeleton />
      ) : isError ? (
        <ErrorState
          message={pick(L.loadError, locale)}
          onRetry={() => void refetch()}
          retryLabel={pick(L.tryAgain, locale)}
        />
      ) : rails.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Heading level={3} center>
            {pick(L.noResultsTitle, locale)}
          </Heading>
          <Text variant="body" color="textMuted" center>
            {pick(L.noResultsBody, locale)}
          </Text>
        </View>
      ) : (
        rails.map((rail) => <Rail key={rail.key} rail={rail} locale={locale} />)
      )}
    </Screen>
  );
}

function Rail({ rail, locale }: { rail: RailData; locale: Locale }) {
  return (
    <View style={styles.rail}>
      <View style={styles.railHeader}>
        <Text variant="title" weight="bold" numberOfLines={1} style={styles.flex}>
          {rail.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pick(L.showResults, locale)}
          onPress={() => router.push({ pathname: '/search/results', params: toParams(rail.params) })}
          hitSlop={8}
          style={styles.seeAll}
        >
          <Text variant="body-sm" weight="semibold" color="accent">
            {pick(L.showResults, locale)}
          </Text>
          <ChevronRight
            size={16}
            color={theme.color.accent}
            strokeWidth={2.5}
            style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
          />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {rail.items.map((p) => (
          <RailCard
            key={p.id}
            property={p}
            locale={locale}
            onPress={() => router.push(`/property/${p.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function RailsSkeleton() {
  return (
    <View>
      {[0, 1].map((r) => (
        <View key={r} style={styles.rail}>
          <Skeleton style={styles.skelTitle} />
          <ScrollView
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContent}
          >
            {[0, 1, 2].map((c) => (
              <View key={c} style={styles.skelCard}>
                <Skeleton style={styles.skelImage} />
                <Skeleton style={styles.skelLineWide} />
                <Skeleton style={styles.skelLineNarrow} />
              </View>
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: theme.space['4xl'] },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.lg,
  },
  tagline: { marginTop: theme.space.xs },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.space.xl,
    marginBottom: theme.space['2xl'],
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    gap: theme.space.md,
    ...theme.shadow.xs,
  },

  rail: { marginBottom: theme.space['2xl'] },
  railHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xl,
    marginBottom: theme.space.md,
    gap: theme.space.sm,
  },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  railContent: { paddingHorizontal: theme.space.xl, gap: theme.space.lg },

  emptyWrap: { padding: theme.space['2xl'], alignItems: 'center', gap: theme.space.sm },

  // Skeleton
  skelTitle: {
    height: 22,
    width: '55%',
    marginHorizontal: theme.space.xl,
    marginBottom: theme.space.md,
    borderRadius: theme.radius.sm,
  },
  skelCard: { width: 240, gap: theme.space.sm },
  skelImage: { width: '100%', height: 240, borderRadius: theme.radius.lg },
  skelLineWide: { height: 14, width: '80%', borderRadius: theme.radius.sm },
  skelLineNarrow: { height: 12, width: '50%', borderRadius: theme.radius.sm },
});
