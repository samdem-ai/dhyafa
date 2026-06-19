/**
 * ReviewItem — one review rendered borderless (Airbnb-style): an avatar + author
 * name, a small terracotta star row, the comment, the date, and an optional
 * host reply indented under it. Used by the property detail summary and the full
 * "all reviews" route. Reads from the joined ReviewWithMeta (no extra fetch).
 *
 * No surface box / shadow / border — plain text on the page background. Icons are
 * outline lucide glyphs (the reply marker), never emoji. RTL-aware via primitives.
 */

import { View, StyleSheet, I18nManager } from 'react-native';
import type { Locale } from '@dyafa/i18n';
import { formatNumber } from '@dyafa/i18n';
import { Star, CornerDownRight } from 'lucide-react-native';
import type { ReviewWithMeta } from '@/lib/discovery';
import { Text, Avatar } from '@/ui';
import { L, pick } from '@/lib/copy';
import { formatDate } from '@/lib/dateFormat';
import { theme } from '@/theme';

export function ReviewItem({ review, locale }: { review: ReviewWithMeta; locale: Locale }) {
  const comment = (review.comment_text ?? '').trim();
  const author = review.author?.display_name ?? '';
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Avatar name={author} size="md" />
        <View style={styles.flex}>
          {author ? (
            <Text variant="body" weight="semibold" numberOfLines={1}>
              {author}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Star
              size={13}
              color={theme.color.ratingStar}
              fill={theme.color.ratingStar}
              strokeWidth={0}
            />
            <Text variant="body-sm" weight="semibold">
              {formatNumber(review.overall, locale)}
            </Text>
            <Text variant="caption" color="textMuted">
              · {formatDate(review.created_at, locale)}
            </Text>
          </View>
        </View>
      </View>

      {comment.length > 0 ? (
        <Text variant="body" color="text" style={styles.comment}>
          {comment}
        </Text>
      ) : null}

      {review.reply ? (
        <View style={styles.reply}>
          <CornerDownRight
            size={16}
            color={theme.color.textMuted}
            strokeWidth={2}
            style={[styles.replyIcon, { transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }]}
          />
          <View style={styles.flex}>
            <Text variant="caption" weight="semibold" color="primary">
              {pick(L.hostReply, locale)}
            </Text>
            <Text variant="body-sm" color="textMuted" style={styles.replyText}>
              {review.reply.body}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: theme.space.sm, paddingVertical: theme.space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs, marginTop: 2 },
  comment: { lineHeight: theme.lineHeight.body },
  reply: {
    flexDirection: 'row',
    gap: theme.space.sm,
    marginTop: theme.space.xs,
    paddingStart: theme.space.sm,
  },
  replyIcon: { marginTop: 2 },
  replyText: { lineHeight: theme.lineHeight['body-sm'], marginTop: 2 },
});
