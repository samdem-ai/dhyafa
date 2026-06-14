import { forwardRef } from 'react';
import { cn } from '../lib/cn';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-md',
  md: 'p-lg',
  lg: 'p-xl',
};

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Optional header title (renders a bordered header row). */
  title?: React.ReactNode;
  /** Right-aligned header controls (only rendered when `title` is set). */
  actions?: React.ReactNode;
  /** Optional footer slot (bordered). */
  footer?: React.ReactNode;
  /** Body padding. Default `lg`. Use `none` for tables/edge-to-edge content. */
  padding?: CardPadding;
  as?: 'section' | 'div' | 'article';
}

/** Surface card — white bg, hairline border, soft teal-tinted shadow. */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { title, actions, footer, padding = 'lg', as: Tag = 'section', className, children, ...rest },
  ref,
) {
  return (
    <Tag
      ref={ref as never}
      className={cn(
        'rounded-card border border-border bg-surface shadow-card',
        className,
      )}
      {...rest}
    >
      {title != null && (
        <div className="flex flex-wrap items-center justify-between gap-md border-b border-border px-xl py-lg">
          <h3 className="font-display text-heading-3 font-semibold text-primary">{title}</h3>
          {actions && <div className="flex items-center gap-sm">{actions}</div>}
        </div>
      )}
      <div className={PADDING[padding]}>{children}</div>
      {footer != null && (
        <div className="border-t border-border px-xl py-lg">{footer}</div>
      )}
    </Tag>
  );
});
