/**
 * Host dashboard (redesigned — Airbnb-style design language).
 *
 * Header with a persistent "Switch to Travelling" affordance + a localized
 * title. Borderless headline stats, a list of borderless nav rows (outline
 * Lucide icon + label + chevron), the host's own listings as borderless rows
 * separated by hairline dividers, and a SINGLE consolidated "Create listing"
 * CTA (sticky footer).
 *
 * States are distinguished:
 *  - hydrating/claim-refreshing: skeleton + "setting up your host account…"
 *  - genuinely empty (host with zero listings): a welcoming first-listing CTA
 *  - populated: stats + nav rows + listings
 *
 * Built on @/ui (Screen/Header/Text/Heading/Button/StatusPill/EmptyState/
 * ErrorState/Skeleton), outline Lucide icons, haptics, pull-to-refresh, full RTL.
 */

import type { ComponentType } from 'react';
import { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, RefreshControl, I18nManager } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
import {
  CalendarDays,
  ClipboardList,
  Wallet,
  BarChart3,
  Star,
  Plane,
  Plus,
  ChevronRight,
  type LucideProps,
} from 'lucide-react-native';
import { listMyProperties, getMyHostProfileId, localizedName, type PropertyRow } from '@/lib/listings';
import { getHostPerformance } from '@/lib/host';
import { supabase } from '@/lib/auth';
import {
  Screen,
  Header,
  Text,
  Heading,
  Button,
  StatusPill,
  statusTone,
  SkeletonList,
  ErrorState,
  EmptyState,
  haptics,
} from '@/ui';
import { L, pick, type LMessage } from '@/lib/copy';
import { theme } from '@/theme';

const COPY = {
  untitled: { ar: 'إعلان بدون عنوان', fr: 'Annonce sans titre', en: 'Untitled listing' },
  rejected: { ar: 'سبب الرفض:', fr: 'Motif du rejet :', en: 'Rejection reason:' },
  instant: { ar: 'حجز فوري', fr: 'Réservation instantanée', en: 'Instant book' },
  minNights: { ar: 'حد أدنى', fr: 'min.', en: 'min' },
  nights: { ar: 'ليالٍ', fr: 'nuits', en: 'nights' },
  myListings: { ar: 'إعلاناتي', fr: 'Mes annonces', en: 'My listings' },
} as const;

interface Tile {
  key: string;
  icon: ComponentType<LucideProps>;
  label: LMessage;
  href: Href;
}

