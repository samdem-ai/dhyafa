/**
 * A minimal, dependency-free month calendar with single date-range selection.
 *
 * react-native-calendars is not a dependency of this app and we must not add
 * native/extra deps, so this renders a scrollable list of months built from
 * plain Date math. RTL-aware: the weekday header + day grid keep their natural
 * order but the whole block mirrors via the parent flex direction. All copy
 * renders through the @/ui <Text> primitive (locale-aware faces, never
 * hand-rolled fontFamily).
 *
 * Range model: tap once → check-in; tap a later day → check-out; tap again →
 * restart. Past days (before `minDate`) are disabled.
 */

import { useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  type DimensionValue,
} from 'react-native';
import type { Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { Text } from '@/ui';
import { L, pick } from '@/lib/copy';

const MONTH_NAMES: Record<Locale, string[]> = {
  ar: [
    'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
    'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ],
  fr: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
};

const WEEKDAY_LABELS: Record<Locale, string[]> = {
  // Week starts Sunday to match getDay() (0=Sun).
  ar: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
  fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/**
 * Screen-reader status suffixes for day cells. Booked/unavailable have no clean
 * copy.ts key, so they live here locally (closed reuses copy via L.hostClosed,
 * check-in/check-out via L.checkIn/L.checkOut).
 */
const A11Y_STATUS: Record<Locale, { booked: string; unavailable: string }> = {
  ar: { booked: 'محجوز', unavailable: 'غير متاح' },
  fr: { booked: 'Réservé', unavailable: 'Indisponible' },
  en: { booked: 'Booked', unavailable: 'Unavailable' },
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBetween(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime();
  return t > start.getTime() && t < end.getTime();
}

interface MonthGrid {
  year: number;
  month: number;
  /** null = leading/trailing blank cell. */
  days: (Date | null)[];
}

function buildMonth(year: number, month: number): MonthGrid {
  const first = new Date(year, month, 1);
  const lead = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);
  return { year, month, days: cells };
}

/** Per-day decoration for the host availability calendar (optional). */
export interface DayMeta {
  /** Day is blocked/closed — rendered with a muted strike-through tint. */
  closed?: boolean;
  /** A nightly price override exists for this day — shows a small dot. */
  hasOverride?: boolean;
  /** A booking covers this night — shows a terracotta booked dot. */
  booked?: boolean;
}

export interface DateRangePickerProps {
  locale: Locale;
  checkIn: Date | null;
  checkOut: Date | null;
  onChange: (range: { checkIn: Date | null; checkOut: Date | null }) => void;
  /** Earliest selectable day; defaults to today. */
  minDate?: Date;
  /** How many months forward to render. */
  monthsAhead?: number;
  /**
   * Optional per-day metadata keyed by 'YYYY-MM-DD' (local calendar day).
   * Used by the host calendar to reflect closed days + price overrides; guest
   * callers omit it and get the plain picker.
   */
  dayMeta?: Record<string, DayMeta>;
  /**
   * Whether the picker owns a vertical ScrollView (default true). Set FALSE when
   * embedding inside another vertical ScrollView (e.g. the host calendar page) —
   * nesting two vertical scrollers traps the outer scroll so the edit panel
   * below becomes unreachable. With false, the parent scroll handles everything.
   */
  scroll?: boolean;
  /**
   * When true, days marked closed/booked in `dayMeta` are NON-selectable and a
   * range may not span them (the guest booking picker). The host calendar leaves
   * this false so the host can still tap closed days to UN-block them.
   */
  disableBlocked?: boolean;
}

/** Local 'YYYY-MM-DD' key for a Date (no TZ shift). */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DateRangePicker({
  locale,
  checkIn,
  checkOut,
  onChange,
  minDate,
  monthsAhead = 12,
  dayMeta,
  scroll = true,
  disableBlocked = false,
}: DateRangePickerProps) {
  const today = startOfDay(new Date());
  const min = minDate ? startOfDay(minDate) : today;

  const months = useMemo<MonthGrid[]>(() => {
    const out: MonthGrid[] = [];
    const base = new Date(min.getFullYear(), min.getMonth(), 1);
    for (let i = 0; i < monthsAhead; i++) {
      out.push(buildMonth(base.getFullYear(), base.getMonth() + i));
    }
    return out;
  }, [min, monthsAhead]);

  /** A day is blocked (guest cannot pick it) when disableBlocked + closed/booked. */
  function blocked(day: Date): boolean {
    if (!disableBlocked) return false;
    const m = dayMeta ? dayMeta[dayKey(day)] : undefined;
    return m?.closed === true || m?.booked === true;
  }

  /** Any blocked night in [start, end) — used to reject a range that spans one. */
  function rangeSpansBlocked(start: Date, end: Date): boolean {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (d.getTime() < end.getTime()) {
      if (blocked(d)) return true;
      d.setDate(d.getDate() + 1);
    }
    return false;
  }

  function onDayPress(day: Date) {
    if (day.getTime() < min.getTime()) return;
    if (blocked(day)) return;
    // No selection yet, or a full range exists → start fresh with check-in.
    if (!checkIn || (checkIn && checkOut)) {
      onChange({ checkIn: day, checkOut: null });
      return;
    }
    // Have check-in only.
    if (day.getTime() <= checkIn.getTime()) {
      onChange({ checkIn: day, checkOut: null });
      return;
    }
    // A stay must not span a blocked night → restart at the tapped day instead.
    if (disableBlocked && rangeSpansBlocked(checkIn, day)) {
      onChange({ checkIn: day, checkOut: null });
      return;
    }
    onChange({ checkIn, checkOut: day });
  }

  const weekdays = WEEKDAY_LABELS[locale];

  return (
    <ScrollView
      scrollEnabled={scroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.weekHeader}>
        {weekdays.map((w, i) => (
          <View key={i} style={styles.weekdayCell}>
            <Text variant="caption" weight="medium" color="textMuted" center>
              {w}
            </Text>
          </View>
        ))}
      </View>

      {months.map((m) => (
        <View key={`${m.year}-${m.month}`} style={styles.month}>
          <Text variant="title" weight="bold" style={styles.monthTitle}>
            {MONTH_NAMES[locale][m.month]} {m.year}
          </Text>
          <View style={styles.grid}>
            {m.days.map((day, idx) => {
              if (!day) return <View key={idx} style={styles.cell} />;
              const disabled = day.getTime() < min.getTime() || blocked(day);
              const isStart = checkIn ? sameDay(day, checkIn) : false;
              const isEnd = checkOut ? sameDay(day, checkOut) : false;
              const inRange = checkIn && checkOut ? isBetween(day, checkIn, checkOut) : false;
              const isEdge = isStart || isEnd;
              const meta = dayMeta ? dayMeta[dayKey(day)] : undefined;
              const closed = meta?.closed === true && !isEdge;

              const dateLabel = `${day.getDate()} ${MONTH_NAMES[locale][day.getMonth()]} ${day.getFullYear()}`;
              const statusParts: string[] = [];
              if (isStart) statusParts.push(pick(L.checkIn, locale));
              else if (isEnd) statusParts.push(pick(L.checkOut, locale));
              if (disabled) statusParts.push(A11Y_STATUS[locale].unavailable);
              if (closed) statusParts.push(pick(L.hostClosed, locale));
              if (meta?.booked && !isEdge) statusParts.push(A11Y_STATUS[locale].booked);
              const a11yLabel =
                statusParts.length > 0 ? `${dateLabel} — ${statusParts.join(', ')}` : dateLabel;

              return (
                <Pressable
                  key={idx}
                  accessibilityRole="button"
                  accessibilityLabel={a11yLabel}
                  accessibilityState={{ disabled, selected: isEdge }}
                  disabled={disabled}
                  onPress={() => onDayPress(day)}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.dayInner,
                      inRange && styles.dayInRange,
                      closed && styles.dayClosed,
                      isEdge && styles.dayEdge,
                    ]}
                  >
                    <Text
                      variant="body-sm"
                      weight={isEdge ? 'bold' : 'medium'}
                      color={
                        isEdge
                          ? 'textOnPrimary'
                          : disabled
                            ? 'ink300'
                            : closed
                              ? 'ink300'
                              : 'text'
                      }
                      center
                      style={closed ? styles.dayTextClosed : undefined}
                    >
                      {day.getDate()}
                    </Text>
                    {meta?.booked && !isEdge ? <View style={styles.bookedDot} /> : null}
                    {meta?.hasOverride && !isEdge && !meta?.booked ? (
                      <View style={styles.overrideDot} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const CELL: DimensionValue = `${100 / 7}%`;

const styles = StyleSheet.create({
  scroll: { paddingBottom: theme.space.xl },
  weekHeader: {
    flexDirection: 'row',
    paddingVertical: theme.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
  weekdayCell: { width: CELL },
  month: { marginTop: theme.space.xl },
  monthTitle: { marginBottom: theme.space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: CELL,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  },
  dayInRange: { backgroundColor: theme.color.infoBg },
  dayEdge: { backgroundColor: theme.color.primary },
  dayClosed: { backgroundColor: theme.color.surfaceSunken },
  dayTextClosed: { textDecorationLine: 'line-through' },
  overrideDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
  },
  bookedDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.primary,
  },
});
