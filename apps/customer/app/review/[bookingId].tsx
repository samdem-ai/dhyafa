/**
 * Leave-a-review screen (M3).
 *
 * Entry from Trips (completed bucket) + booking detail when a stay is
 * `completed` and not yet reviewed. Six category 1-5 star pickers (cleanliness,
 * accuracy, communication, location, value, checkin) + an optional comment →
 * submit_review. The server computes `overall` from the categories.
 *
 * Guards: the booking must belong to the caller and be `completed`, and not
 * already reviewed. On success we show a thank-you state with a "view trip" CTA.
 */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { getBookingDetail, type BookingWithProperty } from '@/lib/bookings';
import { localizedName } from '@/lib/discovery';
import { submitReview, hasReviewedBooking, REVIEW_CATEGORIES, type ReviewCategory } from '@/lib/reviews';
import { Skeleton, ErrorState, EmptyState, PrimaryButton } from '@/components/ui';
import { StarRating } from '@/components/StarRating';
import { L, pick } from '@/lib/copy';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

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
      <SafeAreaView style={styles.safe}>
        <TopBar title={pick(L.leaveReview, locale)} />
        <View style={styles.body}>
          <Skeleton style={styles.skBlock} />
          <Skeleton style={styles.skBlock} />
        </View>
      </SafeAreaView>
    );
  }
  if (phase === 'error') {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title={pick(L.leaveReview, locale)} />
        <ErrorState message={pick(L.loadError, locale)} onRetry={() => void load()} retryLabel={pick(L.goBack, locale)} />
      </SafeAreaView>
    );
  }
  if (phase === 'ineligible') {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title={pick(L.leaveReview, locale)} />
        <EmptyState
          emoji="⭐"
          title={pick(L.reviewNotEligibleTitle, locale)}
          subtitle={pick(L.reviewNotEligibleBody, locale)}
        />
        <View style={styles.footer}>
          <PrimaryButton label={pick(L.viewTrip, locale)} variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }
  if (phase === 'done') {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title={pick(L.leaveReview, locale)} />
        <EmptyState emoji="🎉" title={pick(L.reviewThanksTitle, locale)} subtitle={pick(L.reviewThanksBody, locale)} />
        <View style={styles.footer}>
          <PrimaryButton label={pick(L.viewTrip, locale)} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title={pick(L.leaveReview, locale)} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <Text style={styles.heading}>{pick(L.rateYourStay, locale)}</Text>
            {title ? <Text style={styles.subhead}>{title}</Text> : null}
            <Text style={styles.introNote}>{pick(L.reviewIntro, locale)}</Text>
          </View>

          <View style={styles.card}>
            {REVIEW_CATEGORIES.map((cat, i) => (
              <View key={cat} style={[styles.catRow, i > 0 && styles.catRowBorder]}>
                <Text style={styles.catLabel}>{pick(L[CATEGORY_LABEL[cat]], locale)}</Text>
                <StarRating
                  value={scores[cat]}
                  onChange={(v) => setCategory(cat, v)}
                  accessibilityLabel={pick(L[CATEGORY_LABEL[cat]], locale)}
                />
              </View>
            ))}
          </View>

          <View style={styles.commentWrap}>
            <Text style={styles.commentLabel}>{pick(L.reviewComment, locale)}</Text>
            <TextInput
              style={[styles.input, { textAlign }]}
              value={comment}
              onChangeText={setComment}
              placeholder={pick(L.reviewCommentHint, locale)}
              placeholderTextColor={theme.color.textMuted}
              multiline
              accessibilityLabel={pick(L.reviewComment, locale)}
            />
          </View>

          {formError ? <Text style={styles.error}>{formError}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={pick(L.submitReview, locale)}
            onPress={() => void onSubmit()}
            loading={submitting}
            disabled={submitting}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TopBar({ title }: { title: string }) {
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
        <Text style={styles.topBack}>{I18nManager.isRTL ? '→' : '←'}</Text>
      </Pressable>
      <Text style={styles.topTitle}>{title}</Text>
      <View style={styles.topSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  flex: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    gap: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
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

  body: { padding: theme.space.xl, gap: theme.space.lg, paddingBottom: theme.space['2xl'] },

  intro: { gap: theme.space.xs },
  heading: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['heading-1'],
    color: theme.color.text,
    textAlign,
  },
  subhead: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  introNote: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    lineHeight: theme.lineHeight['body-sm'],
    textAlign,
  },

  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    paddingHorizontal: theme.space.lg,
    ...theme.shadow.card,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingVertical: theme.space.lg,
  },
  catRowBorder: { borderTopWidth: 1, borderTopColor: theme.color.border },
  catLabel: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },

  commentWrap: { gap: theme.space.sm },
  commentLabel: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  input: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.md,
    minHeight: 110,
    textAlignVertical: 'top',
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
  },
  error: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.error,
    textAlign,
  },

  footer: {
    padding: theme.space.xl,
    paddingTop: theme.space.md,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },

  skBlock: { height: 120, width: '100%', borderRadius: theme.radius.card },
});
