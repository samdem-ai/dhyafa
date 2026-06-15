/**
 * Shared presentational components for the guest discovery + booking surfaces:
 * rating row, instant-book / free-cancel badges, result card, rail card,
 * booking-status badge, guest stepper, and a price-breakdown panel.
 *
 * All token-styled + RTL-aware (logical props). Photography-forward cards reuse
 * RemoteImage for blur-up + fallback. No native deps.
 */

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  I18nManager,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';
import { L, pick } from '@/lib/copy';
import {
  type PropertySummary,
  coverUrl,
  propertyTitle,
  localizedName,
} from '@/lib/discovery';
import type { BookingStatus } from '@/lib/bookings';
import { WishlistHeart } from '@/ui';
import { RemoteImage } from './RemoteImage';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

// ---------------------------------------------------------------------------
// Rating row (terracotta star — never yellow, per brand)
// ---------------------------------------------------------------------------
export function RatingRow({
  rating,
  count,
  locale,
  size = 'sm',
}: {
  rating: number;
  count: number;
  locale: Locale;
  size?: 'sm' | 'md';
}) {
  const isNew = count === 0;
  const fs = size === 'md' ? theme.fontSize['body-sm'] : theme.fontSize.caption;
  return (
    <View style={styles.ratingRow}>
      <Text style={[styles.ratingStar, { fontSize: fs }]}>★</Text>
      {isNew ? (
        <Text style={[styles.ratingValue, { fontSize: fs }]}>{pick(L.noReviews, locale)}</Text>
      ) : (
        <>
          <Text style={[styles.ratingValue, { fontSize: fs }]}>{formatNumber(rating, locale)}</Text>
          <Text style={[styles.ratingCount, { fontSize: fs }]}>
            {' '}
            ({formatNumber(count, locale)})
          </Text>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------
export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'success';
}) {
  const bg =
    tone === 'accent'
      ? theme.color.terracotta100
      : tone === 'success'
        ? theme.color.successBg
        : theme.color.surfaceSunken;
  const fg =
    tone === 'accent'
      ? theme.color.accentHover
      : tone === 'success'
        ? theme.color.success
        : theme.color.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function InstantBookBadge({ locale }: { locale: Locale }) {
  return <Badge label={`⚡ ${pick(L.instantBook, locale)}`} tone="accent" />;
}

export function FreeCancelBadge({ locale }: { locale: Locale }) {
  return <Badge label={pick(L.freeCancel, locale)} tone="success" />;
}

// ---------------------------------------------------------------------------
// Booking status badge (booking_status enum → colored pill)
// ---------------------------------------------------------------------------
const STATUS_TONE: Record<BookingStatus, { bg: string; fg: string }> = {
  requested: { bg: theme.color.warningBg, fg: theme.color.warning },
  awaiting_payment: { bg: theme.color.warningBg, fg: theme.color.warning },
  confirmed: { bg: theme.color.successBg, fg: theme.color.success },
  checked_in: { bg: theme.color.infoBg, fg: theme.color.info },
  completed: { bg: theme.color.surfaceSunken, fg: theme.color.textMuted },
  declined: { bg: theme.color.errorBg, fg: theme.color.error },
  cancelled: { bg: theme.color.errorBg, fg: theme.color.error },
  no_show: { bg: theme.color.errorBg, fg: theme.color.error },
  expired: { bg: theme.color.surfaceSunken, fg: theme.color.textMuted },
};

const STATUS_LABEL: Record<BookingStatus, keyof typeof L> = {
  requested: 'st_requested',
  declined: 'st_declined',
  awaiting_payment: 'st_awaiting_payment',
  confirmed: 'st_confirmed',
  checked_in: 'st_checked_in',
  completed: 'st_completed',
  cancelled: 'st_cancelled',
  no_show: 'st_no_show',
  expired: 'st_expired',
};

export function BookingStatusBadge({
  status,
  locale,
}: {
  status: BookingStatus;
  locale: Locale;
}) {
  const tone = STATUS_TONE[status];
  const label = pick(L[STATUS_LABEL[status]], locale);
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.badgeText, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Result card (full-width, photography-forward)
// ---------------------------------------------------------------------------
export function ResultCard({
  property,
  locale,
  onPress,
}: {
  property: PropertySummary;
  locale: Locale;
  onPress: () => void;
}) {
  const title = propertyTitle(property, locale);
  const place = property.wilaya ? localizedName(property.wilaya, locale) : '';
  const cover = coverUrl(property);
  const altText = property.photos[0]
    ? localizedName(
        {
          name_ar: property.photos[0].alt_ar,
          name_fr: property.photos[0].alt_fr,
          name_en: property.photos[0].alt_en,
        },
        locale,
      ) || title
    : title;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.resultCard, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        <RemoteImage uri={cover} alt={altText} radius={theme.radius.card} style={styles.resultImage} />
        <View style={styles.heartOverlay} pointerEvents="box-none">
          <WishlistHeart propertyId={property.id} locale={locale} variant="overlay" />
        </View>
      </View>
      <View style={styles.resultBody}>
        <View style={styles.resultHeaderRow}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {title}
          </Text>
          <RatingRow rating={property.rating_avg} count={property.review_count} locale={locale} />
        </View>
        {place ? (
          <Text style={styles.resultPlace} numberOfLines={1}>
            {place}
          </Text>
        ) : null}

        <View style={styles.badgeRow}>
          {property.instant_book ? <InstantBookBadge locale={locale} /> : null}
          {property.cancellation_tier === 'flexible' ? <FreeCancelBadge locale={locale} /> : null}
        </View>

        <View style={styles.priceRow}>
          {property.from_price_dzd != null ? (
            <Text style={styles.price}>
              {formatDZD(property.from_price_dzd, locale)}
              <Text style={styles.perNight}> {pick(L.perNight, locale)}</Text>
            </Text>
          ) : (
            <Text style={styles.perNight}>—</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Rail card (compact, horizontal scroller)
// ---------------------------------------------------------------------------
export function RailCard({
  property,
  locale,
  onPress,
}: {
  property: PropertySummary;
  locale: Locale;
  onPress: () => void;
}) {
  const title = propertyTitle(property, locale);
  const place = property.wilaya ? localizedName(property.wilaya, locale) : '';
  const cover = coverUrl(property);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.railCard, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        <RemoteImage uri={cover} alt={title} radius={theme.radius.card} style={styles.railImage} />
        <View style={styles.heartOverlay} pointerEvents="box-none">
          <WishlistHeart propertyId={property.id} locale={locale} variant="overlay" />
        </View>
      </View>
      <View style={styles.railBody}>
        <Text style={styles.railTitle} numberOfLines={1}>
          {title}
        </Text>
        {place ? (
          <Text style={styles.railPlace} numberOfLines={1}>
            {place}
          </Text>
        ) : null}
        <View style={styles.railFooter}>
          {property.from_price_dzd != null ? (
            <Text style={styles.railPrice}>{formatDZD(property.from_price_dzd, locale)}</Text>
          ) : (
            <Text style={styles.railPrice}>—</Text>
          )}
          <RatingRow rating={property.rating_avg} count={property.review_count} locale={locale} />
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Guest stepper (adults / children)
// ---------------------------------------------------------------------------
function StepButton({
  glyph,
  onPress,
  disabled,
  label,
}: {
  glyph: string;
  onPress: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.stepBtn,
        disabled && styles.stepBtnDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.stepGlyph, disabled && styles.stepGlyphDisabled]}>{glyph}</Text>
    </Pressable>
  );
}

export function GuestStepperRow({
  label,
  hint,
  value,
  min = 0,
  max = 16,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <View style={styles.stepperLabelWrap}>
        <Text style={styles.stepperLabel}>{label}</Text>
        {hint ? <Text style={styles.stepperHint}>{hint}</Text> : null}
      </View>
      <View
        style={styles.stepperControls}
        accessibilityRole="adjustable"
        accessibilityValue={{ now: value, min, max }}
      >
        <StepButton
          glyph="−"
          label={`${label} −`}
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}
        />
        <Text style={styles.stepperValue} accessibilityLiveRegion="polite">
          {value}
        </Text>
        <StepButton
          glyph="+"
          label={`${label} +`}
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Price breakdown panel
// ---------------------------------------------------------------------------
export interface PriceLine {
  label: string;
  amountDzd: number;
}

export function PriceBreakdown({
  lines,
  totalLabel,
  totalDzd,
  locale,
  note,
  style,
}: {
  lines: PriceLine[];
  totalLabel: string;
  totalDzd: number;
  locale: Locale;
  note?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.breakdown, style]}>
      {lines.map((line, i) => (
        <View key={`${line.label}-${i}`} style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{line.label}</Text>
          <Text style={styles.breakdownAmount}>{formatDZD(line.amountDzd, locale)}</Text>
        </View>
      ))}
      <View style={styles.breakdownDivider} />
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownTotalLabel}>{totalLabel}</Text>
        <Text style={styles.breakdownTotalAmount}>{formatDZD(totalDzd, locale)}</Text>
      </View>
      {note ? <Text style={styles.breakdownNote}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },

  // Rating
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingStar: { color: theme.color.ratingStar, marginEnd: 2 },
  ratingValue: {
    fontFamily: RN_FONTS.bodySemiBold,
    fontWeight: '600',
    color: theme.color.text,
  },
  ratingCount: { fontFamily: RN_FONTS.bodyRegular, color: theme.color.textMuted },

  // Badges
  badge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
  },

  // Shared photo overlay (wishlist heart, top-end of the card image)
  imageWrap: { position: 'relative' },
  heartOverlay: {
    position: 'absolute',
    top: theme.space.sm,
    // Top-end corner in both writing directions.
    right: I18nManager.isRTL ? undefined : theme.space.sm,
    left: I18nManager.isRTL ? theme.space.sm : undefined,
  },

  // Result card
  resultCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  resultImage: { width: '100%', height: 210 },
  resultBody: { padding: theme.space.md, gap: theme.space.xs },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  resultTitle: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-3'],
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  resultPlace: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xs, marginTop: 2 },
  priceRow: { marginTop: theme.space.xs },
  price: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize.price,
    fontWeight: '700',
    color: theme.color.text,
    textAlign,
    // Keep the DZD numeral + symbol LTR even under RTL (bidi isolation).
    writingDirection: 'ltr',
  },
  perNight: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    fontWeight: '400',
    color: theme.color.textMuted,
  },

  // Rail card
  railCard: {
    width: 220,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  railImage: { width: '100%', height: 150 },
  railBody: { padding: theme.space.md, gap: 2 },
  railTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  railPlace: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign,
  },
  railFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.space.xs,
  },
  railPrice: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize['body-lg'],
    fontWeight: '700',
    color: theme.color.accent,
    writingDirection: 'ltr',
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  stepperLabelWrap: { flex: 1 },
  stepperLabel: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  stepperHint: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign,
  },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { borderColor: theme.color.border, opacity: 0.5 },
  stepGlyph: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: 20,
    lineHeight: 22,
    color: theme.color.primary,
  },
  stepGlyphDisabled: { color: theme.color.textMuted },
  stepperValue: {
    minWidth: 24,
    textAlign: 'center',
    fontFamily: RN_FONTS.bodySemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
  },

  // Breakdown
  breakdown: { gap: theme.space.sm },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  breakdownLabel: {
    flex: 1,
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
    textAlign,
  },
  breakdownAmount: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
    writingDirection: 'ltr',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: theme.color.border,
    marginVertical: theme.space.xs,
  },
  breakdownTotalLabel: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['body-lg'],
    fontWeight: '700',
    color: theme.color.text,
    textAlign,
  },
  breakdownTotalAmount: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize['body-lg'],
    fontWeight: '700',
    color: theme.color.text,
    writingDirection: 'ltr',
  },
  breakdownNote: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign,
    marginTop: theme.space.xs,
    lineHeight: theme.lineHeight.caption,
  },
});
