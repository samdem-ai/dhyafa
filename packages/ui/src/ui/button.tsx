'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'success'
  | 'link';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a spinner and disable the button. Width is preserved (no reflow). */
  loading?: boolean;
  /** Icon rendered before the label (inline-start, mirrors in RTL). */
  iconStart?: React.ReactNode;
  /** Icon rendered after the label (inline-end, mirrors in RTL). */
  iconEnd?: React.ReactNode;
  fullWidth?: boolean;
}

const BASE =
  'relative inline-flex items-center justify-center gap-xs rounded-sm font-semibold whitespace-nowrap select-none ' +
  'transition-[background-color,color,box-shadow,border-color,opacity] duration-fast ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
  'disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none';

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-md text-caption',
  md: 'h-10 px-lg text-body-sm',
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-text-on-primary shadow-xs hover:bg-primary-hover active:bg-primary-pressed',
  secondary:
    'border border-border-strong bg-surface text-text-default shadow-xs hover:bg-surface-sunken active:bg-surface-sunken',
  ghost: 'text-text-muted hover:bg-surface-sunken hover:text-text-default',
  destructive:
    'bg-error text-text-on-primary shadow-xs hover:bg-error/90 active:bg-error/80',
  success:
    'bg-success text-text-on-primary shadow-xs hover:bg-success/90 active:bg-success/80',
  link: 'h-auto px-0 text-primary underline-offset-4 hover:underline shadow-none',
};

/**
 * Primary action button. `primary` = teal, `success` = green (positive
 * confirmations), `destructive` = error red. Positive actions use primary or
 * success — never the terracotta accent, which is reserved for the single CTA
 * per view + prices + active states.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    iconStart,
    iconEnd,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        BASE,
        SIZES[size],
        VARIANTS[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        </span>
      )}
      <span className={cn('inline-flex items-center gap-xs', loading && 'invisible')}>
        {iconStart}
        {children}
        {iconEnd}
      </span>
    </button>
  );
});
