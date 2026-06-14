import { Inbox, SearchX } from 'lucide-react';
import { cn } from '../lib/cn';

export type EmptyStatePreset = 'no-data' | 'no-results';

export interface EmptyStateProps {
  /** `no-data` = nothing exists yet; `no-results` = filters matched nothing. */
  preset?: EmptyStatePreset;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Optional action (e.g. Create… for no-data, Clear filters for no-results). */
  action?: React.ReactNode;
  className?: string;
}

/** Designed empty state with two presets. */
export function EmptyState({
  preset = 'no-data',
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const defaultIcon =
    preset === 'no-results' ? (
      <SearchX className="h-7 w-7" aria-hidden="true" />
    ) : (
      <Inbox className="h-7 w-7" aria-hidden="true" />
    );

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-md rounded-card border border-dashed border-border-strong bg-surface px-xl py-3xl text-center',
        className,
      )}
    >
      <span className="grid h-14 w-14 place-items-center rounded-pill bg-surface-sunken text-text-muted">
        {icon ?? defaultIcon}
      </span>
      <div className="flex flex-col gap-xs">
        <span className="font-display text-heading-3 font-semibold text-primary">{title}</span>
        {description && (
          <p className="mx-auto max-w-sm text-body-sm text-text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
