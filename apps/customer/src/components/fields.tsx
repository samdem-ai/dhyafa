/**
 * Thin re-export shim — DO NOT add components here.
 *
 * The real form fields live in `@/ui`. This module preserves the legacy import
 * path `@/components/fields` so existing wizard/host screens keep compiling
 * during the migration. New code should import from `@/ui` directly.
 */

export { TextField } from '@/ui';
export { LocaleTabs, SelectCard, ToggleRow, LegacyChip as Chip, LegacyCard as Card } from '@/ui/legacy';
