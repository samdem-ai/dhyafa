/**
 * Wizard step 2 — location: wilaya + commune + address + lat/lng.
 *
 * Wilaya is chosen via a searchable BottomSheet (not 58 chips). Commune is an
 * optional searchable list once a wilaya is set. Map is a stub View with manual
 * lat/lng inputs (range-validated; Mapbox lands later, needs an EAS dev client).
 * Persists the draft property on Next.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check, MapPin } from 'lucide-react-native';
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
import { Text, TextField, FieldLabel, Skeleton, ErrorState, BottomSheet, SearchBar } from '@/ui';
import { L, pick as pickL } from '@/lib/copy';
import { theme } from '@/theme';

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
  pickWilaya: { ar: 'اختر الولاية', fr: 'Choisir la wilaya', en: 'Choose a wilaya' },
  pickCommune: { ar: 'اختر البلدية', fr: 'Choisir la commune', en: 'Choose a commune' },
  address: { ar: 'العنوان', fr: 'Adresse', en: 'Address' },
  addressPh: { ar: 'الحي، الشارع…', fr: 'Quartier, rue…', en: 'Neighborhood, street…' },
  map: { ar: 'الخريطة', fr: 'Carte', en: 'Map' },
  mapStub: {
    ar: 'الخريطة التفاعلية تأتي لاحقًا — أدخل الإحداثيات يدويًا',
    fr: 'Carte interactive à venir — saisissez les coordonnées',
    en: 'Interactive map coming later — enter coordinates manually',
  },
  lat: { ar: 'خط العرض (Lat)', fr: 'Latitude', en: 'Latitude' },
  lng: { ar: 'خط الطول (Lng)', fr: 'Longitude', en: 'Longitude' },
  loadError: { ar: 'تعذّر تحميل الولايات.', fr: 'Échec du chargement des wilayas.', en: 'Failed to load wilayas.' },
  saveAuthError: {
    ar: 'تعذّر تجهيز حساب الاستضافة. حاول مجددًا.',
    fr: "Impossible de préparer le compte hôte. Réessayez.",
    en: 'Could not prepare your host account. Try again.',
  },
  saveNetError: {
    ar: 'تعذّر حفظ الموقع. تحقّق من اتصالك.',
    fr: "Échec de l'enregistrement. Vérifiez votre connexion.",
    en: 'Could not save location. Check your connection.',
  },
  badCoords: {
    ar: 'الإحداثيات خارج النطاق الصحيح.',
    fr: 'Coordonnées hors plage valide.',
    en: 'Coordinates are out of range.',
  },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

/** Parse a coordinate, returning null for empty, NaN for invalid. */
function parseCoord(v: string): number | null | undefined {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined; // undefined = invalid
}

