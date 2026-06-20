/**
 * Host reviews (redesigned — Airbnb-style design language).
 *
 * Aggregate header (average score + total reviews), a filter (All / Unreplied),
 * and a list of borderless review rows on the host's properties (newest first).
 * Reviews without a reply get a composer that calls host_reply_review; once
 * posted the reply renders inline and the row drops out of the Unreplied filter.
 *
 * Built on @/ui (Screen/Header/Text/Button/TextField/SegmentedControl/
 * RatingStars/Skeleton/Empty/Error) — borderless photo-less rows, outline Lucide
 * star (terracotta), full RTL, pull-to-refresh. localizedName is imported from
 * the single canonical source (@/lib/listings).
 */

import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, I18nManager } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react-native';
import { formatNumber, type Locale } from '@dyafa/i18n';
import {
  listHostReviews,
  hostReplyReview,
  REVIEW_CATEGORIES,
  type HostReviewItem,
  type ReviewCategory,
} from '@/lib/reviews';
import { localizedName } from '@/lib/listings';
import {
  Screen,
  Header,
  Text,
  Button,
  TextField,
  RatingStars,
  SegmentedControl,
  SkeletonList,
  ErrorState,
  EmptyState,
  haptics,
} from '@/ui';
import { L, pick } from '@/lib/copy';
import { formatDateTime } from '@/lib/dateFormat';
import { theme } from '@/theme';

type Filter = 'all' | 'unreplied';

const CAT_LABEL: Record<ReviewCategory, keyof typeof L> = {
  cleanliness: 'reviewCleanliness',
  accuracy: 'reviewAccuracy',
  communication: 'reviewCommunication',
  location: 'reviewLocation',
  value: 'reviewValue',
  checkin: 'reviewCheckin',
};

export default function HostReviewsScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;

  const [data, setData] = useState<HostReviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await listHostReviews());
    } catch {
      setError(pick(L.loadError, locale));
      setData([]);
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

  const onReplied = useCallback((reviewId: string, body: string, createdAt: string) => {
    setData((prev) =>
      (prev ?? []).map((r) =>
        r.id === reviewId ? { ...r, reply: { id: `${reviewId}-reply`, body, created_at: createdAt } } : r,
      ),
    );
  }, []);

  const all = data ?? [];
  const average = all.length > 0 ? all.reduce((s, r) => s + r.overall, 0) / all.length : 0;
  const visible = useMemo(
    () => (filter === 'unreplied' ? all.filter((r) => !r.reply) : all),
    [all, filter],
  );

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: pick(L.hostReviewsAll, locale) },
    { value: 'unreplied', label: pick(L.hostReviewsUnreplied, locale) },
  ];

  return (
    <Screen>
      <Header title={pick(L.hostReviewsTitle, locale)} />

      {data === null ? (
        <SkeletonList count={4} />
      ) : error && all.length === 0 ? (
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.tryAgain, locale)} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.color.primary} colors={[theme.color.primary]} />
          }
          ListHeaderComponent={
            all.length > 0 ? (
              <View style={styles.headerWrap}>
                <View style={styles.aggregateRow}>
                  <View style={styles.aggregateCol}>
                    <View style={styles.avgRow}>
                      <Star size={18} color={theme.color.ratingStar} fill={theme.color.ratingStar} strokeWidth={0} />
                      <Text variant="title" weight="bold" style={styles.ltr}>
                        {average.toFixed(1)}
                      </Text>
                    </View>
                    <Text variant="caption" color="textMuted">
                      {pick(L.hostReviewsAverage, locale)}
                    </Text>
                  </View>
                  <View style={styles.aggregateDivider} />
                  <View style={styles.aggregateCol}>
                    <Text variant="title" weight="bold">
                      {formatNumber(all.length, locale)}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {pick(L.hostReviewsTotal, locale)}
                    </Text>
                  </View>
                </View>
                <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            filter === 'unreplied' ? (
              <EmptyState
                icon={Star}
                title={pick(L.hostReviewsUnrepliedEmptyTitle, locale)}
                subtitle={pick(L.hostReviewsUnrepliedEmptyBody, locale)}
              />
            ) : (
              <EmptyState
                icon={Star}
                title={pick(L.hostReviewsEmptyTitle, locale)}
                subtitle={pick(L.hostReviewsEmptyBody, locale)}
              />
            )
          }
          renderItem={({ item }) => <HostReviewCard review={item} locale={locale} onReplied={onReplied} />}
        />
      )}
    </Screen>
  );
}

