/**
 * Reusable form fields for the listing wizard: labeled text input, multiline
 * text area, locale tab switcher (ar/fr/en), selectable card, chip, and a
 * toggle row. All RTL-aware and token-styled.
 */

import { useState, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  I18nManager,
  Switch,
  type KeyboardTypeOptions,
} from 'react-native';
import type { Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';
import { FieldLabel } from './ui';

const textAlign = I18nManager.isRTL ? 'right' : 'left';

// ---------------------------------------------------------------------------
// Text input
// ---------------------------------------------------------------------------
export function TextField({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
  autoCapitalize = 'sentences',
}: {
  label?: string;
  hint?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View style={styles.field}>
      {label ? <FieldLabel label={label} hint={hint} /> : null}
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline, { textAlign }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.color.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={label}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Locale tabs (ar / fr / en) — renders children for the active locale.
// ---------------------------------------------------------------------------
const LOCALE_TAB_LABELS: Record<Locale, string> = {
  ar: 'العربية',
  fr: 'Français',
  en: 'English',
};

export function LocaleTabs({
  active,
  onChange,
}: {
  active: Locale;
  onChange: (l: Locale) => void;
}) {
  const order: Locale[] = ['ar', 'fr', 'en'];
  return (
    <View style={styles.tabs}>
      {order.map((l) => {
        const isActive = l === active;
        return (
          <Pressable
            key={l}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(l)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {LOCALE_TAB_LABELS[l]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Selectable card (large tappable option, e.g. property type)
// ---------------------------------------------------------------------------
export function SelectCard({
  title,
  subtitle,
  icon,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.selectCard, selected && styles.selectCardActive]}
    >
      {icon ? <Text style={styles.selectIcon}>{icon}</Text> : null}
      <View style={styles.selectCardBody}>
        <Text style={[styles.selectTitle, selected && styles.selectTitleActive]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.selectSubtitle}>{subtitle}</Text> : null}
      </View>
      {selected ? <Text style={styles.selectCheck}>✓</Text> : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Chip (multi-select pill, e.g. amenities)
// ---------------------------------------------------------------------------
export function Chip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipActive]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
        {icon ? `${icon} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Toggle row
// ---------------------------------------------------------------------------
export function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLabel}>
        <Text style={styles.toggleTitle}>{label}</Text>
        {hint ? <Text style={styles.toggleHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: theme.color.primary, false: theme.color.border }}
        thumbColor={theme.color.surface}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Card wrapper (groups related fields)
// ---------------------------------------------------------------------------
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  field: { gap: theme.space.xs },
  input: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.md,
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },

  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.pill,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: theme.color.surface, ...theme.shadow.xs },
  tabText: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
  },
  tabTextActive: { color: theme.color.text, fontWeight: '600' },

  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    padding: theme.space.lg,
  },
  selectCardActive: { borderColor: theme.color.primary, backgroundColor: theme.color.infoBg },
  selectIcon: { fontSize: 26 },
  selectCardBody: { flex: 1 },
  selectTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  selectTitleActive: { color: theme.color.primary },
  selectSubtitle: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    marginTop: 2,
    textAlign,
  },
  selectCheck: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize.title,
    color: theme.color.primary,
    fontWeight: '700',
  },

  chip: {
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  chipActive: { borderColor: theme.color.primary, backgroundColor: theme.color.infoBg },
  chipText: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.text,
  },
  chipTextActive: { color: theme.color.primary, fontWeight: '600' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    padding: theme.space.lg,
  },
  toggleLabel: { flex: 1 },
  toggleTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  toggleHint: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    marginTop: 2,
    lineHeight: theme.lineHeight.caption,
    textAlign,
  },
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space.lg,
    gap: theme.space.md,
  },
});
