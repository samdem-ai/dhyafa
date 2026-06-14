import { cn } from '../lib/cn';

export interface PageHeaderProps {
  /** Page title — rendered in Fraunces (display font). */
  title: React.ReactNode;
  /** Optional descriptive line under the title. */
  meta?: React.ReactNode;
  /** Status slot (e.g. a <Pill>) shown inline after the title. */
  status?: React.ReactNode;
  /** Primary actions (right-aligned LTR / start-aligned RTL via flex). */
  actions?: React.ReactNode;
  className?: string;
}

/** Detail/page header: Fraunces title + status slot + actions. */
export function PageHeader({ title, meta, status, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-md', className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-md">
          <h1 className="font-display text-heading-1 font-semibold tracking-tight text-primary">
            {title}
          </h1>
          {status}
        </div>
        {meta != null && <p className="mt-xs text-body-sm text-text-muted">{meta}</p>}
      </div>
      {actions != null && <div className="flex shrink-0 items-center gap-sm">{actions}</div>}
    </header>
  );
}
