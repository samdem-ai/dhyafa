/**
 * Shared presentational primitives for the hotel dashboard.
 *
 * Server-safe (no client hooks). Everything composes a small set of building
 * blocks — Card, Button, Pill, StatCard, Table — styled from the Dyafa design
 * tokens with logical (RTL-aware) spacing utilities. Public signatures are kept
 * stable so existing pages keep working; new primitives are additive.
 */

import type { ReactNode } from 'react';
import { formatDZD, type Locale } from '@dyafa/i18n';
import { ArrowRightIcon, SearchIcon, TrendDownIcon, TrendUpIcon } from './icons';

/* ── Card ────────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className = '',
  padded = true,
  interactive = false,
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  /** Apply the default 20–24px padding (set false for tables / media). */
  padded?: boolean;
  /** Add the hover lift (use on linked cards). */
  interactive?: boolean;
  as?: 'div' | 'section' | 'article';
}) {
  return (
    <As
      className={`card-surface ${interactive ? 'card-interactive' : ''} ${
        padded ? 'p-lg sm:p-xl' : ''
      } ${className}`}
    >
      {children}
    </As>
  );
}

/** Card header row: title (+ optional subtitle) on the start, actions on the end. */
export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-md">
      <div className="flex items-center gap-md min-w-0">
        {icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-sunken text-primary">
            {icon}
          </span>
        )}
        <div className="flex flex-col gap-px min-w-0">
          <h3 className="font-display text-heading-3 font-semibold text-primary truncate">{title}</h3>
          {subtitle && <p className="text-body-sm text-text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Page header ─────────────────────────────────────────────────────────── */

/** Page title + optional subtitle, with an optional end-aligned slot. */
export function PageHeader({
  title,
  subtitle,
  action,
  count,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Optional badge count rendered next to the title (e.g. queue size). */
  count?: number;
}) {
  return (
    <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-xs min-w-0">
        <div className="flex items-center gap-md">
          <h1 className="font-display text-display-lg font-semibold text-primary leading-tight">
            {title}
          </h1>
          {count != null && (
            <span className="rounded-pill bg-accent/15 text-accent-hover text-caption font-semibold px-md py-xs tabular-nums">
              {count}
            </span>
          )}
        </div>
        {subtitle && <p className="text-body text-text-muted max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Section wrapper ─────────────────────────────────────────────────────── */

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

/* ── Pills / badges ──────────────────────────────────────────────────────── */

export type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral' | 'accent';

const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  info: 'bg-info-bg text-info',
  danger: 'bg-error-bg text-error',
  neutral: 'bg-surface-sunken text-text-muted',
  accent: 'bg-accent/15 text-accent-hover',
};

/** Tone-based pill (preferred). */
export function Pill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-xs rounded-pill text-caption font-semibold px-md py-xs whitespace-nowrap ${TONE_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}

/**
 * Status pill given precomputed color classes (kept for the booking/property/
 * payout status helpers in dashboard-i18n that already return tailwind classes).
 */
export function StatusPill({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill text-caption font-semibold px-md py-xs whitespace-nowrap ${colorClass}`}
    >
      {label}
    </span>
  );
}

/* ── Buttons (server-safe link variant) ──────────────────────────────────── */

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const BTN_BASE =
  'inline-flex items-center justify-center gap-sm font-semibold rounded-md transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none';

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-text-on-primary hover:bg-primary-hover active:bg-primary-pressed',
  accent: 'bg-accent text-text-on-primary hover:bg-accent-hover',
  secondary: 'bg-surface text-text-default border border-border-strong hover:bg-surface-sunken',
  ghost: 'text-text-muted hover:text-text-default hover:bg-surface-sunken',
  danger: 'bg-error-bg text-error hover:bg-error hover:text-text-on-primary',
};

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'text-body-sm px-md py-xs min-h-[36px]',
  md: 'text-body px-lg py-sm min-h-[40px]',
};

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
): string {
  return `${BTN_BASE} ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${extra}`;
}

/** Anchor styled as a button (server-safe; client buttons reuse `buttonClass`). */
export function LinkButton({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <a href={href} className={buttonClass(variant, size, className)}>
      {children}
    </a>
  );
}

/** A subtle "view all →" style link with a trailing arrow that mirrors in RTL. */
export function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-xs text-body-sm font-semibold text-accent-hover hover:text-accent transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 rounded-sm"
    >
      {label}
      <ArrowRightIcon size={15} className="transition-transform duration-fast group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
    </a>
  );
}

/* ── Inputs (style hooks reused by client controls) ──────────────────────── */

export const inputClass =
  'h-10 w-full rounded-md border border-border-strong bg-surface px-md text-body text-text-default placeholder:text-text-muted outline-none transition-shadow duration-fast focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1';

export const selectClass = `${inputClass} pe-9 appearance-none cursor-pointer`;

/* ── StatCard (KPI tile) ─────────────────────────────────────────────────── */

export interface Trend {
  /** Positive => up/green, negative => down/red, 0 => neutral. */
  direction: 'up' | 'down' | 'flat';
  label: string;
}

/**
 * KPI tile. Back-compatible signature (`label`, `value`, `sub`, `accent`) plus
 * optional `icon`, `trend`, and a `sparkline` slot. Equal height in a grid.
 */
export function KpiCard({
  label,
  value,
  sub,
  accent = false,
  icon,
  trend,
  sparkline,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  icon?: ReactNode;
  trend?: Trend;
  sparkline?: ReactNode;
}) {
  return (
    <div className="card-surface card-interactive p-lg flex h-full flex-col gap-md">
      <div className="flex items-start justify-between gap-sm">
        <span className="text-overline font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </span>
        {icon && (
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-md ${
              accent ? 'bg-accent/12 text-accent-hover' : 'bg-surface-sunken text-primary'
            }`}
          >
            {icon}
          </span>
        )}
      </div>

      <span
        className={`font-display text-display-lg font-semibold leading-none tabular-nums ${
          accent ? 'text-accent-hover' : 'text-primary'
        }`}
      >
        {value}
      </span>

      <div className="mt-auto flex items-end justify-between gap-sm">
        <div className="flex flex-col gap-xs">
          {trend && <TrendPill trend={trend} />}
          {sub && <span className="text-body-sm text-text-muted">{sub}</span>}
        </div>
        {sparkline && <div className="h-8 w-20 shrink-0 self-end">{sparkline}</div>}
      </div>
    </div>
  );
}

