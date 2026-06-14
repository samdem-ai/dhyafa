/**
 * TimePicker — a labeled Row that opens a BottomSheet to choose an hour:minute
 * (24h, 15-minute steps). Avoids free-text HH:MM entry and the native
 * @react-native-community/datetimepicker dependency (works in Expo Go).
 *
 * `value`/`onChange` are "HH:MM" strings. Renders the value bidi-isolated so it
 * doesn't reorder under RTL.
 */

import { useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Clock, Check } from 'lucide-react-native';
import { theme } from '@/theme';
import { Text } from './Text';
import { FieldLabel } from './FieldLabel';
import { BottomSheet } from './BottomSheet';
import { selection as hapticSelection } from './haptics';

export interface TimePickerProps {
  label?: string;
  /** "HH:MM" 24h string. */
  value: string;
  onChange: (value: string) => void;
  sheetTitle?: string;
  /** Minute step. Default 15. */
  minuteStep?: number;
  testID?: string;
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);

function pad(n: number): string {
  return `${n}`.padStart(2, '0');
}

export function TimePicker({
  label,
  value,
  onChange,
  sheetTitle,
  minuteStep = 15,
  testID,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const minutes = Array.from(
    { length: Math.max(1, Math.floor(60 / minuteStep)) },
    (_, i) => i * minuteStep,
  );

  const [h, m] = value.split(':');
  const curH = Number(h);
  const curM = Number(m);

  function set(hh: number, mm: number) {
    hapticSelection();
    onChange(`${pad(hh)}:${pad(mm)}`);
  }

  return (
    <View style={styles.field}>
      {label ? <FieldLabel label={label} /> : null}
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Clock size={18} color={theme.color.ink300} />
        <Text variant="body" style={styles.value}>
          {`⁨${value}⁩`}
        </Text>
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} snapPoints={['55%']}>
        {sheetTitle ? (
          <Text variant="title" weight="semibold" style={styles.sheetTitle}>
            {sheetTitle}
          </Text>
        ) : null}
        <View style={styles.columns}>
          <ScrollView style={styles.col} showsVerticalScrollIndicator={false}>
            {HOURS.map((hh) => {
              const active = hh === curH;
              return (
                <Pressable
                  key={hh}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => set(hh, Number.isFinite(curM) ? curM : 0)}
                  style={[styles.cell, active && styles.cellActive]}
                >
                  <Text variant="body-lg" weight={active ? 'semibold' : 'regular'} color={active ? 'primary' : 'text'} center>
                    {pad(hh)}
                  </Text>
                  {active ? <Check size={16} color={theme.color.primary} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <ScrollView style={styles.col} showsVerticalScrollIndicator={false}>
            {minutes.map((mm) => {
              const active = mm === curM;
              return (
                <Pressable
                  key={mm}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => set(Number.isFinite(curH) ? curH : 0, mm)}
                  style={[styles.cell, active && styles.cellActive]}
                >
                  <Text variant="body-lg" weight={active ? 'semibold' : 'regular'} color={active ? 'primary' : 'text'} center>
                    {pad(mm)}
                  </Text>
                  {active ? <Check size={16} color={theme.color.primary} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
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
  pressed: { backgroundColor: theme.color.surfaceSunken },
  value: { writingDirection: 'ltr' },
  sheetTitle: { marginBottom: theme.space.sm },
  columns: { flexDirection: 'row', gap: theme.space.md, height: 280 },
  col: { flex: 1 },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xs,
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.md,
  },
  cellActive: { backgroundColor: theme.color.infoBg },
});
