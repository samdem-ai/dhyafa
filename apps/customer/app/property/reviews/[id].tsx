/**
 * All reviews for a property (Phase 4; redesigned Phase 8).
 *
 * Reached from the detail screen's "Show all reviews" control. Lists every
 * published review (with author + host reply) in a FlashList, plus the headline
 * rating + category averages. Reuses getPropertyDetail's joined reviews.
 *
 * Redesign: generous gutters, a sans-bold headline with a terracotta star, clean
 * category-average rows, borderless ReviewItem rows with hairline separators, and
 * a centered empty/error state. Outline icons only, type through primitives.
 */

import { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
import { Star } from 'lucide-react-native';
import { getPropertyDetail, type PropertyDetail, type ReviewWithMeta } from '@/lib/discovery';
import { categoryAverage, overallAverage, REVIEW_CATEGORIES, type ReviewCategory } from '@/lib/reviews';
import { ReviewItem } from '@/components/ReviewItem';
import { Screen, Header, Text, List, ConversationSkeleton, ErrorState, EmptyState } from '@/ui';
import { L, pick } from '@/lib/copy';
import { theme } from '@/theme';

const REVIEW_CAT_LABEL: Record<ReviewCategory, keyof typeof L> = {
  cleanliness: 'reviewCleanliness',
  accuracy: 'reviewAccuracy',
  communication: 'reviewCommunication',
  location: 'reviewLocation',
  value: 'reviewValue',
  checkin: 'reviewCheckin',
};

export default function AllReviewsScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { id } = useLocalSearchParams<{ id: string }>();

  const [detail, setDetail] = useState<PropertyDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setDetail(await getPropertyDetail(id));
    } catch {
      setError(pick(L.loadError, locale));
      setDetail(null);
    }
  }, [id, locale]);

  useFocusEffect(
    useCallback(() => {
      if (detail === undefined) void load();
    }, [detail, load]),
  );

  const reviews: ReviewWithMeta[] = detail?.reviews ?? [];
  const headlineScore = detail
    ? detail.rating_avg > 0
      ? detail.rating_avg
      : overallAverage(reviews)
    : 0;
  const headlineCount = detail
    ? detail.review_count > 0
      ? detail.review_count
      : reviews.length
    : 0;

  return (
    <Screen edges={['top']}>
      <Header title={pick(L.reviews, locale)} onBack={() => router.back()} />
      {detail === undefined ? (
        <ConversationSkeleton />
      ) : error && detail === null ? (
        <View style={styles.centerFill}>
          <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.tryAgain, locale)} />
        </View>
      ) : (
        <List<ReviewWithMeta>
          data={reviews}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          header={
            detail ? (
              <View style={styles.head}>
                <View style={styles.headline}>
                  <Star
                    size={22}
                    color={theme.color.ratingStar}
                    fill={theme.color.ratingStar}
                    strokeWidth={0}
                  />
                  <Text variant="title" weight="bold" style={styles.headlineScore}>
                    {formatNumber(headlineScore, locale)}
                  </Text>
                  <Text variant="body" color="textMuted">
                    · {formatNumber(headlineCount, locale)} {pick(L.reviewsCountPlural, locale)}
                  </Text>
                </View>
                <View style={styles.catGrid}>
                  {REVIEW_CATEGORIES.map((cat) => {
                    const a = categoryAverage(reviews, cat);
                    if (a == null) return null;
                    return (
                      <View key={cat} style={styles.catRow}>
                        <Text variant="body-sm" color="textMuted">
                          {pick(L[REVIEW_CAT_LABEL[cat]], locale)}
                        </Text>
                        <Text variant="body-sm" weight="semibold">
                          {formatNumber(a, locale)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null
          }
          emptyComponent={
            <View style={styles.centerFill}>
              <EmptyState icon={Star} title={pick(L.noReviews, locale)} />
            </View>
          }
          renderItem={({ item }) => <ReviewItem review={item} locale={locale} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, justifyContent: 'center' },
  content: { padding: theme.space.xl, flexGrow: 1 },
  head: { gap: theme.space.lg, marginBottom: theme.space.md },
  headline: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  headlineScore: { marginStart: theme.space.xs },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: theme.color.border },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  catRow: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.space.xs,
    paddingEnd: theme.space.lg,
  },
});