export default function StepLocation() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { draft, patch, saveProperty } = useWizard();

  const [wilayas, setWilayas] = useState<WilayaRow[] | null>(null);
  const [communes, setCommunes] = useState<CommuneRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [wilayaSheet, setWilayaSheet] = useState(false);
  const [communeSheet, setCommuneSheet] = useState(false);
  const [wilayaQuery, setWilayaQuery] = useState('');
  const [communeQuery, setCommuneQuery] = useState('');

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

  const selectedWilaya = useMemo(
    () => (wilayas ?? []).find((w) => w.code === draft.wilayaCode) ?? null,
    [wilayas, draft.wilayaCode],
  );
  const selectedCommune = useMemo(
    () => communes.find((c) => c.id === draft.communeId) ?? null,
    [communes, draft.communeId],
  );

  const filteredWilayas = useMemo(() => {
    const q = wilayaQuery.trim().toLowerCase();
    const list = wilayas ?? [];
    if (!q) return list;
    return list.filter(
      (w) =>
        localizedName(w, locale).toLowerCase().includes(q) ||
        String(w.code).padStart(2, '0').includes(q),
    );
  }, [wilayas, wilayaQuery, locale]);

  const filteredCommunes = useMemo(() => {
    const q = communeQuery.trim().toLowerCase();
    if (!q) return communes;
    return communes.filter((c) => localizedName(c, locale).toLowerCase().includes(q));
  }, [communes, communeQuery, locale]);

  async function onNext() {
    const lat = parseCoord(draft.lat);
    const lng = parseCoord(draft.lng);
    if (lat === undefined || lng === undefined) {
      setSaveError(pick(COPY.badCoords, locale));
      return;
    }
    if (
      (lat != null && (lat < -90 || lat > 90)) ||
      (lng != null && (lng < -180 || lng > 180))
    ) {
      setSaveError(pick(COPY.badCoords, locale));
      return;
    }

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
    } catch (e) {
      // Distinguish auth/claim failure from network/RLS.
      const msg = e instanceof Error ? e.message : '';
      if (/PROPERTY_TYPE|host|claim|JWT|auth/i.test(msg)) {
        setSaveError(pick(COPY.saveAuthError, locale));
      } else {
        setSaveError(pick(COPY.saveNetError, locale));
      }
    } finally {
      setSaving(false);
    }
  }

  if (wilayas === null) {
    return (
      <View style={styles.fill}>
        <View style={styles.skeletonWrap}>
          <Skeleton style={styles.skelLabel} radius={theme.radius.sm} />
          <Skeleton style={styles.skelField} radius={theme.radius.md} />
          <Skeleton style={styles.skelLabel} radius={theme.radius.sm} />
          <Skeleton style={styles.skelField} radius={theme.radius.md} />
          <Skeleton style={styles.skelLabel} radius={theme.radius.sm} />
          <Skeleton style={styles.skelField} radius={theme.radius.md} />
          <Skeleton style={styles.skelMap} radius={theme.radius.lg} />
        </View>
      </View>
    );
  }
  if (error && wilayas.length === 0) {
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
      {/* Wilaya picker — opens a searchable sheet */}
      <View style={styles.field}>
        <FieldLabel label={pick(COPY.wilaya, locale)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pick(COPY.pickWilaya, locale)}
          onPress={() => {
            setWilayaQuery('');
            setWilayaSheet(true);
          }}
          style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        >
          <Text variant="body" color={selectedWilaya ? 'text' : 'textMuted'} style={styles.flex}>
            {selectedWilaya
              ? `${String(selectedWilaya.code).padStart(2, '0')} · ${localizedName(selectedWilaya, locale)}`
              : pick(COPY.pickWilaya, locale)}
          </Text>
          <ChevronDown size={20} color={theme.color.ink300} />
        </Pressable>
      </View>

      {/* Commune picker (optional) */}
      <View style={styles.field}>
        <FieldLabel label={pick(COPY.commune, locale)} hint={pick(COPY.communeHint, locale)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pick(COPY.pickCommune, locale)}
          disabled={draft.wilayaCode == null}
          onPress={() => {
            setCommuneQuery('');
            setCommuneSheet(true);
          }}
          style={({ pressed }) => [
            styles.trigger,
            pressed && styles.triggerPressed,
            draft.wilayaCode == null && styles.triggerDisabled,
          ]}
        >
          <Text variant="body" color={selectedCommune ? 'text' : 'textMuted'} style={styles.flex}>
            {selectedCommune ? localizedName(selectedCommune, locale) : pick(COPY.pickCommune, locale)}
          </Text>
          <ChevronDown size={20} color={theme.color.ink300} />
        </Pressable>
      </View>

      <TextField
        label={pick(COPY.address, locale)}
        value={draft.addressLine}
        onChangeText={(t) => patch({ addressLine: t })}
        placeholder={pick(COPY.addressPh, locale)}
      />

      {/* Map stub + manual coordinates (borderless, photo-first surface) */}
      <View style={styles.field}>
        <FieldLabel label={pick(COPY.map, locale)} />
        <View style={styles.mapStub}>
          <MapPin size={24} color={theme.color.textMuted} strokeWidth={2} />
          <Text variant="body-sm" color="textMuted" center>
            {pick(COPY.mapStub, locale)}
          </Text>
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
      </View>

      {saveError ? (
        <View style={styles.errorBox}>
          <Text variant="body-sm" color="error" center>
            {saveError}
          </Text>
        </View>
      ) : null}

      {/* Wilaya search sheet */}
      <BottomSheet visible={wilayaSheet} onClose={() => setWilayaSheet(false)} snapPoints={['80%']}>
        <Text variant="title" weight="bold" style={styles.sheetTitle}>
          {pick(COPY.pickWilaya, locale)}
        </Text>
        <SearchBar
          value={wilayaQuery}
          onChangeText={setWilayaQuery}
          placeholder={pickL(L.wizardSearchWilaya, locale)}
          inputComponent={BottomSheetTextInput}
        />
        <BottomSheetScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
          {filteredWilayas.length === 0 ? (
            <Text variant="body" color="textMuted" center style={styles.noMatch}>
              {pickL(L.wizardNoWilaya, locale)}
            </Text>
          ) : (
            filteredWilayas.map((w) => {
              const active = draft.wilayaCode === w.code;
              return (
                <Pressable
                  key={w.code}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    patch({ wilayaCode: w.code, communeId: null });
                    setWilayaSheet(false);
                  }}
                  style={({ pressed }) => [styles.optionRow, pressed && styles.triggerPressed]}
                >
                  <Text variant="body-lg" color={active ? 'primary' : 'text'} style={styles.flex}>
                    {String(w.code).padStart(2, '0')} · {localizedName(w, locale)}
                  </Text>
                  {active ? <Check size={20} color={theme.color.primary} strokeWidth={2.5} /> : null}
                </Pressable>
              );
            })
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Commune search sheet */}
      <BottomSheet visible={communeSheet} onClose={() => setCommuneSheet(false)} snapPoints={['80%']}>
        <Text variant="title" weight="bold" style={styles.sheetTitle}>
          {pick(COPY.pickCommune, locale)}
        </Text>
        <SearchBar
          value={communeQuery}
          onChangeText={setCommuneQuery}
          placeholder={pickL(L.wizardSearchWilaya, locale)}
          inputComponent={BottomSheetTextInput}
        />
        <BottomSheetScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
          {filteredCommunes.map((c) => {
            const active = draft.communeId === c.id;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  patch({ communeId: active ? null : c.id });
                  setCommuneSheet(false);
                }}
                style={({ pressed }) => [styles.optionRow, pressed && styles.triggerPressed]}
              >
                <Text variant="body-lg" color={active ? 'primary' : 'text'} style={styles.flex}>
                  {localizedName(c, locale)}
                </Text>
                {active ? <Check size={20} color={theme.color.primary} strokeWidth={2.5} /> : null}
              </Pressable>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheet>
    </WizardChrome>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.color.bg },
  centerFill: { flex: 1, justifyContent: 'center', backgroundColor: theme.color.bg },
  flex: { flex: 1 },
  field: { gap: theme.space.xs },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    minHeight: 48,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space.md,
  },
  triggerPressed: { backgroundColor: theme.color.surfaceSunken },
  triggerDisabled: { opacity: 0.5 },
  mapStub: {
    height: 140,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  coordRow: { flexDirection: 'row', gap: theme.space.md, marginTop: theme.space.md },
  coordCol: { flex: 1 },
  errorBox: {
    backgroundColor: theme.color.errorBg,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
  },
  sheetTitle: { marginBottom: theme.space.sm },
  sheetList: { maxHeight: 420, marginTop: theme.space.sm },
  noMatch: { paddingVertical: theme.space.xl },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingVertical: theme.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
  skeletonWrap: { padding: theme.space.xl, gap: theme.space.md },
  skelLabel: { height: 16, width: '35%' },
  skelField: { height: 48, marginBottom: theme.space.sm },
  skelMap: { height: 140, marginTop: theme.space.sm },
});
