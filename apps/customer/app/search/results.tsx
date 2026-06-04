/**
 * Results screen (M2).
 *
 * Reads the serialized search state from route params, runs searchProperties(),
 * and renders a List ⇄ Map toggle. Map is a STUB (no native map deps): it shows
 * the same listings as styled price "pins" in a placeholder panel, clearly
 * labelled as a map stub. A Filters button (with applied-count badge) opens the
 * filters modal; a Sort control cycles sort order. Designed skeletons + empty +
 * error states.
 */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  SafeAreaView,
  I18nManager,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import {
  searchProperties,
  propertyTitle,
  localizedName,
  type PropertySummary,
  type SortKey,
} from '@/lib/discovery';
import { ResultCard, RatingRow } from '@/components/discovery';
import { SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { L, pick, type LMessage } from '@/lib/copy';
import {
  fromParams,
  toFilters,
  toParams,
  activeFilterCount,
  type SearchState,
} from '@/lib/searchParams';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

type ViewMode = 'list' | 'map';

const SORT_CYCLE: SortKey[] = ['recommended', 'price_asc', 'price_desc', 'rating'];
const SORT_LABEL: Record<SortKey, LMessage> = {
  recommended: L.sortRecommended,
  price_asc: L.sortPriceAsc,
  price_desc: L.sortPriceDesc,
  rating: L.sortRating,
};

export default function ResultsScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const params = useLocalSearchParams();
  const state: SearchState = fromParams(params as Record<string, string | undefined>);

  const [mode, setMode] = useState<ViewMode>('list');
  const [results, setResults] = useState<PropertySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(params);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await searchProperties(toFilters(state));
      setResults(rows);
    } catch {
      setError(pick(L.loadError, locale));
      setResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, locale]);

  useFocusEffect(
    useCallback(() => {
      setResults(null);
      void load();
    }, [load]),
  );

  const sort = state.sort ?? 'recommended';
  const appliedCount = activeFilterCount(state);

  function cycleSort() {
    const idx = SORT_CYCLE.indexOf(sort);
    const next = SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]!;
    router.setParams(toParams({ ...state, sort: next }));
  }

  function openFilters() {
    router.push({ pathname: '/search/filters', params: toParams(state) });
  }

  const headerTitle =
    state.wilayaCode != null && results && results[0]?.wilaya
      ? localizedName(results[0].wilaya, locale)
      : pick(L.results, locale);

  const countLabel =
    results != null
      ? `${formatNumber(results.length, locale)} ${
          results.length === 1 ? pick(L.resultsCount, locale) : pick(L.resultsCountPlural, locale)
        }`
      : '';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>{I18nManager.isRTL ? '→' : '←'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/search')}
          style={styles.searchPill}
        >
          <Text style={styles.searchPillText} numberOfLines={1}>
            {headerTitle}
            {countLabel ? ` · ${countLabel}` : ''}
          </Text>
        </Pressable>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          onPress={openFilters}
          style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
        >
          <Text style={styles.controlText}>
            ⚙ {pick(L.filters, locale)}
            {appliedCount > 0 ? ` (${formatNumber(appliedCount, locale)})` : ''}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={cycleSort}
          style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
        >
          <Text style={styles.controlText}>↕ {pick(SORT_LABEL[sort], locale)}</Text>
        </Pressable>
        <View style={styles.toggle}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'list' }}
            onPress={() => setMode('list')}
            style={[styles.toggleItem, mode === 'list' && styles.toggleItemActive]}
          >
            <Text style={[styles.toggleText, mode === 'list' && styles.toggleTextActive]}>
              {pick(L.list, locale)}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'map' }}
            onPress={() => setMode('map')}
            style={[styles.toggleItem, mode === 'map' && styles.toggleItemActive]}
          >
            <Text style={[styles.toggleText, mode === 'map' && styles.toggleTextActive]}>
              {pick(L.map, locale)}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Body */}
      {results === null ? (
        <SkeletonList count={4} />
      ) : error && results.length === 0 ? (
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.search, locale)} />
      ) : results.length === 0 ? (
        <EmptyState emoji="🔍" title={pick(L.noResultsTitle, locale)} subtitle={pick(L.noResultsBody, locale)} />
      ) : mode === 'list' ? (
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ResultCard
              property={item}
              locale={locale}
              onPress={() => router.push(`/property/${item.id}`)}
            />
          )}
        />
      ) : (
        <MapStub results={results} locale={locale} />
      )}
    </SafeAreaView>
  );
}

