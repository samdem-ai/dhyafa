/**
 * Select — a Row showing the current value that opens a BottomSheet list of
 * options (not a native picker). Generic over the option value type.
 */

import { useState } from 'react';
import { View, Pressable, StyleSheet, I18nManager, ScrollView } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { theme } from '@/theme';
import { Text } from './Text';
import { FieldLabel } from './FieldLabel';
import { BottomSheet } from './BottomSheet';
import { selection as hapticSelection } from './haptics';

export interface SelectOption<T> {
  value: T;
  label: string;
  subtitle?: string;
}

export interface SelectProps<T> {
  label?: string;
  hint?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  /** Title shown at the top of the options sheet. */
  sheetTitle?: string;
  disabled?: boolean;
  testID?: string;
}

export function Select<T extends string | number>({
  label,
  hint,
  value,
  options,
  onChange,
  placeholder,
  sheetTitle,
  disabled = false,
  testID,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? null;

  function pick(v: T) {
    hapticSelection();
    onChange(v);
    setOpen(false);
  }

  return (
    <View style={styles.field}>
      {label ? <FieldLabel label={label} hint={hint} /> : null}
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        accessibilityLabel={label ?? placeholder}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed, disabled && styles.disabled]}
      >
        <Text variant="body" color={selected ? 'text' : 'textMuted'} style={styles.triggerText}>
          {selected ? selected.label : placeholder ?? ''}
        </Text>
        <ChevronDown size={20} color={theme.color.ink300} />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        {sheetTitle ? (
          <Text variant="title" weight="semibold" style={styles.sheetTitle}>
            {sheetTitle}
          </Text>
        ) : null}
        <ScrollView style={styles.list} bounces={false}>
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <Pressable
                key={String(opt.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => pick(opt.value)}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              >
                <View style={styles.optionBody}>
                  <Text variant="body-lg" color={isActive ? 'primary' : 'text'}>
                    {opt.label}
                  </Text>
                  {opt.subtitle ? (
                    <Text variant="body-sm" color="textMuted">
                      {opt.subtitle}
                    </Text>
                  ) : null}
                </View>
                {isActive ? <Check size={20} color={theme.color.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: theme.space.xs },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
    minHeight: 48,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space.md,
  },
  triggerText: { flex: 1, textAlign: I18nManager.isRTL ? 'right' : 'left' },
  pressed: { backgroundColor: theme.color.surfaceSunken },
  disabled: { opacity: 0.6 },
  sheetTitle: { marginBottom: theme.space.sm },
  list: { maxHeight: 360 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingVertical: theme.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
  optionBody: { flex: 1, gap: 2 },
});
