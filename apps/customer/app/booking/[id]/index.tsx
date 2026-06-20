/**
 * Booking / trip detail (M2, migrated onto @/ui).
 *
 * Status badge, contextual banner (request sent / awaiting payment), property
 * summary, dates + guests, the AUTHORITATIVE server price breakdown (the
 * snapshot columns on the booking row), and the booking code. awaiting_payment
 * bookings show a "complete payment" CTA → the pay stub.
 *
 * Built on src/ui (Screen / Header / Text / Button / DetailSkeleton /
 * RemoteImage). Airbnb-style: borderless, photo-first, sans-bold section
 * headers — matching its flow-mates booking/confirm.tsx and pay.tsx. The
 * localized screen-reader back label is automatic from Header.
 */

import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, I18nManager } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
import { Luggage, ChevronRight } from 'lucide-react-native';
import {
  getBookingDetail,
  bookingCoverUrl,
  isCancellable,
  type BookingWithProperty,
} from '@/lib/bookings';
import { localizedName } from '@/lib/discovery';
import { useSession } from '@/lib/auth';
import { buildNextPath } from '@/lib/searchParams';
import { getOrCreateConversation } from '@/lib/messaging';
import { CancelBookingSheet } from '@/components/CancelBookingSheet';
import { BookingStatusBadge, PriceBreakdown, type PriceLine } from '@/components/discovery';
import {
  Screen,
  Header,
  Text,
  Button,
  RemoteImage,
  DetailSkeleton,
  ErrorState,
  EmptyState,
} from '@/ui';
import { L, pick } from '@/lib/copy';
import { useWilayaNames } from '@/lib/useWilayaNames';
import { formatRange, formatDateTime } from '@/lib/dateFormat';
import { theme } from '@/theme';