/**
 * MAP STUB — there are no native map dependencies in this app (Mapbox needs an
 * EAS dev client). This renders the result set as styled price pins in a
 * placeholder "map" panel so the List⇄Map toggle is functional and the data
 * binding is real; replace with @rnmapbox/maps in a later milestone.
 */
function MapStub({ results, locale }: { results: PropertySummary[]; locale: Locale }) {
  return (
    <View style={styles.mapWrap}>
      <View style={styles.mapCanvas}>
        <Text style={styles.mapStubTitle}>🗺 {pick(L.mapStubTitle, locale)}</Text>
        <Text style={styles.mapStubBody}>{pick(L.mapStubBody, locale)}</Text>
      </View>
      <ScrollView
        style={styles.pinsScroll}
        contentContainerStyle={styles.pinsContent}
        showsVerticalScrollIndicator={false}
      >
        {results.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            onPress={() => router.push(`/property/${p.id}`)}
            style={({ pressed }) => [styles.pin, pressed && styles.pressed]}
          >
            <View style={styles.pinPrice}>
              <Text style={styles.pinPriceText}>
                {p.from_price_dzd != null ? formatDZD(p.from_price_dzd, locale) : '—'}
              </Text>
            </View>
            <View style={styles.pinBody}>
              <Text style={styles.pinTitle} numberOfLines={1}>
                {propertyTitle(p, locale)}
              </Text>
              <View style={styles.pinMetaRow}>
                {p.wilaya ? (
                  <Text style={styles.pinPlace} numberOfLines={1}>
                    {localizedName(p.wilaya, locale)}
                  </Text>
                ) : null}
                <RatingRow rating={p.rating_avg} count={p.review_count} locale={locale} />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const textAlign = I18nManager.isRTL ? 'right' : 'left';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  pressed: { opacity: 0.9 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.sm,
  },
  back: { fontFamily: RN_FONTS.bodyMedium, fontSize: theme.fontSize['heading-3'], color: theme.color.text },
  searchPill: {
    flex: 1,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.borderStrong,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    ...theme.shadow.xs,
  },
  searchPillText: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.text,
    textAlign,
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.sm,
  },
  controlBtn: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.borderStrong,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  controlText: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.text,
  },
  toggle: {
    marginStart: 'auto',
    flexDirection: 'row',
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.pill,
    padding: 3,
    gap: 3,
  },
  toggleItem: {
    paddingHorizontal: theme.space.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  toggleItemActive: { backgroundColor: theme.color.surface, ...theme.shadow.xs },
  toggleText: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
  },
  toggleTextActive: { color: theme.color.text, fontWeight: '600' },

  listContent: { padding: theme.space.lg, gap: theme.space.lg, paddingBottom: theme.space['2xl'] },

  // Map stub
  mapWrap: { flex: 1 },
  mapCanvas: {
    margin: theme.space.lg,
    padding: theme.space.lg,
    minHeight: 120,
    backgroundColor: theme.color.teal100,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.teal200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xs,
  },
  mapStubTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.primary,
    textAlign: 'center',
  },
  mapStubBody: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.info,
    textAlign: 'center',
    lineHeight: theme.lineHeight.caption,
  },
  pinsScroll: { flex: 1 },
  pinsContent: { paddingHorizontal: theme.space.lg, paddingBottom: theme.space['2xl'], gap: theme.space.sm },
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.md,
    ...theme.shadow.xs,
  },
  pinPrice: {
    backgroundColor: theme.color.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    ...theme.shadow.pin,
  },
  pinPriceText: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize['body-sm'],
    fontWeight: '700',
    color: theme.color.textOnPrimary,
  },
  pinBody: { flex: 1 },
  pinTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  pinMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
    marginTop: 2,
  },
  pinPlace: {
    flex: 1,
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign,
  },
});
