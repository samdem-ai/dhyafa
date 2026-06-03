/**
 * Host home — lists the signed-in host's own properties with status badges
 * and a "Create listing" CTA. Skeleton while loading, designed empty + error
 * states (no bare spinners). Pull-to-refresh re-fetches.
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
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
import {
  listMyProperties,
  localizedName,
  type PropertyRow,
} from '@/lib/listings';
import {
  PrimaryButton,
  StatusBadge,
  SkeletonList,
  ErrorState,
  EmptyState,
} from '@/components/ui';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const COPY = {
  create: { ar: 'إنشاء إعلان جديد', fr: 'Créer une annonce', en: 'Create listing' },
  emptyTitle: { ar: 'لا توجد إعلانات بعد', fr: 'Aucune annonce', en: 'No listings yet' },
  emptySub: {
    ar: 'ابدأ بإضافة أول مكان إقامة لك واستقبل ضيوفك.',
    fr: 'Ajoutez votre premier hébergement pour accueillir des voyageurs.',
    en: 'Add your first place to start welcoming guests.',
  },
  loadError: {
    ar: 'تعذّر تحميل إعلاناتك.',
    fr: 'Impossible de charger vos annonces.',
    en: 'Could not load your listings.',
  },
  retry: { ar: 'إعادة المحاولة', fr: 'Réessayer', en: 'Retry' },
  untitled: { ar: 'إعلان بدون عنوان', fr: 'Annonce sans titre', en: 'Untitled listing' },
  rejected: { ar: 'سبب الرفض:', fr: 'Motif du rejet :', en: 'Rejection reason:' },
  instant: { ar: '⚡ حجز فوري', fr: '⚡ Réservation instantanée', en: '⚡ Instant book' },
  minNights: { ar: 'حد أدنى', fr: 'min.', en: 'min' },
  nights: { ar: 'ليالٍ', fr: 'nuits', en: 'nights' },
  guestReviews: { ar: 'تقييمات ضيوفي', fr: 'Avis des voyageurs', en: 'Guest reviews' },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

function propertyTitle(p: PropertyRow, locale: Locale): string {
  return (
    localizedName(
      { name_ar: p.title_ar, name_fr: p.title_fr, name_en: p.title_en },
      locale,
    ) || ''
  );
}

export default function HostHomeScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;

  const [properties, setProperties] = useState<PropertyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await listMyProperties();
      setProperties(rows);
    } catch {
      setError(pick(COPY.loadError, locale));
      setProperties([]);
    }
  }, [locale]);

  // Reload each time the screen regains focus (e.g. after submitting a listing).
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

  // Loading skeleton (first load only).
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
          retryLabel={pick(COPY.retry, locale)}
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
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/host/reviews')}
            style={({ pressed }) => [styles.reviewsLink, pressed && styles.cardPressed]}
          >
            <Text style={styles.reviewsLinkGlyph}>⭐</Text>
            <Text style={styles.reviewsLinkLabel}>{pick(COPY.guestReviews, locale)}</Text>
            <Text style={styles.reviewsLinkChevron}>{I18nManager.isRTL ? '‹' : '›'}</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <EmptyState
            title={pick(COPY.emptyTitle, locale)}
            subtitle={pick(COPY.emptySub, locale)}
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
          label={pick(COPY.create, locale)}
          onPress={() => router.push('/host/new')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.color.bg },
  listContent: {
    padding: theme.space.xl,
    gap: theme.space.md,
    flexGrow: 1,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    ...theme.shadow.card,
  },
  cardPressed: { opacity: 0.9 },
  reviewsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    ...theme.shadow.card,
  },
  reviewsLinkGlyph: { fontSize: 20 },
  reviewsLinkLabel: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  reviewsLinkChevron: {
    fontFamily: RN_FONTS.bodyRegular,
    fontSize: theme.fontSize['heading-3'],
    color: theme.color.textMuted,
  },
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
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  cardMeta: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    marginTop: theme.space.xs,
  },
  rejectNote: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.error,
    marginTop: theme.space.sm,
    lineHeight: theme.lineHeight.caption,
  },
  cta: {
    position: 'absolute',
    left: theme.space.xl,
    right: theme.space.xl,
    bottom: theme.space.xl,
  },
});
