/**
 * Search results (Phase 4 rework).
 *
 * Server-side filter/sort/pagination via the discovery layer
 * (`searchPropertiesPage`: PostgREST filters + `.range()` + `onEndReached`)
 * instead of pulling the whole approved set client-side on every change.
 *
 * - Header shows the searched wilaya name even with 0 results (resolved from the
 *   wilaya lookup, not results[0]).
 * - Sort is a labeled chooser in a BottomSheet (not a cycle pill).
 * - Filters open in a BottomSheet OVER results (no second results instance) with
 *   min≤max validation, a live "Show N stays" count, and amenities grouped by
 *   category.
 * - FlashList + pull-to-refresh. List default; Map is an honest stub toggle.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import { SlidersHorizontal, ArrowUpDown, List as ListIcon, Map as MapIcon, Check } from 'lucide-react-native';
import {
  searchPropertiesPage,
  listActiveWilayas,
  propertyTitle,
  localizedName,
  fetchApproxCoords,
  type PropertySummary,
  type SortKey,
  type WilayaLite,
  type ApproxCoord,
  SEARCH_PAGE_SIZE,
} from '@/lib/discovery';
import { ResultCard } from '@/components/discovery';
import { FiltersSheet } from '@/components/FiltersSheet';
import {
  Screen,
  Header,
  Text,
  Heading,
  List,
  PropertyCardSkeleton,
  EmptyState,
  ErrorState,
  BottomSheet,
  Map,
} from '@/ui';
import { L, pick, type LMessage } from '@/lib/copy';
import {
  fromParams,
  toFilters,
  toParams,
  activeFilterCount,
  type SearchState,
} from '@/lib/searchParams';
import { selection as hapticSelection } from '@/ui/haptics';
import { theme } from '@/theme';

type ViewMode = 'list' | 'map';

const SORT_KEYS: SortKey[] = ['recommended', 'price_asc', 'price_desc', 'rating'];
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
  const filtersKey = JSON.stringify(toFilters(state));

  const [mode, setMode] = useState<ViewMode>('list');
  const [rows, setRows] = useState<PropertySummary[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Wilaya name for the header — resolved independently of results so it shows
  // even with zero matches.
  const [wilayaName, setWilayaName] = useState<string | null>(null);

  // Approximate (privacy-safe) coordinates for the map view, keyed by id.
  // Lazily fetched the first time the user opens the map for the current rows.
  const [coords, setCoords] = useState<Record<string, ApproxCoord>>({});

  // Guard against last-resolve-wins races when filters change rapidly.
  const reqId = useRef(0);

  const loadFirst = useCallback(async () => {
    const myReq = ++reqId.current;
    setError(null);
    try {
      const res = await searchPropertiesPage(toFilters(state), 0);
      if (myReq !== reqId.current) return;
      setRows(res.rows);
      setTotal(res.total);
      setHasMore(res.hasMore);
      setPage(0);
    } catch {
      if (myReq !== reqId.current) return;
      setError(pick(L.loadError, locale));
      setRows([]);
      setHasMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, locale]);

  useEffect(() => {
    setRows(null);
    void loadFirst();
  }, [loadFirst]);

  // Resolve the wilaya name (once / when the code changes).
  useEffect(() => {
    let mounted = true;
    if (state.wilayaCode == null) {
      setWilayaName(null);
      return;
    }
    listActiveWilayas()
      .then((all: WilayaLite[]) => {
        if (!mounted) return;
        const w = all.find((x) => x.code === state.wilayaCode);
        setWilayaName(w ? localizedName(w, locale) : null);
      })
      .catch(() => {
        if (mounted) setWilayaName(null);
      });
    return () => {
      mounted = false;
    };
  }, [state.wilayaCode, locale]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFirst();
    setRefreshing(false);
  }, [loadFirst]);

  const onEndReached = useCallback(async () => {
    if (!hasMore || loadingMore || rows == null) return;
    const myReq = reqId.current;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await searchPropertiesPage(toFilters(state), next);
      if (myReq !== reqId.current) return;
      setRows((cur) => [...(cur ?? []), ...res.rows]);
      setHasMore(res.hasMore);
      setPage(next);
    } catch {
      // Keep what we have; pagination errors are non-fatal.
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, rows, page, filtersKey]);

  const sort = state.sort ?? 'recommended';
  const appliedCount = activeFilterCount(state);

  function applySort(next: SortKey) {
    hapticSelection();
    setSortOpen(false);
    router.setParams(toParams({ ...state, sort: next }));
  }

  function applyFilters(nextState: SearchState) {
    setFiltersOpen(false);
    router.setParams(toParams(nextState));
  }

  const headerTitle = wilayaName ?? pick(L.results, locale);
  const countLabel =
    total != null
      ? `${formatNumber(total, locale)} ${
          total === 1 ? pick(L.resultsCount, locale) : pick(L.resultsCountPlural, locale)
        }`
      : rows != null
        ? `${formatNumber(rows.length, locale)} ${
            rows.length === 1 ? pick(L.resultsCount, locale) : pick(L.resultsCountPlural, locale)
          }`
        : '';

  // Fetch privacy-safe coords for the current rows the first time the map opens
  // (and as rows grow). The stub fallback ignores them; the real Mapbox map uses
  // them. Missing ids are simply not plotted.
  useEffect(() => {
    if (mode !== 'map' || rows == null || rows.length === 0) return;
    const missing = rows.map((p) => p.id).filter((id) => !(id in coords));
    if (missing.length === 0) return;
    let mounted = true;
    void fetchApproxCoords(missing)
      .then((fresh) => {
        if (mounted) setCoords((cur) => ({ ...cur, ...fresh }));
      })
      .catch(() => {
        /* coords are best-effort; the map still renders without missing pins */
      });
    return () => {
      mounted = false;
    };
  }, [mode, rows, coords]);

  const mapMarkers = useMemo(
    () =>
      (rows ?? []).map((p) => ({
        id: p.id,
        latitude: coords[p.id]?.latitude ?? 0,
        longitude: coords[p.id]?.longitude ?? 0,
        price: p.from_price_dzd ?? undefined,
        label: `${propertyTitle(p, locale)} — ${
          p.from_price_dzd != null ? formatDZD(p.from_price_dzd, locale) : '—'
        }`,
      })),
    [rows, locale, coords],
  );

  return (
    <Screen edges={['top']}>
      <Header
        title={`${headerTitle}${countLabel ? ` · ${countLabel}` : ''}`}
        onBack={() => router.back()}
      />

      {/* Controls */}
      <View style={styles.controls}>
        <ControlPill
          icon={SlidersHorizontal}
          label={`${pick(L.filters, locale)}${appliedCount > 0 ? ` (${formatNumber(appliedCount, locale)})` : ''}`}
          onPress={() => setFiltersOpen(true)}
        />
        <ControlPill
          icon={ArrowUpDown}
          label={pick(SORT_LABEL[sort], locale)}
          onPress={() => setSortOpen(true)}
        />
        <View style={styles.toggle}>
          <ToggleItem
            icon={ListIcon}
            active={mode === 'list'}
            onPress={() => setMode('list')}
            label={pick(L.list, locale)}
          />
          <ToggleItem
            icon={MapIcon}
            active={mode === 'map'}
            onPress={() => setMode('map')}
            label={pick(L.map, locale)}
          />
        </View>
      </View>

      {/* Body */}
      {rows === null ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </View>
      ) : error && rows.length === 0 ? (
        <View style={styles.centerFill}>
          <ErrorState message={error} onRetry={() => void loadFirst()} retryLabel={pick(L.tryAgain, locale)} />
        </View>
      ) : mode === 'map' ? (
        <Map
          markers={mapMarkers}
          onMarkerPress={(id) => router.push(`/property/${id}`)}
          title={pick(L.mapStubTitle, locale)}
          body={pick(L.mapStubBody, locale)}
        />
      ) : (
        <List<PropertySummary>
          data={rows}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          onEndReached={() => void onEndReached()}
          loadingMore={loadingMore}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          emptyComponent={
            <View style={styles.centerFill}>
              <EmptyState
                title={pick(L.noResultsTitle, locale)}
                subtitle={pick(L.noResultsBody, locale)}
                icon={SlidersHorizontal}
                action={{ label: pick(L.filters, locale), onPress: () => setFiltersOpen(true) }}
              />
            </View>
          }
          renderItem={({ item }) => (
            <ResultCard
              property={item}
              locale={locale}
              onPress={() => router.push(`/property/${item.id}`)}
            />
          )}
        />
      )}

      {/* Sort sheet */}
      <BottomSheet visible={sortOpen} onClose={() => setSortOpen(false)}>
        <Heading level={3} style={styles.sheetTitle}>
          {pick(L.sortBy, locale)}
        </Heading>
        {SORT_KEYS.map((k) => {
          const active = k === sort;
          return (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => applySort(k)}
              style={({ pressed }) => [styles.sortRow, pressed && styles.pressed]}
            >
              <Text variant="body-lg" weight={active ? 'semibold' : 'regular'} color={active ? 'accent' : 'text'}>
                {pick(SORT_LABEL[k], locale)}
              </Text>
              {active ? <Check size={20} color={theme.color.accent} strokeWidth={2.25} /> : null}
            </Pressable>
          );
        })}
      </BottomSheet>

      {/* Filters sheet */}
      <FiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        state={state}
        locale={locale}
        onApply={applyFilters}
      />
    </Screen>
  );
}

function ControlPill({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof SlidersHorizontal;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
    >
      <Icon size={16} color={theme.color.text} strokeWidth={2} />
      <Text variant="body-sm" weight="semibold" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function ToggleItem({
  icon: Icon,
  active,
  onPress,
  label,
}: {
  icon: typeof ListIcon;
  active: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.toggleItem, active && styles.toggleItemActive]}
    >
      <Icon size={18} color={active ? theme.color.text : theme.color.textMuted} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.color.borderStrong,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    minHeight: 36,
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
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  },
  toggleItemActive: { backgroundColor: theme.color.surface, ...theme.shadow.xs },

  skeletonWrap: { paddingHorizontal: theme.space.xl, paddingVertical: theme.space.lg, gap: theme.space['2xl'] },
  listContent: { paddingHorizontal: theme.space.xl, paddingVertical: theme.space.lg, flexGrow: 1 },
  sep: { height: theme.space.xl },
  centerFill: { flex: 1, justifyContent: 'center' },

  sheetTitle: { marginBottom: theme.space.sm },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
});
