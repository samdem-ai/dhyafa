/**
 * FiltersSheet — the search filters as a BottomSheet over results (Phase 4).
 *
 * Replaces the standalone /search/filters route (which created a second results
 * instance). Edits a local copy of the search state, validates min ≤ max price,
 * groups amenities by `amenities.category`, and shows a LIVE "Show N stays"
 * count on the apply button (debounced count via countMatchingProperties).
 */

import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { formatNumber, type Locale } from '@dyafa/i18n';
import { Zap, Star } from 'lucide-react-native';
import {
  listPropertyTypesLite,
  listAmenitiesLite,
  countMatchingProperties,
  localizedName,
  type PropertyTypeLite,
  type AmenityRow,
} from '@/lib/discovery';
import {
  BottomSheet,
  Text,
  Heading,
  Button,
  Chip,
  TextField,
} from '@/ui';
import { L, pick, type LMessage } from '@/lib/copy';
import { toFilters, type SearchState } from '@/lib/searchParams';
import { theme } from '@/theme';

const RATING_OPTIONS: (number | null)[] = [null, 3, 4, 4.5];

/** amenities.category → localized heading. */
const CATEGORY_LABEL: Record<string, LMessage> = {
  general: L.amCatEssentials,
  kitchen: L.amCatKitchen,
  bathroom: L.amCatBathroom,
  safety: L.amCatSafety,
  accessibility: L.amCatAccessibility,
  outdoor: L.amCatOutdoor,
};

export interface FiltersSheetProps {
  visible: boolean;
  onClose: () => void;
  state: SearchState;
  locale: Locale;
  onApply: (next: SearchState) => void;
}

export function FiltersSheet({ visible, onClose, state, locale, onApply }: FiltersSheetProps) {
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [typeIds, setTypeIds] = useState<number[]>([]);
  const [instant, setInstant] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [amenityIds, setAmenityIds] = useState<number[]>([]);

  const [types, setTypes] = useState<PropertyTypeLite[]>([]);
  const [amenities, setAmenities] = useState<AmenityRow[]>([]);

  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  // Seed local state from the active search whenever the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setMinPrice(state.minPrice != null ? String(state.minPrice) : '');
    setMaxPrice(state.maxPrice != null ? String(state.maxPrice) : '');
    setTypeIds(state.propertyTypeIds ?? []);
    setInstant(state.instantBookOnly ?? false);
    setMinRating(state.minRating ?? null);
    setAmenityIds(state.amenityIds ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Load facet options once.
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

  const parsedMin = minPrice.trim() === '' ? null : Number(minPrice);
  const parsedMax = maxPrice.trim() === '' ? null : Number(maxPrice);
  const min = Number.isFinite(parsedMin) ? parsedMin : null;
  const max = Number.isFinite(parsedMax) ? parsedMax : null;
  const priceInvalid = min != null && max != null && min > max;

  function buildState(): SearchState {
    return {
      ...state,
      minPrice: min,
      maxPrice: max,
      propertyTypeIds: typeIds,
      instantBookOnly: instant,
      minRating,
      amenityIds,
    };
  }

  // Live count: debounce on the current draft.
  useEffect(() => {
    if (!visible || priceInvalid) {
      setCount(null);
      return;
    }
    let cancelled = false;
    setCounting(true);
    const handle = setTimeout(() => {
      countMatchingProperties(toFilters(buildState()))
        .then((n) => {
          if (!cancelled) setCount(n);
        })
        .catch(() => {
          if (!cancelled) setCount(null);
        })
        .finally(() => {
          if (!cancelled) setCounting(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, minPrice, maxPrice, JSON.stringify(typeIds), instant, minRating, JSON.stringify(amenityIds), priceInvalid]);

  function toggle<T>(list: T[], v: T): T[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  function onReset() {
    setMinPrice('');
    setMaxPrice('');
    setTypeIds([]);
    setInstant(false);
    setMinRating(null);
    setAmenityIds([]);
  }

  // Group amenities by category for the headings.
  const groupedAmenities = useMemo(() => {
    const groups = new Map<string, AmenityRow[]>();
    for (const a of amenities) {
      const key = a.category ?? 'other';
      const arr = groups.get(key) ?? [];
      arr.push(a);
      groups.set(key, arr);
    }
    return [...groups.entries()];
  }, [amenities]);

  const ratingLabel = (r: number | null): string =>
    r == null ? pick(L.anyRating, locale) : `${formatNumber(r, locale)}+`;

  const applyLabel =
    priceInvalid
      ? pick(L.showResults, locale)
      : count != null
        ? `${pick(L.showNStays, locale)} (${formatNumber(count, locale)})`
        : pick(L.showResults, locale);

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={['90%']}>
      <View style={styles.header}>
        <Heading level={3}>{pick(L.filters, locale)}</Heading>
        <Button
          label={pick(L.resetFilters, locale)}
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={onReset}
        />
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Price range */}
        <Section title={pick(L.priceRange, locale)}>
          <View style={styles.priceRow}>
            <View style={styles.priceField}>
              <TextField
                label={pick(L.minPrice, locale)}
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.priceField}>
              <TextField
                label={pick(L.maxPrice, locale)}
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="number-pad"
                placeholder="∞"
              />
            </View>
          </View>
          {priceInvalid ? (
            <Text variant="caption" color="error" accessibilityLiveRegion="polite">
              {pick(L.priceRangeInvalid, locale)}
            </Text>
          ) : null}
        </Section>

        {/* Instant book */}
        <Section title={pick(L.instantBookOnly, locale)}>
          <View style={styles.chipWrap}>
            <Chip
              label={pick(L.instantBook, locale)}
              icon={Zap}
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
                icon={r == null ? undefined : Star}
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
                  selected={typeIds.includes(t.id)}
                  onPress={() => setTypeIds((l) => toggle(l, t.id))}
                />
              ))}
            </View>
          </Section>
        ) : null}

        {/* Amenities grouped by category */}
        {groupedAmenities.map(([category, list]) => {
          const heading = CATEGORY_LABEL[category]
            ? pick(CATEGORY_LABEL[category], locale)
            : pick(L.amCatOther, locale);
          return (
            <Section key={category} title={heading}>
              <View style={styles.chipWrap}>
                {list.map((a) => (
                  <Chip
                    key={a.id}
                    label={localizedName(a, locale)}
                    selected={amenityIds.includes(a.id)}
                    onPress={() => setAmenityIds((l) => toggle(l, a.id))}
                  />
                ))}
              </View>
            </Section>
          );
        })}
        <View style={styles.bottomPad} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={applyLabel}
          loading={counting && count == null}
          disabled={priceInvalid}
          onPress={() => onApply(buildState())}
        />
      </View>
    </BottomSheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="title" weight="bold">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space.md,
  },
  scroll: { maxHeight: 480 },
  section: { gap: theme.space.md, marginBottom: theme.space['2xl'] },
  priceRow: { flexDirection: 'row', gap: theme.space.md },
  priceField: { flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  bottomPad: { height: theme.space.lg },
  footer: {
    paddingTop: theme.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
  },
});
