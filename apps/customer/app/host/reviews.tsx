/**
 * Host reviews (M3).
 *
 * Lists every review on the signed-in host's own properties (newest first),
 * each showing the score, category breakdown, comment, author, and property
 * title. Reviews without a reply get a "Reply" composer that calls
 * host_reply_review; once posted, the reply renders inline.
 *
 * Designed skeleton + empty + error states; pull-to-refresh re-fetches.
 */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  SafeAreaView,
  I18nManager,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
import {
  listHostReviews,
  hostReplyReview,
  REVIEW_CATEGORIES,
  type HostReviewItem,
  type ReviewCategory,
} from '@/lib/reviews';
import { localizedName } from '@/lib/discovery';
import { StarRating } from '@/components/StarRating';
import { SkeletonList, ErrorState, EmptyState, PrimaryButton } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { formatDateTime } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

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

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await listHostReviews();
      setData(rows);
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

  /** Patch one review row in place after a reply is posted. */
  const onReplied = useCallback((reviewId: string, body: string, createdAt: string) => {
    setData((prev) =>
      (prev ?? []).map((r) =>
        r.id === reviewId ? { ...r, reply: { id: `${reviewId}-reply`, body, created_at: createdAt } } : r,
      ),
    );
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.topBack}>{I18nManager.isRTL ? '→' : '←'}</Text>
        </Pressable>
        <Text style={styles.topTitle}>{pick(L.hostReviewsTitle, locale)}</Text>
        <View style={styles.topSpacer} />
      </View>

      {data === null ? (
        <SkeletonList count={4} />
      ) : error && data.length === 0 ? (
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.search, locale)} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          ListEmptyComponent={
            <EmptyState
              emoji="⭐"
              title={pick(L.hostReviewsEmptyTitle, locale)}
              subtitle={pick(L.hostReviewsEmptyBody, locale)}
            />
          }
          renderItem={({ item }) => <HostReviewCard review={item} locale={locale} onReplied={onReplied} />}
        />
      )}
    </SafeAreaView>
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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.scoreWrap}>
          <Text style={styles.scoreStar}>★</Text>
          <Text style={styles.scoreValue}>{formatNumber(review.overall, locale)}</Text>
        </View>
        {propertyTitle ? (
          <Text style={styles.cardProperty} numberOfLines={1}>
            {propertyTitle}
          </Text>
        ) : null}
      </View>

      <Text style={styles.author}>
        {review.author?.display_name ?? ''}
        {review.author?.display_name ? ' · ' : ''}
        {formatDateTime(review.created_at, locale)}
      </Text>

      {/* Category breakdown */}
      <View style={styles.cats}>
        {REVIEW_CATEGORIES.map((cat) => {
          const v = review[cat];
          if (typeof v !== 'number') return null;
          return (
            <View key={cat} style={styles.catRow}>
              <Text style={styles.catLabel}>{pick(L[CAT_LABEL[cat]], locale)}</Text>
              <StarRating value={v} size={14} />
            </View>
          );
        })}
      </View>

      {(review.comment_text ?? '').trim().length > 0 ? (
        <Text style={styles.comment}>{review.comment_text}</Text>
      ) : null}

      {/* Reply: existing, or a composer */}
      {review.reply ? (
        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>{pick(L.hostReply, locale)}</Text>
          <Text style={styles.replyText}>{review.reply.body}</Text>
        </View>
      ) : composing ? (
        <View style={styles.composer}>
          <TextInput
            style={[styles.input, { textAlign }]}
            value={body}
            onChangeText={setBody}
            placeholder={pick(L.replyPlaceholder, locale)}
            placeholderTextColor={theme.color.textMuted}
            multiline
            accessibilityLabel={pick(L.reply, locale)}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.composerActions}>
            <PrimaryButton
              label={pick(L.replySubmit, locale)}
              onPress={() => void onPost()}
              loading={busy}
              disabled={busy || body.trim().length === 0}
            />
          </View>
        </View>
      ) : (
        <View style={styles.replyCta}>
          <PrimaryButton label={pick(L.reply, locale)} variant="secondary" onPress={() => setComposing(true)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    gap: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
  topBack: { fontFamily: RN_FONTS.bodyBold, fontSize: theme.fontSize['heading-3'], color: theme.color.text },
  topTitle: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-3'],
    fontWeight: '600',
    color: theme.color.text,
    textAlign: 'center',
  },
  topSpacer: { width: 24 },

  listContent: { padding: theme.space.xl, gap: theme.space.md, flexGrow: 1 },
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    gap: theme.space.sm,
    ...theme.shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  scoreWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  scoreStar: { fontSize: 16, color: theme.color.ratingStar },
  scoreValue: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.color.text,
  },
  cardProperty: {
    flexShrink: 1,
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign: I18nManager.isRTL ? 'left' : 'right',
  },
  author: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign,
  },
  cats: { gap: theme.space.xs, marginTop: theme.space.xs },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  catLabel: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
  },
  comment: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
    lineHeight: theme.lineHeight.body,
    textAlign,
    marginTop: theme.space.xs,
  },

  replyBox: {
    marginTop: theme.space.sm,
    padding: theme.space.md,
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.md,
    gap: 2,
  },
  replyLabel: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    color: theme.color.primary,
    textAlign,
  },
  replyText: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.text,
    lineHeight: theme.lineHeight['body-sm'],
    textAlign,
  },

  replyCta: { marginTop: theme.space.sm },
  composer: { marginTop: theme.space.sm, gap: theme.space.sm },
  input: {
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.md,
    minHeight: 90,
    textAlignVertical: 'top',
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
  },
  composerActions: { alignItems: 'stretch' },
  error: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.error,
    textAlign,
  },
});
