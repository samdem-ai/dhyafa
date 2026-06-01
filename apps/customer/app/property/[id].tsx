/**
 * Property detail (M2).
 *
 * Swipeable photo gallery (blur-up + fallback via RemoteImage), title/location,
 * rating summary + category breakdown, amenities grid, house rules, check-in/out,
 * cancellation policy, room-type selection (multi-room), and a STICKY bottom
 * booking widget (dates + guests + price/night + total + CTA) that stays while
 * scrolling. Designed skeleton + not-found + error states.
 *
 * Dates/guests can arrive via search params; the widget lets the user adjust
 * them in an in-screen calendar/guest overlay before continuing to booking.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  I18nManager,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import {
  getPropertyDetail,
  resolvePhotoUrl,
  propertyTitle,
  localizedName,
  type PropertyDetail,
  type RoomTypeRow,
} from '@/lib/discovery';
import {
  priceQuote,
  nightsBetween,
  toDateParam,
  type PriceQuote,
} from '@/lib/bookings';
import { RemoteImage } from '@/components/RemoteImage';
import { RatingRow, GuestStepperRow, PriceBreakdown } from '@/components/discovery';
import { DateRangePicker } from '@/components/Calendar';
import { Skeleton, ErrorState, PrimaryButton } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { fromParams, parseDate } from '@/lib/searchParams';
import { formatRange, formatTime } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

// Cancellation tier → plain-language summary key.
const CANCEL_COPY = {
  flexible: L.cancelFlexible,
  moderate: L.cancelModerate,
  strict: L.cancelStrict,
} as const;

type Overlay = 'dates' | 'guests' | null;

export default function PropertyDetailScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const searchState = fromParams(params as Record<string, string | undefined>);

  const [detail, setDetail] = useState<PropertyDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Booking selection state (seeded from search params when present).
  const [checkIn, setCheckIn] = useState<Date | null>(parseDate(searchState.checkIn));
  const [checkOut, setCheckOut] = useState<Date | null>(parseDate(searchState.checkOut));
  const [adults, setAdults] = useState<number>(searchState.adults ?? 1);
  const [children, setChildren] = useState<number>(searchState.children ?? 0);
  const [roomTypeId, setRoomTypeId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const d = await getPropertyDetail(id);
      setDetail(d);
      // Default room selection: the default room or the first active one.
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
    return <DetailSkeleton />;
  }
  if (error && detail === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <DetailTopBar />
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.search, locale)} />
      </SafeAreaView>
    );
  }
  if (detail === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <DetailTopBar />
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>🔍</Text>
          <Text style={styles.notFoundTitle}>{pick(L.notFoundTitle, locale)}</Text>
          <Text style={styles.notFoundBody}>{pick(L.notFoundBody, locale)}</Text>
          <View style={styles.notFoundCta}>
            <PrimaryButton label={pick(L.backToExplore, locale)} variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const title = propertyTitle(detail, locale);
  const place = [
    detail.wilaya ? localizedName(detail.wilaya, locale) : '',
    detail.commune ? localizedName(detail.commune, locale) : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const description = localizedName(
    { name_ar: detail.description_ar, name_fr: detail.description_fr, name_en: detail.description_en },
    locale,
  );
  const houseRules = localizedName(
    { name_ar: detail.house_rules_ar, name_fr: detail.house_rules_fr, name_en: detail.house_rules_en },
    locale,
  );
  const isMultiRoom = detail.listing_kind === 'multi_room' && detail.full_room_types.length > 1;

  const nightlyForWidget = selectedRoom?.base_price_dzd ?? detail.from_price_dzd ?? 0;

  function onContinue() {
    if (!checkIn || !checkOut || nights <= 0 || !selectedRoom) {
      setOverlay('dates');
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

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Gallery */}
        <Gallery detail={detail} title={title} locale={locale} />

        <View style={styles.body}>
          {/* Title + rating */}
          <Text style={styles.title}>{title}</Text>
          {place ? <Text style={styles.place}>{place}</Text> : null}
          <View style={styles.ratingWrap}>
            <RatingRow rating={detail.rating_avg} count={detail.review_count} locale={locale} size="md" />
            {detail.instant_book ? (
              <View style={styles.instantPill}>
                <Text style={styles.instantPillText}>⚡ {pick(L.instantBook, locale)}</Text>
              </View>
            ) : null}
          </View>

          {/* Description */}
          {description ? (
            <Section title={pick(L.about, locale)}>
              <Text style={styles.paragraph}>{description}</Text>
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
                {detail.amenities.slice(0, 8).map((a) => (
                  <View key={a.id} style={styles.amenityItem}>
                    <Text style={styles.amenityIcon}>{a.icon ?? '•'}</Text>
                    <Text style={styles.amenityLabel} numberOfLines={2}>
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
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>{pick(L.checkIn, locale)}</Text>
                <Text style={styles.timeValue}>{formatTime(detail.checkin_time)}</Text>
              </View>
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>{pick(L.checkOut, locale)}</Text>
                <Text style={styles.timeValue}>{formatTime(detail.checkout_time)}</Text>
              </View>
            </View>
          </Section>

          {/* House rules */}
          {houseRules ? (
            <Section title={pick(L.houseRules, locale)}>
              <Text style={styles.paragraph}>{houseRules}</Text>
            </Section>
          ) : null}

          {/* Cancellation policy */}
          <Section title={pick(L.cancellationPolicy, locale)}>
            <Text style={styles.paragraph}>{pick(CANCEL_COPY[detail.cancellation_tier], locale)}</Text>
          </Section>

          {/* Reviews */}
          <Section
            title={`${pick(L.reviews, locale)}${
              detail.review_count > 0 ? ` · ${formatNumber(detail.review_count, locale)}` : ''
            }`}
          >
            <ReviewsSummary detail={detail} locale={locale} />
          </Section>
        </View>
      </ScrollView>

      {/* Sticky booking widget */}
      <View style={styles.widget}>
        <View style={styles.widgetInfo}>
          <Text style={styles.widgetPrice}>
            {formatDZD(nightlyForWidget, locale)}
            <Text style={styles.widgetPerNight}> {pick(L.perNight, locale)}</Text>
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setOverlay('dates')}>
            <Text style={styles.widgetDates} numberOfLines={1}>
              {checkIn && checkOut ? formatRange(checkIn, checkOut, locale) : pick(L.addDates, locale)}
              {' · '}
              <Text onPress={() => setOverlay('guests')}>
                {formatNumber(guests, locale)} {guests === 1 ? pick(L.guestsCount, locale) : pick(L.guestsCountPlural, locale)}
              </Text>
            </Text>
          </Pressable>
          {quote ? (
            <Text style={styles.widgetTotal}>
              {pick(L.total, locale)}: {formatDZD(quote.totalDzd, locale)}
            </Text>
          ) : null}
        </View>
        <View style={styles.widgetCta}>
          <PrimaryButton
            label={detail.instant_book ? pick(L.confirmAndBook, locale) : pick(L.reviewBooking, locale)}
            onPress={onContinue}
          />
        </View>
      </View>

      {/* Overlays */}
      {overlay === 'dates' ? (
        <OverlaySheet title={pick(L.dates, locale)} onClose={() => setOverlay(null)} locale={locale}>
          <View style={styles.overlayCalendar}>
            <DateRangePicker
              locale={locale}
              checkIn={checkIn}
              checkOut={checkOut}
              onChange={({ checkIn: ci, checkOut: co }) => {
                setCheckIn(ci);
                setCheckOut(co);
              }}
            />
          </View>
        </OverlaySheet>
      ) : null}
      {overlay === 'guests' ? (
        <OverlaySheet title={pick(L.guests, locale)} onClose={() => setOverlay(null)} locale={locale}>
          <View style={styles.overlayGuests}>
            <GuestStepperRow label={pick(L.adults, locale)} value={adults} min={1} max={selectedRoom?.max_adults ?? 16} onChange={setAdults} />
            <View style={styles.overlayDivider} />
            <GuestStepperRow label={pick(L.children, locale)} value={children} min={0} max={selectedRoom?.max_children ?? 10} onChange={setChildren} />
          </View>
        </OverlaySheet>
      ) : null}
    </View>
  );
}

// ── Gallery ─────────────────────────────────────────────────────────────────
function Gallery({ detail, title, locale }: { detail: PropertyDetail; title: string; locale: Locale }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const photos = detail.photos.length > 0 ? detail.photos : [];

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  }

  return (
    <View style={[styles.gallery, { height: width * 0.72 }]}>
      {photos.length === 0 ? (
        <RemoteImage uri={null} alt={title} style={{ width, height: width * 0.72 }} />
      ) : (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {photos.map((p) => {
            const alt =
              localizedName({ name_ar: p.alt_ar, name_fr: p.alt_fr, name_en: p.alt_en }, locale) || title;
            return (
              <RemoteImage
                key={p.id}
                uri={resolvePhotoUrl(p.storage_path)}
                alt={alt}
                style={{ width, height: width * 0.72 }}
              />
            );
          })}
        </ScrollView>
      )}

      {/* Top bar over the gallery */}
      <SafeAreaView style={styles.galleryTopBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pick(L.backToExplore, locale)}
          onPress={() => router.back()}
          style={styles.galleryBackBtn}
          hitSlop={8}
        >
          <Text style={styles.galleryBackGlyph}>{I18nManager.isRTL ? '→' : '←'}</Text>
        </Pressable>
      </SafeAreaView>

      {/* Dots + counter */}
      {photos.length > 1 ? (
        <View style={styles.galleryCounter}>
          <Text style={styles.galleryCounterText}>
            {formatNumber(index + 1, locale)} / {formatNumber(photos.length, locale)}
          </Text>
        </View>
      ) : null}
    </View>
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
      <View style={styles.roomBody}>
        <Text style={[styles.roomName, selected && styles.roomNameSelected]}>{name}</Text>
        <Text style={styles.roomMeta}>
          {formatNumber(room.max_occupancy, locale)} {pick(L.guestsCountPlural, locale)}
          {' · '}
          {formatDZD(room.base_price_dzd, locale)} {pick(L.perNight, locale)}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

// ── Reviews summary ─────────────────────────────────────────────────────────
function ReviewsSummary({ detail, locale }: { detail: PropertyDetail; locale: Locale }) {
  const reviews = detail.reviews;
  if (detail.review_count === 0 || reviews.length === 0) {
    return <Text style={styles.paragraph}>{pick(L.noReviews, locale)}</Text>;
  }

  // Category averages (only categories with at least one value).
  const cats: { key: keyof typeof L; field: keyof (typeof reviews)[number] }[] = [
    { key: 'reviewCleanliness', field: 'cleanliness' },
    { key: 'reviewAccuracy', field: 'accuracy' },
    { key: 'reviewLocation', field: 'location' },
    { key: 'reviewValue', field: 'value' },
    { key: 'reviewCheckin', field: 'checkin' },
    { key: 'reviewCommunication', field: 'communication' },
  ];

  function avg(field: keyof (typeof reviews)[number]): number | null {
    const vals = reviews.map((r) => r[field]).filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  return (
    <View style={styles.reviewsWrap}>
      <View style={styles.reviewHeadline}>
        <Text style={styles.reviewBigStar}>★</Text>
        <Text style={styles.reviewBigScore}>{formatNumber(detail.rating_avg, locale)}</Text>
        <Text style={styles.reviewBigCount}>
          {' · '}
          {formatNumber(detail.review_count, locale)}{' '}
          {detail.review_count === 1 ? pick(L.reviewsCount, locale) : pick(L.reviewsCountPlural, locale)}
        </Text>
      </View>

      <View style={styles.catGrid}>
        {cats.map((c) => {
          const a = avg(c.field);
          if (a == null) return null;
          return (
            <View key={String(c.field)} style={styles.catRow}>
              <Text style={styles.catLabel}>{pick(L[c.key], locale)}</Text>
              <Text style={styles.catValue}>{formatNumber(a, locale)}</Text>
            </View>
          );
        })}
      </View>

      {/* A couple of recent comments */}
      {reviews
        .filter((r) => (r.comment_text ?? '').trim().length > 0)
        .slice(0, 2)
        .map((r) => (
          <View key={r.id} style={styles.reviewItem}>
            <View style={styles.reviewItemHeader}>
              <Text style={styles.reviewItemStar}>★</Text>
              <Text style={styles.reviewItemScore}>{formatNumber(r.overall, locale)}</Text>
            </View>
            <Text style={styles.reviewItemText} numberOfLines={4}>
              {r.comment_text}
            </Text>
          </View>
        ))}
    </View>
  );
}

// ── Bits ────────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailTopBar() {
  return (
    <SafeAreaView>
      <View style={styles.plainTopBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.plainBack}>{I18nManager.isRTL ? '→' : '←'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function OverlaySheet({
  title,
  onClose,
  locale,
  children,
}: {
  title: string;
  onClose: () => void;
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.overlayBackdrop}>
      <Pressable style={styles.overlayDismiss} onPress={onClose} accessibilityLabel={pick(L.done, locale)} />
      <View style={styles.overlaySheet}>
        <View style={styles.overlayHeader}>
          <Text style={styles.overlayTitle}>{title}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
            <Text style={styles.overlayClose}>✕</Text>
          </Pressable>
        </View>
        {children}
        <View style={styles.overlayFooter}>
          <PrimaryButton label={pick(L.done, locale)} onPress={onClose} />
        </View>
      </View>
    </View>
  );
}

function DetailSkeleton() {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.root}>
      <Skeleton style={{ width, height: width * 0.72, borderRadius: 0 }} />
      <View style={styles.body}>
        <Skeleton style={styles.skTitle} />
        <Skeleton style={styles.skLine} />
        <Skeleton style={styles.skLineShort} />
        <View style={{ height: theme.space.xl }} />
        <Skeleton style={styles.skBlock} />
        <View style={{ height: theme.space.lg }} />
        <Skeleton style={styles.skBlock} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  safe: { flex: 1, backgroundColor: theme.color.bg },
  scrollContent: { paddingBottom: 140 },

  // Gallery
  gallery: { width: '100%', backgroundColor: theme.color.surfaceSunken },
  galleryTopBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  galleryBackBtn: {
    margin: theme.space.md,
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: I18nManager.isRTL ? 'flex-end' : 'flex-start',
    ...theme.shadow.card,
  },
  galleryBackGlyph: { fontFamily: RN_FONTS.bodyBold, fontSize: 20, color: theme.color.text },
  galleryCounter: {
    position: 'absolute',
    bottom: theme.space.md,
    alignSelf: 'center',
    backgroundColor: theme.color.overlay,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
  },
  galleryCounterText: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.caption,
    color: theme.color.white,
  },

  body: { padding: theme.space.xl, gap: theme.space.sm },
  title: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['heading-1'],
    color: theme.color.text,
    textAlign,
  },
  place: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.textMuted,
    textAlign,
  },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, marginTop: theme.space.xs },
  instantPill: {
    backgroundColor: theme.color.terracotta100,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 3,
  },
  instantPillText: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    color: theme.color.accentHover,
  },

  section: { marginTop: theme.space.xl, gap: theme.space.md },
  sectionTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-2'],
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  paragraph: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
    lineHeight: theme.lineHeight.body,
    textAlign,
  },

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
  roomBody: { flex: 1 },
  roomName: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  roomNameSelected: { color: theme.color.primary },
  roomMeta: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    marginTop: 2,
    textAlign,
  },
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
  amenityIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  amenityLabel: {
    flex: 1,
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.text,
    textAlign,
  },

  // Times
  timesRow: { flexDirection: 'row', gap: theme.space.md },
  timeBox: {
    flex: 1,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space.lg,
    gap: theme.space.xs,
  },
  timeLabel: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign,
  },
  timeValue: {
    fontFamily: RN_FONTS.bodySemiBold,
    fontSize: theme.fontSize['heading-3'],
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },

  // Reviews
  reviewsWrap: { gap: theme.space.md },
  reviewHeadline: { flexDirection: 'row', alignItems: 'center' },
  reviewBigStar: { fontSize: 20, color: theme.color.ratingStar, marginEnd: theme.space.xs },
  reviewBigScore: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['heading-2'],
    color: theme.color.text,
  },
  reviewBigCount: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.textMuted,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  catRow: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.space.xs,
    paddingEnd: theme.space.lg,
  },
  catLabel: { fontFamily: RN_FONTS.arabicRegular, fontSize: theme.fontSize['body-sm'], color: theme.color.textMuted },
  catValue: { fontFamily: RN_FONTS.bodySemiBold, fontSize: theme.fontSize['body-sm'], fontWeight: '600', color: theme.color.text },
  reviewItem: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space.lg,
    gap: theme.space.xs,
  },
  reviewItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewItemStar: { fontSize: 13, color: theme.color.ratingStar },
  reviewItemScore: { fontFamily: RN_FONTS.bodySemiBold, fontSize: theme.fontSize['body-sm'], fontWeight: '600', color: theme.color.text },
  reviewItemText: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.text,
    lineHeight: theme.lineHeight['body-sm'],
    textAlign,
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
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    ...theme.shadow.sheet,
  },
  widgetInfo: { flex: 1 },
  widgetPrice: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize.price,
    fontWeight: '700',
    color: theme.color.text,
    textAlign,
    writingDirection: 'ltr',
  },
  widgetPerNight: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    fontWeight: '400',
    color: theme.color.textMuted,
  },
  widgetDates: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.accent,
    textDecorationLine: 'underline',
    textAlign,
  },
  widgetTotal: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign,
  },
  widgetCta: { minWidth: 150 },

  // Not found / plain top bar
  plainTopBar: { padding: theme.space.lg },
  plainBack: { fontFamily: RN_FONTS.bodyBold, fontSize: theme.fontSize['heading-3'], color: theme.color.text },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.space['2xl'], gap: theme.space.sm },
  notFoundEmoji: { fontSize: 40 },
  notFoundTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-2'],
    color: theme.color.text,
    textAlign: 'center',
  },
  notFoundBody: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.textMuted,
    textAlign: 'center',
    lineHeight: theme.lineHeight.body,
  },
  notFoundCta: { marginTop: theme.space.md, minWidth: 180 },

  // Overlay
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.overlay,
    justifyContent: 'flex-end',
  },
  overlayDismiss: { flex: 1 },
  overlaySheet: {
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    padding: theme.space.xl,
    maxHeight: '85%',
    ...theme.shadow.sheet,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space.md,
  },
  overlayTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-3'],
    fontWeight: '600',
    color: theme.color.text,
  },
  overlayClose: { fontFamily: RN_FONTS.bodyMedium, fontSize: theme.fontSize.title, color: theme.color.text },
  overlayCalendar: { height: 360 },
  overlayGuests: { gap: theme.space.md },
  overlayDivider: { height: 1, backgroundColor: theme.color.border },
  overlayFooter: { marginTop: theme.space.lg },

  // Skeleton bits
  skTitle: { height: 28, width: '70%', borderRadius: theme.radius.sm, marginBottom: theme.space.sm },
  skLine: { height: 16, width: '90%', borderRadius: theme.radius.sm, marginBottom: theme.space.xs },
  skLineShort: { height: 16, width: '50%', borderRadius: theme.radius.sm },
  skBlock: { height: 90, width: '100%', borderRadius: theme.radius.card },
});
