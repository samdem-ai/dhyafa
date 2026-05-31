/**
 * Wizard step 2 — location: wilaya + commune + address + lat/lng.
 * Map is a stub View with manual lat/lng inputs (Mapbox lands later, needs an
 * EAS dev client). Persists the draft property on Next.
 */

import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, I18nManager } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import {
  listWilayas,
  listCommunes,
  localizedName,
  type WilayaRow,
  type CommuneRow,
} from '@/lib/listings';
import { useWizard } from '@/lib/wizard';
import { WizardChrome } from '@/components/WizardChrome';
import { TextField, Card } from '@/components/fields';
import { FieldLabel, SkeletonList, ErrorState } from '@/components/ui';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const COPY = {
  title: { ar: 'أين يقع مكانك؟', fr: 'Où se trouve votre lieu ?', en: 'Where is your place?' },
  subtitle: {
    ar: 'لن نعرض العنوان الدقيق للضيوف قبل تأكيد الحجز.',
    fr: "L'adresse exacte n'est partagée qu'après réservation.",
    en: 'The exact address is only shared after booking.',
  },
  wilaya: { ar: 'الولاية', fr: 'Wilaya', en: 'Wilaya' },
  commune: { ar: 'البلدية', fr: 'Commune', en: 'Commune' },
  communeHint: { ar: 'اختياري', fr: 'Optionnel', en: 'Optional' },
  pickWilaya: { ar: 'اختر الولاية أولًا', fr: "Choisissez d'abord la wilaya", en: 'Pick a wilaya first' },
  address: { ar: 'العنوان', fr: 'Adresse', en: 'Address' },
  addressPh: { ar: 'الحي، الشارع…', fr: 'Quartier, rue…', en: 'Neighborhood, street…' },
  map: { ar: 'الخريطة', fr: 'Carte', en: 'Map' },
  mapStub: {
    ar: '🗺 الخريطة التفاعلية تأتي لاحقًا — أدخل الإحداثيات يدويًا',
    fr: '🗺 Carte interactive à venir — saisissez les coordonnées',
    en: '🗺 Interactive map coming later — enter coordinates manually',
  },
  lat: { ar: 'خط العرض (Lat)', fr: 'Latitude', en: 'Latitude' },
  lng: { ar: 'خط الطول (Lng)', fr: 'Longitude', en: 'Longitude' },
  loadError: { ar: 'تعذّر تحميل الولايات.', fr: 'Échec du chargement des wilayas.', en: 'Failed to load wilayas.' },
  retry: { ar: 'إعادة المحاولة', fr: 'Réessayer', en: 'Retry' },
  saveError: { ar: 'تعذّر حفظ الموقع.', fr: "Échec de l'enregistrement.", en: 'Could not save location.' },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

function parseCoord(v: string): number | null {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function StepLocation() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;
  const { draft, patch, saveProperty } = useWizard();

  const [wilayas, setWilayas] = useState<WilayaRow[] | null>(null);
  const [communes, setCommunes] = useState<CommuneRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setWilayas(await listWilayas());
    } catch {
      setError(pick(COPY.loadError, locale));
      setWilayas([]);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  // Load communes whenever the wilaya changes.
  useEffect(() => {
    if (draft.wilayaCode == null) {
      setCommunes([]);
      return;
    }
    let active = true;
    listCommunes(draft.wilayaCode)
      .then((rows) => active && setCommunes(rows))
      .catch(() => active && setCommunes([]));
    return () => {
      active = false;
    };
  }, [draft.wilayaCode]);

  async function onNext() {
    const lat = parseCoord(draft.lat);
    const lng = parseCoord(draft.lng);
    setSaving(true);
    setSaveError(null);
    try {
      await saveProperty({
        wilaya_code: draft.wilayaCode ?? undefined,
        commune_id: draft.communeId,
        address_line: draft.addressLine.trim() || null,
        lat,
        lng,
      });
      router.push('/host/new/photos');
    } catch {
      setSaveError(pick(COPY.saveError, locale));
    } finally {
      setSaving(false);
    }
  }

  if (wilayas === null) {
    return (
      <View style={styles.fill}>
        <SkeletonList count={5} />
      </View>
    );
  }
  if (error && wilayas.length === 0) {
    return (
      <View style={styles.fill}>
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(COPY.retry, locale)} />
      </View>
    );
  }

  const canNext = draft.wilayaCode != null;

  return (
    <WizardChrome
      locale={locale}
      step={2}
      title={pick(COPY.title, locale)}
      subtitle={pick(COPY.subtitle, locale)}
      nextDisabled={!canNext}
      nextLoading={saving}
      onNext={() => void onNext()}
    >
      {/* Wilaya picker — horizontal-wrapping chips */}
      <FieldLabel label={pick(COPY.wilaya, locale)} />
      <View style={styles.chipWrap}>
        {wilayas.map((w) => {
          const selected = draft.wilayaCode === w.code;
          return (
            <Pressable
              key={w.code}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => patch({ wilayaCode: w.code, communeId: null })}
              style={[styles.wilayaChip, selected && styles.wilayaChipActive]}
            >
              <Text style={[styles.wilayaChipText, selected && styles.wilayaChipTextActive]}>
                {String(w.code).padStart(2, '0')} · {localizedName(w, locale)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Commune picker (optional) */}
      <FieldLabel label={pick(COPY.commune, locale)} hint={pick(COPY.communeHint, locale)} />
      {draft.wilayaCode == null ? (
        <Text style={styles.muted}>{pick(COPY.pickWilaya, locale)}</Text>
      ) : (
        <View style={styles.chipWrap}>
          {communes.map((c) => {
            const selected = draft.communeId === c.id;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => patch({ communeId: selected ? null : c.id })}
                style={[styles.wilayaChip, selected && styles.wilayaChipActive]}
              >
                <Text style={[styles.wilayaChipText, selected && styles.wilayaChipTextActive]}>
                  {localizedName(c, locale)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <TextField
        label={pick(COPY.address, locale)}
        value={draft.addressLine}
        onChangeText={(t) => patch({ addressLine: t })}
        placeholder={pick(COPY.addressPh, locale)}
      />

      {/* Map stub + manual coordinates */}
      <FieldLabel label={pick(COPY.map, locale)} />
      <Card>
        <View style={styles.mapStub}>
          <Text style={styles.mapStubText}>{pick(COPY.mapStub, locale)}</Text>
        </View>
        <View style={styles.coordRow}>
          <View style={styles.coordCol}>
            <TextField
              label={pick(COPY.lat, locale)}
              value={draft.lat}
              onChangeText={(t) => patch({ lat: t })}
              placeholder="36.75"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={styles.coordCol}>
            <TextField
              label={pick(COPY.lng, locale)}
              value={draft.lng}
              onChangeText={(t) => patch({ lng: t })}
              placeholder="3.06"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
      </Card>

      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
    </WizardChrome>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.color.bg },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  wilayaChip: {
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  wilayaChipActive: { borderColor: theme.color.primary, backgroundColor: theme.color.infoBg },
  wilayaChipText: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.text,
  },
  wilayaChipTextActive: { color: theme.color.primary, fontWeight: '600' },
  muted: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
  },
  mapStub: {
    height: 120,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.lg,
  },
  mapStubText: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign: 'center',
    lineHeight: theme.lineHeight['body-sm'],
  },
  coordRow: { flexDirection: 'row', gap: theme.space.md },
  coordCol: { flex: 1 },
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
