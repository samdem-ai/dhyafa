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
import { cancellationTierCopy, pick as pickL } from '@/lib/copy';
import { theme } from '@/theme';

const COPY = {
  title: { ar: 'سياسة الحجز', fr: 'Politique de réservation', en: 'Booking policy' },
  subtitle: {
    ar: 'اختر سياسة الإلغاء وكيفية قبول الحجوزات.',
    fr: "Choisissez l'annulation et le mode de réservation.",
    en: 'Choose your cancellation policy and how bookings work.',
  },
  cancellation: { ar: 'سياسة الإلغاء', fr: 'Politique d’annulation', en: 'Cancellation policy' },
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

const TIER_VALUES: CancellationTier[] = ['flexible', 'moderate', 'strict'];

export default function StepPolicy() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
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
        {TIER_VALUES.map((value) => {
          const c = cancellationTierCopy(value);
          return (
            <SelectCard
              key={value}
              title={pickL(c.label, locale)}
              subtitle={pickL(c.window, locale)}
              selected={draft.cancellationTier === value}
              onPress={() => patch({ cancellationTier: value })}
            />
          );
        })}
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