const TILES: Tile[] = [
  { key: 'reservations', icon: ClipboardList, label: L.hostReservations, href: '/host/reservations' },
  { key: 'calendar', icon: CalendarDays, label: L.hostCalendarLink, href: '/host/calendar' },
  { key: 'earnings', icon: Wallet, label: L.hostEarnings, href: '/host/earnings' },
  { key: 'performance', icon: BarChart3, label: L.hostPerformanceLink, href: '/host/performance' },
  { key: 'reviews', icon: Star, label: L.hostReviewsTitle, href: '/host/reviews' },
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
  // True while we believe the host_id claim may not be minted yet (new host).
  const [claimRefreshing, setClaimRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      let [rows, perf] = await Promise.all([listMyProperties(), getHostPerformance()]);
      // A brand-new host whose host_id claim hasn't propagated reads zero rows
      // even though a host_profile exists. Refresh once and retry to distinguish
      // "claim refreshing" from "genuinely empty".
      if (rows.length === 0 && perf.listingCount === 0) {
        const hasProfile = (await getMyHostProfileId()) !== null;
        if (hasProfile) {
          setClaimRefreshing(true);
          await supabase.auth.refreshSession();
          [rows, perf] = await Promise.all([listMyProperties(), getHostPerformance()]);
        }
      }
      setClaimRefreshing(false);
      setProperties(rows);
      setActiveListings(perf.listingCount);
      setPendingRequests(perf.pendingRequests);
    } catch {
      setClaimRefreshing(false);
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

  function goCreate() {
    haptics.tap();
    router.push('/host/new');
  }

  const header = (
    <Header
      title={pick(L.hostHomeTitle, locale)}
      showBack={false}
      rightSlot={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pick(L.switchToTravelling, locale)}
          onPress={() => {
            haptics.tap();
            router.replace('/(tabs)');
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.switchBtn, pressed && styles.pressed]}
        >
          <Plane size={16} color={theme.color.primary} strokeWidth={2} />
          <Text variant="caption" weight="semibold" color="primary">
            {pick(L.switchToTravelling, locale)}
          </Text>
        </Pressable>
      }
    />
  );

  // Loading / claim-refreshing
  if (properties === null) {
    return (
      <Screen>
        {header}
        {claimRefreshing ? (
          <View style={styles.center}>
            <Text variant="body" color="textMuted" center>
              {pick(L.hostClaimRefreshing, locale)}
            </Text>
          </View>
        ) : (
          <SkeletonList count={4} />
        )}
      </Screen>
    );
  }

  if (error && properties.length === 0) {
    return (
      <Screen>
        {header}
        <ErrorState
          message={error}
          onRetry={() => void load()}
          retryLabel={pick(L.tryAgain, locale)}
        />
      </Screen>
    );
  }

  // Genuinely empty (new host with no listings yet).
  if (properties.length === 0) {
    return (
      <Screen footer={<Button label={pick(L.hostCreate, locale)} icon={Plus} onPress={goCreate} />}>
        {header}
        <EmptyState
          icon={Plus}
          title={pick(L.hostNewHostTitle, locale)}
          subtitle={pick(L.hostNewHostBody, locale)}
        />
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label={pick(L.hostCreate, locale)} icon={Plus} onPress={goCreate} />}>
      {header}
      <FlatList
        data={properties}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={theme.color.primary}
            colors={[theme.color.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.statsRow}>
              <StatBlock
                label={pick(L.hostStatActiveListings, locale)}
                value={activeListings === null ? '—' : formatNumber(activeListings, locale)}
              />
              <View style={styles.statDivider} />
              <StatBlock
                label={pick(L.hostStatPendingRequests, locale)}
                value={pendingRequests === null ? '—' : formatNumber(pendingRequests, locale)}
                badge={pendingRequests !== null && pendingRequests > 0}
                onPress={() => router.push('/host/reservations')}
              />
            </View>

            <View style={styles.navList}>
              {TILES.map((tile) => {
                const Icon = tile.icon;
                return (
                  <Pressable
                    key={tile.key}
                    accessibilityRole="button"
                    accessibilityLabel={pick(tile.label, locale)}
                    onPress={() => {
                      haptics.tap();
                      router.push(tile.href);
                    }}
                    style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
                  >
                    <View style={styles.navIcon}>
                      <Icon size={20} color={theme.color.primary} strokeWidth={2} />
                    </View>
                    <Text variant="body" weight="semibold" numberOfLines={1} style={styles.flex}>
                      {pick(tile.label, locale)}
                    </Text>
                    <ChevronRight
                      size={20}
                      color={theme.color.textMuted}
                      strokeWidth={2}
                      style={styles.chevron}
                    />
                  </Pressable>
                );
              })}
            </View>

            <Text variant="title" weight="bold" style={styles.sectionTitle}>
              {pick(COPY.myListings, locale)}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const title = propertyTitle(item, locale) || pick(COPY.untitled, locale);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptics.tap();
                router.push({ pathname: '/host/new', params: { propertyId: item.id } });
              }}
              style={({ pressed }) => [styles.listingRow, pressed && styles.pressed]}
            >
              <View style={styles.cardHeader}>
                <Text variant="body" weight="semibold" numberOfLines={1} style={styles.flex}>
                  {title}
                </Text>
                <StatusPill label={listingLabel(item.status, locale)} tone={statusTone(item.status)} />
              </View>
              <Text variant="body-sm" color="textMuted">
                {item.instant_book ? `${pick(COPY.instant, locale)}  ·  ` : ''}
                {pick(COPY.minNights, locale)} {formatNumber(item.min_nights, locale)}{' '}
                {pick(COPY.nights, locale)}
              </Text>
              {item.status === 'rejected' && item.rejection_note ? (
                <Text variant="caption" color="error">
                  {pick(COPY.rejected, locale)} {item.rejection_note}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const LISTING_STATUS: Record<string, LMessage> = {
  draft: { ar: 'مسودة', fr: 'Brouillon', en: 'Draft' },
  pending: { ar: 'قيد المراجعة', fr: 'En révision', en: 'In review' },
  approved: { ar: 'منشور', fr: 'Publié', en: 'Published' },
  rejected: { ar: 'مرفوض', fr: 'Rejeté', en: 'Rejected' },
};

function listingLabel(status: string, locale: Locale): string {
  const m = LISTING_STATUS[status] ?? LISTING_STATUS['draft']!;
  return pick(m, locale);
}

function StatBlock({
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
      <View style={styles.statValueRow}>
        <Heading level={1} color={badge ? 'accent' : 'primary'}>
          {value}
        </Heading>
        {badge ? <View style={styles.badgeDot} /> : null}
      </View>
      <Text variant="body-sm" color="textMuted">
        {label}
      </Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.statBlock, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.statBlock}>{content}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.space.xl },
  chevron: { transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] },

  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.infoBg,
  },

  listContent: { padding: theme.space.xl, paddingBottom: theme.space['3xl'] },
  headerWrap: { gap: theme.space['2xl'] },

  // Stats — borderless, plain numbers on the canvas.
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xl },
  statBlock: { flex: 1, gap: theme.space.xs },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: theme.color.border },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.color.accent,
  },

  // Nav rows — borderless (icon circle + label + chevron).
  navList: {},
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingVertical: theme.space.md,
  },
  navIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.infoBg,
  },

  sectionTitle: {},

  // Listing rows — borderless, hairline-separated.
  listingRow: { gap: theme.space.xs, paddingVertical: theme.space.md },
  divider: { height: 1, backgroundColor: theme.color.border },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
});
