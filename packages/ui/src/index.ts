/**
 * @dyafa/ui — shared design-system component library.
 *
 * Built on Radix UI primitives + the @dyafa/design-tokens Tailwind preset.
 * Source-based exports: consuming apps transpile this package (add to
 * `transpilePackages`) and include `../../packages/ui/src/**` in Tailwind
 * `content`. All components are RTL-safe (logical properties only).
 */

// ── Utilities ────────────────────────────────────────────────────────────────
export { cn } from './lib/cn';

// ── Primitives (ui/) ─────────────────────────────────────────────────────────
export { Button } from './ui/button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './ui/button';

export { Card } from './ui/card';
export type { CardProps, CardPadding } from './ui/card';

export { Pill, statusToPill } from './ui/pill';
export type { PillProps, PillVariant, PillSize, StatusDescriptor } from './ui/pill';

export { FormField } from './ui/form-field';
export type { FormFieldProps } from './ui/form-field';

export { Input, Textarea } from './ui/input';
export type { InputProps, TextareaProps } from './ui/input';

export { Select } from './ui/select';
export type { SelectProps, SelectOption } from './ui/select';

export { Checkbox } from './ui/checkbox';
export type { CheckboxProps } from './ui/checkbox';

export { Switch } from './ui/switch';
export type { SwitchProps } from './ui/switch';

export { Modal } from './ui/modal';
export type { ModalProps, ModalSize } from './ui/modal';

export { ConfirmDialog } from './ui/confirm-dialog';
export type { ConfirmDialogProps } from './ui/confirm-dialog';

export { ToastProvider, useToast } from './ui/toast';
export type { ToastOptions, ToastVariant } from './ui/toast';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

export { Tooltip, TooltipProvider } from './ui/tooltip';
export type { TooltipProps } from './ui/tooltip';

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverClose,
} from './ui/popover';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

export { SegmentedControl } from './ui/segmented-control';
export type { SegmentedControlProps, SegmentOption } from './ui/segmented-control';

export { Skeleton, SkeletonCard, SkeletonTable } from './ui/skeleton';
export type { SkeletonProps } from './ui/skeleton';

// ── Patterns (patterns/) ─────────────────────────────────────────────────────
export { PageHeader } from './patterns/page-header';
export type { PageHeaderProps } from './patterns/page-header';

export { StatCard } from './patterns/stat-card';
export type { StatCardProps, TrendDirection } from './patterns/stat-card';

export { FilterBar } from './patterns/filter-bar';
export type { FilterBarProps, FilterChip } from './patterns/filter-bar';

export { EmptyState } from './patterns/empty-state';
export type { EmptyStateProps, EmptyStatePreset } from './patterns/empty-state';

export { DataTable } from './patterns/data-table';
export type {
  DataTableProps,
  DataTableColumn,
  DataTablePagination,
  DataTableLabels,
  ColumnAlign,
  TableDensity,
} from './patterns/data-table';

// ── App shell (app-shell/) ───────────────────────────────────────────────────
export { AppShell } from './app-shell/app-shell';
export type { AppShellProps } from './app-shell/app-shell';
export { Sidebar } from './app-shell/sidebar';
export type { SidebarProps, LinkComponent } from './app-shell/sidebar';
export { TopBar } from './app-shell/top-bar';
export type { TopBarProps } from './app-shell/top-bar';
export type { NavItem, NavGroup, LanguageOption } from './app-shell/types';
