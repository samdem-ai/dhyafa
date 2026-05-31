/**
 * Wizard step 8 — cancellation tier + instant book + minimum nights.
 * Persists onto the draft property on Next.
 */

import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { useWizard } from '@/lib/wizard';
import type { CancellationTier } from '@/lib/listings';
import { WizardChrome } from '@/components/WizardChrome';
import { SelectCard, ToggleRow, TextField } from '@/components/fields';
import { FieldLabel } from '@/components/ui';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const COPY = {
  title: { ar: 'سياسة الحجز', fr: 'Politique de réservation', en: 'Booking policy' },
  subtitle: {
    ar: 'اختر سياسة الإلغاء وكيفية قبول الحجوزات.',
    fr: "Choisissez l'annulation et le mode de réservation.",
    en: 'Choose your cancellation policy and how bookings work.',
  },
  cancellation: { ar: 'سياسة الإلغاء', fr: 'Politique d’annulation', en: 'Cancellation policy' },
  flexible: { ar: 'مرنة', fr: 'Flexible', en: 'Flexible' },
  flexibleSub: {
    ar: 'استرداد كامل قبل الوصول بفترة قصيرة.',
    fr: 'Remboursement intégral peu avant l’arrivée.',
    en: 'Full refund up to shortly before arrival.',
  },
  moderate: { ar: 'متوسطة', fr: 'Modérée', en: 'Moderate' },
  moderateSub: {
    ar: 'استرداد كامل حتى بضعة أيام قبل الوصول.',
    fr: 'Remboursement intégral jusqu’à quelques jours avant.',
    en: 'Full refund until a few days before arrival.',
  },
  strict: { ar: 'صارمة', fr: 'Stricte', en: 'Strict' },
  strictSub: {
    ar: 'استرداد جزئي فقط ضمن نافذة محدودة.',
    fr: 'Remboursement partiel dans une fenêtre limitée.',
    en: 'Partial refund within a limited window only.',
  },
  instant: { ar: 'الحجز الفوري', fr: 'Réservation instantanée', en: 'Instant book' },
  instantHint: {
    ar: 'يحجز الضيوف فورًا دون انتظار موافقتك.',
    fr: 'Les voyageurs réservent sans votre approbation.',
    en: 'Guests book instantly without waiting for approval.',
  },
  minNights: { ar: 'الحد الأدنى لعدد الليالي', fr: 'Nuits minimum', en: 'Minimum nights' },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

const TIERS: { value: CancellationTier; label: keyof typeof COPY; sub: keyof typeof COPY }[] = [
  { value: 'flexible', label: 'flexible', sub: 'flexibleSub' },
  { value: 'moderate', label: 'moderate', sub: 'moderateSub' },
  { value: 'strict', label: 'strict', sub: 'strictSub' },
];

export default function StepPolicy() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;
  const { draft, patch } = useWizard();
  const [minNights, setMinNights] = useState(draft.minNights);

  function onNext() {
    patch({ minNights });
    router.push('/host/new/review');
  }

  return (
    <WizardChrome
      locale={locale}
      step={8}
      title={pick(COPY.title, locale)}
      subtitle={pick(COPY.subtitle, locale)}
      onNext={onNext}
    >
      <FieldLabel label={pick(COPY.cancellation, locale)} />
      <View style={styles.list}>
        {TIERS.map((t) => (
          <SelectCard
            key={t.value}
            title={pick(COPY[t.label], locale)}
            subtitle={pick(COPY[t.sub], locale)}
            selected={draft.cancellationTier === t.value}
            onPress={() => patch({ cancellationTier: t.value })}
          />
        ))}
      </View>

      <ToggleRow
        label={pick(COPY.instant, locale)}
        hint={pick(COPY.instantHint, locale)}
        value={draft.instantBook}
        onValueChange={(v) => patch({ instantBook: v })}
      />

      <TextField
        label={pick(COPY.minNights, locale)}
        value={minNights}
        onChangeText={setMinNights}
        placeholder="1"
        keyboardType="number-pad"
      />
    </WizardChrome>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.space.md },
});
