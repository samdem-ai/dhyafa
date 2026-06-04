/**
 * Presentational primitives shared across admin pages.
 *
 * Pure Server-Component-safe building blocks (no client state) that encode the
 * Dyafa design system so every page is visually consistent: cards with soft
 * teal-tinted shadows, stat tiles with trend pills, status pills, tables (sticky
 * header / hairline rows / hover tint / designed empty + skeleton states), and a
 * shared button helper. RTL-safe via CSS logical utilities (ps-/pe-/text-start).
 *
 * Back-compat: the original exports (PageHeader, SectionCard, StatusPill,
 * MetaRow, EmptyState, ErrorState, TableShell, Th) keep their signatures so the
 * existing pages render unchanged while gaining the refreshed styling.
 */

import type { Locale } from '@dyafa/i18n';
import { C, STATUS_PILL, tl, type Tone } from '../lib/admin-i18n';
import { ArrowRightIcon, InboxIcon, TrendDownIcon, TrendUpIcon } from './icons';

// Shared shadow for elevated surfaces (set as a utility in globals.css).
const CARD_SHADOW = 'shadow-elevated';

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
    <section className="flex flex-wrap items-start justify-between gap-md">
      <div className="min-w-0">
        <div className="flex items-center gap-md">
          <h2 className="font-display text-heading-1 font-semibold tracking-tight text-primary">
            {title}
          </h2>
          {count != null && (
            <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-pill bg-accent/12 px-sm py-xs text-caption font-semibold tabular-nums text-accent ring-1 ring-inset ring-accent/20">
              {count}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-xs max-w-2xl text-body-sm text-text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-sm">{action}</div>}
    </section>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────

export function Card({
  title,
  actions,
  children,
  className = '',
  bodyClassName = '',
  as: Tag = 'section',
}: {
  title?: React.ReactNode;
  /** Right-aligned header controls (only rendered when `title` is set). */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: 'section' | 'div' | 'article';
}) {
  return (
    <Tag
      className={`rounded-card border border-border bg-surface ${CARD_SHADOW} ${className}`}
    >
      {title != null && (
        <div className="flex flex-wrap items-center justify-between gap-md border-b border-border px-xl py-lg">
          <h3 className="font-display text-heading-3 font-semibold text-primary">{title}</h3>
          {actions && <div className="flex items-center gap-sm">{actions}</div>}
        </div>
      )}
      <div className={`p-xl ${bodyClassName}`}>{children}</div>
    </Tag>
  );
}

/**
 * Back-compat card used by existing pages. Same look as <Card> (hairline border
 * + soft shadow) with an optional title; flex-column body with gap.
 */
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
    <section
      className={`flex flex-col gap-md rounded-card border border-border bg-surface p-xl ${CARD_SHADOW} ${className}`}
    >
      {title && (
        <h2 className="font-display text-heading-3 font-semibold text-primary">{title}</h2>
      )}
      {children}
    </section>
  );
}

// ─── Stat / KPI card ─────────────────────────────────────────────────────────

export type TrendDir = 'up' | 'down' | 'neutral';

