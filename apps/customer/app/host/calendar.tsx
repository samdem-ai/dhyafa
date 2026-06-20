/**
 * Host calendar & pricing (M4; redesigned Phase 8).
 *
 * Flow: pick one of the host's listings → pick a room type → month grid
 * (reuses Calendar's DateRangePicker, decorated with per-day closed / price-
 * override markers from the `availability` rows) → select a date range → an
 * edit panel to block/unblock, set a nightly price override (DZD), and set a
 * minimum stay. Applying calls set_availability_range (one RPC per range) and
 * re-reads availability so the grid reflects the change.
 *
 * Borderless, photo-first design language: pills, plain section headers, a
 * borderless edit panel and a tokenized availability grid. Designed skeleton +
 * empty + error states; pull-to-refresh on the grid; full RTL. formatDZD is
 * used for any money the host sees.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { formatDZD, type Locale } from '@dyafa/i18n';
import { DateRangePicker, type DayMeta } from '@/components/Calendar';
import {
  listRoomTypesForProperty,
  listAvailability,
  setAvailabilityRange,
  clearAvailabilityOverride,
  listBookedDates,
  type RoomTypeRow,
  type AvailabilityRow,
} from '@/lib/host';
import { listMyProperties, localizedName, type PropertyRow } from '@/lib/listings';
import { toDateParam, nightsBetween } from '@/lib/bookings';
import {
  Screen,
  Header,
  Text,
  Button,
  TextField,
  Skeleton,
  SkeletonList,
  ErrorState,
  EmptyState,
  haptics,
} from '@/ui';
import { L, pick } from '@/lib/copy';
import { formatRange } from '@/lib/dateFormat';
import { theme } from '@/theme';

/** How many days forward to fetch availability for the decorated grid. */
const WINDOW_DAYS = 180;

function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateParam(d);
}

function propTitle(p: PropertyRow, locale: Locale): string {
  return (
    localizedName({ name_ar: p.title_ar, name_fr: p.title_fr, name_en: p.title_en }, locale) || ''
  );
}

function roomLabel(rt: RoomTypeRow, locale: Locale): string {
  return (
    localizedName({ name_ar: rt.name_ar, name_fr: rt.name_fr, name_en: rt.name_en }, locale) || ''
  );
}

