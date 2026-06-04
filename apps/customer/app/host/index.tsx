/**
 * Host dashboard (M4).
 *
 * Headline stats (active listings, pending requests) + a tidy grid of entry
 * tiles: Reservations, Calendar & pricing, Earnings, Performance, Reviews, and
 * Create listing. Below the tiles, the host's own listings remain inline (each
 * routes into the wizard for editing) with status badges and a Create CTA.
 *
 * Skeleton while loading, designed empty + error states (no bare spinners),
 * pull-to-refresh. Full RTL; counts use formatNumber.
 */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  I18nManager,
} from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
import {
  listMyProperties,
  localizedName,
  type PropertyRow,
} from '@/lib/listings';
import { getHostPerformance } from '@/lib/host';
import {
  PrimaryButton,
  StatusBadge,
  SkeletonList,
  ErrorState,
  EmptyState,
} from '@/components/ui';
import { L, pick, type LMessage } from '@/lib/copy';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

const COPY = {
  untitled: { ar: 'إعلان بدون عنوان', fr: 'Annonce sans titre', en: 'Untitled listing' },
  rejected: { ar: 'سبب الرفض:', fr: 'Motif du rejet :', en: 'Rejection reason:' },
  instant: { ar: '⚡ حجز فوري', fr: '⚡ Réservation instantanée', en: '⚡ Instant book' },
  minNights: { ar: 'حد أدنى', fr: 'min.', en: 'min' },
  nights: { ar: 'ليالٍ', fr: 'nuits', en: 'nights' },
  myListings: { ar: 'إعلاناتي', fr: 'Mes annonces', en: 'My listings' },
} as const;

interface Tile {
  key: string;
  glyph: string;
  label: LMessage;
  href: string;
}

const TILES: Tile[] = [
  { key: 'reservations', glyph: '📥', label: L.hostReservations, href: '/host/reservations' },
  { key: 'calendar', glyph: '📅', label: L.hostCalendarLink, href: '/host/calendar' },
  { key: 'earnings', glyph: '💸', label: L.hostEarnings, href: '/host/earnings' },
  { key: 'performance', glyph: '📊', label: L.hostPerformanceLink, href: '/host/performance' },
  { key: 'reviews', glyph: '⭐', label: L.hostReviewsTitle, href: '/host/reviews' },
  { key: 'create', glyph: '➕', label: L.hostCreate, href: '/host/new' },
];

function propertyTitle(p: PropertyRow, locale: Locale): string {
  return (
    localizedName({ name_ar: p.title_ar, name_fr: p.title_fr, name_en: p.title_en }, locale) || ''
  );
}

export default function HostHomeScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;

  const [properties, setProperties] = useState<PropertyRow[] | null>(null);
  const [activeListings, setActiveListings] = useState<number | null>(null);
  const [pendingRequests, setPendingRequests] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [rows, perf] = await Promise.all([listMyProperties(), getHostPerformance()]);
      setProperties(rows);
      setActiveListings(perf.listingCount);
      setPendingRequests(perf.pendingRequests);
    } catch {
      setError(pick(L.loadError, locale));
      setProperties([]);
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

  if (properties === null) {
    return (
      <View style={styles.container}>
        <SkeletonList count={4} />
      </View>
    );
  }

  if (error && properties.length === 0) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={error}
          onRetry={() => void load()}
          retryLabel={pick(L.search, locale)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={properties}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {/* Headline stats */}
            <View style={styles.statsRow}>
              <StatCard
                label={pick(L.hostStatActiveListings, locale)}
                value={activeListings === null ? '—' : formatNumber(activeListings, locale)}
              />
              <StatCard
                label={pick(L.hostStatPendingRequests, locale)}
                value={pendingRequests === null ? '—' : formatNumber(pendingRequests, locale)}
                badge={pendingRequests !== null && pendingRequests > 0}
                onPress={() => router.push('/host/reservations')}
              />
            </View>

            {/* Navigation tiles */}
            <View style={styles.tiles}>
              {TILES.map((tile) => (
                <Pressable
                  key={tile.key}
                  accessibilityRole="button"
                  onPress={() => router.push(tile.href as Href)}
                  style={({ pressed }) => [styles.tile, pressed && styles.cardPressed]}
                >
                  <Text style={styles.tileGlyph}>{tile.glyph}</Text>
                  <Text style={styles.tileLabel} numberOfLines={2}>
                    {pick(tile.label, locale)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>{pick(COPY.myListings, locale)}</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={pick(L.hostNoListingsTitle, locale)}
            subtitle={pick(L.hostNoListingsBody, locale)}
          />
        }
        renderItem={({ item }) => {
          const title = propertyTitle(item, locale) || pick(COPY.untitled, locale);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/host/new', params: { propertyId: item.id } })
              }
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {title}
                </Text>
                <StatusBadge status={item.status as string} locale={locale} />
              </View>
              <Text style={styles.cardMeta}>
                {item.instant_book ? `${pick(COPY.instant, locale)}  ·  ` : ''}
                {pick(COPY.minNights, locale)} {formatNumber(item.min_nights, locale)}{' '}
                {pick(COPY.nights, locale)}
              </Text>
              {item.status === 'rejected' && item.rejection_note ? (
                <Text style={styles.rejectNote}>
                  {pick(COPY.rejected, locale)} {item.rejection_note}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
      />

      <View style={styles.cta}>
        <PrimaryButton
          label={pick(L.hostCreate, locale)}
          onPress={() => router.push('/host/new')}
        />
      </View>
    </View>
  );
}

function StatCard({
  label,
  value,
  badge = false,
  onPress,
}: {
  label: string;
  value: string;
  badge?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={[styles.statValue, badge && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.statCard, badge && styles.statCardAccent, pressed && styles.cardPressed]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.statCard}>{content}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.color.bg },
  listContent: {
    padding: theme.space.xl,
    gap: theme.space.md,
    flexGrow: 1,
    paddingBottom: 96,
  },
  headerWrap: { gap: theme.space.lg },

  statsRow: { flexDirection: 'row', gap: theme.space.md },
  statCard: {
    flex: 1,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    gap: theme.space.xs,
    ...theme.shadow.card,
  },
  statCardAccent: { backgroundColor: theme.color.terracotta100 },
  statValue: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['heading-1'],
    color: theme.color.primary,
    textAlign,
  },
  statValueAccent: { color: theme.color.accentHover },
  statLabel: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
  },

  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.md,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    alignItems: 'center',
    gap: theme.space.sm,
    ...theme.shadow.card,
  },
  tileGlyph: { fontSize: 26 },
  tileLabel: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['body-sm'],
    fontWeight: '600',
    color: theme.color.text,
    textAlign: 'center',
  },

  sectionTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
    marginTop: theme.space.xs,
  },

  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    ...theme.shadow.card,
  },
  cardPressed: { opacity: 0.9 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  cardTitle: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  cardMeta: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    marginTop: theme.space.xs,
    textAlign,
  },
  rejectNote: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.error,
    marginTop: theme.space.sm,
    lineHeight: theme.lineHeight.caption,
    textAlign,
  },
  cta: {
    position: 'absolute',
    left: theme.space.xl,
    right: theme.space.xl,
    bottom: theme.space.xl,
  },
});
