import { useId } from 'react';
import { cn } from '../lib/cn';

export interface FormFieldProps {
  label?: React.ReactNode;
  /** Helper text under the label. */
  helper?: React.ReactNode;
  /** Error message; turns the control red and is announced via aria-describedby. */
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  /**
   * Render-prop: receives the ids to wire onto the control
   * (`id`, `aria-describedby`, `aria-invalid`).
   */
  children: (ids: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }) => React.ReactNode;
}

/**
 * Field wrapper: label (above) + helper + control slot + reserved message line.
 * Wires `aria-describedby`/`aria-invalid` to the control via a render-prop so
 * validation is announced. Reserves message height to avoid layout jump.
 */
export function FormField({ label, helper, error, required, className, children }: FormFieldProps) {
  const id = useId();
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-xs', className)}>
      {label != null && (
        <label htmlFor={id} className="text-body-sm font-semibold text-text-default">
          {label}
          {required && (
            <span className="ms-xs text-caption font-medium text-text-muted">(required)</span>
          )}
        </label>
      )}
      {helper != null && (
        <p id={helperId} className="text-caption text-text-muted">
          {helper}
        </p>
      )}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {/* Reserve a line so the field doesn't jump when an error appears. */}
      <p id={errorId} className={cn('min-h-[1rem] text-caption', error ? 'text-error' : 'sr-only')}>
        {error}
      </p>
    </div>
  );
}
