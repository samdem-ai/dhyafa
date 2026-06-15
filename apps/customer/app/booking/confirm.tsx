/**
 * Booking confirm (Phase 4 rework).
 *
 * Built on src/ui. Covers: trip summary → multi-unit quantity → guests → client
 * price preview → guest contact → create_booking. The SERVER snapshot is
 * authoritative; the breakdown here is a preview only.
 *
 * Key behaviors:
 *  - CONTEXT PRESERVATION across the sign-in detour. When signed out we navigate
 *    to `/(auth)/sign-in?next=<full confirm path with dates/room/guests/units>`
 *    (built via buildNextPath) so the user RESUMES the same booking on return —
 *    we never router.replace away and lose the in-progress state.
 *  - STRUCTURED CONTACT: full name + phone are written to profiles.full_name /
 *    profiles.phone_e164 (validated E.164 +213), not crammed into special_requests.
 *    Existing profile contact pre-fills the form.
 *  - MULTI-UNIT: a quantity selector wired to create_booking p_units.
 *  - MIN_NIGHTS surfaced before submit (nights < detail.min_nights).
 *  - On success route to pay; if create_booking succeeded but the follow-up
 *    status re-read failed, we still proceed with the returned id (no false
 *    "could not create booking").
 */

import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, I18nManager } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
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
  getBookingStatus,
  bookingErrorMessage,
  normalizePhoneE164,
  saveGuestContact,
  getMyContact,
  type PriceQuote,
} from '@/lib/bookings';
import { GuestStepperRow, PriceBreakdown, type PriceLine } from '@/components/discovery';
import {
  Screen,
  Header,
  Text,
  Heading,
  Button,
  Card,
  TextField,
  DetailSkeleton,
  ErrorState,
  PriceText,
  useToast,
  haptics,
} from '@/ui';
import { L, pick } from '@/lib/copy';
import { parseDate, buildNextPath } from '@/lib/searchParams';
import { formatRange } from '@/lib/dateFormat';
import { theme } from '@/theme';

