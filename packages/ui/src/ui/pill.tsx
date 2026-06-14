import { forwardRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

export type PillVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'accent';
export type PillSize = 'sm' | 'md';

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: PillVariant;
  size?: PillSize;
  /** Show a leading status dot. */
  dot?: boolean;
  /** Render a trailing × that calls `onRemove`. */
  removable?: boolean;
  onRemove?: () => void;
  /** aria-label for the remove button. */
  removeLabel?: string;
}

const VARIANTS: Record<PillVariant, string> = {
  neutral: 'bg-surface-sunken text-text-muted ring-1 ring-inset ring-border-strong/50',
  success: 'bg-success-bg text-success ring-1 ring-inset ring-success/15',
  warning: 'bg-warning-bg text-warning ring-1 ring-inset ring-warning/15',
  error: 'bg-error-bg text-error ring-1 ring-inset ring-error/15',
  info: 'bg-info-bg text-info ring-1 ring-inset ring-info/20',
  accent: 'bg-accent/12 text-accent ring-1 ring-inset ring-accent/20',
};

const SIZES: Record<PillSize, string> = {
  sm: 'px-sm py-[1px] text-overline',
  md: 'px-md py-xs text-caption',
};

/** Status badge. Use `statusToPill()` to map a domain status → variant + label. */
export const Pill = forwardRef<HTMLSpanElement, PillProps>(function Pill(
  { variant = 'neutral', size = 'md', dot = false, removable = false, onRemove, removeLabel = 'Remove', className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-xs rounded-pill font-semibold',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-pill bg-current opacity-70" />}
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="-me-1 grid h-4 w-4 place-items-center rounded-pill text-current/70 transition-colors duration-fast hover:bg-current/15 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
});

/** A status descriptor: which pill variant + the user-facing label. */
export interface StatusDescriptor {
  variant: PillVariant;
  label: string;
}

/**
 * Centralized status → pill mapper. Pass a status key and a label map; the
 * function resolves the right pill variant from a known vocabulary, falling
 * back to `neutral`. Domain apps keep their own localized label maps and feed
 * the resolved label in.
 */
const STATUS_VARIANTS: Record<string, PillVariant> = {
  // generic
  active: 'success',
  inactive: 'neutral',
  draft: 'neutral',
  pending: 'warning',
  // property / listing
  approved: 'success',
  published: 'success',
  rejected: 'error',
  suspended: 'error',
  // bookings
  requested: 'info',
  awaiting_payment: 'warning',
  confirmed: 'success',
  checked_in: 'success',
  completed: 'success',
  cancelled: 'error',
  no_show: 'error',
  declined: 'neutral',
  expired: 'neutral',
  // payments / payouts
  processing: 'info',
  paid: 'success',
  failed: 'error',
  refunded: 'neutral',
  partially_refunded: 'neutral',
  on_hold: 'neutral',
  // disputes
  open: 'warning',
  under_review: 'info',
  resolved: 'success',
  // verification
  unverified: 'neutral',
  verified: 'success',
  hidden: 'neutral',
  removed: 'error',
};

/** Resolve the pill variant for a status key (neutral fallback). */
export function statusToPill(status: string | null | undefined): PillVariant {
  if (!status) return 'neutral';
  return STATUS_VARIANTS[status] ?? 'neutral';
}
