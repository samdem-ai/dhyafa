/**
 * Booking / trip detail (M2).
 *
 * Status badge, contextual banner (request sent / awaiting payment), property
 * summary, dates + guests, the AUTHORITATIVE server price breakdown (the
 * snapshot columns on the booking row), and the booking code. awaiting_payment
 * bookings show a "complete payment" CTA → the pay stub.
 */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  I18nManager,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
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
import { RemoteImage } from '@/components/RemoteImage';
import { BookingStatusBadge, PriceBreakdown, type PriceLine } from '@/components/discovery';
import { Skeleton, ErrorState, EmptyState, PrimaryButton } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { useWilayaNames } from '@/lib/useWilayaNames';
import { formatRange, formatDateTime } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

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
      <SafeAreaView style={styles.safe}>
        <TopBar title={pick(L.tripDetail, locale)} />
        <View style={styles.body}>
          <Skeleton style={styles.skImage} />
          <Skeleton style={styles.skBlock} />
          <Skeleton style={styles.skBlock} />
        </View>
      </SafeAreaView>
    );
  }
  if (error && booking === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title={pick(L.tripDetail, locale)} />
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.goBack, locale)} />
      </SafeAreaView>
    );
  }
  if (booking === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title={pick(L.tripDetail, locale)} />
        <EmptyState emoji="🧳" title={pick(L.notFoundTitle, locale)} subtitle={pick(L.notFoundBody, locale)} />
      </SafeAreaView>
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
    <SafeAreaView style={styles.safe}>
      <TopBar title={pick(L.tripDetail, locale)} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Banner for actionable states */}
        {showBanner ? (
          <View style={[styles.banner, booking.status === 'awaiting_payment' && styles.bannerWarn]}>
            <Text style={styles.bannerTitle}>{bannerTitle}</Text>
            <Text style={styles.bannerBody}>{bannerBody}</Text>
          </View>
        ) : null}

        {/* Property summary */}
        <View style={styles.propCard}>
          <RemoteImage uri={cover} alt={title} radius={theme.radius.md} style={styles.propImage} />
          <View style={styles.propBody}>
            <View style={styles.propHeader}>
              <Text style={styles.propTitle} numberOfLines={2}>
                {title}
              </Text>
              <BookingStatusBadge status={booking.status} locale={locale} />
            </View>
            {place ? <Text style={styles.propPlace}>{place}</Text> : null}
            {prop ? (
              <Pressable accessibilityRole="button" onPress={() => router.push(`/property/${prop.id}`)} hitSlop={6}>
                <Text style={styles.viewListing}>{pick(L.about, locale)} ›</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Dates + guests */}
        <View style={styles.infoCard}>
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
        <View style={styles.priceCard}>
          <Text style={styles.sectionTitle}>{pick(L.total, locale)}</Text>
          <PriceBreakdown lines={lines} totalLabel={pick(L.total, locale)} totalDzd={booking.total_dzd} locale={locale} />
        </View>

        {/* Actions: message host, and review when the stay is completed */}
        <View style={styles.actions}>
          {booking.status === 'completed' ? (
            <PrimaryButton
              label={pick(L.leaveReview, locale)}
              onPress={() => router.push(`/review/${booking.id}`)}
            />
          ) : null}
          <PrimaryButton
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
              style={({ pressed }) => [styles.cancelLink, pressed && styles.cancelLinkPressed]}
            >
              <Text style={styles.cancelLinkText}>{pick(L.cancelBookingAction, locale)}</Text>
            </Pressable>
          ) : null}
          {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}
        </View>

        {/* Booking code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{pick(L.bookingCode, locale)}</Text>
          <Text style={styles.codeValue}>{booking.code}</Text>
        </View>
      </ScrollView>

      {/* CTA for awaiting payment */}
      {booking.status === 'awaiting_payment' ? (
        <View style={styles.footer}>
          <PrimaryButton
            label={pick(L.completePayment, locale)}
            onPress={() => router.push(`/booking/${booking.id}/pay`)}
          />
        </View>
      ) : null}

      {/* Cancel flow (quote_refund → confirm → cancel_booking) */}
      <CancelBookingSheet
        booking={booking}
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancelled={() => void load()}
        locale={locale}
      />
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
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

  banner: {
    backgroundColor: theme.color.successBg,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    gap: theme.space.xs,
  },
  bannerWarn: { backgroundColor: theme.color.warningBg },
  bannerTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  bannerBody: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.text,
    lineHeight: theme.lineHeight['body-sm'],
    textAlign,
  },

  propCard: {
    flexDirection: 'row',
    gap: theme.space.md,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.md,
    ...theme.shadow.card,
  },
  propImage: { width: 100, height: 100 },
  propBody: { flex: 1, gap: 2 },
  propHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  propTitle: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  propPlace: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
  },
  viewListing: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.accent,
    marginTop: theme.space.xs,
    textAlign,
  },

  infoCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    ...theme.shadow.card,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  infoLabel: { fontFamily: RN_FONTS.arabicRegular, fontSize: theme.fontSize.body, color: theme.color.textMuted },
  infoValue: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign: I18nManager.isRTL ? 'left' : 'right',
  },
  infoDivider: { height: 1, backgroundColor: theme.color.border },

  priceCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    gap: theme.space.md,
    ...theme.shadow.card,
  },
  sectionTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-3'],
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },

  actions: { gap: theme.space.md },
  actionError: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.error,
    textAlign,
  },
  cancelLink: { alignSelf: 'center', paddingVertical: theme.space.sm, paddingHorizontal: theme.space.md },
  cancelLinkPressed: { opacity: 0.6 },
  cancelLinkText: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['body-sm'],
    fontWeight: '600',
    color: theme.color.error,
    textAlign: 'center',
  },

  codeCard: {
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    alignItems: 'center',
    gap: theme.space.xs,
  },
  codeLabel: { fontFamily: RN_FONTS.arabicRegular, fontSize: theme.fontSize.caption, color: theme.color.textMuted },
  codeValue: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize['heading-2'],
    fontWeight: '700',
    color: theme.color.primary,
    letterSpacing: 2,
  },

  footer: {
    padding: theme.space.xl,
    paddingTop: theme.space.md,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },

  skImage: { width: '100%', height: 120, borderRadius: theme.radius.card },
  skBlock: { height: 90, width: '100%', borderRadius: theme.radius.card },
});
