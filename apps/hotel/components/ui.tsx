/**
 * Small shared presentational components for the hotel dashboard.
 * Server-safe (no client hooks). Tokens + RTL-friendly logical utilities.
 */

import type { ReactNode } from 'react';
import { formatDZD, type Locale } from '@dyafa/i18n';

/** Page title + optional subtitle, with an optional right-aligned slot. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-heading-1 font-semibold text-primary">{title}</h1>
        {subtitle && <p className="text-body-sm text-text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Centered empty-state card. */
export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-card bg-surface shadow-card px-xl py-3xl flex flex-col items-center text-center gap-sm">
      <span className="font-display text-heading-3 font-semibold text-primary">{title}</span>
      {body && <p className="text-body-sm text-text-muted max-w-md">{body}</p>}
    </div>
  );
}

/** Inline error banner. */
export function ErrorState({ title, message }: { title: string; message?: string }) {
  return (
    <div role="alert" className="rounded-card bg-error-bg text-error px-xl py-lg text-body-sm">
      {title}
      {message ? ` — ${message}` : ''}
    </div>
  );
}

/** A KPI tile. */
export function KpiCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-sm">
      <span className="text-caption font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span
        className={`font-display text-heading-1 font-semibold tabular-nums ${
          accent ? 'text-accent' : 'text-primary'
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-body-sm text-text-muted">{sub}</span>}
    </div>
  );
}

/** Generic status pill given precomputed color classes. */
export function StatusPill({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`rounded-pill text-caption font-semibold px-md py-xs ${colorClass}`}>
      {label}
    </span>
  );
}

/** A DZD amount wrapped in <bdi> to prevent RTL symbol reordering. */
export function Price({
  amount,
  locale,
  className,
}: {
  amount: number;
  locale: Locale;
  className?: string;
}) {
  return <bdi className={`tabular-nums ${className ?? ''}`}>{formatDZD(amount, locale)}</bdi>;
}

/** Section wrapper with a heading. */
export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="font-display text-heading-2 font-semibold text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
