/**
 * Shared presentational components for the guest discovery + booking surfaces:
 * rating row, instant-book / free-cancel chips, result card, rail card,
 * booking-status badge, guest stepper, and a price-breakdown panel.
 *
 * Redesign (Airbnb-style): cards are BORDERLESS and photography-forward — a
 * rounded photo, then plain text directly on the page (no surface box, no
 * shadow, no border). Icons are outline lucide glyphs (never emoji). All copy
 * goes through the locale-aware <Text>/<Heading> primitives. RTL-aware.
 */

import {
  View,
  StyleSheet,
  Pressable,
  I18nManager,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Star, Zap, ShieldCheck } from 'lucide-react-native';
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { Text } from '@/ui';
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

// ---------------------------------------------------------------------------
// Rating row (small filled star — terracotta, per brand; never yellow)
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
  const glyph = size === 'md' ? 15 : 13;
  return (
    <View style={styles.ratingRow}>
      <Star size={glyph} color={theme.color.ratingStar} fill={theme.color.ratingStar} strokeWidth={0} />
      {isNew ? (
        <Text variant="body-sm" weight="medium" color="textMuted">
          {pick(L.noReviews, locale)}
        </Text>
      ) : (
        <Text variant="body-sm" weight="medium">
          {formatNumber(rating, locale)}{' '}
          <Text variant="body-sm" color="textMuted">
            ({formatNumber(count, locale)})
          </Text>
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Chips (outline icon + label; used on property detail, not crowding cards)
// ---------------------------------------------------------------------------
function Chip({
  label,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  icon?: typeof Zap;
  tone?: 'neutral' | 'accent' | 'success';
}) {
  const fg =
    tone === 'accent'
      ? theme.color.accent
      : tone === 'success'
        ? theme.color.success
        : theme.color.textMuted;
  return (
    <View style={styles.chip}>
      {Icon ? <Icon size={13} color={fg} strokeWidth={2} /> : null}
      <Text variant="caption" weight="semibold" color={fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function InstantBookBadge({ locale }: { locale: Locale }) {
  return <Chip label={pick(L.instantBook, locale)} icon={Zap} tone="accent" />;
}

export function FreeCancelBadge({ locale }: { locale: Locale }) {
  return <Chip label={pick(L.freeCancel, locale)} icon={ShieldCheck} tone="success" />;
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
    <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
      <Text variant="caption" weight="semibold" color={tone.fg}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Result card (full-width, borderless, photo-first)
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
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        <RemoteImage uri={cover} alt={altText} radius={theme.radius.lg} style={styles.resultImage} />
        <View style={styles.heartOverlay} pointerEvents="box-none">
          <WishlistHeart propertyId={property.id} locale={locale} variant="overlay" />
        </View>
        {property.instant_book ? (
          <View style={styles.imageTag} pointerEvents="none">
            <Zap size={12} color={theme.color.accent} strokeWidth={2.25} fill={theme.color.accent} />
            <Text variant="caption" weight="semibold">
              {pick(L.instantBook, locale)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="body" weight="semibold" numberOfLines={1} style={styles.flex}>
            {title}
          </Text>
          {property.review_count > 0 ? (
            <RatingRow rating={property.rating_avg} count={property.review_count} locale={locale} />
          ) : null}
        </View>
        {place ? (
          <Text variant="body-sm" color="textMuted" numberOfLines={1}>
            {place}
          </Text>
        ) : null}
        <View style={styles.priceRow}>
          {property.from_price_dzd != null ? (
            <Text variant="body" weight="bold" style={styles.ltr}>
              {formatDZD(property.from_price_dzd, locale)}
              <Text variant="body-sm" color="textMuted" weight="regular">
                {' '}
                {pick(L.perNight, locale)}
              </Text>
            </Text>
          ) : (
            <Text variant="body-sm" color="textMuted">
              —
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Rail card (compact, horizontal scroller — borderless, photo-first)
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
        <RemoteImage uri={cover} alt={title} radius={theme.radius.lg} style={styles.railImage} />
        <View style={styles.heartOverlay} pointerEvents="box-none">
          <WishlistHeart propertyId={property.id} locale={locale} variant="overlay" />
        </View>
      </View>
      <View style={styles.railBody}>
        <View style={styles.titleRow}>
          <Text variant="body-sm" weight="semibold" numberOfLines={1} style={styles.flex}>
            {title}
          </Text>
          {property.review_count > 0 ? (
            <RatingRow rating={property.rating_avg} count={property.review_count} locale={locale} />
          ) : null}
        </View>
        {place ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {place}
          </Text>
        ) : null}
        {property.from_price_dzd != null ? (
          <Text variant="body-sm" weight="bold" style={styles.ltr}>
            {formatDZD(property.from_price_dzd, locale)}
            <Text variant="caption" color="textMuted" weight="regular">
              {' '}
              {pick(L.perNight, locale)}
            </Text>
          </Text>
        ) : null}
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
  glyph: '+' | '−';
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
      hitSlop={8}
      style={({ pressed }) => [
        styles.stepBtn,
        disabled && styles.stepBtnDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        variant="title"
        weight="medium"
        color={disabled ? 'textMuted' : 'primary'}
        style={styles.stepGlyph}
      >
        {glyph}
      </Text>
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
      <View style={styles.flex}>
        <Text variant="body" weight="semibold">
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        ) : null}
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
        <Text variant="body" weight="semibold" center style={styles.stepperValue} accessibilityLiveRegion="polite">
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
          <Text variant="body" color="textMuted" style={styles.flex}>
            {line.label}
          </Text>
          <Text variant="body" style={styles.ltr}>
            {formatDZD(line.amountDzd, locale)}
          </Text>
        </View>
      ))}
      <View style={styles.breakdownDivider} />
      <View style={styles.breakdownRow}>
        <Text variant="body-lg" weight="bold" style={styles.flex}>
          {totalLabel}
        </Text>
        <Text variant="body-lg" weight="bold" style={styles.ltr}>
          {formatDZD(totalDzd, locale)}
        </Text>
      </View>
      {note ? (
        <Text variant="caption" color="textMuted">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  flex: { flex: 1 },
  ltr: { writingDirection: 'ltr' },

  // Rating
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  // Chips (icon + label, no fill box other than a faint sunken pill)
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceSunken,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 3,
  },

  // Shared photo + overlays
  imageWrap: { position: 'relative' },
  heartOverlay: {
    position: 'absolute',
    top: theme.space.sm,
    right: I18nManager.isRTL ? undefined : theme.space.sm,
    left: I18nManager.isRTL ? theme.space.sm : undefined,
  },
  imageTag: {
    position: 'absolute',
    bottom: theme.space.sm,
    left: I18nManager.isRTL ? undefined : theme.space.sm,
    right: I18nManager.isRTL ? theme.space.sm : undefined,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 4,
  },

  // Result card — borderless, photo-first
  card: { backgroundColor: 'transparent' },
  resultImage: { width: '100%', aspectRatio: 4 / 3 },
  body: { paddingTop: theme.space.sm, gap: 2 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  priceRow: { marginTop: 2 },

  // Rail card — borderless
  railCard: { width: 240, backgroundColor: 'transparent' },
  railImage: { width: '100%', aspectRatio: 1, height: undefined },
  railBody: { paddingTop: theme.space.sm, gap: 2 },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
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
  stepGlyph: { lineHeight: 24 },
  stepperValue: { minWidth: 28 },

  // Breakdown
  breakdown: { gap: theme.space.sm },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: theme.color.border,
    marginVertical: theme.space.xs,
  },
});
