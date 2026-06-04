/**
 * Filters modal (M2).
 *
 * Edits a local copy of the search state (price range, property type, instant
 * book, guest rating, amenities), then navigates back to the results screen
 * with the new params applied. Reset clears all filter facets (keeps the
 * destination/dates/guests from the active search).
 */

import { useEffect, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatNumber, type Locale } from '@dyafa/i18n';
import {
  listPropertyTypesLite,
  listAmenitiesLite,
  localizedName,
  type PropertyTypeLite,
  type AmenityRow,
} from '@/lib/discovery';
import { Chip } from '@/components/fields';
import { PrimaryButton } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { fromParams, toParams, type SearchState } from '@/lib/searchParams';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const RATING_OPTIONS: (number | null)[] = [null, 3, 4, 4.5];

export default function FiltersScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const params = useLocalSearchParams();
  const initial = fromParams(params as Record<string, string | undefined>);

  const [minPrice, setMinPrice] = useState<string>(initial.minPrice != null ? String(initial.minPrice) : '');
  const [maxPrice, setMaxPrice] = useState<string>(initial.maxPrice != null ? String(initial.maxPrice) : '');
  const [typeIds, setTypeIds] = useState<number[]>(initial.propertyTypeIds ?? []);
  const [instant, setInstant] = useState<boolean>(initial.instantBookOnly ?? false);
  const [minRating, setMinRating] = useState<number | null>(initial.minRating ?? null);
  const [amenityIds, setAmenityIds] = useState<number[]>(initial.amenityIds ?? []);

  const [types, setTypes] = useState<PropertyTypeLite[]>([]);
  const [amenities, setAmenities] = useState<AmenityRow[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([listPropertyTypesLite(), listAmenitiesLite()])
      .then(([t, a]) => {
        if (!mounted) return;
        setTypes(t);
        setAmenities(a);
      })
      .catch(() => {
        if (mounted) {
          setTypes([]);
          setAmenities([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  function toggle<T>(list: T[], v: T): T[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  function buildState(): SearchState {
    const min = minPrice.trim() === '' ? null : Number(minPrice);
    const max = maxPrice.trim() === '' ? null : Number(maxPrice);
    return {
      ...initial,
      minPrice: Number.isFinite(min) ? min : null,
      maxPrice: Number.isFinite(max) ? max : null,
      propertyTypeIds: typeIds,
      instantBookOnly: instant,
      minRating,
      amenityIds,
    };
  }

  function onApply() {
    router.navigate({ pathname: '/search/results', params: toParams(buildState()) });
  }

  function onReset() {
    setMinPrice('');
    setMaxPrice('');
    setTypeIds([]);
    setInstant(false);
    setMinRating(null);
    setAmenityIds([]);
  }

  const ratingLabel = (r: number | null): string =>
    r == null ? pick(L.anyRating, locale) : `${formatNumber(r, locale)}+`;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.topTitle}>{pick(L.filters, locale)}</Text>
        <Pressable accessibilityRole="button" onPress={onReset} hitSlop={8}>
          <Text style={styles.reset}>{pick(L.resetFilters, locale)}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Price range */}
        <Section title={pick(L.priceRange, locale)}>
          <View style={styles.priceRow}>
            <View style={styles.priceField}>
              <Text style={styles.priceLabel}>{pick(L.minPrice, locale)}</Text>
              <TextInput
                style={styles.priceInput}
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.color.textMuted}
              />
            </View>
            <View style={styles.priceField}>
              <Text style={styles.priceLabel}>{pick(L.maxPrice, locale)}</Text>
              <TextInput
                style={styles.priceInput}
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="number-pad"
                placeholder="∞"
                placeholderTextColor={theme.color.textMuted}
              />
            </View>
          </View>
        </Section>

        {/* Instant book */}
        <Section title={pick(L.instantBookOnly, locale)}>
          <View style={styles.chipWrap}>
            <Chip
              label={`⚡ ${pick(L.instantBook, locale)}`}
              selected={instant}
              onPress={() => setInstant((v) => !v)}
            />
          </View>
        </Section>

        {/* Guest rating */}
        <Section title={pick(L.guestRating, locale)}>
          <View style={styles.chipWrap}>
            {RATING_OPTIONS.map((r) => (
              <Chip
                key={String(r)}
                label={ratingLabel(r)}
                icon={r == null ? undefined : '★'}
                selected={minRating === r}
                onPress={() => setMinRating(r)}
              />
            ))}
          </View>
        </Section>

        {/* Property type */}
        {types.length > 0 ? (
          <Section title={pick(L.propertyType, locale)}>
            <View style={styles.chipWrap}>
              {types.map((t) => (
                <Chip
                  key={t.id}
                  label={localizedName(t, locale)}
                  icon={t.icon ?? undefined}
                  selected={typeIds.includes(t.id)}
                  onPress={() => setTypeIds((l) => toggle(l, t.id))}
                />
              ))}
            </View>
          </Section>
        ) : null}

        {/* Amenities */}
        {amenities.length > 0 ? (
          <Section title={pick(L.amenities, locale)}>
            <View style={styles.chipWrap}>
              {amenities.map((a) => (
                <Chip
                  key={a.id}
                  label={localizedName(a, locale)}
                  icon={a.icon ?? undefined}
                  selected={amenityIds.includes(a.id)}
                  onPress={() => setAmenityIds((l) => toggle(l, a.id))}
                />
              ))}
            </View>
          </Section>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label={pick(L.showResults, locale)} onPress={onApply} />
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const textAlign = I18nManager.isRTL ? 'right' : 'left';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
    gap: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
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
  reset: { fontFamily: RN_FONTS.arabicMedium, fontSize: theme.fontSize['body-sm'], color: theme.color.accent },

  scroll: { padding: theme.space.xl, gap: theme.space.xl, paddingBottom: theme.space['2xl'] },
  section: { gap: theme.space.md },
  sectionTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },

  priceRow: { flexDirection: 'row', gap: theme.space.md },
  priceField: { flex: 1, gap: theme.space.xs },
  priceLabel: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
  },
  priceInput: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.md,
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
    textAlign,
  },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },

  footer: {
    padding: theme.space.xl,
    paddingTop: theme.space.md,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
});
