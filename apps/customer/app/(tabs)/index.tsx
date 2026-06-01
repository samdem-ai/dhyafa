/**
 * Explore landing (M2).
 *
 * A search-entry bar (opens the search modal) + curated rails querying approved
 * listings: Popular in <wilaya>, Beachfront, Sahara escapes, Top rated. Tapping
 * a card opens the property detail; the search bar / "see all" opens results.
 *
 * Photography-forward rail cards, designed skeletons, empty + error states.
 */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  SafeAreaView,
  I18nManager,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import {
  railPopularInWilaya,
  railByWilayaCodes,
  railTopRated,
  listWilayasWithListings,
  listActiveWilayas,
  localizedName,
  type PropertySummary,
  type WilayaLite,
} from '@/lib/discovery';
import { RailCard } from '@/components/discovery';
import { Skeleton, ErrorState } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

// Algerian coastal + Saharan wilaya code buckets for curated rails.
const COASTAL_WILAYAS = [2, 6, 13, 15, 16, 18, 21, 23, 27, 31, 35, 36, 42, 46];
const SAHARA_WILAYAS = [1, 3, 7, 8, 11, 17, 30, 33, 37, 39, 47];

interface RailData {
  key: string;
  title: string;
  items: PropertySummary[];
}

export default function ExploreScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;

  const [rails, setRails] = useState<RailData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [withListings, allWilayas] = await Promise.all([
        listWilayasWithListings(),
        listActiveWilayas(),
      ]);
      const wilayaByCode = new Map<number, WilayaLite>(allWilayas.map((w) => [w.code, w]));
      // Pick the first wilaya that actually has listings for the "Popular in" rail.
      const popularCode = withListings[0] ?? null;
      const popularName =
        popularCode != null && wilayaByCode.has(popularCode)
          ? localizedName(wilayaByCode.get(popularCode)!, locale)
          : '';

      const [popular, beachfront, sahara, topRated] = await Promise.all([
        popularCode != null ? railPopularInWilaya(popularCode) : Promise.resolve([]),
        railByWilayaCodes(COASTAL_WILAYAS),
        railByWilayaCodes(SAHARA_WILAYAS),
        railTopRated(),
      ]);

      const built: RailData[] = [];
      if (popular.length > 0 && popularName) {
        built.push({
          key: 'popular',
          title: `${pick(L.railPopular, locale)} ${popularName}`,
          items: popular,
        });
      }
      if (topRated.length > 0) {
        built.push({ key: 'top', title: pick(L.railTopRated, locale), items: topRated });
      }
      if (beachfront.length > 0) {
        built.push({ key: 'beach', title: pick(L.railBeachfront, locale), items: beachfront });
      }
      if (sahara.length > 0) {
        built.push({ key: 'sahara', title: pick(L.railSahara, locale), items: sahara });
      }
      setRails(built);
    } catch {
      setError(pick(L.loadError, locale));
      setRails([]);
    }
  }, [locale]);

  useFocusEffect(
    useCallback(() => {
      if (rails === null) void load();
    }, [load, rails]),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>{pick(L.exploreGreeting, locale)}</Text>
          <Text style={styles.tagline}>{pick(L.searchTitle, locale)}</Text>
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
        {rails === null ? (
          <RailsSkeleton />
        ) : error && rails.length === 0 ? (
          <ErrorState
            message={error}
            onRetry={() => {
              setRails(null);
              void load();
            }}
            retryLabel={pick(L.search, locale)}
          />
        ) : rails.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>{pick(L.noResultsTitle, locale)}</Text>
            <Text style={styles.emptyBody}>{pick(L.noResultsBody, locale)}</Text>
          </View>
        ) : (
          rails.map((rail) => (
            <Rail key={rail.key} rail={rail} locale={locale} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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
          onPress={() => router.push('/search/results')}
          hitSlop={6}
        >
          <Text style={styles.seeAll}>{pick(L.results, locale)}</Text>
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
  safe: { flex: 1, backgroundColor: theme.color.bg },
  scrollContent: { paddingBottom: theme.space['2xl'] },
  pressed: { opacity: 0.9 },

  header: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.md,
  },
  brand: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['display-lg'],
    fontWeight: '600',
    color: theme.color.primary,
    textAlign,
  },
  tagline: {
    fontFamily: RN_FONTS.arabicRegular,
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
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  searchSecondary: {
    fontFamily: RN_FONTS.arabicRegular,
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
