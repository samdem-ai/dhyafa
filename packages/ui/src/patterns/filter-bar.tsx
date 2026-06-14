'use client';

import { Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { Input } from '../ui/input';
import { Pill } from '../ui/pill';

export interface FilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

export interface FilterBarProps {
  /** Search box value (controlled). Omit `onSearchChange` to hide the search box. */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Active filters rendered as removable chips. */
  chips?: FilterChip[];
  /** Clear-all control (only shown when there are chips). */
  onClearAll?: () => void;
  clearAllLabel?: string;
  removeChipLabel?: string;
  /** Left-side filter controls (selects, popovers). */
  children?: React.ReactNode;
  /** Right-aligned slot (density toggle, column visibility, export). */
  rightSlot?: React.ReactNode;
  className?: string;
}

/** Table toolbar: search + filter controls + removable active-filter chips. */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  chips = [],
  onClearAll,
  clearAllLabel = 'Clear all',
  removeChipLabel = 'Remove filter',
  children,
  rightSlot,
  className,
}: FilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-md', className)}>
      <div className="flex flex-wrap items-center gap-sm">
        {onSearchChange && (
          <div className="min-w-[12rem] flex-1 sm:max-w-xs">
            <Input
              type="search"
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              iconStart={<Search aria-hidden="true" />}
              aria-label={searchPlaceholder}
            />
          </div>
        )}
        {children}
        {rightSlot && <div className="ms-auto flex items-center gap-sm">{rightSlot}</div>}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-xs">
          {chips.map((chip) => (
            <Pill
              key={chip.id}
              variant="neutral"
              size="md"
              removable
              onRemove={chip.onRemove}
              removeLabel={removeChipLabel}
            >
              {chip.label}
            </Pill>
          ))}
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-sm px-sm py-xs text-caption font-semibold text-text-muted underline-offset-2 transition-colors duration-fast hover:text-text-default hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {clearAllLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
