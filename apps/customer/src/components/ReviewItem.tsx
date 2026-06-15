/**
 * ReviewItem — one review card with rating, author, comment, date, and an
 * optional host reply. Used by the property detail summary and the full
 * "all reviews" route. Reads from the joined ReviewWithMeta (no extra fetch).
 */

import { View, StyleSheet } from 'react-native';
import type { Locale } from '@dyafa/i18n';
import { formatNumber } from '@dyafa/i18n';
import type { ReviewWithMeta } from '@/lib/discovery';
import { Card, Text, RatingStars } from '@/ui';
import { L, pick } from '@/lib/copy';
import { formatDate } from '@/lib/dateFormat';
import { theme } from '@/theme';

export function ReviewItem({ review, locale }: { review: ReviewWithMeta; locale: Locale }) {
  const comment = (review.comment_text ?? '').trim();
  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <RatingStars value={review.overall} size={14} />
        <Text variant="body-sm" weight="semibold">
          {formatNumber(review.overall, locale)}
        </Text>
        {review.author?.display_name ? (
          <Text variant="body-sm" color="textMuted" numberOfLines={1} style={styles.author}>
            · {review.author.display_name}
          </Text>
        ) : null}
      </View>
      {comment.length > 0 ? (
        <Text variant="body-sm" style={styles.comment}>
          {comment}
        </Text>
      ) : null}
      <Text variant="overline" color="textMuted">
        {formatDate(review.created_at, locale)}
      </Text>
      {review.reply ? (
        <View style={styles.replyBox}>
          <Text variant="caption" weight="semibold" color="primary">
            {pick(L.hostReply, locale)}
          </Text>
          <Text variant="body-sm" style={styles.replyText}>
            {review.reply.body}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.space.xs, marginTop: theme.space.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  author: { flexShrink: 1 },
  comment: { lineHeight: theme.lineHeight['body-sm'] },
  replyBox: {
    marginTop: theme.space.xs,
    padding: theme.space.md,
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.md,
    gap: 2,
  },
  replyText: { lineHeight: theme.lineHeight['body-sm'] },
});
