/**
 * Thin re-export shim — DO NOT add components here.
 *
 * The real design system lives in `@/ui`. This module preserves the legacy
 * import path `@/components/ui` so existing screens keep compiling during the
 * migration. New code should import from `@/ui` directly.
 */

export { PrimaryButton, StatusBadge, FieldLabel } from '@/ui/legacy';
export {
  Skeleton,
  SkeletonList,
  ErrorState,
  EmptyState,
} from '@/ui';
