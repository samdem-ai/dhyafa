/**
 * Property detail (Phase 4 rework; redesigned Phase 8 — Airbnb-style hero).
 *
 * Built on src/ui: an edge-to-edge <PhotoGallery> (paged expo-image — no
 * per-frame setState jank) under a transparent <Header> over a scrim, then
 * generous-whitespace content sections (sans-bold headers), an amenities grid
 * with OUTLINE lucide icons, rules, cancellation policy, room-type select, and
 * reviews read from the JOINED `detail.reviews` (getPropertyDetail already joins
 * author + reply — no second fetch). A sticky bottom booking widget (PriceText +
 * Reserve CTA, shadow.xs) with separate dates vs guests tap targets and an
 * OCCUPANCY GUARD in the guests sheet (max_occupancy enforced on adults+children
 * together, not independently).
 *
 * Language fallback (ar→fr→en) is indicated when content is shown in another
 * language than the active UI locale.
 *
 * The header carries a wishlist heart (Phase 5a). A "Message host" action (P5b)
 *   opens a compose sheet → start_inquiry RPC → routes to the new thread. Signed-
 *   out guests are sent to sign-in with a `next` back to this property.
 */

import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions, I18nManager } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
import {
  Calendar as CalendarIcon,
  Users,
  Star,
  Check,
  Clock,
  ChevronRight,
  Languages,
} from 'lucide-react-native';
import {
  getPropertyDetail,
  resolvePhotoUrl,
  propertyTitle,
  localizedName,
  localizedNameWithSource,
  type PropertyDetail,
  type RoomTypeRow,
  type ReviewWithMeta,
} from '@/lib/discovery';
import { priceQuote, nightsBetween, toDateParam, type PriceQuote } from '@/lib/bookings';
import { categoryAverage, overallAverage, REVIEW_CATEGORIES, type ReviewCategory } from '@/lib/reviews';
import { startInquiry, InquiryError } from '@/lib/messaging';
import { useSession } from '@/lib/auth';
import { GuestStepperRow, InstantBookBadge } from '@/components/discovery';
import { DateRangePicker } from '@/components/Calendar';
import { ReviewItem } from '@/components/ReviewItem';
import {
  Screen,
  Header,
  Text,
  Heading,
  Button,
  PriceText,
  BottomSheet,
  TextField,
  PhotoGallery,
  DetailSkeleton,
  ErrorState,
  EmptyState,
  WishlistHeart,
  haptics,
} from '@/ui';
import { L, pick, type LMessage } from '@/lib/copy';
import { fromParams, parseDate, buildNextPath } from '@/lib/searchParams';
import { formatRange, formatTime } from '@/lib/dateFormat';
import { theme } from '@/theme';

const CANCEL_COPY: Record<PropertyDetail['cancellation_tier'], LMessage> = {
  flexible: L.cancelFlexible,
  moderate: L.cancelModerate,
  strict: L.cancelStrict,
};

const REVIEW_CAT_LABEL: Record<ReviewCategory, keyof typeof L> = {
  cleanliness: 'reviewCleanliness',
  accuracy: 'reviewAccuracy',
  communication: 'reviewCommunication',
  location: 'reviewLocation',
  value: 'reviewValue',
  checkin: 'reviewCheckin',
};

type Sheet = 'dates' | 'guests' | 'inquiry' | null;

