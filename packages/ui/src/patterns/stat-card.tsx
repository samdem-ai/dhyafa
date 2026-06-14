import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../lib/cn';
import { Pill } from '../ui/pill';

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface StatCardProps {
  /** Overline label (uppercase, muted). */
  label: string;
  /** Big value — Fraunces, tabular-nums. */
  value: React.ReactNode;
  /** Render the value in terracotta accent (money/headline metric). */
  accent?: boolean;
  /** Trend delta shown as a Pill. */
  trend?: { direction: TrendDirection; text: string };
  /** Caption under the value (e.g. "vs last period"). */
  sub?: string;
  /** Optional leading icon chip. */
  icon?: React.ReactNode;
  className?: string;
}

const TREND_VARIANT = {
  up: 'success',
  down: 'error',
  neutral: 'neutral',
} as const;

/** KPI card: overline label, Fraunces tabular value, trend pill. */
export function StatCard({ label, value, accent = false, trend, sub, icon, className }: StatCardProps) {
  return (
    <div className={cn('flex flex-col rounded-card border border-border bg-surface p-xl shadow-card', className)}>
      <div className="flex items-start justify-between gap-md">
        <span className="text-overline font-semibold uppercase tracking-[0.12em] text-text-muted">
          {label}
        </span>
        {icon && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-primary/8 text-primary">
            {icon}
          </span>
        )}
      </div>

      <div className="mt-sm flex items-end justify-between gap-md">
        <span
          className={cn(
            'font-display text-display-lg font-semibold leading-none tracking-tight tabular-nums',
            accent ? 'text-accent' : 'text-primary',
          )}
        >
          {value}
        </span>
        {trend && (
          <Pill variant={TREND_VARIANT[trend.direction]} size="sm" className="tabular-nums">
            {trend.direction === 'up' && <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />}
            {trend.direction === 'down' && <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
            {trend.text}
          </Pill>
        )}
      </div>

      {sub && <span className="mt-sm text-caption text-text-muted">{sub}</span>}
    </div>
  );
}
