/**
 * Wizard step 5 — amenities multi-select, grouped by category. Selection is
 * held in the wizard draft and synced to property_amenities on Next.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import {
  listAmenities,
  localizedName,
  setAmenities,
  type AmenityRow,
} from '@/lib/listings';
import { useWizard } from '@/lib/wizard';
import { WizardChrome } from '@/components/WizardChrome';
import { Chip } from '@/components/fields';
import { SkeletonList, ErrorState } from '@/components/ui';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const COPY = {
  title: { ar: 'ما المرافق المتوفرة؟', fr: 'Quels équipements ?', en: 'What amenities?' },
  subtitle: {
    ar: 'اختر كل ما ينطبق على مكانك.',
    fr: 'Sélectionnez tout ce qui s’applique.',
    en: 'Select everything your place offers.',
  },
  loadError: { ar: 'تعذّر تحميل المرافق.', fr: 'Échec du chargement.', en: 'Failed to load amenities.' },
  retry: { ar: 'إعادة المحاولة', fr: 'Réessayer', en: 'Retry' },
  saveError: { ar: 'تعذّر الحفظ.', fr: "Échec de l'enregistrement.", en: 'Could not save.' },
  other: { ar: 'أخرى', fr: 'Autres', en: 'Other' },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
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
      const key = a.category ?? pick(COPY.other, locale);
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [amenities, locale]);

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
        <SkeletonList count={4} />
      </View>
    );
  }
  if (error && amenities.length === 0) {
    return (
      <View style={styles.fill}>
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(COPY.retry, locale)} />
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
          <Text style={styles.groupTitle}>{category}</Text>
          <View style={styles.chips}>
            {items.map((a) => (
              <Chip
                key={a.id}
                label={localizedName(a, locale) || a.slug}
                icon={a.icon ?? undefined}
                selected={draft.amenityIds.includes(a.id)}
                onPress={() => toggle(a.id)}
              />
            ))}
          </View>
        </View>
      ))}
      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
    </WizardChrome>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.color.bg },
  group: { gap: theme.space.sm },
  groupTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    textTransform: 'capitalize',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  error: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.error,
    backgroundColor: theme.color.errorBg,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    textAlign: 'center',
  },
});
