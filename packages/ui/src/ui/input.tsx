import { forwardRef } from 'react';
import { cn } from '../lib/cn';

const FIELD_BASE =
  'w-full rounded-sm border bg-surface text-body-sm text-text-default ' +
  'placeholder:text-text-muted shadow-xs transition-[border-color,box-shadow] duration-fast ' +
  'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 focus-visible:ring-offset-bg ' +
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-muted motion-reduce:transition-none ' +
  'aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:ring-error';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Icon rendered at the inline-start edge. */
  iconStart?: React.ReactNode;
  /** Icon rendered at the inline-end edge. */
  iconEnd?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, iconStart, iconEnd, ...rest },
  ref,
) {
  if (iconStart || iconEnd) {
    return (
      <div className="relative flex items-center">
        {iconStart && (
          <span className="pointer-events-none absolute start-md text-text-muted [&>svg]:h-4 [&>svg]:w-4">
            {iconStart}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            FIELD_BASE,
            'h-10',
            iconStart ? 'ps-3xl' : 'ps-md',
            iconEnd ? 'pe-3xl' : 'pe-md',
            className,
          )}
          {...rest}
        />
        {iconEnd && (
          <span className="pointer-events-none absolute end-md text-text-muted [&>svg]:h-4 [&>svg]:w-4">
            {iconEnd}
          </span>
        )}
      </div>
    );
  }
  return <input ref={ref} className={cn(FIELD_BASE, 'h-10 px-md', className)} {...rest} />;
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(FIELD_BASE, 'resize-y px-md py-sm', className)}
      {...rest}
    />
  );
});