export default function BookingConfirmScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { user } = useSession();
  const toast = useToast();
  const params = useLocalSearchParams<{
    propertyId: string;
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    adults?: string;
    children?: string;
    units?: string;
  }>();

  const [detail, setDetail] = useState<PropertyDetail | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const checkIn = parseDate(params.checkIn);
  const checkOut = parseDate(params.checkOut);

  const [adults, setAdults] = useState<number>(Number(params.adults ?? '1') || 1);
  const [children, setChildren] = useState<number>(Number(params.children ?? '0') || 0);
  const [units, setUnits] = useState<number>(Number(params.units ?? '1') || 1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
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

  // Pre-fill contact from the signed-in user's profile (once).
  const [contactLoaded, setContactLoaded] = useState(false);
  const prefillContact = useCallback(async () => {
    if (!user || contactLoaded) return;
    setContactLoaded(true);
    try {
      const c = await getMyContact(user.id);
      if (c.fullName) setFullName((cur) => cur || c.fullName!);
      if (c.phoneE164) setPhone((cur) => cur || c.phoneE164!);
    } catch {
      // best-effort prefill; ignore
    }
  }, [user, contactLoaded]);

  useFocusEffect(
    useCallback(() => {
      if (detail === undefined) void load();
      void prefillContact();
    }, [detail, load, prefillContact]),
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
      units,
    });
  }, [room, checkIn, checkOut, nights, guests, units]);

  // ── loading / error ────────────────────────────────────────────────────
  if (detail === undefined) {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.yourTrip, locale)} />
        <DetailSkeleton />
      </Screen>
    );
  }
  if (detail === null || !room || !checkIn || !checkOut || nights <= 0) {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.yourTrip, locale)} />
        <ErrorState
          message={loadError ?? pick(L.selectDatesFirst, locale)}
          onRetry={() => router.back()}
          retryLabel={pick(L.goBack, locale)}
        />
      </Screen>
    );
  }

  const title = propertyTitle(detail, locale);
  const place = detail.wilaya ? localizedName(detail.wilaya, locale) : '';
  const roomName = localizedName(
    { name_ar: room.name_ar, name_fr: room.name_fr, name_en: room.name_en },
    locale,
  );

  // Available units to offer for this room (cap the selector at inventory).
  const maxUnits = Math.max(1, room.inventory_count ?? 1);

  // Price breakdown lines (preview).
  const lines: PriceLine[] = [
    {
      label: `${formatNumber(room.base_price_dzd, locale)} × ${formatNumber(nights, locale)} ${
        nights === 1 ? pick(L.night, locale) : pick(L.nights, locale)
      }${units > 1 ? ` × ${formatNumber(units, locale)}` : ''}`,
      amountDzd: quote!.nightlySubtotalDzd,
    },
  ];
  if (quote!.cleaningFeeDzd > 0) lines.push({ label: pick(L.cleaningFee, locale), amountDzd: quote!.cleaningFeeDzd });
  if (quote!.extraGuestFeeDzd > 0)
    lines.push({ label: pick(L.extraGuestFee, locale), amountDzd: quote!.extraGuestFeeDzd });

  const occupancyExceeded = guests > room.max_occupancy * units;
  const belowMinNights = detail.min_nights > 0 && nights < detail.min_nights;

  async function onSubmit() {
    // CONTEXT PRESERVATION: build the full path to THIS booking and resume after auth.
    if (!user) {
      const next = buildNextPath('/booking/confirm', {
        propertyId: detail!.id,
        roomTypeId: room!.id,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        adults: String(adults),
        children: String(children),
        units: String(units),
      });
      router.push({ pathname: '/(auth)/sign-in', params: { next } });
      return;
    }
    if (occupancyExceeded || belowMinNights) return;

    // Validate phone (E.164 +213) when provided.
    const trimmedPhone = phone.trim();
    let phoneE164: string | null = null;
    if (trimmedPhone) {
      phoneE164 = normalizePhoneE164(trimmedPhone);
      if (!phoneE164) {
        setPhoneError(pick(L.phoneInvalid, locale));
        return;
      }
    }
    setPhoneError(null);

    setSubmitting(true);
    setSubmitError(null);
    try {
      // Write contact to structured profile columns (best-effort, non-fatal).
      try {
        await saveGuestContact({ userId: user.id, fullName, phoneE164 });
      } catch {
        // a failed contact save must not block the booking
      }

      const bookingId = await createBooking({
        propertyId: detail!.id,
        roomTypeId: room!.id,
        checkIn: checkIn!,
        checkOut: checkOut!,
        adults,
        children,
        units,
        specialRequests: specialRequests.trim() || null,
      });

      haptics.success();

      // Re-read just the status to choose the route. A FAILED re-read must NOT
      // surface "could not create booking" — the booking already exists.
      let status = null;
      try {
        status = await getBookingStatus(bookingId);
      } catch {
        toast.show({ message: pick(L.bookingCreatedReadFailed, locale), tone: 'info' });
      }
      if (status === 'awaiting_payment') {
        router.replace(`/booking/${bookingId}/pay`);
      } else {
        router.replace(`/booking/${bookingId}`);
      }
    } catch (err) {
      haptics.error();
      setSubmitError(bookingErrorMessage(err, locale));
    } finally {
      setSubmitting(false);
    }
  }

  const ctaLabel = !user
    ? pick(L.signIn, locale)
    : detail.instant_book
      ? pick(L.confirmAndBook, locale)
      : pick(L.reviewBooking, locale);

  return (
    <Screen
      edges={['top']}
      footer={
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <PriceText amount={quote!.totalDzd} variant="total" locale={locale} />
            <Text variant="caption" color="textMuted">
              {pick(L.estTotal, locale)}
            </Text>
          </View>
          <View style={styles.footerCta}>
            <Button
              label={ctaLabel}
              variant="tertiary"
              onPress={() => void onSubmit()}
              loading={submitting}
              disabled={occupancyExceeded || belowMinNights}
            />
          </View>
        </View>
      }
    >
      <Header title={pick(L.yourTrip, locale)} />
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
          <Card>
            <Text variant="title" weight="semibold" numberOfLines={2}>
              {title}
            </Text>
            {place ? (
              <Text variant="body-sm" color="textMuted">
                {place}
              </Text>
            ) : null}
            {roomName ? (
              <Text variant="body-sm" weight="medium" color="primary" style={styles.gapTop}>
                {roomName}
              </Text>
            ) : null}
            <View style={styles.divider} />
            <SummaryRow label={pick(L.dates, locale)} value={formatRange(checkIn, checkOut, locale)} />
            <SummaryRow
              label={pick(L.guests, locale)}
              value={`${formatNumber(guests, locale)} ${guests === 1 ? pick(L.guestsCount, locale) : pick(L.guestsCountPlural, locale)}`}
            />
            {units > 1 ? (
              <SummaryRow
                label={pick(L.quantity, locale)}
                value={`${formatNumber(units, locale)} ${units === 1 ? pick(L.unit, locale) : pick(L.units, locale)}`}
              />
            ) : null}
          </Card>

          {/* Quantity (multi-unit) */}
          {maxUnits > 1 ? (
            <Section title={pick(L.quantity, locale)}>
              <GuestStepperRow
                label={pick(L.units, locale)}
                value={units}
                min={1}
                max={maxUnits}
                onChange={setUnits}
              />
            </Section>
          ) : null}

          {/* Guests */}
          <Section title={pick(L.guests, locale)}>
            <GuestStepperRow
              label={pick(L.adults, locale)}
              value={adults}
              min={1}
              max={(room.max_adults ?? room.max_occupancy) * units}
              onChange={setAdults}
            />
            <View style={styles.divider} />
            <GuestStepperRow
              label={pick(L.children, locale)}
              value={children}
              min={0}
              max={(room.max_children ?? Math.max(0, room.max_occupancy - 1)) * units}
              onChange={setChildren}
            />
            {occupancyExceeded ? (
              <Text variant="caption" color="error">
                {pick(L.maxGuests, locale)}: {formatNumber(room.max_occupancy * units, locale)}
              </Text>
            ) : null}
          </Section>

          {/* Min-nights notice (surfaced before submit) */}
          {belowMinNights ? (
            <Card variant="flat">
              <Text variant="body-sm" weight="medium" color="error">
                {pick(L.minNightsError, locale)}: {formatNumber(detail.min_nights, locale)}{' '}
                {detail.min_nights === 1 ? pick(L.night, locale) : pick(L.nights, locale)}
              </Text>
            </Card>
          ) : null}

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

          {/* Guest contact (structured profile columns) */}
          <Section title={pick(L.guestDetails, locale)}>
            <TextField
              label={pick(L.contactName, locale)}
              value={fullName}
              onChangeText={setFullName}
              placeholder={pick(L.contactName, locale)}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
            <TextField
              label={pick(L.contactPhone, locale)}
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                if (phoneError) setPhoneError(null);
              }}
              placeholder="+213…"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              error={phoneError ?? undefined}
            />
            <TextField
              label={pick(L.specialRequests, locale)}
              value={specialRequests}
              onChangeText={setSpecialRequests}
              placeholder={pick(L.specialRequestsHint, locale)}
              multiline
            />
          </Section>

          {submitError ? (
            <Text variant="body-sm" weight="medium" color="error" center>
              {submitError}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text variant="body" color="textMuted">
        {label}
      </Text>
      <Text variant="body" weight="semibold" numberOfLines={1} style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Heading level={3}>{title}</Heading>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: theme.space.xl, gap: theme.space.xl, paddingBottom: theme.space['2xl'] },
  gapTop: { marginTop: theme.space.xs },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.color.border, marginVertical: theme.space.md },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingVertical: theme.space.xs,
  },
  // Value aligns to the end edge (right in LTR, left in RTL).
  summaryValue: { flex: 1, textAlign: I18nManager.isRTL ? 'left' : 'right' },

  section: { gap: theme.space.md },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingBottom: theme.space.md,
  },
  footerInfo: { flex: 1 },
  footerCta: { minWidth: 160 },
});
