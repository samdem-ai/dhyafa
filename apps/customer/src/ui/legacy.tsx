/**
 * Legacy-compatibility shims.
 *
 * These preserve the exact public APIs that existing screens import from
 * `@/components/ui` and `@/components/fields`, implemented on top of the new
 * `src/ui` library. They let screens keep compiling unchanged during migration;
 * new code should import the elevated components directly instead.
 */

import { useState, type ReactNode } from 'react';
import { View, Pressable, StyleSheet, Switch } from 'react-native';
import { Check } from 'lucide-react-native';
import type { Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { Text } from './Text';
import { Button } from './Button';
import { StatusPill, statusTone } from './StatusPill';
import { RatingStars } from './RatingStars';
import { FieldLabel } from './FieldLabel';

// ── PrimaryButton (legacy: variant primary|secondary|danger) ─────────────────
export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <Button label={label} onPress={onPress} loading={loading} disabled={disabled} variant={variant} />
  );
}

// ── StatusBadge (legacy: status + locale, host listing statuses) ─────────────
const STATUS_LABELS: Record<string, { ar: string; fr: string; en: string }> = {
  draft: { ar: 'مسودة', fr: 'Brouillon', en: 'Draft' },
  pending: { ar: 'قيد المراجعة', fr: 'En révision', en: 'In review' },
  approved: { ar: 'منشور', fr: 'Publié', en: 'Published' },
  rejected: { ar: 'مرفوض', fr: 'Rejeté', en: 'Rejected' },
};

export function StatusBadge({ status, locale }: { status: string; locale: string }) {
  const key = status in STATUS_LABELS ? status : 'draft';
  const labels = STATUS_LABELS[key]!;
  const label = locale === 'fr' ? labels.fr : locale === 'en' ? labels.en : labels.ar;
  return <StatusPill label={label} tone={statusTone(key)} />;
}

// ── StarRating (legacy name → RatingStars) ───────────────────────────────────
export function StarRating(props: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  accessibilityLabel?: string;
}) {
  return <RatingStars {...props} />;
}

// ── LocaleTabs (ar / fr / en) ────────────────────────────────────────────────
const LOCALE_TAB_LABELS: Record<Locale, string> = {
  ar: 'العربية',
  fr: 'Français',
  en: 'English',
};

export function LocaleTabs({ active, onChange }: { active: Locale; onChange: (l: Locale) => void }) {
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
            <Text variant="body-sm" weight={isActive ? 'semibold' : 'medium'} color={isActive ? 'text' : 'textMuted'}>
              {LOCALE_TAB_LABELS[l]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── SelectCard (large tappable option) ───────────────────────────────────────
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
      <View style={styles.flex}>
        <Text variant="title" weight="semibold" color={selected ? 'primary' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {selected ? <Check size={20} color={theme.color.primary} /> : null}
    </Pressable>
  );
}

// ── ToggleRow ────────────────────────────────────────────────────────────────
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
      <View style={styles.flex}>
        <Text variant="body" weight="semibold">
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        ) : null}
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

// ── Chip (legacy: string icon prefix, label, selected, onPress) ──────────────
export function LegacyChip({
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
      style={[styles.legacyChip, selected && styles.legacyChipActive]}
    >
      <Text variant="body-sm" weight={selected ? 'semibold' : 'medium'} color={selected ? 'primary' : 'text'}>
        {icon ? `${icon} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

// ── Card (legacy fields Card: bordered, gap) ─────────────────────────────────
export function LegacyCard({ children }: { children: ReactNode }) {
  return <View style={styles.legacyCard}>{children}</View>;
}

export { FieldLabel };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.pill,
    padding: 4,
    gap: 4,
  },
  tab: { flex: 1, paddingVertical: theme.space.sm, borderRadius: theme.radius.pill, alignItems: 'center' },
  tabActive: { backgroundColor: theme.color.surface, ...theme.shadow.xs },
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
  legacyChip: {
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  legacyChipActive: { borderColor: theme.color.primary, backgroundColor: theme.color.infoBg },
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
  legacyCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space.lg,
    gap: theme.space.md,
  },
});
