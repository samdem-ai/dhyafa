/**
 * Wizard step 1 — property type + listing kind.
 *
 * Also the hydration entry point: if opened with ?propertyId=… it loads the
 * existing draft into the wizard before letting the host continue.
 */

import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import {
  listPropertyTypes,
  localizedName,
  getPropertyWithChildren,
  getAmenityIds,
  type PropertyTypeRow,
  type ListingKind,
  type CancellationTier,
} from '@/lib/listings';
import { useWizard, emptyRoom, type RoomTypeDraft } from '@/lib/wizard';
import { WizardChrome } from '@/components/WizardChrome';
import { SelectCard } from '@/components/fields';
import { FieldLabel, SkeletonList, ErrorState } from '@/components/ui';
import { theme } from '@/theme';

const COPY = {
  title: { ar: 'ما نوع مكانك؟', fr: 'Quel type de lieu ?', en: 'What kind of place?' },
  subtitle: {
    ar: 'اختر النوع الذي يصف إقامتك بشكل أفضل.',
    fr: 'Choisissez le type qui décrit le mieux votre hébergement.',
    en: 'Pick the type that best describes your place.',
  },
  kindLabel: { ar: 'طريقة الإيجار', fr: 'Mode de location', en: 'Listing kind' },
  single: { ar: 'وحدة كاملة', fr: 'Unité entière', en: 'Whole unit' },
  singleSub: {
    ar: 'يُؤجَّر المكان بالكامل كوحدة واحدة (سعر واحد).',
    fr: "Tout le lieu est loué comme une seule unité.",
    en: 'The whole place is rented as one unit.',
  },
  multi: { ar: 'غرف متعددة', fr: 'Chambres multiples', en: 'Multiple rooms' },
  multiSub: {
    ar: 'تؤجَّر عدة غرف بأسعار وسعات مختلفة.',
    fr: 'Plusieurs chambres avec prix et capacités différents.',
    en: 'Several rooms with different prices and capacity.',
  },
  loadError: { ar: 'تعذّر التحميل.', fr: 'Échec du chargement.', en: 'Failed to load.' },
  retry: { ar: 'إعادة المحاولة', fr: 'Réessayer', en: 'Retry' },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

export default function StepType() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;
  const params = useLocalSearchParams<{ propertyId?: string }>();
  const { draft, patch, setRooms } = useWizard();

  const [types, setTypes] = useState<PropertyTypeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await listPropertyTypes();
      setTypes(rows);
    } catch {
      setError(pick(COPY.loadError, locale));
      setTypes([]);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  // Hydrate from an existing draft when ?propertyId is present.
  useEffect(() => {
    const id = params.propertyId;
    if (!id || hydrated || draft.propertyId === id) {
      if (id && draft.propertyId === id) setHydrated(true);
      return;
    }
    (async () => {
      try {
        const prop = await getPropertyWithChildren(id);
        if (!prop) return;
        const amenityIds = await getAmenityIds(id);
        const rooms: RoomTypeDraft[] =
          prop.room_types.length > 0
            ? prop.room_types.map((r) => ({
                key: r.id,
                id: r.id,
                nameAr: r.name_ar ?? '',
                nameFr: r.name_fr ?? '',
                nameEn: r.name_en ?? '',
                maxOccupancy: String(r.max_occupancy ?? 2),
                basePriceDzd: String(r.base_price_dzd ?? ''),
                weekendPriceDzd: r.weekend_price_dzd != null ? String(r.weekend_price_dzd) : '',
                cleaningFeeDzd: String(r.cleaning_fee_dzd ?? 0),
                inventoryCount: String(r.inventory_count ?? 1),
              }))
            : [emptyRoom(true)];
        patch({
          propertyId: prop.id,
          hostProfileId: prop.host_profile_id,
          propertyTypeId: prop.property_type_id,
          listingKind: prop.listing_kind as ListingKind,
          wilayaCode: prop.wilaya_code,
          communeId: prop.commune_id,
          addressLine: prop.address_line ?? '',
          lat: prop.lat != null ? String(prop.lat) : '',
          lng: prop.lng != null ? String(prop.lng) : '',
          titleAr: prop.title_ar ?? '',
          titleFr: prop.title_fr ?? '',
          titleEn: prop.title_en ?? '',
          descriptionAr: prop.description_ar ?? '',
          descriptionFr: prop.description_fr ?? '',
          descriptionEn: prop.description_en ?? '',
          amenityIds,
          houseRulesAr: prop.house_rules_ar ?? '',
          houseRulesFr: prop.house_rules_fr ?? '',
          houseRulesEn: prop.house_rules_en ?? '',
          checkinTime: (prop.checkin_time ?? '14:00').slice(0, 5),
          checkoutTime: (prop.checkout_time ?? '12:00').slice(0, 5),
          cancellationTier: prop.cancellation_tier as CancellationTier,
          instantBook: prop.instant_book,
          minNights: String(prop.min_nights ?? 1),
        });
        setRooms(rooms);
      } catch {
        // hydration best-effort; the host can still re-enter values
      } finally {
        setHydrated(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.propertyId]);

  function setKind(kind: ListingKind) {
    // When switching to single_unit, collapse to one default room.
    if (kind === 'single_unit' && draft.rooms.length > 1) {
      setRooms([draft.rooms[0] ?? emptyRoom(true)]);
    }
    patch({ listingKind: kind });
  }

  if (types === null) {
    return (
      <View style={styles.fill}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (error && types.length === 0) {
    return (
      <View style={styles.fill}>
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(COPY.retry, locale)} />
      </View>
    );
  }

  return (
    <WizardChrome
      locale={locale}
      step={1}
      title={pick(COPY.title, locale)}
      subtitle={pick(COPY.subtitle, locale)}
      nextDisabled={draft.propertyTypeId == null}
      onNext={() => router.push('/host/new/location')}
      onBack={() => router.back()}
    >
      <View style={styles.list}>
        {types.map((t) => (
          <SelectCard
            key={t.id}
            icon={t.icon ?? '🏠'}
            title={localizedName(t, locale) || t.slug}
            selected={draft.propertyTypeId === t.id}
            onPress={() => patch({ propertyTypeId: t.id })}
          />
        ))}
      </View>

      <FieldLabel label={pick(COPY.kindLabel, locale)} />
      <View style={styles.list}>
        <SelectCard
          icon="🏡"
          title={pick(COPY.single, locale)}
          subtitle={pick(COPY.singleSub, locale)}
          selected={draft.listingKind === 'single_unit'}
          onPress={() => setKind('single_unit')}
        />
        <SelectCard
          icon="🛏️"
          title={pick(COPY.multi, locale)}
          subtitle={pick(COPY.multiSub, locale)}
          selected={draft.listingKind === 'multi_room'}
          onPress={() => setKind('multi_room')}
        />
      </View>
    </WizardChrome>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.color.bg },
  list: { gap: theme.space.md },
});
