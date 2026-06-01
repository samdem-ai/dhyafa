/**
 * Search entry (M2).
 *
 * Destination (wilaya picker), date range (calendar), and guests (steppers).
 * Each opens as an in-screen panel (no extra routes). "Search" pushes to the
 * results screen with the state serialized as route params.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  TextInput,
  I18nManager,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
import {
  listActiveWilayas,
  listWilayasWithListings,
  localizedName,
  type WilayaLite,
} from '@/lib/discovery';
import { DateRangePicker } from '@/components/Calendar';
import { GuestStepperRow } from '@/components/discovery';
import { PrimaryButton } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { toDateParam } from '@/lib/bookings';
import { toParams, type SearchState } from '@/lib/searchParams';
import { formatRange } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

type Panel = 'destination' | 'dates' | 'guests' | null;

export default function SearchEntryScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;

  const [panel, setPanel] = useState<Panel>('destination');

  const [wilayas, setWilayas] = useState<WilayaLite[]>([]);
  const [withListings, setWithListings] = useState<Set<number>>(new Set());
  const [wilayaQuery, setWilayaQuery] = useState('');
  const [wilayaCode, setWilayaCode] = useState<number | null>(null);

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

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

  const filteredWilayas = useMemo(() => {
    const q = wilayaQuery.trim().toLowerCase();
    // Surface wilayas that have listings first, then the rest.
    const sorted = [...wilayas].sort((a, b) => {
      const aHas = withListings.has(a.code) ? 0 : 1;
      const bHas = withListings.has(b.code) ? 0 : 1;
      return aHas - bHas || a.code - b.code;
    });
    if (!q) return sorted;
    return sorted.filter((w) =>
      [w.name_ar, w.name_fr, w.name_en].some((n) => (n ?? '').toLowerCase().includes(q)),
    );
  }, [wilayas, withListings, wilayaQuery]);

  const selectedWilayaName = useMemo(() => {
    if (wilayaCode == null) return pick(L.anyDestination, locale);
    const w = wilayas.find((x) => x.code === wilayaCode);
    return w ? localizedName(w, locale) : pick(L.anyDestination, locale);
  }, [wilayaCode, wilayas, locale]);

  const datesLabel =
    checkIn && checkOut ? formatRange(checkIn, checkOut, locale) : pick(L.anyDates, locale);
  const guestsTotal = adults + children;
  const guestsLabel = `${formatNumber(guestsTotal, locale)} ${
    guestsTotal === 1 ? pick(L.guestsCount, locale) : pick(L.guestsCountPlural, locale)
  }`;

  function onSearch() {
    const state: SearchState = {
      wilayaCode,
      checkIn: checkIn ? toDateParam(checkIn) : null,
      checkOut: checkOut ? toDateParam(checkOut) : null,
      adults,
      children,
      guests: guestsTotal,
    };
    router.push({ pathname: '/search/results', params: toParams(state) });
  }

  function onClear() {
    setWilayaCode(null);
    setCheckIn(null);
    setCheckOut(null);
    setAdults(1);
    setChildren(0);
    setWilayaQuery('');
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pick(L.done, locale)}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.topTitle}>{pick(L.searchTitle, locale)}</Text>
        <Pressable accessibilityRole="button" onPress={onClear} hitSlop={8}>
          <Text style={styles.clear}>{pick(L.clear, locale)}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Destination section */}
        <SectionCard
          label={pick(L.destination, locale)}
          value={selectedWilayaName}
          open={panel === 'destination'}
          onToggle={() => setPanel(panel === 'destination' ? null : 'destination')}
        >
          <TextInput
            style={[styles.input, { textAlign: I18nManager.isRTL ? 'right' : 'left' }]}
            placeholder={pick(L.chooseWilaya, locale)}
            placeholderTextColor={theme.color.textMuted}
            value={wilayaQuery}
            onChangeText={setWilayaQuery}
          />
          <View style={styles.wilayaList}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setWilayaCode(null);
                setPanel('dates');
              }}
              style={({ pressed }) => [styles.wilayaRow, pressed && styles.pressed]}
            >
              <Text style={styles.wilayaName}>{pick(L.anyDestination, locale)}</Text>
            </Pressable>
            {filteredWilayas.slice(0, 30).map((w) => {
              const selected = w.code === wilayaCode;
              const has = withListings.has(w.code);
              return (
                <Pressable
                  key={w.code}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setWilayaCode(w.code);
                    setPanel('dates');
                  }}
                  style={({ pressed }) => [styles.wilayaRow, pressed && styles.pressed]}
                >
                  <Text style={[styles.wilayaName, selected && styles.wilayaNameSelected]}>
                    {localizedName(w, locale)}
                  </Text>
                  {has ? <View style={styles.hasDot} /> : null}
                  {selected ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        {/* Dates section */}
        <SectionCard
          label={pick(L.dates, locale)}
          value={datesLabel}
          open={panel === 'dates'}
          onToggle={() => setPanel(panel === 'dates' ? null : 'dates')}
        >
          <View style={styles.calendarWrap}>
            <DateRangePicker
              locale={locale}
              checkIn={checkIn}
              checkOut={checkOut}
              onChange={({ checkIn: ci, checkOut: co }) => {
                setCheckIn(ci);
                setCheckOut(co);
                if (ci && co) setPanel('guests');
              }}
            />
          </View>
        </SectionCard>

        {/* Guests section */}
        <SectionCard
          label={pick(L.guests, locale)}
          value={guestsLabel}
          open={panel === 'guests'}
          onToggle={() => setPanel(panel === 'guests' ? null : 'guests')}
        >
          <View style={styles.guestRows}>
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
          </View>
        </SectionCard>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton label={pick(L.search, locale)} onPress={onSearch} />
      </View>
    </SafeAreaView>
  );
}

function SectionCard({
  label,
  value,
  open,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, open && styles.sectionOpen]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={styles.sectionHeader}
      >
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.sectionValue} numberOfLines={1}>
          {value}
        </Text>
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

const textAlign = I18nManager.isRTL ? 'right' : 'left';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  pressed: { opacity: 0.85 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
    gap: theme.space.md,
  },
  close: { fontFamily: RN_FONTS.bodyMedium, fontSize: theme.fontSize.title, color: theme.color.text },
  topTitle: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-3'],
    fontWeight: '600',
    color: theme.color.text,
    textAlign: 'center',
  },
  clear: { fontFamily: RN_FONTS.arabicMedium, fontSize: theme.fontSize['body-sm'], color: theme.color.accent },

  scroll: { padding: theme.space.xl, gap: theme.space.md, paddingBottom: theme.space['2xl'] },

  section: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    overflow: 'hidden',
  },
  sectionOpen: { borderColor: theme.color.borderStrong, ...theme.shadow.card },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  sectionLabel: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
  },
  sectionValue: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign: I18nManager.isRTL ? 'left' : 'right',
  },
  sectionBody: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.lg,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
  },

  input: {
    marginTop: theme.space.md,
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
  },
  wilayaList: { marginTop: theme.space.sm, maxHeight: 320 },
  wilayaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingVertical: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  wilayaName: {
    flex: 1,
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
    textAlign,
  },
  wilayaNameSelected: { color: theme.color.primary, fontFamily: RN_FONTS.arabicSemiBold, fontWeight: '600' },
  hasDot: { width: 6, height: 6, borderRadius: theme.radius.pill, backgroundColor: theme.color.accent },
  check: { fontFamily: RN_FONTS.bodyBold, fontSize: theme.fontSize.title, color: theme.color.primary },

  calendarWrap: { height: 380, marginTop: theme.space.sm },
  guestRows: { marginTop: theme.space.md, gap: theme.space.md },
  divider: { height: 1, backgroundColor: theme.color.border },

  footer: {
    padding: theme.space.xl,
    paddingTop: theme.space.md,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
});
