/**
 * Property detail (Phase 4 rework).
 *
 * Built on src/ui: a <PhotoGallery> (paged expo-image — no per-frame setState
 * jank), a transparent <Header> over a gallery scrim, amenities grid, rules,
 * cancellation policy, room-type select, and reviews read from the JOINED
 * `detail.reviews` (getPropertyDetail already joins author + reply — no second
 * fetch). A sticky bottom booking widget (PriceText + Reserve CTA) with separate
 * dates vs guests tap targets and an OCCUPANCY GUARD in the guests sheet
 * (max_occupancy enforced on adults+children together, not independently).
 *
 * Language fallback (ar→fr→en) is indicated when content is shown in another
 * language than the active UI locale.
 *
 * TODO(Phase 5): wishlist heart on the header + a pre-booking "inquiry" message
 *   to the host without a booking. The inquiry path needs a backend RPC
 *   (get_or_create_conversation requires a booking today), so "Message host" is
 *   intentionally omitted here until that lands.
 */

import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
import { Calendar as CalendarIcon, Users, Zap, ChevronRight, Languages } from 'lucide-react-native';
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
import { GuestStepperRow } from '@/components/discovery';
import { DateRangePicker } from '@/components/Calendar';
import { ReviewItem } from '@/components/ReviewItem';
import {
  Screen,
  Header,
  Text,
  Heading,
  Button,
  Card,
  Chip,
  RatingStars,
  PriceText,
  BottomSheet,
  PhotoGallery,
  DetailSkeleton,
  ErrorState,
  EmptyState,
} from '@/ui';
import { L, pick, type LMessage } from '@/lib/copy';
import { fromParams, parseDate } from '@/lib/searchParams';
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

type Sheet = 'dates' | 'guests' | null;

