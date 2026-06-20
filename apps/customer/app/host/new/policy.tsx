/**
 * Wizard step 8 — cancellation tier + instant book + minimum nights.
 * Persists onto the draft property on Next.
 */

import { useState } from 'react';
import { View, StyleSheet, Pressable, Switch } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import type { Locale } from '@dyafa/i18n';
import { useWizard } from '@/lib/wizard';
import type { CancellationTier } from '@/lib/listings';
import { WizardChrome } from '@/components/WizardChrome';
import { TextField, FieldLabel, Text } from '@/ui';
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
      <View style={styles.section}>
        <Text variant="title" weight="bold">
          {pick(COPY.cancellation, locale)}
        </Text>
        <View style={styles.options}>
          {TIER_VALUES.map((value) => {
            const c = cancellationTierCopy(value);
            const selected = draft.cancellationTier === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => patch({ cancellationTier: value })}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <View style={styles.optionText}>
                  <Text variant="body" weight="semibold" color={selected ? 'accent' : 'text'}>
                    {pickL(c.label, locale)}
                  </Text>
                  <Text variant="body-sm" color="textMuted">
                    {pickL(c.window, locale)}
                  </Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <Check size={15} color={theme.color.textOnPrimary} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleText}>
          <Text variant="body" weight="semibold">
            {pick(COPY.instant, locale)}
          </Text>
          <Text variant="body-sm" color="textMuted">
            {pick(COPY.instantHint, locale)}
          </Text>
        </View>
        <Switch
          value={draft.instantBook}
          onValueChange={(v) => patch({ instantBook: v })}
          trackColor={{ true: theme.color.accent, false: theme.color.borderStrong }}
          thumbColor={theme.color.surface}
        />
      </View>

      <View style={styles.section}>
        <FieldLabel label={pick(COPY.minNights, locale)} />
        <TextField
          value={minNights}
          onChangeText={setMinNights}
          placeholder="1"
          keyboardType="number-pad"
        />
      </View>
    </WizardChrome>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.space.md },
  options: { gap: theme.space.lg },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  optionPressed: { opacity: 0.7 },
  optionText: { flex: 1, gap: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: theme.color.accent,
    borderColor: theme.color.accent,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  toggleText: { flex: 1, gap: 2 },
});
