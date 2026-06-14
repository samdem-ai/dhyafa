'use client';

import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Enable an inline search box (for long lists like wilayas). */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-label'?: string;
  className?: string;
}

const TRIGGER =
  'flex h-10 w-full items-center justify-between gap-sm rounded-sm border border-border-strong bg-surface px-md text-body-sm text-text-default shadow-xs ' +
  'transition-[border-color,box-shadow] duration-fast ' +
  'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 focus-visible:ring-offset-bg ' +
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-muted ' +
  'aria-[invalid=true]:border-error';

/**
 * Searchable single-select built on Radix Popover (full focus/dismiss handling).
 * Logical-property safe; the list mirrors in RTL.
 */
export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchable = false,
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  disabled,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  'aria-label': ariaLabel,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery('');
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={cn(TRIGGER, className)}
        >
          <span className={cn('truncate', !selected && 'text-text-muted')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-dropdown w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-sm border border-border bg-surface shadow-raised data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none"
        >
          {searchable && (
            <div className="flex items-center gap-sm border-b border-border px-md py-sm">
              <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-body-sm text-text-default placeholder:text-text-muted focus-visible:outline-none"
              />
            </div>
          )}
          <ul role="listbox" className="max-h-64 overflow-y-auto p-xs">
            {filtered.length === 0 && (
              <li className="px-md py-sm text-caption text-text-muted">{emptyText}</li>
            )}
            {filtered.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-sm rounded-sm px-md py-sm text-start text-body-sm transition-colors duration-fast',
                      'hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-none',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      isSelected ? 'font-semibold text-primary' : 'text-text-default',
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
