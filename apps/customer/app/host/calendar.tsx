/**
 * Host calendar & pricing (M4).
 *
 * Flow: pick one of the host's listings → pick a room type → month grid
 * (reuses Calendar's DateRangePicker, decorated with per-day closed / price-
 * override markers from the `availability` rows) → select a date range → an
 * edit panel to block/unblock, set a nightly price override (DZD), and set a
 * minimum stay. Applying calls set_availability_range (one RPC per range) and
 * re-reads availability so the grid reflects the change.
 *
 * Designed skeleton + empty + error states; pull-to-refresh on the grid; full
 * RTL. formatDZD is used for any money the host sees.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  I18nManager,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDZD, type Locale } from '@dyafa/i18n';
import { DateRangePicker, type DayMeta } from '@/components/Calendar';
import {
  listRoomTypesForProperty,
  listAvailability,
  setAvailabilityRange,
  type RoomTypeRow,
  type AvailabilityRow,
} from '@/lib/host';
import { listMyProperties, localizedName, type PropertyRow } from '@/lib/listings';
import { toDateParam, nightsBetween } from '@/lib/bookings';
import { TextField, ToggleRow } from '@/components/fields';
import {
  PrimaryButton,
  Skeleton,
  SkeletonList,
  ErrorState,
  EmptyState,
} from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { formatRange } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

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
  const locale = (i18n.language ?? 'ar') as Locale;

  const [properties, setProperties] = useState<PropertyRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomTypeRow[] | null>(null);
  const [roomTypeId, setRoomTypeId] = useState<string | null>(null);

  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
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
      return;
    }
    setAvailLoading(true);
    try {
      const rows = await listAvailability(roomTypeId, dayOffset(0), dayOffset(WINDOW_DAYS));
      setAvailability(rows);
    } catch {
      setAvailability([]);
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
    return map;
  }, [availability]);

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
        to: toDateParam(rangeEnd),
        isClosed: closed,
        priceOverrideDzd:
          priceVal != null && Number.isFinite(priceVal) && priceVal > 0 ? Math.round(priceVal) : null,
        minStay:
          minStayVal != null && Number.isFinite(minStayVal) && minStayVal > 0
            ? Math.round(minStayVal)
            : null,
      });
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
      <SafeAreaView style={styles.safe}>
        <TopBar locale={locale} />
        <SkeletonList count={4} />
      </SafeAreaView>
    );
  }
  if (loadError && properties.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar locale={locale} />
        <ErrorState
          message={loadError}
          onRetry={() => void loadProperties()}
          retryLabel={pick(L.search, locale)}
        />
      </SafeAreaView>
    );
  }
  if (properties.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar locale={locale} />
        <EmptyState
          title={pick(L.hostNoListingsTitle, locale)}
          subtitle={pick(L.hostNoListingsBody, locale)}
        />
      </SafeAreaView>
    );
  }

  const hasRange = checkIn !== null;

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar locale={locale} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Listing picker */}
        <Text style={styles.sectionLabel}>{pick(L.hostPickListing, locale)}</Text>
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
                <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>
                  {propTitle(p, locale) || pick(L.notFoundTitle, locale)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Room-type picker */}
        <Text style={styles.sectionLabel}>{pick(L.hostPickRoomType, locale)}</Text>
        {roomTypes === null ? (
          <Skeleton style={styles.roomSkeleton} />
        ) : roomTypes.length === 0 ? (
          <Text style={styles.muted}>{pick(L.hostNoRoomTypes, locale)}</Text>
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
                  <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>
                    {roomLabel(rt, locale) || pick(L.chooseRoom, locale)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {roomTypeId ? (
          <>
            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: theme.color.surfaceSunken }]} />
                <Text style={styles.legendText}>{pick(L.hostLegendClosed, locale)}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.color.accent }]} />
                <Text style={styles.legendText}>{pick(L.hostLegendOverride, locale)}</Text>
              </View>
            </View>

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
                />
              )}
            </View>

            {/* Edit panel */}
            {hasRange ? (
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>{pick(L.hostRangeSelected, locale)}</Text>
                  <Pressable accessibilityRole="button" onPress={clearSelection} hitSlop={8}>
                    <Text style={styles.clearText}>{pick(L.hostClearRange, locale)}</Text>
                  </Pressable>
                </View>
                <Text style={styles.panelRange}>
                  {rangeEnd
                    ? formatRange(toDateParam(checkIn), toDateParam(rangeEnd), locale)
                    : ''}
                </Text>

                <ToggleRow
                  label={pick(L.hostBlock, locale)}
                  hint={pick(closed ? L.hostBlock : L.hostUnblock, locale)}
                  value={closed}
                  onValueChange={setClosed}
                />

                <TextField
                  label={pick(L.hostPriceOverride, locale)}
                  hint={pick(L.hostKeepCurrent, locale)}
                  value={priceText}
                  onChangeText={setPriceText}
                  placeholder="—"
                  keyboardType="number-pad"
                />
                {priceText.trim() && Number(priceText.trim()) > 0 ? (
                  <Text style={styles.pricePreview}>
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
                  <Text style={feedback.kind === 'ok' ? styles.okText : styles.errText}>
                    {feedback.text}
                  </Text>
                ) : null}

                <View style={styles.applyRow}>
                  <PrimaryButton
                    label={pick(L.hostApplyChanges, locale)}
                    onPress={() => void onApply()}
                    loading={applying}
                    disabled={applying || rangeNights === 0}
                  />
                </View>
              </View>
            ) : (
              <Text style={styles.hint}>{pick(L.hostSelectRange, locale)}</Text>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TopBar({ locale }: { locale: Locale }) {
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
        <Text style={styles.topBack}>{I18nManager.isRTL ? '→' : '←'}</Text>
      </Pressable>
      <Text style={styles.topTitle}>{pick(L.hostCalendarTitle, locale)}</Text>
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
    backgroundColor: theme.color.surface,
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

  scroll: { padding: theme.space.xl, paddingBottom: theme.space['3xl'], gap: theme.space.sm },

  sectionLabel: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    marginTop: theme.space.md,
    marginBottom: theme.space.xs,
    textAlign,
  },
  pillRow: { gap: theme.space.sm, paddingVertical: theme.space.xs },
  pill: {
    maxWidth: 220,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  pillActive: { borderColor: theme.color.primary, backgroundColor: theme.color.infoBg },
  pillText: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.text,
  },
  pillTextActive: { color: theme.color.primary, fontWeight: '600' },

  roomSkeleton: { height: 40, borderRadius: theme.radius.pill },
  muted: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
    paddingVertical: theme.space.sm,
  },

  legend: {
    flexDirection: 'row',
    gap: theme.space.lg,
    marginTop: theme.space.md,
    alignItems: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  legendSwatch: { width: 16, height: 16, borderRadius: theme.radius.sm },
  legendDot: { width: 8, height: 8, borderRadius: theme.radius.pill },
  legendText: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
  },

  calendarWrap: { minHeight: 320 },
  calSkeleton: { height: 320, borderRadius: theme.radius.card },

  hint: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign: 'center',
    marginTop: theme.space.md,
    lineHeight: theme.lineHeight['body-sm'],
  },

  panel: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
    marginTop: theme.space.md,
    gap: theme.space.md,
    ...theme.shadow.card,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  panelTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  clearText: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.accent,
  },
  panelRange: {
    fontFamily: RN_FONTS.bodySemiBold,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
    textAlign,
    writingDirection: 'ltr',
  },
  pricePreview: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize.body,
    fontWeight: '700',
    color: theme.color.primary,
    textAlign,
    marginTop: -theme.space.sm,
  },
  applyRow: { marginTop: theme.space.xs },
  okText: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.success,
    textAlign,
  },
  errText: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.error,
    textAlign,
  },
});