/** Alias kept for the brief's "StatCard" naming — identical to KpiCard. */
export const StatCard = KpiCard;

export function TrendPill({ trend }: { trend: Trend }) {
  const cls =
    trend.direction === 'up'
      ? 'bg-success-bg text-success'
      : trend.direction === 'down'
        ? 'bg-error-bg text-error'
        : 'bg-surface-sunken text-text-muted';
  return (
    <span className={`inline-flex items-center gap-xs rounded-pill px-sm py-px text-caption font-semibold tabular-nums ${cls}`}>
      {trend.direction === 'up' && <TrendUpIcon size={13} />}
      {trend.direction === 'down' && <TrendDownIcon size={13} />}
      {trend.label}
    </span>
  );
}

/* ── Table primitives (compose inside a Card) ────────────────────────────── */

/** Card wrapper that clips a table to rounded corners + allows x-scroll. */
export function TableCard({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) {
  return (
    <div className="card-surface overflow-hidden">
      {toolbar && (
        <div className="border-b border-border px-lg py-md">{toolbar}</div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

/** Sticky, muted, uppercase column header cell. */
export function Th({
  children,
  align = 'start',
  className = '',
}: {
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
}) {
  const a = align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : 'text-start';
  return (
    <th
      className={`${a} px-lg py-md text-overline font-semibold uppercase tracking-wider text-text-muted ${className}`}
    >
      {children}
    </th>
  );
}

/** Body cell with consistent padding + row height. */
export function Td({
  children,
  align = 'start',
  className = '',
}: {
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
}) {
  const a = align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : 'text-start';
  return <td className={`${a} px-lg py-md align-middle ${className}`}>{children}</td>;
}

/** Shared <thead> styling. */
export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-surface-sunken/60 border-b border-border">{children}</thead>;
}

/* ── Empty / error states ────────────────────────────────────────────────── */

/** Centered empty-state panel with optional icon + CTA. */
export function EmptyState({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card-surface bg-dotted px-xl py-3xl flex flex-col items-center text-center gap-md">
      {icon && (
        <span className="grid size-14 place-items-center rounded-card bg-surface-sunken text-text-muted shadow-xs">
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-xs">
        <span className="font-display text-heading-2 font-semibold text-primary">{title}</span>
        {body && <p className="text-body-sm text-text-muted max-w-md">{body}</p>}
      </div>
      {action}
    </div>
  );
}

/** Inline error banner. */
export function ErrorState({ title, message }: { title: string; message?: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-sm rounded-card border border-error/30 bg-error-bg text-error px-lg py-md text-body-sm"
    >
      <span aria-hidden className="mt-px font-semibold">!</span>
      <span>
        <span className="font-semibold">{title}</span>
        {message ? ` — ${message}` : ''}
      </span>
    </div>
  );
}

/** Skeleton block for loading rows/cards. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-sunken ${className}`} />;
}

/* ── Price ───────────────────────────────────────────────────────────────── */

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

/* ── Search input (server-safe, decorative leading icon) ─────────────────── */

export function SearchField({
  name,
  defaultValue,
  placeholder,
  ariaLabel,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 start-0 grid w-10 place-items-center text-text-muted">
        <SearchIcon size={18} />
      </span>
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`${inputClass} ps-10`}
      />
    </div>
  );
}
