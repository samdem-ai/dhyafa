/**
 * Leave-a-review screen (M3; redesigned Phase 8).
 *
 * Entry from Trips (completed bucket) + booking detail when a stay is
 * `completed` and not yet reviewed. Six category 1-5 star pickers (cleanliness,
 * accuracy, communication, location, value, checkin) + an optional comment →
 * submit_review. The server computes `overall` from the categories.
 *
 * Guards: the booking must belong to the caller and be `completed`, and not
 * already reviewed. On success we show a thank-you state with a "view trip" CTA.
 *
 * Redesign (Airbnb-style): built on @/ui primitives — Screen + Header + Button +
 * Text/Heading/TextField. Borderless category rows separated by hairlines, the
 * already-redesigned StarRating (outline lucide stars), every state centered
 * (Skeleton / ErrorState / EmptyState), and a sticky submit footer (shadow.xs
 * via Screen).
 */

import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Star, PartyPopper } from 'lucide-react-native';
import type { Locale } from '@dyafa/i18n';
import { getBookingDetail, type BookingWithProperty } from '@/lib/bookings';
import { localizedName } from '@/lib/discovery';
import { submitReview, hasReviewedBooking, REVIEW_CATEGORIES, type ReviewCategory } from '@/lib/reviews';
import { StarRating } from '@/components/StarRating';
import {
  Screen,
  Header,
  Heading,
  Text,
  Button,
  TextField,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@/ui';
import { L, pick } from '@/lib/copy';
import { theme } from '@/theme';

const CATEGORY_LABEL: Record<ReviewCategory, keyof typeof L> = {
  cleanliness: 'reviewCleanliness',
  accuracy: 'reviewAccuracy',
  communication: 'reviewCommunication',
  location: 'reviewLocation',
  value: 'reviewValue',
  checkin: 'reviewCheckin',
};

type Scores = Record<ReviewCategory, number>;
const EMPTY_SCORES: Scores = {
  cleanliness: 0,
  accuracy: 0,
  communication: 0,
  location: 0,
  value: 0,
  checkin: 0,
};

type Phase = 'loading' | 'form' | 'ineligible' | 'done' | 'error';

export default function LeaveReviewScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const [phase, setPhase] = useState<Phase>('loading');
  const [booking, setBooking] = useState<BookingWithProperty | null>(null);
  const [scores, setScores] = useState<Scores>(EMPTY_SCORES);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!bookingId) return;
    setPhase('loading');
    try {
      const b = await getBookingDetail(bookingId);
      if (!b) {
        setPhase('error');
        return;
      }
      setBooking(b);
      if (b.status !== 'completed') {
        setPhase('ineligible');
        return;
      }
      const reviewed = await hasReviewedBooking(bookingId);
      setPhase(reviewed ? 'ineligible' : 'form');
    } catch {
      setPhase('error');
    }
  }, [bookingId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function setCategory(cat: ReviewCategory, v: number) {
    setScores((prev) => ({ ...prev, [cat]: v }));
    setFormError(null);
  }

  const allRated = REVIEW_CATEGORIES.every((c) => scores[c] >= 1);

  async function onSubmit() {
    if (!bookingId) return;
    if (!allRated) {
      setFormError(pick(L.reviewSelectAll, locale));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await submitReview({
        bookingId,
        cleanliness: scores.cleanliness,
        accuracy: scores.accuracy,
        communication: scores.communication,
        location: scores.location,
        value: scores.value,
        checkin: scores.checkin,
        comment: comment.trim() ? comment.trim() : null,
      });
      setPhase('done');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : pick(L.reviewFailed, locale));
    } finally {
      setSubmitting(false);
    }
  }

  const prop = booking?.property ?? null;
  const title = prop
    ? localizedName({ name_ar: prop.title_ar, name_fr: prop.title_fr, name_en: prop.title_en }, locale)
    : '';

  // ── States ────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.leaveReview, locale)} />
        <View style={styles.skeletonWrap}>
          <Skeleton style={styles.skLineTitle} />
          <Skeleton style={styles.skLine} />
          <Skeleton style={styles.skBlock} />
          <Skeleton style={styles.skBlock} />
        </View>
      </Screen>
    );
  }
  if (phase === 'error') {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.leaveReview, locale)} />
        <View style={styles.centerFill}>
          <ErrorState
            message={pick(L.loadError, locale)}
            onRetry={() => void load()}
            retryLabel={pick(L.tryAgain, locale)}
          />
        </View>
      </Screen>
    );
  }
  if (phase === 'ineligible') {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.leaveReview, locale)} />
        <View style={styles.centerFill}>
          <EmptyState
            icon={Star}
            title={pick(L.reviewNotEligibleTitle, locale)}
            subtitle={pick(L.reviewNotEligibleBody, locale)}
            action={{ label: pick(L.viewTrip, locale), onPress: () => router.back() }}
          />
        </View>
      </Screen>
    );
  }
  if (phase === 'done') {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.leaveReview, locale)} />
        <View style={styles.centerFill}>
          <EmptyState
            icon={PartyPopper}
            title={pick(L.reviewThanksTitle, locale)}
            subtitle={pick(L.reviewThanksBody, locale)}
            action={{ label: pick(L.viewTrip, locale), onPress: () => router.back() }}
          />
        </View>
      </Screen>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <Screen
      edges={['top']}
      footer={
        <Button
          label={pick(L.submitReview, locale)}
          variant="tertiary"
          onPress={() => void onSubmit()}
          loading={submitting}
          disabled={submitting}
        />
      }
    >
      <Header title={pick(L.leaveReview, locale)} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Intro */}
          <View style={styles.intro}>
            <Heading level={1}>{pick(L.rateYourStay, locale)}</Heading>
            {title ? (
              <Text variant="title" weight="semibold">
                {title}
              </Text>
            ) : null}
            <Text variant="body-sm" color="textMuted">
              {pick(L.reviewIntro, locale)}
            </Text>
          </View>

          {/* Category star pickers — borderless rows, hairline separators */}
          <View style={styles.categories}>
            {REVIEW_CATEGORIES.map((cat, i) => (
              <View key={cat} style={[styles.catRow, i > 0 && styles.catRowBorder]}>
                <Text variant="body" weight="semibold" style={styles.flex}>
                  {pick(L[CATEGORY_LABEL[cat]], locale)}
                </Text>
                <StarRating
                  value={scores[cat]}
                  onChange={(v) => setCategory(cat, v)}
                  accessibilityLabel={pick(L[CATEGORY_LABEL[cat]], locale)}
                />
              </View>
            ))}
          </View>

          {/* Optional comment */}
          <TextField
            label={pick(L.reviewComment, locale)}
            value={comment}
            onChangeText={setComment}
            placeholder={pick(L.reviewCommentHint, locale)}
            multiline
          />

          {formError ? (
            <Text variant="body-sm" weight="medium" color="error" center>
              {formError}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerFill: { flex: 1, justifyContent: 'center' },

  body: { padding: theme.space.xl, gap: theme.space['2xl'], paddingBottom: theme.space['3xl'] },

  intro: { gap: theme.space.xs },

  // Category pickers — borderless, separated by hairlines
  categories: { gap: 0 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingVertical: theme.space.md,
  },
  catRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.color.border },

  // Skeleton (mirrors the form layout)
  skeletonWrap: { padding: theme.space.xl, gap: theme.space.lg },
  skLineTitle: { height: 28, width: '60%', borderRadius: theme.radius.sm },
  skLine: { height: 14, width: '40%', borderRadius: theme.radius.sm },
  skBlock: { height: 120, width: '100%', borderRadius: theme.radius.lg },
});