export default function PropertyDetailScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const searchState = fromParams(params as Record<string, string | undefined>);

  const [detail, setDetail] = useState<PropertyDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const [checkIn, setCheckIn] = useState<Date | null>(parseDate(searchState.checkIn));
  const [checkOut, setCheckOut] = useState<Date | null>(parseDate(searchState.checkOut));
  const [adults, setAdults] = useState<number>(searchState.adults ?? 1);
  const [children, setChildren] = useState<number>(searchState.children ?? 0);
  const [roomTypeId, setRoomTypeId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);

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
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.search, locale)} />
      </Screen>
    );
  }
  if (detail === null) {
    return (
      <Screen edges={['top']}>
        <Header title="" />
        <EmptyState
          title={pick(L.notFoundTitle, locale)}
          subtitle={pick(L.notFoundBody, locale)}
          action={{ label: pick(L.backToExplore, locale), onPress: () => router.back() }}
        />
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

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Gallery */}
        <Gallery uris={photoUris} altPrefix={title} />

        <View style={styles.body}>
          <Heading level={1}>{title}</Heading>
          {place ? (
            <Text variant="body" color="textMuted">
              {place}
            </Text>
          ) : null}
          <View style={styles.ratingWrap}>
            <RatingStars value={detail.rating_avg} size={18} />
            <Text variant="body-sm" weight="semibold">
              {detail.review_count === 0
                ? pick(L.noReviews, locale)
                : `${formatNumber(detail.rating_avg, locale)} · ${formatNumber(detail.review_count, locale)} ${
                    detail.review_count === 1 ? pick(L.reviewsCount, locale) : pick(L.reviewsCountPlural, locale)
                  }`}
            </Text>
            {detail.instant_book ? (
              <View style={styles.instantPill}>
                <Zap size={12} color={theme.color.accentHover} />
                <Text variant="caption" weight="semibold" color="accentHover">
                  {pick(L.instantBook, locale)}
                </Text>
              </View>
            ) : null}
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

          {/* Amenities grid */}
          {detail.amenities.length > 0 ? (
            <Section title={pick(L.whatThisPlaceOffers, locale)}>
              <View style={styles.amenityGrid}>
                {detail.amenities.slice(0, 10).map((a) => (
                  <View key={a.id} style={styles.amenityItem}>
                    <Text variant="body" style={styles.amenityIcon}>
                      {a.icon ?? '•'}
                    </Text>
                    <Text variant="body-sm" numberOfLines={2} style={styles.flex}>
                      {localizedName(a, locale)}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {/* Check-in / out */}
          <Section title={pick(L.checkInOut, locale)}>
            <View style={styles.timesRow}>
              <Card style={styles.timeBox}>
                <Text variant="caption" color="textMuted">
                  {pick(L.checkIn, locale)}
                </Text>
                <Text variant="title" weight="semibold">
                  {formatTime(detail.checkin_time)}
                </Text>
              </Card>
              <Card style={styles.timeBox}>
                <Text variant="caption" color="textMuted">
                  {pick(L.checkOut, locale)}
                </Text>
                <Text variant="title" weight="semibold">
                  {formatTime(detail.checkout_time)}
                </Text>
              </Card>
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
      <BottomSheet visible={sheet === 'guests'} onClose={() => setSheet(null)}>
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

// ── Gallery (transparent header + scrim) ─────────────────────────────────────
function Gallery({ uris, altPrefix }: { uris: string[]; altPrefix: string }) {
  const { width } = useWindowDimensions();
  const height = width * 0.72;
  return (
    <View style={[styles.gallery, { height }]}>
      <PhotoGalleryOrPlaceholder uris={uris} height={height} altPrefix={altPrefix} />
      {/* Scrim behind the transparent header for back-button contrast. */}
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.headerOverlay} pointerEvents="box-none">
        <Header transparent title="" onBack={() => router.back()} />
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

// ── Booking widget ───────────────────────────────────────────────────────────
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
  return (
    <View style={styles.widget}>
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
            <CalendarIcon size={13} color={theme.color.accent} />
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
            <Users size={13} color={theme.color.accent} />
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
    <Section
      title={`${pick(L.reviews, locale)} · ${formatNumber(headlineCount, locale)}`}
    >
      <View style={styles.reviewHeadline}>
        <RatingStars value={headlineScore} size={18} />
        <Text variant="title" weight="semibold">
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
          style={({ pressed }) => [styles.showAll, pressed && styles.pressed]}
        >
          <Text variant="body" weight="semibold" color="primary">
            {pick(L.showAllReviews, locale)}
          </Text>
          <ChevronRight size={18} color={theme.color.primary} />
        </Pressable>
      ) : null}
    </Section>
  );
}

// ── Room option ───────────────────────────────────────────────────────────
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
          {formatNumber(room.max_occupancy, locale)} {pick(L.guestsCountPlural, locale)} ·{' '}
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
      <Heading level={2}>{title}</Heading>
      {children}
    </View>
  );
}

function FallbackNote({ show, locale }: { show: boolean; locale: Locale }) {
  if (!show) return null;
  return (
    <View style={styles.fallbackNote}>
      <Languages size={14} color={theme.color.textMuted} />
      <Text variant="caption" color="textMuted" style={styles.flex}>
        {pick(L.langFallbackNote, locale)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.9 },
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

  body: { padding: theme.space.xl, gap: theme.space.sm },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    marginTop: theme.space.xs,
    flexWrap: 'wrap',
  },
  instantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.color.terracotta100,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 3,
  },

  section: { marginTop: theme.space.xl, gap: theme.space.md },
  paragraph: { lineHeight: theme.lineHeight.body },
  fallbackNote: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },

  // Rooms
  roomList: { gap: theme.space.sm },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
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
  },
  amenityIcon: { width: 24, textAlign: 'center' },

  // Times
  timesRow: { flexDirection: 'row', gap: theme.space.md },
  timeBox: { flex: 1, gap: theme.space.xs },

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
    justifyContent: 'center',
    gap: theme.space.xs,
    paddingVertical: theme.space.md,
    marginTop: theme.space.sm,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
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
    ...theme.shadow.raised,
  },
  widgetInfo: { flex: 1, gap: 2 },
  widgetPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  widgetTapRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  widgetTap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  widgetCta: { minWidth: 140 },

  // Sheets
  sheetTitle: { marginBottom: theme.space.sm },
  calendarWrap: { height: 420, marginVertical: theme.space.sm },
  guestRows: { marginVertical: theme.space.md, gap: theme.space.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.color.border },
});
