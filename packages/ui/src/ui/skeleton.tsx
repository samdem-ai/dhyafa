import { cn } from '../lib/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/** Shimmering placeholder block. Reduced-motion safe. */
export function Skeleton({ className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-sm bg-surface-sunken motion-reduce:animate-none',
        className,
      )}
      {...rest}
    />
  );
}

/** Card-shaped skeleton (header strip + body lines). */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('rounded-card border border-border bg-surface p-xl shadow-card', className)}>
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-lg flex flex-col gap-sm">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3.5" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Table-shaped skeleton matching the DataTable chrome (header + rows). */
export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div className="flex items-center gap-xl border-b border-border bg-surface-sunken/50 px-xl py-md">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-3" style={{ width: c === 0 ? '34%' : `${18 - c * 2}%` }} />
        ))}
      </div>
      <ul>
        {Array.from({ length: rows }).map((_, r) => (
          <li key={r} className="flex items-center gap-xl border-b border-border px-xl py-lg last:border-0">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4" style={{ width: c === 0 ? '34%' : `${18 - c * 2}%` }} />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
