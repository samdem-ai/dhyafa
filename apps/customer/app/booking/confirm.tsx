/**
 * Booking confirm (M2).
 *
 * Single screen covering: confirm dates/guests → client-side price preview
 * (nights × rate + cleaning + extra-guest + total) → guest details + special
 * requests → create_booking. The SERVER snapshot is authoritative; the
 * breakdown here is a preview only.
 *
 * On success the created booking is re-read for its status:
 *   awaiting_payment → push the payment stub
 *   requested        → push the booking detail (shows "request sent")
 *
 * create_booking error codes are surfaced as friendly localized messages.
 */

import { useCallback, useMemo, useState } from 'react';
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
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import { useSession } from '@/lib/auth';
import {
  getPropertyDetail,
  propertyTitle,
  localizedName,
  type PropertyDetail,
  type RoomTypeRow,
} from '@/lib/discovery';
import {
  priceQuote,
  nightsBetween,
  createBooking,
  getBookingDetail,
  bookingErrorMessage,
  type PriceQuote,
} from '@/lib/bookings';
import { GuestStepperRow, PriceBreakdown, type PriceLine } from '@/components/discovery';
import { Skeleton, ErrorState, PrimaryButton } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { parseDate } from '@/lib/searchParams';
import { formatRange } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

export default function BookingConfirmScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { user } = useSession();
  const params = useLocalSearchParams<{
    propertyId: string;
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    adults?: string;
    children?: string;
  }>();

  const [detail, setDetail] = useState<PropertyDetail | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const checkIn = parseDate(params.checkIn);
  const checkOut = parseDate(params.checkOut);

  const [adults, setAdults] = useState<number>(Number(params.adults ?? '1') || 1);
  const [children, setChildren] = useState<number>(Number(params.children ?? '0') || 0);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params.propertyId) return;
    setLoadError(null);
    try {
      const d = await getPropertyDetail(params.propertyId);
      setDetail(d);
    } catch {
      setLoadError(pick(L.loadError, locale));
      setDetail(null);
    }
  }, [params.propertyId, locale]);

  useFocusEffect(
    useCallback(() => {
      if (detail === undefined) void load();
    }, [detail, load]),
  );

  const room: RoomTypeRow | null = useMemo(() => {
    if (!detail) return null;
    return (
      detail.full_room_types.find((r) => r.id === params.roomTypeId) ??
      detail.full_room_types.find((r) => r.is_default) ??
      detail.full_room_types[0] ??
      null
    );
  }, [detail, params.roomTypeId]);

  const guests = adults + children;
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  const quote: PriceQuote | null = useMemo(() => {
    if (!room || !checkIn || !checkOut || nights <= 0) return null;
    return priceQuote({
      nightlyRateDzd: room.base_price_dzd,
      checkIn,
      checkOut,
      cleaningFeeDzd: room.cleaning_fee_dzd,
      extraGuestFeeDzd: room.extra_guest_fee_dzd,
      baseOccupancy: room.base_occupancy ?? room.max_occupancy,
      guests,
      units: 1,
    });
  }, [room, checkIn, checkOut, nights, guests]);

  // ── loading / error ────────────────────────────────────────────────────
  if (detail === undefined) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title={pick(L.yourTrip, locale)} />
        <View style={styles.body}>
          <Skeleton style={styles.skBlock} />
          <Skeleton style={styles.skBlock} />
          <Skeleton style={styles.skBlock} />
        </View>
      </SafeAreaView>
    );
  }
  if (detail === null || !room || !checkIn || !checkOut || nights <= 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title={pick(L.yourTrip, locale)} />
        <ErrorState
          message={loadError ?? pick(L.selectDatesFirst, locale)}
          onRetry={() => router.back()}
          retryLabel={pick(L.goBack, locale)}
        />
      </SafeAreaView>
    );
  }

  const title = propertyTitle(detail, locale);
  const place = detail.wilaya ? localizedName(detail.wilaya, locale) : '';
  const roomName = localizedName(
    { name_ar: room.name_ar, name_fr: room.name_fr, name_en: room.name_en },
    locale,
  );

  // Build the price breakdown lines (preview).
  const lines: PriceLine[] = [
    {
      label: `${formatDZD(room.base_price_dzd, locale)} × ${formatNumber(nights, locale)} ${
        nights === 1 ? pick(L.night, locale) : pick(L.nights, locale)
      }`,
      amountDzd: quote!.nightlySubtotalDzd,
    },
  ];
  if (quote!.cleaningFeeDzd > 0) lines.push({ label: pick(L.cleaningFee, locale), amountDzd: quote!.cleaningFeeDzd });
  if (quote!.extraGuestFeeDzd > 0)
    lines.push({ label: pick(L.extraGuestFee, locale), amountDzd: quote!.extraGuestFeeDzd });

  const occupancyExceeded = guests > room.max_occupancy;

  async function onSubmit() {
    if (!user) {
      router.replace('/(auth)/sign-in');
      return;
    }
    if (occupancyExceeded) {
      setSubmitError(pick(L.bookingFailed, locale));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const notes = [fullName.trim() ? `${pick(L.fullName, locale)}: ${fullName.trim()}` : '', phone.trim() ? `${pick(L.phone, locale)}: ${phone.trim()}` : '', specialRequests.trim()]
        .filter(Boolean)
        .join('\n');
      const bookingId = await createBooking({
        propertyId: detail!.id,
        roomTypeId: room!.id,
        checkIn: checkIn!,
        checkOut: checkOut!,
        adults,
        children,
        units: 1,
        specialRequests: notes || null,
      });
      // Re-read to learn the resulting status (awaiting_payment vs requested).
      const created = await getBookingDetail(bookingId);
      if (created?.status === 'awaiting_payment') {
        router.replace(`/booking/${bookingId}/pay`);
      } else {
        router.replace(`/booking/${bookingId}`);
      }
    } catch (err) {
      setSubmitError(bookingErrorMessage(err, locale));
    } finally {
      setSubmitting(false);
    }
  }

  const ctaLabel = detail.instant_book ? pick(L.confirmAndBook, locale) : pick(L.reviewBooking, locale);

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title={pick(L.yourTrip, locale)} />
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
          {/* Trip summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle} numberOfLines={2}>
              {title}
            </Text>
            {place ? <Text style={styles.summaryPlace}>{place}</Text> : null}
            {roomName ? <Text style={styles.summaryRoom}>{roomName}</Text> : null}
            <View style={styles.summaryDivider} />
            <SummaryRow label={pick(L.dates, locale)} value={formatRange(checkIn, checkOut, locale)} />
            <SummaryRow
              label={pick(L.guests, locale)}
              value={`${formatNumber(guests, locale)} ${guests === 1 ? pick(L.guestsCount, locale) : pick(L.guestsCountPlural, locale)}`}
            />
          </View>

          {/* Guests stepper */}
          <Section title={pick(L.guests, locale)}>
            <GuestStepperRow
              label={pick(L.adults, locale)}
              value={adults}
              min={1}
              max={room.max_adults ?? room.max_occupancy}
              onChange={setAdults}
            />
            <View style={styles.divider} />
            <GuestStepperRow
              label={pick(L.children, locale)}
              value={children}
              min={0}
              max={room.max_children ?? Math.max(0, room.max_occupancy - 1)}
              onChange={setChildren}
            />
            {occupancyExceeded ? (
              <Text style={styles.warnText}>
                {pick(L.maxGuests, locale)}: {formatNumber(room.max_occupancy, locale)}
              </Text>
            ) : null}
          </Section>

          {/* Price breakdown */}
          <Section title={pick(L.estTotal, locale)}>
            <PriceBreakdown
              lines={lines}
              totalLabel={pick(L.total, locale)}
              totalDzd={quote!.totalDzd}
              locale={locale}
              note={pick(L.priceEstimateNote, locale)}
            />
          </Section>

          {/* Guest details */}
          <Section title={pick(L.guestDetails, locale)}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{pick(L.fullName, locale)}</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder={pick(L.fullName, locale)}
                placeholderTextColor={theme.color.textMuted}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{pick(L.phone, locale)}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+213…"
                placeholderTextColor={theme.color.textMuted}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{pick(L.specialRequests, locale)}</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={specialRequests}
                onChangeText={setSpecialRequests}
                placeholder={pick(L.specialRequestsHint, locale)}
                placeholderTextColor={theme.color.textMuted}
                multiline
              />
            </View>
          </Section>

          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
        </ScrollView>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerTotal}>{formatDZD(quote!.totalDzd, locale)}</Text>
            <Text style={styles.footerTotalLabel}>{pick(L.estTotal, locale)}</Text>
          </View>
          <View style={styles.footerCta}>
            <PrimaryButton label={ctaLabel} onPress={() => void onSubmit()} loading={submitting} disabled={occupancyExceeded} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryRowLabel}>{label}</Text>
      <Text style={styles.summaryRowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
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

  body: { padding: theme.space.xl, gap: theme.space.xl, paddingBottom: theme.space['2xl'] },

  summaryCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    ...theme.shadow.card,
  },
  summaryTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-3'],
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  summaryPlace: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    marginTop: 2,
    textAlign,
  },
  summaryRoom: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.primary,
    marginTop: theme.space.xs,
    textAlign,
  },
  summaryDivider: { height: 1, backgroundColor: theme.color.border, marginVertical: theme.space.md },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingVertical: theme.space.xs,
  },
  summaryRowLabel: { fontFamily: RN_FONTS.arabicRegular, fontSize: theme.fontSize.body, color: theme.color.textMuted },
  summaryRowValue: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign: I18nManager.isRTL ? 'left' : 'right',
  },

  section: { gap: theme.space.md },
  sectionTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-3'],
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  divider: { height: 1, backgroundColor: theme.color.border },
  warnText: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.error,
    textAlign,
  },

  field: { gap: theme.space.xs },
  fieldLabel: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
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
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
    textAlign,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },

  errorText: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.error,
    textAlign: 'center',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.xl,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
  footerInfo: { flex: 1 },
  footerTotal: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize.price,
    fontWeight: '700',
    color: theme.color.text,
    textAlign,
    writingDirection: 'ltr',
  },
  footerTotalLabel: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign,
  },
  footerCta: { minWidth: 160 },

  skBlock: { height: 110, width: '100%', borderRadius: theme.radius.card },
});
