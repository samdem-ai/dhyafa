/**
 * Search entry (Phase 4 rework).
 *
 * Built on src/ui: Screen + Header, a searchable wilaya BottomSheet picker (all
 * 69 wilayas, not a clipped 320px slice), a DateRangePicker in a BottomSheet
 * (not nested in the page ScrollView), a guests stepper sheet with an "any
 * guests" option, and recent/popular destinations. Navigates to results with
 * typed params.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView, I18nManager } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
import { MapPin, Calendar as CalendarIcon, Users, Search as SearchIcon, ChevronRight } from 'lucide-react-native';
import {
  listActiveWilayas,
  listWilayasWithListings,
  localizedName,
  type WilayaLite,
} from '@/lib/discovery';
import { DateRangePicker } from '@/components/Calendar';
import { GuestStepperRow } from '@/components/discovery';
import {
  Screen,
  Header,
  Text,
  Heading,
  Button,
  SearchBar,
  Chip,
  BottomSheet,
} from '@/ui';
import { L, pick } from '@/lib/copy';
import { toDateParam } from '@/lib/bookings';
import { toParams, type SearchState } from '@/lib/searchParams';
import { formatRange } from '@/lib/dateFormat';
import { theme } from '@/theme';

type Sheet = 'destination' | 'dates' | 'guests' | null;

export default function SearchEntryScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;

  const [sheet, setSheet] = useState<Sheet>(null);

  const [wilayas, setWilayas] = useState<WilayaLite[]>([]);
  const [withListings, setWithListings] = useState<Set<number>>(new Set());
  const [wilayaQuery, setWilayaQuery] = useState('');
  const [wilayaCode, setWilayaCode] = useState<number | null>(null);

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  const [anyGuests, setAnyGuests] = useState(true);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  useEffect(() => {
    let mounted = true;
    Promise.all([listActiveWilayas(), listWilayasWithListings()])
      .then(([all, codes]) => {
        if (!mounted) return;
        setWilayas(all);
        setWithListings(new Set(codes));
      })
      .catch(() => {
        if (mounted) setWilayas([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const sortedWilayas = useMemo(() => {
    // Wilayas with listings first, then by code.
    return [...wilayas].sort((a, b) => {
      const aHas = withListings.has(a.code) ? 0 : 1;
      const bHas = withListings.has(b.code) ? 0 : 1;
      return aHas - bHas || a.code - b.code;
    });
  }, [wilayas, withListings]);

  const filteredWilayas = useMemo(() => {
    const q = wilayaQuery.trim().toLowerCase();
    if (!q) return sortedWilayas;
    return sortedWilayas.filter((w) =>
      [w.name_ar, w.name_fr, w.name_en].some((n) => (n ?? '').toLowerCase().includes(q)),
    );
  }, [sortedWilayas, wilayaQuery]);

  // "Popular destinations" = wilayas that actually have approved listings (top 6).
  const popular = useMemo(
    () => sortedWilayas.filter((w) => withListings.has(w.code)).slice(0, 6),
    [sortedWilayas, withListings],
  );

  const selectedWilayaName = useMemo(() => {
    if (wilayaCode == null) return pick(L.anyDestination, locale);
    const w = wilayas.find((x) => x.code === wilayaCode);
    return w ? localizedName(w, locale) : pick(L.anyDestination, locale);
  }, [wilayaCode, wilayas, locale]);

  const datesLabel =
    checkIn && checkOut ? formatRange(checkIn, checkOut, locale) : pick(L.anyDates, locale);

  const guestsTotal = adults + children;
  const guestsLabel = anyGuests
    ? pick(L.anyGuests, locale)
    : `${formatNumber(guestsTotal, locale)} ${
        guestsTotal === 1 ? pick(L.guestsCount, locale) : pick(L.guestsCountPlural, locale)
      }`;

  function pickWilaya(code: number | null) {
    setWilayaCode(code);
    setSheet(null);
  }

  function onSearch() {
    const state: SearchState = {
      wilayaCode,
      checkIn: checkIn ? toDateParam(checkIn) : null,
      checkOut: checkOut ? toDateParam(checkOut) : null,
      adults: anyGuests ? undefined : adults,
      children: anyGuests ? undefined : children,
      guests: anyGuests ? null : guestsTotal,
    };
    router.push({ pathname: '/search/results', params: toParams(state) });
  }

  function onClear() {
    setWilayaCode(null);
    setCheckIn(null);
    setCheckOut(null);
    setAnyGuests(true);
    setAdults(1);
    setChildren(0);
    setWilayaQuery('');
  }

  return (
    <Screen
      edges={['top']}
      footer={<Button label={pick(L.search, locale)} icon={SearchIcon} onPress={onSearch} />}
    >
      <Header
        title={pick(L.searchTitle, locale)}
        rightSlot={
          <Pressable accessibilityRole="button" onPress={onClear} hitSlop={8} style={styles.clearBtn}>
            <Text variant="body-sm" color="accent" weight="semibold">
              {pick(L.clear, locale)}
            </Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.fieldGroup}>
          <FieldRow
            icon={MapPin}
            label={pick(L.destination, locale)}
            value={selectedWilayaName}
            onPress={() => setSheet('destination')}
          />
          <View style={styles.fieldDivider} />
          <FieldRow
            icon={CalendarIcon}
            label={pick(L.dates, locale)}
            value={datesLabel}
            onPress={() => setSheet('dates')}
          />
          <View style={styles.fieldDivider} />
          <FieldRow
            icon={Users}
            label={pick(L.guests, locale)}
            value={guestsLabel}
            onPress={() => setSheet('guests')}
          />
        </View>

        {/* Popular destinations */}
        {popular.length > 0 ? (
          <View style={styles.popularWrap}>
            <Text variant="title" weight="bold">
              {pick(L.popularDestinations, locale)}
            </Text>
            <View style={styles.chipWrap}>
              {popular.map((w) => (
                <Chip
                  key={w.code}
                  label={localizedName(w, locale)}
                  selected={w.code === wilayaCode}
                  onPress={() => setWilayaCode(w.code)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Destination sheet */}
      <BottomSheet
        visible={sheet === 'destination'}
        onClose={() => setSheet(null)}
        snapPoints={['85%']}
      >
        <Heading level={3} style={styles.sheetTitle}>
          {pick(L.destination, locale)}
        </Heading>
        <SearchBar
          value={wilayaQuery}
          onChangeText={setWilayaQuery}
          placeholder={pick(L.searchWilayaPlaceholder, locale)}
          clearLabel={pick(L.clear, locale)}
        />
        <ScrollView style={styles.wilayaList} keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityRole="button"
            onPress={() => pickWilaya(null)}
            style={({ pressed }) => [styles.wilayaRow, pressed && styles.pressed]}
          >
            <Text variant="body-lg" color={wilayaCode == null ? 'primary' : 'text'}>
              {pick(L.anyDestination, locale)}
            </Text>
          </Pressable>
          {filteredWilayas.map((w) => {
            const selected = w.code === wilayaCode;
            const has = withListings.has(w.code);
            return (
              <Pressable
                key={w.code}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => pickWilaya(w.code)}
                style={({ pressed }) => [styles.wilayaRow, pressed && styles.pressed]}
              >
                <Text variant="body-lg" color={selected ? 'primary' : 'text'} style={styles.flex}>
                  {localizedName(w, locale)}
                </Text>
                {has ? <View style={styles.hasDot} /> : null}
              </Pressable>
            );
          })}
          {filteredWilayas.length === 0 ? (
            <Text variant="body" color="textMuted" center style={styles.noMatch}>
              {pick(L.searchNoMatches, locale)}
            </Text>
          ) : null}
        </ScrollView>
      </BottomSheet>

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
            onChange={({ checkIn: ci, checkOut: co }) => {
              setCheckIn(ci);
              setCheckOut(co);
            }}
          />
        </View>
        <Button label={pick(L.done, locale)} onPress={() => setSheet(null)} />
      </BottomSheet>

      {/* Guests sheet */}
      <BottomSheet visible={sheet === 'guests'} onClose={() => setSheet(null)} snapPoints={['55%']}>
        <Heading level={3} style={styles.sheetTitle}>
          {pick(L.guests, locale)}
        </Heading>
        <View style={styles.guestRows}>
          <Chip
            label={pick(L.anyGuests, locale)}
            selected={anyGuests}
            onPress={() => setAnyGuests((v) => !v)}
          />
          {!anyGuests ? (
            <>
              <GuestStepperRow
                label={pick(L.adults, locale)}
                value={adults}
                min={1}
                max={16}
                onChange={setAdults}
              />
              <View style={styles.divider} />
              <GuestStepperRow
                label={pick(L.children, locale)}
                value={children}
                min={0}
                max={10}
                onChange={setChildren}
              />
            </>
          ) : null}
        </View>
        <Button label={pick(L.done, locale)} onPress={() => setSheet(null)} />
      </BottomSheet>
    </Screen>
  );
}

function FieldRow({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.fieldRow, pressed && styles.pressed]}
    >
      <Icon size={22} color={theme.color.primary} strokeWidth={2} />
      <View style={styles.fieldBody}>
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
        <Text variant="body-lg" weight="semibold" numberOfLines={1}>
          {value}
        </Text>
      </View>
      <ChevronRight
        size={20}
        color={theme.color.ink300}
        strokeWidth={2}
        style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  flex: { flex: 1 },
  clearBtn: { paddingHorizontal: theme.space.sm },

  scroll: { padding: theme.space.xl, gap: theme.space['2xl'], paddingBottom: theme.space['2xl'] },

  fieldGroup: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.lg,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingVertical: theme.space.lg,
  },
  fieldDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.color.border },
  fieldBody: { flex: 1, gap: 2 },

  popularWrap: { gap: theme.space.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },

  sheetTitle: { marginBottom: theme.space.sm },
  wilayaList: { maxHeight: 440, marginTop: theme.space.sm },
  wilayaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingVertical: theme.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
  hasDot: { width: 6, height: 6, borderRadius: theme.radius.pill, backgroundColor: theme.color.accent },
  noMatch: { paddingVertical: theme.space.xl },

  calendarWrap: { height: 420, marginVertical: theme.space.sm },
  guestRows: { marginVertical: theme.space.md, gap: theme.space.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.color.border },
});
