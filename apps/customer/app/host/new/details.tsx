/**
 * Wizard step 4 — title + description, per-locale (ar/fr/en tabs).
 * At least one title (any locale) is required (also enforced server-side).
 * Persists onto the draft property on Next.
 */

import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { useWizard } from '@/lib/wizard';
import { WizardChrome } from '@/components/WizardChrome';
import { Text, TextField, SegmentedControl } from '@/ui';
import { theme } from '@/theme';

const COPY = {
  title: { ar: 'العنوان والوصف', fr: 'Titre et description', en: 'Title & description' },
  subtitle: {
    ar: 'يمكنك إدخال لغة واحدة على الأقل؛ الباقي اختياري.',
    fr: 'Au moins une langue ; les autres sont optionnelles.',
    en: 'Fill at least one language; the rest are optional.',
  },
  titleField: { ar: 'العنوان', fr: 'Titre', en: 'Title' },
  titlePh: {
    ar: 'مثال: شقة مطلة على البحر في وهران',
    fr: 'Ex. : Appartement vue mer à Oran',
    en: 'e.g. Sea-view apartment in Oran',
  },
  descField: { ar: 'الوصف', fr: 'Description', en: 'Description' },
  descPh: {
    ar: 'صف المكان والأجواء والمميزات…',
    fr: "Décrivez le lieu, l'ambiance, les atouts…",
    en: 'Describe the place, the vibe, the highlights…',
  },
  needTitle: {
    ar: 'أدخل عنوانًا بلغة واحدة على الأقل.',
    fr: 'Saisissez un titre dans au moins une langue.',
    en: 'Enter a title in at least one language.',
  },
  saveError: { ar: 'تعذّر الحفظ.', fr: "Échec de l'enregistrement.", en: 'Could not save.' },
} as const;

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'ar', label: 'العربية' },
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

export default function StepDetails() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { draft, patch, saveProperty } = useWizard();

  const [tab, setTab] = useState<Locale>(locale);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const titleByTab: Record<Locale, string> = {
    ar: draft.titleAr,
    fr: draft.titleFr,
    en: draft.titleEn,
  };
  const descByTab: Record<Locale, string> = {
    ar: draft.descriptionAr,
    fr: draft.descriptionFr,
    en: draft.descriptionEn,
  };

  function setTitle(t: string) {
    if (tab === 'ar') patch({ titleAr: t });
    else if (tab === 'fr') patch({ titleFr: t });
    else patch({ titleEn: t });
  }
  function setDesc(t: string) {
    if (tab === 'ar') patch({ descriptionAr: t });
    else if (tab === 'fr') patch({ descriptionFr: t });
    else patch({ descriptionEn: t });
  }

  const hasTitle =
    draft.titleAr.trim() !== '' ||
    draft.titleFr.trim() !== '' ||
    draft.titleEn.trim() !== '';

  async function onNext() {
    setSaving(true);
    setSaveError(null);
    try {
      await saveProperty({
        title_ar: draft.titleAr.trim() || null,
        title_fr: draft.titleFr.trim() || null,
        title_en: draft.titleEn.trim() || null,
        description_ar: draft.descriptionAr.trim() || null,
        description_fr: draft.descriptionFr.trim() || null,
        description_en: draft.descriptionEn.trim() || null,
      });
      router.push('/host/new/amenities');
    } catch {
      setSaveError(pick(COPY.saveError, locale));
    } finally {
      setSaving(false);
    }
  }

  return (
    <WizardChrome
      locale={locale}
      step={4}
      title={pick(COPY.title, locale)}
      subtitle={pick(COPY.subtitle, locale)}
      nextDisabled={!hasTitle}
      nextLoading={saving}
      onNext={() => void onNext()}
    >
      <SegmentedControl options={LOCALE_OPTIONS} value={tab} onChange={setTab} />

      <TextField
        label={pick(COPY.titleField, locale)}
        value={titleByTab[tab]}
        onChangeText={setTitle}
        placeholder={pick(COPY.titlePh, locale)}
      />
      <TextField
        label={pick(COPY.descField, locale)}
        value={descByTab[tab]}
        onChangeText={setDesc}
        placeholder={pick(COPY.descPh, locale)}
        multiline
      />

      {!hasTitle ? (
        <Text variant="body-sm" color="textMuted">
          {pick(COPY.needTitle, locale)}
        </Text>
      ) : null}
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
  errorBox: {
    backgroundColor: theme.color.errorBg,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
  },
});
