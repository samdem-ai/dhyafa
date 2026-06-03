/**
 * Small presentational primitives shared across admin pages.
 *
 * Pure Server-Component-safe building blocks (no client state). They encode the
 * design-token classes the existing moderation pages use so every new page is
 * visually consistent (cards, status pills, table headers, empty/error states).
 */

import type { Locale } from '@dyafa/i18n';
import { C, STATUS_PILL, tl, type Tone } from '../lib/admin-i18n';

// ─── Page header ──────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  count,
  action,
}: {
  title: string;
  subtitle?: string;
  /** Optional badge count (e.g. queue size). */
  count?: number;
  /** Optional trailing node (e.g. a filter control or link). */
  action?: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-md flex-wrap mb-xs">
        <div className="flex items-center gap-md">
          <h1 className="font-display text-heading-1 font-semibold text-primary">{title}</h1>
          {count != null && (
            <span className="rounded-pill bg-accent text-text-on-primary text-caption font-semibold px-md py-xs tabular-nums">
              {count}
            </span>
          )}
        </div>
        {action}
      </div>
      {subtitle && <p className="text-body-sm text-text-muted">{subtitle}</p>}
    </section>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────

export function SectionCard({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card bg-surface shadow-card p-xl flex flex-col gap-md ${className}`}>
      {title && (
        <h2 className="font-display text-heading-2 font-semibold text-primary">{title}</h2>
      )}
      {children}
    </section>
  );
}

// ─── Status pill ─────────────────────────────────────────────────────────────

export function StatusPill({ text, tone }: { text: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill text-caption font-semibold px-md py-xs ${STATUS_PILL[tone]}`}
    >
      {text}
    </span>
  );
}

// ─── Key/value meta row ──────────────────────────────────────────────────────

export function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-md py-sm border-b border-border last:border-0">
      <span className="text-body-sm text-text-muted">{label}</span>
      <span className="text-body-sm font-medium text-text-default text-end">{value}</span>
    </div>
  );
}

// ─── Empty / error states ────────────────────────────────────────────────────

export function EmptyState({
  locale,
  title,
  body,
}: {
  locale: Locale;
  title?: string;
  body?: string;
}) {
  return (
    <div className="rounded-card bg-surface shadow-card px-xl py-3xl flex flex-col items-center text-center gap-sm">
      <span className="font-display text-heading-2 font-semibold text-primary">
        {title ?? tl(C.emptyTitle, locale)}
      </span>
      <p className="text-body-sm text-text-muted max-w-md">{body ?? tl(C.emptyBody, locale)}</p>
    </div>
  );
}

export function ErrorState({ locale, message }: { locale: Locale; message?: string }) {
  return (
    <div role="alert" className="rounded-card bg-error-bg text-error px-xl py-lg text-body-sm">
      {tl(C.errorTitle, locale)}
      {message ? ` — ${message}` : ''}
    </div>
  );
}

// ─── Table shell (consistent header styling) ──────────────────────────────────

export function TableShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-card bg-surface shadow-card overflow-hidden">{children}</div>;
}

/** Column header cell for the grid-based tables used across pages. */
export function Th({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`text-caption font-semibold uppercase tracking-wide text-text-muted ${className}`}>
      {children}
    </span>
  );
}