export default function BookingDetailScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, loading: authLoading } = useSession();
  const wilayaNames = useWilayaNames(locale);

  const [booking, setBooking] = useState<BookingWithProperty | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const onMessageHost = useCallback(async () => {
    if (!id) return;
    setMessaging(true);
    setActionError(null);
    try {
      const conversationId = await getOrCreateConversation(id);
      router.push(`/conversation/${conversationId}`);
    } catch {
      setActionError(pick(L.conversationFailed, locale));
    } finally {
      setMessaging(false);
    }
  }, [id, locale]);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const b = await getBookingDetail(id);
      setBooking(b);
    } catch {
      setError(pick(L.loadError, locale));
      setBooking(null);
    }
  }, [id, locale]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Signed-out guard (the booking stack no longer hard-gates at the layout, so
  // we resume HERE after auth instead of dropping context at a bare sign-in).
  // Navigate from an effect, never during render.
  const signedOut = !authLoading && !user;
  useFocusEffect(
    useCallback(() => {
      if (signedOut && id) {
        router.replace({
          pathname: '/(auth)/sign-in',
          params: { next: buildNextPath(`/booking/${id}`, {}) },
        });
      }
    }, [signedOut, id]),
  );

  if (booking === undefined || signedOut) {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.tripDetail, locale)} />
        <DetailSkeleton />
      </Screen>
    );
  }
  if (error && booking === null) {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.tripDetail, locale)} />
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.tryAgain, locale)} />
      </Screen>
    );
  }
  if (booking === null) {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.tripDetail, locale)} />
        <View style={styles.centerFill}>
          <EmptyState icon={Luggage} title={pick(L.notFoundTitle, locale)} subtitle={pick(L.notFoundBody, locale)} />
        </View>
      </Screen>
    );
  }

  const prop = booking.property;
  const title = prop
    ? localizedName({ name_ar: prop.title_ar, name_fr: prop.title_fr, name_en: prop.title_en }, locale)
    : '';
  const place = prop ? wilayaNames.get(prop.wilaya_code) ?? '' : '';
  const cover = bookingCoverUrl(booking);
  const guests = booking.adults + booking.children;

  // Authoritative server snapshot lines.
  const lines: PriceLine[] = [
    {
      label: `${pick(L.nights, locale)} × ${formatNumber(booking.nights ?? 0, locale)}`,
      amountDzd: booking.nightly_subtotal_dzd,
    },
  ];
  if (booking.cleaning_fee_dzd > 0) lines.push({ label: pick(L.cleaningFee, locale), amountDzd: booking.cleaning_fee_dzd });
  if (booking.extra_guest_fee_dzd > 0)
    lines.push({ label: pick(L.extraGuestFee, locale), amountDzd: booking.extra_guest_fee_dzd });
  if (booking.service_fee_dzd > 0) lines.push({ label: pick(L.serviceFee, locale), amountDzd: booking.service_fee_dzd });

  const showBanner = booking.status === 'requested' || booking.status === 'awaiting_payment';
  const bannerTitle =
    booking.status === 'requested' ? pick(L.requestSentTitle, locale) : pick(L.awaitingPaymentTitle, locale);
  const bannerBody =
    booking.status === 'requested' ? pick(L.requestSentBody, locale) : pick(L.awaitingPaymentBody, locale);

  return (
    <Screen
      edges={['top']}
      footer={
        booking.status === 'awaiting_payment' ? (
          <View style={styles.footer}>
            <Button
              label={pick(L.completePayment, locale)}
              variant="tertiary"
              onPress={() => router.push(`/booking/${booking.id}/pay`)}
            />
          </View>
        ) : undefined
      }
    >
      <Header title={pick(L.tripDetail, locale)} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Banner for actionable states */}
        {showBanner ? (
          <View style={[styles.banner, booking.status === 'awaiting_payment' && styles.bannerWarn]}>
            <Text variant="title" weight="semibold">
              {bannerTitle}
            </Text>
            <Text variant="body-sm">{bannerBody}</Text>
          </View>
        ) : null}

        {/* Property summary — borderless, photo-first */}
        <View style={styles.propRow}>
          <RemoteImage uri={cover} alt={title} radius={theme.radius.lg} style={styles.propImage} />
          <View style={styles.propBody}>
            <View style={styles.propHeader}>
              <Text variant="body" weight="semibold" numberOfLines={2} style={styles.propTitle}>
                {title}
              </Text>
              <BookingStatusBadge status={booking.status} locale={locale} />
            </View>
            {place ? (
              <Text variant="body-sm" color="textMuted">
                {place}
              </Text>
            ) : null}
            {prop ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/property/${prop.id}`)}
                hitSlop={6}
                style={styles.viewListing}
              >
                <Text variant="body-sm" weight="semibold" color="accent">
                  {pick(L.about, locale)}
                </Text>
                <ChevronRight
                  size={16}
                  color={theme.color.accent}
                  strokeWidth={2.5}
                  style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Dates + guests */}
        <View style={styles.section}>
          <InfoRow label={pick(L.dates, locale)} value={formatRange(booking.check_in, booking.check_out, locale)} />
          <View style={styles.infoDivider} />
          <InfoRow
            label={pick(L.guests, locale)}
            value={`${formatNumber(guests, locale)} ${guests === 1 ? pick(L.guestsCount, locale) : pick(L.guestsCountPlural, locale)}`}
          />
          {booking.payment_deadline && booking.status === 'awaiting_payment' ? (
            <>
              <View style={styles.infoDivider} />
              <InfoRow label={pick(L.payByDeadline, locale)} value={formatDateTime(booking.payment_deadline, locale)} />
            </>
          ) : null}
        </View>

        {/* Price breakdown (authoritative) */}
        <View style={styles.priceSection}>
          <Text variant="title" weight="bold">
            {pick(L.estTotal, locale)}
          </Text>
          <PriceBreakdown lines={lines} totalLabel={pick(L.total, locale)} totalDzd={booking.total_dzd} locale={locale} />
        </View>

        {/* Actions: message host, and review when the stay is completed */}
        <View style={styles.actions}>
          {booking.status === 'completed' ? (
            <Button
              label={pick(L.leaveReview, locale)}
              onPress={() => router.push(`/review/${booking.id}`)}
            />
          ) : null}
          <Button
            label={pick(L.messageHost, locale)}
            variant="secondary"
            onPress={() => void onMessageHost()}
            loading={messaging}
            disabled={messaging}
          />
          {isCancellable(booking.status) ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setCancelOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [styles.cancelLink, pressed && styles.cancelLinkPressed]}
            >
              <Text variant="body-sm" weight="semibold" color="error" center>
                {pick(L.cancelBookingAction, locale)}
              </Text>
            </Pressable>
          ) : null}
          {actionError ? (
            <Text variant="body-sm" weight="medium" color="error">
              {actionError}
            </Text>
          ) : null}
        </View>

        {/* Booking code */}
        <View style={styles.codeCard}>
          <Text variant="caption" color="textMuted">
            {pick(L.bookingCode, locale)}
          </Text>
          <Text variant="title" weight="bold" color="primary" style={styles.codeValue}>
            {booking.code}
          </Text>
        </View>
      </ScrollView>

      {/* Cancel flow (quote_refund → confirm → cancel_booking) */}
      <CancelBookingSheet
        booking={booking}
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancelled={() => void load()}
        locale={locale}
      />
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="body" color="textMuted">
        {label}
      </Text>
      <Text variant="body" weight="semibold" numberOfLines={1} style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: theme.space.xl, gap: theme.space['2xl'], paddingBottom: theme.space['3xl'] },
  centerFill: { flex: 1, justifyContent: 'center' },

  banner: {
    backgroundColor: theme.color.successBg,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    gap: theme.space.xs,
  },
  bannerWarn: { backgroundColor: theme.color.warningBg },

  propRow: { flexDirection: 'row', gap: theme.space.md },
  propImage: { width: 96, height: 96 },
  propBody: { flex: 1, gap: 2 },
  propHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  propTitle: { flex: 1 },
  viewListing: {
    marginTop: theme.space.xs,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  section: { gap: theme.space.xs },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  // Value aligns to the end edge (right in LTR, left in RTL).
  infoValue: { flex: 1, textAlign: I18nManager.isRTL ? 'left' : 'right' },
  infoDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.color.border },

  priceSection: { gap: theme.space.md },

  actions: { gap: theme.space.md },
  cancelLink: { alignSelf: 'center', paddingVertical: theme.space.sm, paddingHorizontal: theme.space.md },
  cancelLinkPressed: { opacity: 0.6 },

  codeCard: {
    alignItems: 'center',
    gap: theme.space.xs,
    paddingTop: theme.space.sm,
  },
  codeValue: { letterSpacing: 2 },

  footer: { paddingBottom: theme.space.md },
});