function HostReviewCard({
  review,
  locale,
  onReplied,
}: {
  review: HostReviewItem;
  locale: Locale;
  onReplied: (reviewId: string, body: string, createdAt: string) => void;
}) {
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const propertyTitle = review.property
    ? localizedName(
        {
          name_ar: review.property.title_ar,
          name_fr: review.property.title_fr,
          name_en: review.property.title_en,
        },
        locale,
      )
    : '';

  async function onPost() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      await hostReplyReview(review.id, text);
      haptics.success();
      onReplied(review.id, text, new Date().toISOString());
      setComposing(false);
      setBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : pick(L.replyFailed, locale));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.reviewRow}>
      <View style={styles.cardHeader}>
        <View style={styles.scoreWrap}>
          <Star size={16} color={theme.color.ratingStar} fill={theme.color.ratingStar} strokeWidth={0} />
          <Text variant="title" weight="bold">
            {formatNumber(review.overall, locale)}
          </Text>
        </View>
        {propertyTitle ? (
          <Text variant="body-sm" color="textMuted" numberOfLines={1} style={styles.cardProperty}>
            {propertyTitle}
          </Text>
        ) : null}
      </View>

      <Text variant="caption" color="textMuted">
        {review.author?.display_name ?? ''}
        {review.author?.display_name ? ' · ' : ''}
        {formatDateTime(review.created_at, locale)}
      </Text>

      <View style={styles.cats}>
        {REVIEW_CATEGORIES.map((cat) => {
          const v = review[cat];
          if (typeof v !== 'number') return null;
          return (
            <View key={cat} style={styles.catRow}>
              <Text variant="body-sm" color="textMuted">
                {pick(L[CAT_LABEL[cat]], locale)}
              </Text>
              <RatingStars value={v} size={14} />
            </View>
          );
        })}
      </View>

      {(review.comment_text ?? '').trim().length > 0 ? (
        <Text variant="body" style={styles.comment}>
          {review.comment_text}
        </Text>
      ) : null}

      {review.reply ? (
        <View style={styles.replyBox}>
          <Text variant="caption" weight="semibold" color="primary">
            {pick(L.hostReply, locale)}
          </Text>
          <Text variant="body-sm">{review.reply.body}</Text>
        </View>
      ) : composing ? (
        <View style={styles.composer}>
          <TextField
            value={body}
            onChangeText={setBody}
            placeholder={pick(L.replyPlaceholder, locale)}
            multiline
            error={error ?? undefined}
          />
          <Button label={pick(L.replySubmit, locale)} onPress={() => void onPost()} loading={busy} disabled={busy || body.trim().length === 0} />
        </View>
      ) : (
        <View style={styles.replyCta}>
          <Button label={pick(L.reply, locale)} variant="secondary" onPress={() => setComposing(true)} fullWidth={false} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ltr: { writingDirection: 'ltr' },
  listContent: { padding: theme.space.xl, flexGrow: 1 },
  headerWrap: { gap: theme.space.xl, marginBottom: theme.space.lg },
  divider: { height: 1, backgroundColor: theme.color.border, marginVertical: theme.space.lg },

  // Aggregate — borderless summary on the canvas.
  aggregateRow: { flexDirection: 'row', alignItems: 'center' },
  aggregateCol: { flex: 1, alignItems: 'center', gap: 2 },
  aggregateDivider: { width: 1, alignSelf: 'stretch', backgroundColor: theme.color.border },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },

  // Review row — borderless.
  reviewRow: { gap: theme.space.xs },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  scoreWrap: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  cardProperty: { flexShrink: 1, textAlign: I18nManager.isRTL ? 'left' : 'right' },

  cats: { gap: theme.space.xs, marginTop: theme.space.xs },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  comment: { marginTop: theme.space.xs },

  replyBox: {
    marginTop: theme.space.sm,
    padding: theme.space.md,
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.md,
    gap: 2,
  },
  replyCta: { marginTop: theme.space.sm },
  composer: { marginTop: theme.space.sm, gap: theme.space.sm },
});
