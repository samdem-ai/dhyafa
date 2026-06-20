/**
 * Wizard step 5 — amenities multi-select, grouped by category. Selection is
 * held in the wizard draft and synced to property_amenities on Next.
 */

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Wifi,
  Snowflake,
  Flame,
  Tv,
  Briefcase,
  SquareParking,
  WavesLadder,
  Sun,
  Trees,
  Droplets,
  FlameKindling,
  Utensils,
  Refrigerator,
  Microwave,
  Coffee,
  Soup,
  WashingMachine,
  Droplet,
  Bath,
  Wind,
  Sparkles,
  ShieldAlert,
  Cross,
  ShieldCheck,
  Video,
  Zap,
  DoorOpen,
  Accessibility,
  ArrowUpDown,
  Croissant,
  Plane,
  PawPrint,
  Tag,
  type LucideProps,
} from 'lucide-react-native';
import type { Locale } from '@dyafa/i18n';
import {
  listAmenities,
  localizedName,
  setAmenities,
  type AmenityRow,
} from '@/lib/listings';
import { useWizard } from '@/lib/wizard';
import { WizardChrome } from '@/components/WizardChrome';
import { Text, Chip, Skeleton, ErrorState } from '@/ui';
import { L, pick as pickL, type LMessage } from '@/lib/copy';
import { theme } from '@/theme';

const COPY = {
  title: { ar: 'ما المرافق المتوفرة؟', fr: 'Quels équipements ?', en: 'What amenities?' },
  subtitle: {
    ar: 'اختر كل ما ينطبق على مكانك.',
    fr: 'Sélectionnez tout ce qui s’applique.',
    en: 'Select everything your place offers.',
  },
  loadError: { ar: 'تعذّر تحميل المرافق.', fr: 'Échec du chargement.', en: 'Failed to load amenities.' },
  saveError: { ar: 'تعذّر الحفظ.', fr: "Échec de l'enregistrement.", en: 'Could not save.' },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

/** Amenity slug → outline lucide icon (no emoji). Falls back to Tag. */
const AMENITY_ICON: Record<string, ComponentType<LucideProps>> = {
  wifi: Wifi,
  air_conditioning: Snowflake,
  heating: Flame,
  tv: Tv,
  workspace: Briefcase,
  parking: SquareParking,
  pool: WavesLadder,
  terrace: Sun,
  garden: Trees,
  sea_view: Droplets,
  bbq: FlameKindling,
  kitchen: Utensils,
  fridge: Refrigerator,
  microwave: Microwave,
  coffee_maker: Coffee,
  dishwasher: Soup,
  washer: WashingMachine,
  hot_water: Droplet,
  hammam: Bath,
  hair_dryer: Wind,
  toiletries: Sparkles,
  smoke_alarm: ShieldAlert,
  first_aid: Cross,
  fire_extinguisher: ShieldCheck,
  security_cameras: Video,
  generator: Zap,
  step_free_access: DoorOpen,
  wheelchair: Accessibility,
  elevator: ArrowUpDown,
  breakfast: Croissant,
  airport_shuttle: Plane,
  pets_allowed: PawPrint,
};

function amenityIcon(slug: string): ComponentType<LucideProps> {
  return AMENITY_ICON[slug] ?? Tag;
}

/** Map a DB amenity category slug → a localized heading (fallback: humanized slug). */
const CATEGORY_LABEL: Record<string, LMessage> = {
  essentials: L.amCatEssentials,
  features: L.amCatFeatures,
  safety: L.amCatSafety,
  location: L.amCatLocation,
  accessibility: L.amCatAccessibility,
  kitchen: L.amCatKitchen,
  bathroom: L.amCatBathroom,
  outdoor: L.amCatOutdoor,
  entertainment: L.amCatEntertainment,
  other: L.amCatOther,
};

function categoryHeading(slug: string, locale: Locale): string {
  const m = CATEGORY_LABEL[slug];
  if (m) return pickL(m, locale);
  // Humanize an unmapped slug: 'home_office' → 'Home office'.
  const words = slug.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default function StepAmenities() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { draft, patch, ensureDraft } = useWizard();

  const [amenities, setAmenitiesState] = useState<AmenityRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setAmenitiesState(await listAmenities());
    } catch {
      setError(pick(COPY.loadError, locale));
      setAmenitiesState([]);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, AmenityRow[]>();
    for (const a of amenities ?? []) {
      const key = a.category ?? 'other';
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [amenities]);

  function toggle(id: number) {
    const set = new Set(draft.amenityIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    patch({ amenityIds: [...set] });
  }

  async function onNext() {
    setSaving(true);
    setSaveError(null);
    try {
      const id = await ensureDraft();
      await setAmenities(id, draft.amenityIds);
      router.push('/host/new/rules');
    } catch {
      setSaveError(pick(COPY.saveError, locale));
    } finally {
      setSaving(false);
    }
  }

  if (amenities === null) {
    return (
      <View style={styles.fill}>
        <View style={styles.skeletonWrap}>
          {[0, 1, 2].map((g) => (
            <View key={g} style={styles.skelGroup}>
              <Skeleton style={styles.skelHeading} radius={theme.radius.sm} />
              <View style={styles.chips}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} style={styles.skelChip} radius={theme.radius.pill} />
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }
  if (error && amenities.length === 0) {
    return (
      <View style={styles.centerFill}>
        <ErrorState
          message={error}
          onRetry={() => void load()}
          retryLabel={pickL(L.tryAgain, locale)}
        />
      </View>
    );
  }

  return (
    <WizardChrome
      locale={locale}
      step={5}
      title={pick(COPY.title, locale)}
      subtitle={pick(COPY.subtitle, locale)}
      nextLoading={saving}
      onNext={() => void onNext()}
    >
      {grouped.map(([category, items]) => (
        <View key={category} style={styles.group}>
          <Text variant="title" weight="bold">
            {categoryHeading(category, locale)}
          </Text>
          <View style={styles.chips}>
            {items.map((a) => (
              <Chip
                key={a.id}
                label={localizedName(a, locale) || a.slug}
                icon={amenityIcon(a.slug)}
                selected={draft.amenityIds.includes(a.id)}
                onPress={() => toggle(a.id)}
              />
            ))}
          </View>
        </View>
      ))}
      {saveError ? (
        <View style={styles.errorBox}>
          <Text variant="body-sm" color="error" center>
            {saveError}
          </Text>
        </View>
      ) : null}
    </WizardChrome>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.color.bg },
  centerFill: { flex: 1, justifyContent: 'center', backgroundColor: theme.color.bg },
  group: { gap: theme.space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  errorBox: {
    backgroundColor: theme.color.errorBg,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
  },
  skeletonWrap: { padding: theme.space.xl, gap: theme.space.xl },
  skelGroup: { gap: theme.space.md },
  skelHeading: { height: 18, width: '40%' },
  skelChip: { height: 36, width: 96 },
});