export default function PropertyDetailScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const searchState = fromParams(params as Record<string, string | undefined>);
  const { user } = useSession();

  const [detail, setDetail] = useState<PropertyDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const [checkIn, setCheckIn] = useState<Date | null>(parseDate(searchState.checkIn));
  const [checkOut, setCheckOut] = useState<Date | null>(parseDate(searchState.checkOut));
  const [adults, setAdults] = useState<number>(searchState.adults ?? 1);
  const [children, setChildren] = useState<number>(searchState.children ?? 0);
  const [roomTypeId, setRoomTypeId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [inquiryBody, setInquiryBody] = useState('');
  const [inquirySending, setInquirySending] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const d = await getPropertyDetail(id);
      setDetail(d);
      if (d) {
        const def = d.full_room_types.find((r) => r.is_default) ?? d.full_room_types[0];
        setRoomTypeId((cur) => cur ?? def?.id ?? null);
      }
    } catch {
      setError(pick(L.loadError, locale));
      setDetail(null);
    }
  }, [id, locale]);

  useFocusEffect(
    useCallback(() => {
      if (detail === undefined) void load();
    }, [detail, load]),
  );

  const selectedRoom: RoomTypeRow | null = useMemo(() => {
    if (!detail) return null;
    return detail.full_room_types.find((r) => r.id === roomTypeId) ?? detail.full_room_types[0] ?? null;
  }, [detail, roomTypeId]);

  const guests = adults + children;
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  const quote: PriceQuote | null = useMemo(() => {
    if (!selectedRoom || !checkIn || !checkOut || nights <= 0) return null;
    return priceQuote({
      nightlyRateDzd: selectedRoom.base_price_dzd,
      checkIn,
      checkOut,
      cleaningFeeDzd: selectedRoom.cleaning_fee_dzd,
      extraGuestFeeDzd: selectedRoom.extra_guest_fee_dzd,
      baseOccupancy: selectedRoom.base_occupancy ?? selectedRoom.max_occupancy,
      guests,
      units: 1,
    });
  }, [selectedRoom, checkIn, checkOut, nights, guests]);

  // ── Loading / error / not-found ──────────────────────────────────────────
  if (detail === undefined) {
    return (
      <View style={styles.root}>
        <DetailSkeleton />
      </View>
    );
  }
  if (error && detail === null) {
    return (
      <Screen edges={['top']}>
        <Header title="" />
        <View style={styles.centerFill}>
          <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.tryAgain, locale)} />
        </View>
      </Screen>
    );
  }
  if (detail === null) {
    return (
      <Screen edges={['top']}>
        <Header title="" />
        <View style={styles.centerFill}>
          <EmptyState
            title={pick(L.notFoundTitle, locale)}
            subtitle={pick(L.notFoundBody, locale)}
            action={{ label: pick(L.backToExplore, locale), onPress: () => router.back() }}
          />
        </View>
      </Screen>
    );
  }

  const title = propertyTitle(detail, locale);
  const place = [
    detail.wilaya ? localizedName(detail.wilaya, locale) : '',
    detail.commune ? localizedName(detail.commune, locale) : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const desc = localizedNameWithSource(
    { name_ar: detail.description_ar, name_fr: detail.description_fr, name_en: detail.description_en },
    locale,
  );
  const rules = localizedNameWithSource(
    { name_ar: detail.house_rules_ar, name_fr: detail.house_rules_fr, name_en: detail.house_rules_en },
    locale,
  );
  const isMultiRoom = detail.listing_kind === 'multi_room' && detail.full_room_types.length > 1;
  const nightlyForWidget = selectedRoom?.base_price_dzd ?? detail.from_price_dzd ?? 0;
  const occupancyExceeded = selectedRoom != null && guests > selectedRoom.max_occupancy;

  const photoUris = detail.photos
    .map((p) => resolvePhotoUrl(p.storage_path))
    .filter((u): u is string => u != null);

  function onReserve() {
    if (!checkIn || !checkOut || nights <= 0 || !selectedRoom) {
      setSheet('dates');
      return;
    }
    router.push({
      pathname: '/booking/confirm',
      params: {
        propertyId: detail!.id,
        roomTypeId: selectedRoom.id,
        checkIn: toDateParam(checkIn),
        checkOut: toDateParam(checkOut),
        adults: String(adults),
        children: String(children),
      },
    });
  }

  const ctaLabel = detail.instant_book ? pick(L.confirmAndBook, locale) : pick(L.reserve, locale);

  function onMessageHost() {
    // Signed-out → sign-in, resuming back to this property afterwards.
    if (!user) {
      router.push({
        pathname: '/(auth)/sign-in',
        params: { next: buildNextPath(`/property/${id}`, {}) },
      });
      return;
    }
    setInquiryError(null);
    setSheet('inquiry');
  }

  async function onSendInquiry() {
    const body = inquiryBody.trim();
    if (!body || !id || inquirySending) return;
    setInquirySending(true);
    setInquiryError(null);
    try {
      const conversationId = await startInquiry(id, body);
      haptics.success();
      setSheet(null);
      setInquiryBody('');
      router.push(`/conversation/${conversationId}`);
    } catch (e) {
      haptics.error();
      const code = e instanceof InquiryError ? e.code : 'UNKNOWN';
      const msg =
        code === 'OWN_PROPERTY'
          ? pick(L.inquiryOwnProperty, locale)
          : code === 'PROPERTY_NOT_AVAILABLE' || code === 'PROPERTY_NOT_FOUND'
            ? pick(L.inquiryNotAvailable, locale)
            : pick(L.inquiryFailed, locale);
      setInquiryError(msg);
    } finally {
      setInquirySending(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Gallery */}
        <Gallery uris={photoUris} altPrefix={title} propertyId={detail.id} locale={locale} />

        <View style={styles.body}>
          {/* Title block */}
          <View style={styles.titleBlock}>
            <Heading level={1}>{title}</Heading>
            {place ? (
              <Text variant="body-lg" color="textMuted">
                {place}
              </Text>
            ) : null}
            <View style={styles.ratingWrap}>
              <Star size={16} color={theme.color.ratingStar} fill={theme.color.ratingStar} strokeWidth={0} />
              <Text variant="body-sm" weight="semibold">
                {detail.review_count === 0
                  ? pick(L.noReviews, locale)
                  : `${formatNumber(detail.rating_avg, locale)} · ${formatNumber(detail.review_count, locale)} ${
                      detail.review_count === 1 ? pick(L.reviewsCount, locale) : pick(L.reviewsCountPlural, locale)
                    }`}
              </Text>
              {detail.instant_book ? <InstantBookBadge locale={locale} /> : null}
            </View>
          </View>

          {/* Description */}
          {desc.text ? (
            <Section title={pick(L.about, locale)}>
              <FallbackNote show={desc.fellBack} locale={locale} />
              <Text variant="body" style={styles.paragraph}>
                {desc.text}
              </Text>
            </Section>
          ) : null}

          {/* Room types (multi-room) */}
          {isMultiRoom ? (
            <Section title={pick(L.chooseRoom, locale)}>
              <View style={styles.roomList}>
                {detail.full_room_types.map((room) => (
                  <RoomOption
                    key={room.id}
                    room={room}
                    locale={locale}
                    selected={room.id === selectedRoom?.id}
                    onSelect={() => setRoomTypeId(room.id)}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          {/* Amenities grid — outline lucide check marks, never the DB emoji */}
          {detail.amenities.length > 0 ? (
            <Section title={pick(L.whatThisPlaceOffers, locale)}>
              <View style={styles.amenityGrid}>
                {detail.amenities.slice(0, 10).map((a) => (
                  <View key={a.id} style={styles.amenityItem}>
                    <Check size={18} color={theme.color.primary} strokeWidth={2} />
                    <Text variant="body" numberOfLines={2} style={styles.flex}>
                      {localizedName(a, locale)}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {/* Check-in / out — borderless rows with outline clock icons */}
          <Section title={pick(L.checkInOut, locale)}>
            <View style={styles.timesRow}>
              <View style={styles.timeBox}>
                <Clock size={18} color={theme.color.primary} strokeWidth={2} />
                <View style={styles.flex}>
                  <Text variant="caption" color="textMuted">
                    {pick(L.checkIn, locale)}
                  </Text>
                  <Text variant="title" weight="semibold">
                    {formatTime(detail.checkin_time)}
                  </Text>
                </View>
              </View>
              <View style={styles.timeBox}>
                <Clock size={18} color={theme.color.primary} strokeWidth={2} />
                <View style={styles.flex}>
                  <Text variant="caption" color="textMuted">
                    {pick(L.checkOut, locale)}
                  </Text>
                  <Text variant="title" weight="semibold">
                    {formatTime(detail.checkout_time)}
                  </Text>
                </View>
              </View>
            </View>
          </Section>

          {/* House rules */}
          {rules.text ? (
            <Section title={pick(L.houseRules, locale)}>
              <FallbackNote show={rules.fellBack} locale={locale} />
              <Text variant="body" style={styles.paragraph}>
                {rules.text}
              </Text>
            </Section>
          ) : null}

          {/* Cancellation policy */}
          <Section title={pick(L.cancellationPolicy, locale)}>
            <Text variant="body" style={styles.paragraph}>
              {pick(CANCEL_COPY[detail.cancellation_tier], locale)}
            </Text>
          </Section>

          {/* Message host (pre-booking inquiry) */}
          <View style={styles.messageHostWrap}>
            <Button label={pick(L.messageHost, locale)} variant="secondary" onPress={onMessageHost} />
          </View>

          {/* Reviews (from joined detail.reviews — no second fetch) */}
          <Reviews detail={detail} locale={locale} />
        </View>
      </ScrollView>

      {/* Sticky booking widget */}
      <BookingWidget
        nightly={nightlyForWidget}
        quote={quote}
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
        locale={locale}
        ctaLabel={ctaLabel}
        onDates={() => setSheet('dates')}
        onGuests={() => setSheet('guests')}
        onReserve={onReserve}
      />

      {/* Dates sheet */}
      <BottomSheet visible={sheet === 'dates'} onClose={() => setSheet(null)} snapPoints={['85%']}>
        <Heading level={3} style={styles.sheetTitle}>
          {pick(L.dates, locale)}
        </Heading>
        <View style={styles.calendarWrap}>
          <DateRangePicker
            locale={locale}
            checkIn={checkIn}
            checkOut={checkOut}
            minDate={new Date()}
            onChange={({ checkIn: ci, checkOut: co }) => {
              setCheckIn(ci);
              setCheckOut(co);
            }}
          />
        </View>
        <Button label={pick(L.done, locale)} onPress={() => setSheet(null)} />
      </BottomSheet>

      {/* Guests sheet — occupancy guard on adults+children combined */}
      <BottomSheet visible={sheet === 'guests'} onClose={() => setSheet(null)} snapPoints={['55%']}>
        <Heading level={3} style={styles.sheetTitle}>
          {pick(L.guests, locale)}
        </Heading>
        <View style={styles.guestRows}>
          <GuestStepperRow
            label={pick(L.adults, locale)}
            value={adults}
            min={1}
            max={maxAdultsFor(selectedRoom, children)}
            onChange={setAdults}
          />
          <View style={styles.divider} />
          <GuestStepperRow
            label={pick(L.children, locale)}
            value={children}
            min={0}
            max={maxChildrenFor(selectedRoom, adults)}
            onChange={setChildren}
          />
          {selectedRoom ? (
            <Text variant="caption" color="textMuted">
              {pick(L.occupancyMax, locale)}: {formatNumber(selectedRoom.max_occupancy, locale)}
            </Text>
          ) : null}
        </View>
        <Button label={pick(L.done, locale)} onPress={() => setSheet(null)} disabled={occupancyExceeded} />
      </BottomSheet>

      {/* Message host — pre-booking inquiry compose */}
      <BottomSheet visible={sheet === 'inquiry'} onClose={() => setSheet(null)} dismissible={!inquirySending}>
        <View style={styles.inquirySheet}>
          <Heading level={3}>{pick(L.messageHostSheetTitle, locale)}</Heading>
          <Text variant="body" color="textMuted">
            {pick(L.messageHostSheetBody, locale)}
          </Text>
          <TextField
            label={pick(L.messageHostSheetTitle, locale)}
            value={inquiryBody}
            onChangeText={setInquiryBody}
            placeholder={pick(L.inquiryPlaceholder, locale)}
            multiline
            error={inquiryError ?? undefined}
            autoCapitalize="sentences"
          />
          <Button
            label={pick(L.inquirySend, locale)}
            variant="tertiary"
            onPress={() => void onSendInquiry()}
            loading={inquirySending}
            disabled={inquiryBody.trim().length === 0}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

/**
 * Occupancy guard: cap adults so adults+children never exceeds max_occupancy
 * (the old screen capped each independently and could exceed the total).
 */
function maxAdultsFor(room: RoomTypeRow | null, children: number): number {
  if (!room) return 16;
  const byTotal = Math.max(1, room.max_occupancy - children);
  return Math.min(room.max_adults ?? room.max_occupancy, byTotal);
}
function maxChildrenFor(room: RoomTypeRow | null, adults: number): number {
  if (!room) return 10;
  const byTotal = Math.max(0, room.max_occupancy - adults);
  return Math.min(room.max_children ?? Math.max(0, room.max_occupancy - 1), byTotal);
}

// ── Gallery (edge-to-edge photo + transparent header over scrim) ─────────────
function Gallery({
  uris,
  altPrefix,
  propertyId,
  locale,
}: {
  uris: string[];
  altPrefix: string;
  propertyId: string;
  locale: Locale;
}) {
  const { width } = useWindowDimensions();
  const height = width * 0.82;
  return (
    <View style={[styles.gallery, { height }]}>
      <PhotoGalleryOrPlaceholder uris={uris} height={height} altPrefix={altPrefix} />
      {/* Scrim behind the transparent header for back-button contrast. */}
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.headerOverlay} pointerEvents="box-none">
        <Header
          transparent
          topInset
          title=""
          onBack={() => router.back()}
          rightSlot={
            <WishlistHeart
              propertyId={propertyId}
              locale={locale}
              variant="plain"
              onDark
              style={styles.headerHeart}
            />
          }
        />
      </View>
    </View>
  );
}

function PhotoGalleryOrPlaceholder({
  uris,
  height,
  altPrefix,
}: {
  uris: string[];
  height: number;
  altPrefix: string;
}) {
  const { width } = useWindowDimensions();
  if (uris.length === 0) {
    return <View style={[styles.galleryPlaceholder, { width, height }]} />;
  }
  return <PhotoGallery uris={uris} height={height} altPrefix={altPrefix} />;
}

// ── Booking widget (sticky footer — shadow.xs) ───────────────────────────────
function BookingWidget({
  nightly,
  quote,
  checkIn,
  checkOut,
  guests,
  locale,
  ctaLabel,
  onDates,
  onGuests,
  onReserve,
}: {
  nightly: number;
  quote: PriceQuote | null;
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  locale: Locale;
  ctaLabel: string;
  onDates: () => void;
  onGuests: () => void;
  onReserve: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.widget, { paddingBottom: Math.max(theme.space.xl, insets.bottom + theme.space.md) }]}>
      <View style={styles.widgetInfo}>
        <View style={styles.widgetPriceRow}>
          <PriceText amount={nightly} variant="large" locale={locale} />
          <Text variant="body-sm" color="textMuted">
            {' '}
            {pick(L.perNight, locale)}
          </Text>
        </View>
        {/* Separate dates vs guests tap targets (no nested overlapping Pressables). */}
        <View style={styles.widgetTapRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={pick(L.dates, locale)}
            onPress={onDates}
            hitSlop={6}
            style={styles.widgetTap}
          >
            <CalendarIcon size={13} color={theme.color.accent} strokeWidth={2} />
            <Text variant="caption" color="accent" weight="medium" numberOfLines={1}>
              {checkIn && checkOut ? formatRange(checkIn, checkOut, locale) : pick(L.addDates, locale)}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={pick(L.guests, locale)}
            onPress={onGuests}
            hitSlop={6}
            style={styles.widgetTap}
          >
            <Users size={13} color={theme.color.accent} strokeWidth={2} />
            <Text variant="caption" color="accent" weight="medium">
              {formatNumber(guests, locale)}
            </Text>
          </Pressable>
        </View>
        {quote ? (
          <Text variant="caption" color="textMuted">
            {pick(L.total, locale)}: <PriceText amount={quote.totalDzd} variant="inline" locale={locale} />
          </Text>
        ) : null}
      </View>
      <View style={styles.widgetCta}>
        <Button label={ctaLabel} variant="tertiary" onPress={onReserve} haptic="tap" />
      </View>
    </View>
  );
}

// ── Reviews (from the joined detail.reviews) ────────────────────────────────
function Reviews({ detail, locale }: { detail: PropertyDetail; locale: Locale }) {
  const reviews: ReviewWithMeta[] = detail.reviews;

  if (detail.review_count === 0 && reviews.length === 0) {
    return (
      <Section title={pick(L.reviews, locale)}>
        <Text variant="body" color="textMuted">
          {pick(L.noReviews, locale)}
        </Text>
      </Section>
    );
  }

  const headlineScore = detail.rating_avg > 0 ? detail.rating_avg : overallAverage(reviews);
  const headlineCount = detail.review_count > 0 ? detail.review_count : reviews.length;

  return (
    <Section title={`${pick(L.reviews, locale)} · ${formatNumber(headlineCount, locale)}`}>
      <View style={styles.reviewHeadline}>
        <Star size={20} color={theme.color.ratingStar} fill={theme.color.ratingStar} strokeWidth={0} />
        <Text variant="title" weight="bold">
          {formatNumber(headlineScore, locale)}
        </Text>
      </View>

      {/* Category averages */}
      <View style={styles.catGrid}>
        {REVIEW_CATEGORIES.map((cat) => {
          const a = categoryAverage(reviews, cat);
          if (a == null) return null;
          return (
            <View key={cat} style={styles.catRow}>
              <Text variant="body-sm" color="textMuted">
                {pick(L[REVIEW_CAT_LABEL[cat]], locale)}
              </Text>
              <Text variant="body-sm" weight="semibold">
                {formatNumber(a, locale)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* First few reviews */}
      {reviews.slice(0, 4).map((r) => (
        <ReviewItem key={r.id} review={r} locale={locale} />
      ))}

      {reviews.length > 4 || headlineCount > 4 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/property/reviews/${detail.id}`)}
          hitSlop={8}
          style={({ pressed }) => [styles.showAll, pressed && styles.pressed]}
        >
          <Text variant="body" weight="semibold" color="accent">
            {pick(L.showAllReviews, locale)}
          </Text>
          <ChevronRight
            size={18}
            color={theme.color.accent}
            strokeWidth={2.5}
            style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
          />
        </Pressable>
      ) : null}
    </Section>
  );
}

// ── Room option (selectable — keeps radio selection state) ──────────────────
function RoomOption({
  room,
  locale,
  selected,
  onSelect,
}: {
  room: RoomTypeRow;
  locale: Locale;
  selected: boolean;
  onSelect: () => void;
}) {
  const name =
    localizedName({ name_ar: room.name_ar, name_fr: room.name_fr, name_en: room.name_en }, locale) ||
    pick(L.chooseRoom, locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={[styles.roomCard, selected && styles.roomCardSelected]}
    >
      <View style={styles.flex}>
        <Text variant="title" weight="semibold" color={selected ? 'primary' : 'text'}>
          {name}
        </Text>
        <Text variant="body-sm" color="textMuted">
          {formatNumber(room.max_occupancy, locale)} {pick(L.guestsCountPlural, locale)}
        </Text>
        <PriceText amount={room.base_price_dzd} variant="inline" locale={locale} />
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

// ── Bits ────────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="title" weight="bold" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function FallbackNote({ show, locale }: { show: boolean; locale: Locale }) {
  if (!show) return null;
  return (
    <View style={styles.fallbackNote}>
      <Languages size={14} color={theme.color.textMuted} strokeWidth={2} />
      <Text variant="caption" color="textMuted" style={styles.flex}>
        {pick(L.langFallbackNote, locale)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  centerFill: { flex: 1, justifyContent: 'center' },
  scrollContent: { paddingBottom: 150 },

  // Gallery
  gallery: { width: '100%', backgroundColor: theme.color.surfaceSunken },
  galleryPlaceholder: { backgroundColor: theme.color.surfaceSunken },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: theme.color.overlay,
    opacity: 0.5,
  },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  // Scrim chip behind the header heart for contrast over light photos.
  headerHeart: { backgroundColor: theme.color.overlay },

  body: { paddingHorizontal: theme.space.xl, paddingTop: theme.space.xl },
  titleBlock: { gap: theme.space.xs },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    marginTop: theme.space.xs,
    flexWrap: 'wrap',
  },

  section: { marginTop: theme.space['2xl'], gap: theme.space.md },
  sectionTitle: { marginBottom: theme.space.xs },
  paragraph: { lineHeight: theme.lineHeight.body },
  fallbackNote: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },

  // Rooms
  roomList: { gap: theme.space.sm },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    padding: theme.space.lg,
  },
  roomCardSelected: { borderColor: theme.color.primary, backgroundColor: theme.color.infoBg },
  radio: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: theme.color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: theme.color.primary },
  radioDot: { width: 10, height: 10, borderRadius: theme.radius.pill, backgroundColor: theme.color.primary },

  // Amenities
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  amenityItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingVertical: theme.space.sm,
    paddingEnd: theme.space.sm,
  },

  // Times
  timesRow: { flexDirection: 'row', gap: theme.space.xl },
  timeBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },

  // Reviews
  reviewHeadline: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  catRow: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.space.xs,
    paddingEnd: theme.space.lg,
  },
  showAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingVertical: theme.space.md,
    marginTop: theme.space.sm,
  },

  // Sticky widget
  widget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.xl,
    backgroundColor: theme.color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
    ...theme.shadow.xs,
  },
  widgetInfo: { flex: 1, gap: 2 },
  widgetPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  widgetTapRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  widgetTap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  widgetCta: { minWidth: 140 },

  // Message host
  messageHostWrap: { marginTop: theme.space['2xl'] },

  // Sheets
  sheetTitle: { marginBottom: theme.space.sm },
  calendarWrap: { height: 420, marginVertical: theme.space.sm },
  guestRows: { marginVertical: theme.space.md, gap: theme.space.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.color.border },
  inquirySheet: { gap: theme.space.md, paddingTop: theme.space.sm },
});