export function StatCard({
  label,
  value,
  sub,
  accent = false,
  trend,
  chart,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  /** Render the value in terracotta (rationed accent — money/headline metric). */
  accent?: boolean;
  /** Optional trend pill, e.g. { dir: 'up', text: '+12%' }. */
  trend?: { dir: TrendDir; text: string };
  /** Optional sparkline / mini-chart slot rendered under the value. */
  chart?: React.ReactNode;
  /** Optional leading icon shown in a soft tinted chip. */
  icon?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col rounded-card border border-border bg-surface p-xl ${CARD_SHADOW}`}>
      <div className="flex items-start justify-between gap-md">
        <span className="text-overline font-semibold uppercase tracking-[0.12em] text-text-muted">
          {label}
        </span>
        {icon && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/8 text-primary">
            {icon}
          </span>
        )}
      </div>

      <div className="mt-sm flex items-end justify-between gap-md">
        <span
          className={`font-display text-display-lg font-semibold leading-none tracking-tight tabular-nums ${
            accent ? 'text-accent' : 'text-primary'
          }`}
        >
          {value}
        </span>
        {trend && <TrendPill dir={trend.dir} text={trend.text} />}
      </div>

      {chart && <div className="mt-md">{chart}</div>}
      {sub && <span className="mt-sm text-caption text-text-muted">{sub}</span>}
    </div>
  );
}

export function TrendPill({ dir, text }: { dir: TrendDir; text: string }) {
  const map: Record<TrendDir, string> = {
    up: 'bg-success-bg text-success',
    down: 'bg-error-bg text-error',
    neutral: 'bg-surface-sunken text-text-muted',
  };
  return (
    <span
      className={`inline-flex items-center gap-xs rounded-pill px-sm py-xs text-caption font-semibold tabular-nums ${map[dir]}`}
    >
      {dir === 'up' && <TrendUpIcon className="h-3.5 w-3.5" />}
      {dir === 'down' && <TrendDownIcon className="h-3.5 w-3.5" />}
      {text}
    </span>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

/**
 * Shared button class string. Compose into <button>/<a>/form submit elements so
 * client islands (panels, forms) and server links share one visual language.
 */
export function buttonClass({
  variant = 'secondary',
  size = 'md',
  full = false,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
} = {}): string {
  const base =
    'inline-flex items-center justify-center gap-xs rounded-md font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,opacity] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-55';
  const sizes: Record<ButtonSize, string> = {
    sm: 'h-9 px-md text-caption',
    md: 'h-10 px-lg text-body-sm',
  };
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-text-on-primary shadow-xs hover:bg-primary-hover active:bg-primary-pressed',
    accent: 'bg-accent text-text-on-primary shadow-xs hover:bg-accent-hover active:bg-accent-hover',
    secondary:
      'border border-border-strong bg-surface text-text-default shadow-xs hover:bg-surface-sunken active:bg-surface-sunken',
    ghost: 'text-text-muted hover:bg-surface-sunken hover:text-text-default',
    danger: 'bg-error-bg text-error hover:bg-error hover:text-text-on-primary',
  };
  return `${base} ${sizes[size]} ${variants[variant]} ${full ? 'w-full' : ''}`;
}

/** Convenience <a> button (server-safe). */
export function LinkButton({
  href,
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <a href={href} className={`${buttonClass({ variant, size })} ${className}`}>
      {children}
    </a>
  );
}

// ─── Status pill ─────────────────────────────────────────────────────────────

export function StatusPill({ text, tone }: { text: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-xs rounded-pill px-md py-xs text-caption font-semibold ${STATUS_PILL[tone]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-pill bg-current opacity-70" />
      {text}
    </span>
  );
}

// ─── Key/value meta row ──────────────────────────────────────────────────────

export function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-md border-b border-border py-md last:border-0">
      <span className="text-body-sm text-text-muted">{label}</span>
      <span className="text-end text-body-sm font-medium text-text-default">{value}</span>
    </div>
  );
}

// ─── Empty / error states ────────────────────────────────────────────────────

export function EmptyState({
  locale,
  title,
  body,
  icon,
  action,
}: {
  locale: Locale;
  title?: string;
  body?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-md rounded-card border border-dashed border-border-strong bg-surface px-xl py-3xl text-center">
      <span className="grid h-14 w-14 place-items-center rounded-pill bg-surface-sunken text-text-muted">
        {icon ?? <InboxIcon className="h-7 w-7" />}
      </span>
      <div className="flex flex-col gap-xs">
        <span className="font-display text-heading-3 font-semibold text-primary">
          {title ?? tl(C.emptyTitle, locale)}
        </span>
        <p className="mx-auto max-w-sm text-body-sm text-text-muted">
          {body ?? tl(C.emptyBody, locale)}
        </p>
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ locale, message }: { locale: Locale; message?: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-sm rounded-card border border-error/25 bg-error-bg px-lg py-md text-body-sm text-error"
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-pill bg-error/15 text-caption font-bold">
        !
      </span>
      <span>
        <span className="font-semibold">{tl(C.errorTitle, locale)}</span>
        {message ? ` — ${message}` : ''}
      </span>
    </div>
  );
}

// ─── Table primitives ──────────────────────────────────────────────────────────

/** Card wrapper for a table — hairline border, soft shadow, clipped corners. */
export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`overflow-hidden rounded-card border border-border bg-surface ${CARD_SHADOW}`}>
      {children}
    </div>
  );
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
    <span
      className={`text-overline font-semibold uppercase tracking-[0.1em] text-text-muted ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Skeleton rows for a table while a route loads. Mirrors the 52–56px row height
 * so the layout doesn't jump when data resolves.
 */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className={`overflow-hidden rounded-card border border-border bg-surface ${CARD_SHADOW}`}>
      <div className="border-b border-border bg-surface-sunken/40 px-xl py-md">
        <div className="h-3 w-32 rounded-pill bg-surface-sunken" />
      </div>
      <ul>
        {Array.from({ length: rows }).map((_, r) => (
          <li
            key={r}
            className="flex items-center gap-xl border-b border-border px-xl py-lg last:border-0"
          >
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-4 animate-pulse rounded-pill bg-surface-sunken"
                style={{ width: c === 0 ? '34%' : `${18 - c * 2}%` }}
              />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Re-export so pages can pull a single arrow glyph without importing icons.tsx.
export { ArrowRightIcon };
