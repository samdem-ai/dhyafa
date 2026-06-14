/**
 * Explore landing (Phase 2 — single-fetch rework).
 *
 * A search-entry bar (opens the search modal) + curated rails over the approved
 * listings. ALL rails are now derived CLIENT-SIDE from ONE cached
 * useApprovedProperties() result (TanStack Query) — the old screen ran ~6 full
 * table reads per load (4× searchProperties + 2 wilaya lookups, each re-reading
 * the whole approved set with joins). Pull-to-refresh refetches the single
 * cached query.
 *
 * Each rail's "see all" + its context (wilaya / property type) is wired into
 * /search/results via typed params so the results screen scopes correctly.
 */

import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, I18nManager } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import {
  localizedName,
  type PropertySummary,
  type WilayaLite,
} from '@/lib/discovery';
import { useApprovedProperties } from '@/lib/queries';
import { RailCard } from '@/components/discovery';
import { Screen } from '@/ui';
import { Skeleton, ErrorState } from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { L, pick } from '@/lib/copy';
import { toParams, type SearchState } from '@/lib/searchParams';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const RAIL_LIMIT = 8;

/** Coastal + Saharan wilaya code buckets used only to label/scope curated rails. */
const COASTAL_WILAYAS = [2, 6, 13, 15, 16, 18, 21, 23, 27, 31, 35, 36, 42, 46];
const SAHARA_WILAYAS = [1, 3, 7, 8, 11, 17, 30, 33, 37, 39, 47];

interface RailData {
  key: string;
  title: string;
  items: PropertySummary[];
  /** Params for the rail's "see all" → /search/results. */
  params: SearchState;
}

function byRatingDesc(a: PropertySummary, b: PropertySummary): number {
  return b.rating_avg - a.rating_avg || b.review_count - a.review_count;
}

/** Build every rail from the single approved set — no extra network reads. */
function buildRails(all: PropertySummary[], locale: Locale): RailData[] {
  const rails: RailData[] = [];

  // Wilaya with the most approved listings → "Popular in <wilaya>".
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

  // Top rated (4+), across all wilayas.
  const topRated = all.filter((p) => p.rating_avg >= 4).sort(byRatingDesc).slice(0, RAIL_LIMIT);
  if (topRated.length > 0) {
    rails.push({
      key: 'top',
      title: pick(L.railTopRated, locale),
      items: topRated,
      params: { minRating: 4, sort: 'rating' },
    });
  }

  // Beachfront (coastal wilayas).
  const beachfront = all
    .filter((p) => COASTAL_WILAYAS.includes(p.wilaya_code))
    .sort(byRatingDesc)
    .slice(0, RAIL_LIMIT);
  if (beachfront.length > 0) {
    rails.push({
      key: 'beach',
      title: pick(L.railBeachfront, locale),
      items: beachfront,
      // No multi-wilaya param; "see all" opens recommended results.
      params: { sort: 'rating' },
    });
  }

  // Sahara escapes (Saharan wilayas).
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

  const rails = useMemo(
    () => (data ? buildRails(data, locale) : null),
    [data, locale],
  );

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
        <View style={styles.headerText}>
          <Text style={styles.brand}>{pick(L.exploreGreeting, locale)}</Text>
          <Text style={styles.tagline}>{pick(L.searchTitle, locale)}</Text>
        </View>
        <NotificationBell locale={locale} />
      </View>

      {/* Search entry */}
      <Pressable
        accessibilityRole="search"
        onPress={() => router.push('/search')}
        style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <View style={styles.searchTextWrap}>
          <Text style={styles.searchPrimary}>{pick(L.anyDestination, locale)}</Text>
          <Text style={styles.searchSecondary}>
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
          retryLabel={pick(L.search, locale)}
        />
      ) : rails.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>{pick(L.noResultsTitle, locale)}</Text>
          <Text style={styles.emptyBody}>{pick(L.noResultsBody, locale)}</Text>
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
        <Text style={styles.railTitle} numberOfLines={1}>
          {rail.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/search/results', params: toParams(rail.params) })}
          hitSlop={6}
        >
          <Text style={styles.seeAll}>{pick(L.showResults, locale)}</Text>
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

const textAlign = I18nManager.isRTL ? 'right' : 'left';

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },
  // Clear the bottom tab bar (the tab bar owns the safe-area inset).
  scrollContent: { paddingBottom: theme.space['4xl'] },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.md,
  },
  headerText: { flex: 1 },
  brand: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['display-lg'],
    fontWeight: '600',
    color: theme.color.primary,
    textAlign,
  },
  tagline: {
    fontFamily: RN_FONTS.bodyRegular,
    fontSize: theme.fontSize['body-lg'],
    color: theme.color.textMuted,
    marginTop: theme.space.xs,
    textAlign,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.space.xl,
    marginBottom: theme.space.xl,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.borderStrong,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    gap: theme.space.md,
    ...theme.shadow.card,
  },
  searchIcon: { fontSize: 20 },
  searchTextWrap: { flex: 1 },
  searchPrimary: {
    fontFamily: RN_FONTS.bodySemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  searchSecondary: {
    fontFamily: RN_FONTS.bodyRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign,
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
  railTitle: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-2'],
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  seeAll: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.accent,
    fontWeight: '600',
  },
  railContent: { paddingHorizontal: theme.space.xl, gap: theme.space.md },

  emptyWrap: { padding: theme.space['2xl'], alignItems: 'center', gap: theme.space.sm },
  emptyTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-3'],
    color: theme.color.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.textMuted,
    textAlign: 'center',
  },

  // Skeleton
  skelTitle: {
    height: 22,
    width: '55%',
    marginHorizontal: theme.space.xl,
    marginBottom: theme.space.md,
    borderRadius: theme.radius.sm,
  },
  skelCard: { width: 220, gap: theme.space.sm },
  skelImage: { width: '100%', height: 150, borderRadius: theme.radius.card },
  skelLineWide: { height: 14, width: '80%', borderRadius: theme.radius.sm },
  skelLineNarrow: { height: 12, width: '50%', borderRadius: theme.radius.sm },
});
