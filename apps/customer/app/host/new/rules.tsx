/**
 * Wizard step 6 — house rules (per-locale) + check-in / check-out times.
 * Times are free-text HH:MM (24h); validated lightly before saving as `time`.
 */

import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { useWizard } from '@/lib/wizard';
import { WizardChrome } from '@/components/WizardChrome';
import { TextField, LocaleTabs, Card } from '@/components/fields';
import { FieldLabel } from '@/components/ui';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const COPY = {
  title: { ar: 'القواعد والأوقات', fr: 'Règles et horaires', en: 'Rules & times' },
  subtitle: {
    ar: 'حدّد قواعد المنزل وأوقات الوصول والمغادرة.',
    fr: 'Définissez le règlement et les horaires.',
    en: 'Set house rules and check-in / check-out times.',
  },
  rules: { ar: 'قواعد المنزل', fr: 'Règlement intérieur', en: 'House rules' },
  rulesPh: {
    ar: 'مثال: ممنوع التدخين، الهدوء بعد العاشرة…',
    fr: 'Ex. : non-fumeur, silence après 22h…',
    en: 'e.g. No smoking, quiet after 10pm…',
  },
  times: { ar: 'الأوقات', fr: 'Horaires', en: 'Times' },
  checkin: { ar: 'وقت الوصول', fr: 'Arrivée', en: 'Check-in' },
  checkout: { ar: 'وقت المغادرة', fr: 'Départ', en: 'Check-out' },
  timeHint: { ar: 'بصيغة 24 ساعة (HH:MM)', fr: 'Format 24 h (HH:MM)', en: '24h format (HH:MM)' },
  badTime: {
    ar: 'صيغة الوقت غير صحيحة (HH:MM).',
    fr: "Format d'heure invalide (HH:MM).",
    en: 'Invalid time format (HH:MM).',
  },
  saveError: { ar: 'تعذّر الحفظ.', fr: "Échec de l'enregistrement.", en: 'Could not save.' },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export default function StepRules() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { draft, patch, saveProperty } = useWizard();

  const [tab, setTab] = useState<Locale>(locale);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const rulesByTab: Record<Locale, string> = {
    ar: draft.houseRulesAr,
    fr: draft.houseRulesFr,
    en: draft.houseRulesEn,
  };
  function setRules(t: string) {
    if (tab === 'ar') patch({ houseRulesAr: t });
    else if (tab === 'fr') patch({ houseRulesFr: t });
    else patch({ houseRulesEn: t });
  }

  const timesValid = TIME_RE.test(draft.checkinTime) && TIME_RE.test(draft.checkoutTime);

  async function onNext() {
    if (!timesValid) {
      setSaveError(pick(COPY.badTime, locale));
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveProperty({
        house_rules_ar: draft.houseRulesAr.trim() || null,
        house_rules_fr: draft.houseRulesFr.trim() || null,
        house_rules_en: draft.houseRulesEn.trim() || null,
        checkin_time: `${draft.checkinTime}:00`,
        checkout_time: `${draft.checkoutTime}:00`,
      });
      router.push('/host/new/pricing');
    } catch {
      setSaveError(pick(COPY.saveError, locale));
    } finally {
      setSaving(false);
    }
  }

  return (
    <WizardChrome
      locale={locale}
      step={6}
      title={pick(COPY.title, locale)}
      subtitle={pick(COPY.subtitle, locale)}
      nextDisabled={!timesValid}
      nextLoading={saving}
      onNext={() => void onNext()}
    >
      <FieldLabel label={pick(COPY.rules, locale)} />
      <LocaleTabs active={tab} onChange={setTab} />
      <TextField
        value={rulesByTab[tab]}
        onChangeText={setRules}
        placeholder={pick(COPY.rulesPh, locale)}
        multiline
      />

      <FieldLabel label={pick(COPY.times, locale)} hint={pick(COPY.timeHint, locale)} />
      <Card>
        <View style={styles.row}>
          <View style={styles.col}>
            <TextField
              label={pick(COPY.checkin, locale)}
              value={draft.checkinTime}
              onChangeText={(t) => patch({ checkinTime: t })}
              placeholder="14:00"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={styles.col}>
            <TextField
              label={pick(COPY.checkout, locale)}
              value={draft.checkoutTime}
              onChangeText={(t) => patch({ checkoutTime: t })}
              placeholder="12:00"
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
  row: { flexDirection: 'row', gap: theme.space.md },
  col: { flex: 1 },
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
