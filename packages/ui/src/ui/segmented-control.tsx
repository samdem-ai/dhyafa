'use client';

import { cn } from '../lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label'?: string;
  className?: string;
}

/** Compact segmented toggle (time range / density). Single-select radiogroup. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-px rounded-sm border border-border bg-surface-sunken p-px shadow-xs',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-[6px] px-md py-xs text-caption font-semibold transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 focus-visible:ring-offset-bg motion-reduce:transition-none',
              active
                ? 'bg-surface text-primary shadow-xs'
                : 'text-text-muted hover:text-text-default',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