export default function HostCalendarScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;

  const [properties, setProperties] = useState<PropertyRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomTypeRow[] | null>(null);
  const [roomTypeId, setRoomTypeId] = useState<string | null>(null);

  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [availLoading, setAvailLoading] = useState(false);

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  const [closed, setClosed] = useState(false);
  const [priceText, setPriceText] = useState('');
  const [minStayText, setMinStayText] = useState('');
  const [applying, setApplying] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Load the host's listings (most recent first); auto-select the first.
  const loadProperties = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await listMyProperties();
      setProperties(rows);
      const first = rows[0];
      if (first && propertyId === null) setPropertyId(first.id);
    } catch {
      setLoadError(pick(L.loadError, locale));
      setProperties([]);
    }
  }, [locale, propertyId]);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  // When the chosen property changes, load its room types + select the first.
  useEffect(() => {
    if (!propertyId) return;
    let active = true;
    setRoomTypes(null);
    setRoomTypeId(null);
    (async () => {
      try {
        const rows = await listRoomTypesForProperty(propertyId);
        if (!active) return;
        setRoomTypes(rows);
        setRoomTypeId(rows[0]?.id ?? null);
      } catch {
        if (!active) return;
        setRoomTypes([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [propertyId]);

  // Load availability for the selected room type across the forward window.
  const loadAvailability = useCallback(async () => {
    if (!roomTypeId) {
      setAvailability([]);
      setBookedDates([]);
      return;
    }
    setAvailLoading(true);
    try {
      const [rows, booked] = await Promise.all([
        listAvailability(roomTypeId, dayOffset(0), dayOffset(WINDOW_DAYS)),
        listBookedDates(roomTypeId, dayOffset(0), dayOffset(WINDOW_DAYS)),
      ]);
      setAvailability(rows);
      setBookedDates(booked);
    } catch {
      setAvailability([]);
      setBookedDates([]);
    } finally {
      setAvailLoading(false);
    }
  }, [roomTypeId]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  // Per-day decoration map for the grid: closed flag + price-override dot.
  const dayMeta = useMemo<Record<string, DayMeta>>(() => {
    const map: Record<string, DayMeta> = {};
    for (const row of availability) {
      map[row.date] = {
        closed: row.is_closed || row.units_open <= 0,
        hasOverride: row.price_override_dzd != null,
      };
    }
    for (const date of bookedDates) {
      map[date] = { ...(map[date] ?? {}), booked: true };
    }
    return map;
  }, [availability, bookedDates]);

  // The currently-selected property (for the draft-listing note).
  const selectedProperty = useMemo(
    () => (properties ?? []).find((p) => p.id === propertyId) ?? null,
    [properties, propertyId],
  );

  const clearSelection = useCallback(() => {
    setCheckIn(null);
    setCheckOut(null);
    setClosed(false);
    setPriceText('');
    setMinStayText('');
    setFeedback(null);
  }, []);

  // The inclusive last night of the selected range (checkout is exclusive in
  // the picker, so the availability range ends the night before).
  const rangeEnd = useMemo(() => {
    if (!checkIn) return null;
    if (!checkOut) return checkIn;
    const end = new Date(checkOut);
    end.setDate(end.getDate() - 1);
    return end.getTime() < checkIn.getTime() ? checkIn : end;
  }, [checkIn, checkOut]);

  const rangeNights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : checkIn ? 1 : 0;

  async function onApply() {
    if (!roomTypeId || !checkIn || !rangeEnd) return;
    const priceTrim = priceText.trim();
    const minStayTrim = minStayText.trim();
    const priceVal = priceTrim ? Number(priceTrim) : null;
    const minStayVal = minStayTrim ? Number(minStayTrim) : null;

    setApplying(true);
    setFeedback(null);
    try {
      await setAvailabilityRange({
        roomTypeId,
        from: toDateParam(checkIn),
        // rangeEnd is the inclusive last night; the lib adds +1 for the RPC's
        // exclusive p_to so the last night is written + single-day works.
        to: toDateParam(rangeEnd),
        isClosed: closed,
        priceOverrideDzd:
          priceVal != null && Number.isFinite(priceVal) && priceVal > 0 ? Math.round(priceVal) : null,
        minStay:
          minStayVal != null && Number.isFinite(minStayVal) && minStayVal > 0
            ? Math.round(minStayVal)
            : null,
      });
      haptics.success();
      setFeedback({ kind: 'ok', text: pick(L.hostCalendarApplied, locale) });
      await loadAvailability();
      setCheckIn(null);
      setCheckOut(null);
    } catch {
      setFeedback({ kind: 'err', text: pick(L.hostCalendarFailed, locale) });
    } finally {
      setApplying(false);
    }
  }

  async function onClearOverride() {
    if (!roomTypeId || !checkIn || !rangeEnd) return;
    setApplying(true);
    setFeedback(null);
    try {
      await clearAvailabilityOverride(
        roomTypeId,
        toDateParam(checkIn),
        toDateParam(rangeEnd),
      );
      haptics.selection();
      setFeedback({ kind: 'ok', text: pick(L.hostCalendarApplied, locale) });
      await loadAvailability();
      setCheckIn(null);
      setCheckOut(null);
    } catch {
      setFeedback({ kind: 'err', text: pick(L.hostCalendarFailed, locale) });
    } finally {
      setApplying(false);
    }
  }

  // ---- Render: loading / error / empty gates ----
  if (properties === null) {
    return (
      <Screen>
        <Header title={pick(L.hostCalendarTitle, locale)} />
        <SkeletonList count={4} />
      </Screen>
    );
  }
  if (loadError && properties.length === 0) {
    return (
      <Screen>
        <Header title={pick(L.hostCalendarTitle, locale)} />
        <View style={styles.centerFill}>
          <ErrorState
            message={loadError}
            onRetry={() => void loadProperties()}
            retryLabel={pick(L.tryAgain, locale)}
          />
        </View>
      </Screen>
    );
  }
  if (properties.length === 0) {
    return (
      <Screen>
        <Header title={pick(L.hostCalendarTitle, locale)} />
        <View style={styles.centerFill}>
          <EmptyState
            title={pick(L.hostNoListingsTitle, locale)}
            subtitle={pick(L.hostNoListingsBody, locale)}
          />
        </View>
      </Screen>
    );
  }

  const hasRange = checkIn !== null;

  return (
    <Screen>
      <Header title={pick(L.hostCalendarTitle, locale)} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Listing picker */}
        <Text variant="title" weight="bold" style={styles.sectionLabel}>
          {pick(L.hostPickListing, locale)}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {properties.map((p) => {
            const active = p.id === propertyId;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setPropertyId(p.id)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text
                  variant="body-sm"
                  weight={active ? 'semibold' : 'medium'}
                  color={active ? 'primary' : 'text'}
                  numberOfLines={1}
                >
                  {propTitle(p, locale) || pick(L.notFoundTitle, locale)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Room-type picker */}
        <Text variant="title" weight="bold" style={styles.sectionLabel}>
          {pick(L.hostPickRoomType, locale)}
        </Text>
        {roomTypes === null ? (
          <Skeleton style={styles.roomSkeleton} />
        ) : roomTypes.length === 0 ? (
          <Text variant="body-sm" color="textMuted" style={styles.muted}>
            {pick(L.hostNoRoomTypes, locale)}
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            {roomTypes.map((rt) => {
              const active = rt.id === roomTypeId;
              return (
                <Pressable
                  key={rt.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setRoomTypeId(rt.id);
                    clearSelection();
                  }}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text
                    variant="body-sm"
                    weight={active ? 'semibold' : 'medium'}
                    color={active ? 'primary' : 'text'}
                    numberOfLines={1}
                  >
                    {roomLabel(rt, locale) || pick(L.chooseRoom, locale)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Draft-listing note */}
        {selectedProperty && selectedProperty.status !== 'approved' ? (
          <View style={styles.noteBox}>
            <Text variant="caption" color="warning">
              {pick(L.hostDraftListingNote, locale)}
            </Text>
          </View>
        ) : null}

        {roomTypeId ? (
          <>
            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.legendSwatchAvailable]} />
                <Text variant="caption" color="textMuted">
                  {pick(L.hostLegendAvailable, locale)}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.legendSwatchClosed]} />
                <Text variant="caption" color="textMuted">
                  {pick(L.hostLegendClosed, locale)}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotBooked]} />
                <Text variant="caption" color="textMuted">
                  {pick(L.hostLegendBooked, locale)}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotOverride]} />
                <Text variant="caption" color="textMuted">
                  {pick(L.hostLegendOverride, locale)}
                </Text>
              </View>
            </View>
            <Text variant="caption" color="textMuted" style={styles.bookingsNote}>
              {pick(L.hostBookingsOverlayNote, locale)}
            </Text>

            {/* Month grid */}
            <View style={styles.calendarWrap}>
              {availLoading && availability.length === 0 ? (
                <Skeleton style={styles.calSkeleton} />
              ) : (
                <DateRangePicker
                  locale={locale}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onChange={({ checkIn: ci, checkOut: co }) => {
                    setCheckIn(ci);
                    setCheckOut(co);
                    setFeedback(null);
                  }}
                  monthsAhead={6}
                  dayMeta={dayMeta}
                  scroll={false}
                />
              )}
            </View>

            {/* Edit panel — borderless */}
            {hasRange ? (
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <Text variant="title" weight="bold" style={styles.flex}>
                    {pick(L.hostRangeSelected, locale)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={pick(L.hostClearRange, locale)}
                    onPress={clearSelection}
                    hitSlop={8}
                    style={styles.clearBtn}
                  >
                    <X size={16} color={theme.color.accent} strokeWidth={2.5} />
                    <Text variant="body-sm" weight="medium" color="accent">
                      {pick(L.hostClearRange, locale)}
                    </Text>
                  </Pressable>
                </View>
                <Text variant="body" weight="semibold" style={styles.panelRange}>
                  {rangeEnd
                    ? formatRange(toDateParam(checkIn), toDateParam(rangeEnd), locale)
                    : ''}
                </Text>

                {/* Block / unblock toggle */}
                <View style={styles.toggleRow}>
                  <View style={styles.flex}>
                    <Text variant="body" weight="semibold">
                      {pick(L.hostBlock, locale)}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {pick(closed ? L.hostBlock : L.hostUnblock, locale)}
                    </Text>
                  </View>
                  <Switch
                    value={closed}
                    onValueChange={setClosed}
                    trackColor={{ true: theme.color.primary, false: theme.color.border }}
                    thumbColor={theme.color.surface}
                  />
                </View>

                <TextField
                  label={pick(L.hostPriceOverride, locale)}
                  hint={pick(L.hostKeepCurrent, locale)}
                  value={priceText}
                  onChangeText={setPriceText}
                  placeholder="—"
                  keyboardType="number-pad"
                />
                {priceText.trim() && Number(priceText.trim()) > 0 ? (
                  <Text variant="body" weight="bold" color="primary" style={styles.pricePreview}>
                    {formatDZD(Math.round(Number(priceText.trim())), locale)}
                  </Text>
                ) : null}

                <TextField
                  label={pick(L.hostMinStay, locale)}
                  hint={pick(L.hostKeepCurrent, locale)}
                  value={minStayText}
                  onChangeText={setMinStayText}
                  placeholder="—"
                  keyboardType="number-pad"
                />

                {feedback ? (
                  <Text
                    variant="body-sm"
                    weight="medium"
                    color={feedback.kind === 'ok' ? 'success' : 'error'}
                  >
                    {feedback.text}
                  </Text>
                ) : null}

                <View style={styles.applyRow}>
                  <Button
                    label={pick(L.hostApplyChanges, locale)}
                    onPress={() => void onApply()}
                    loading={applying}
                    disabled={applying || rangeNights === 0}
                  />
                </View>
                <Button
                  label={pick(L.hostClearOverride, locale)}
                  variant="ghost"
                  onPress={() => void onClearOverride()}
                  disabled={applying || rangeNights === 0}
                />
              </View>
            ) : (
              <Text variant="body-sm" color="textMuted" center style={styles.hint}>
                {pick(L.hostSelectRange, locale)}
              </Text>
            )}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerFill: { flex: 1, justifyContent: 'center' },

  scroll: { padding: theme.space.xl, paddingBottom: theme.space['3xl'], gap: theme.space.md },

  sectionLabel: { marginTop: theme.space.lg, marginBottom: theme.space.xs },
  pillRow: { gap: theme.space.sm, paddingVertical: theme.space.xs },
  pill: {
    maxWidth: 220,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  pillActive: { borderColor: theme.color.primary, backgroundColor: theme.color.infoBg },

  roomSkeleton: { height: 40, borderRadius: theme.radius.pill },
  muted: { paddingVertical: theme.space.sm },

  noteBox: {
    backgroundColor: theme.color.warningBg,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    marginTop: theme.space.sm,
  },
  bookingsNote: { marginTop: theme.space.xs },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.lg,
    marginTop: theme.space.md,
    alignItems: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  legendSwatch: { width: 16, height: 16, borderRadius: theme.radius.sm },
  legendSwatchAvailable: {
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  legendSwatchClosed: { backgroundColor: theme.color.surfaceSunken },
  legendDot: { width: 8, height: 8, borderRadius: theme.radius.pill },
  legendDotBooked: { backgroundColor: theme.color.primary },
  legendDotOverride: { backgroundColor: theme.color.accent },

  calendarWrap: { minHeight: 320 },
  calSkeleton: { height: 320, borderRadius: theme.radius.lg },

  hint: { marginTop: theme.space.md },

  // Borderless edit panel (no surface box / shadow).
  panel: {
    marginTop: theme.space.lg,
    paddingTop: theme.space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
    gap: theme.space.md,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
  },
  panelRange: { writingDirection: 'ltr' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  pricePreview: { marginTop: -theme.space.sm },
  applyRow: { marginTop: theme.space.xs },
});
