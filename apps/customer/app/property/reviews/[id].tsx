/**
 * All reviews for a property (Phase 4).
 *
 * Reached from the detail screen's "Show all reviews" control. Lists every
 * published review (with author + host reply) in a FlashList, plus the headline
 * rating + category averages. Reuses getPropertyDetail's joined reviews.
 */

import { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
import { getPropertyDetail, type PropertyDetail, type ReviewWithMeta } from '@/lib/discovery';
import { categoryAverage, overallAverage, REVIEW_CATEGORIES, type ReviewCategory } from '@/lib/reviews';
import { ReviewItem } from '@/components/ReviewItem';
import { Screen, Header, Text, RatingStars, List, ConversationSkeleton, ErrorState, EmptyState } from '@/ui';
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

  return (
    <Screen edges={['top']}>
      <Header title={pick(L.reviews, locale)} onBack={() => router.back()} />
      {detail === undefined ? (
        <ConversationSkeleton />
      ) : error && detail === null ? (
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.search, locale)} />
      ) : (
        <List<ReviewWithMeta>
          data={reviews}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.content}
          header={
            detail ? (
              <View style={styles.head}>
                <View style={styles.headline}>
                  <RatingStars value={detail.rating_avg > 0 ? detail.rating_avg : overallAverage(reviews)} size={20} />
                  <Text variant="title" weight="semibold">
                    {formatNumber(detail.rating_avg > 0 ? detail.rating_avg : overallAverage(reviews), locale)}
                  </Text>
                  <Text variant="body-sm" color="textMuted">
                    · {formatNumber(detail.review_count > 0 ? detail.review_count : reviews.length, locale)}{' '}
                    {pick(L.reviewsCountPlural, locale)}
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
          emptyComponent={<EmptyState title={pick(L.noReviews, locale)} />}
          renderItem={({ item }) => <ReviewItem review={item} locale={locale} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.space.lg },
  head: { gap: theme.space.md, marginBottom: theme.space.md },
  headline: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
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
