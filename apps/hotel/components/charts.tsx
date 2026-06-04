/**
 * Dependency-free charts (CSS bars + inline SVG line). Server-safe.
 *
 * Tuned for the warm-editorial palette: thin gridlines, teal/terracotta series,
 * rounded bars, soft area fills, readable labels, no heavy borders. RTL-friendly
 * (logical spacing; column order follows reading order via flex).
 */

import type { ReactNode } from 'react';
import { TrendUpIcon } from './icons';

export interface BarDatum {
  label: string;
  value: number;
  /** Optional pre-formatted value shown on hover / under the bar. */
  display?: string;
}

/** Small inline note used by chart empty states. */
function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-sm text-center">
      <span className="grid size-10 place-items-center rounded-full bg-surface-sunken text-text-muted">
        <TrendUpIcon size={18} />
      </span>
      <p className="text-body-sm text-text-muted">{label}</p>
    </div>
  );
}

/** Horizontal bar list (good for "top room types"). RTL-friendly. */
export function BarList({ data, emptyLabel }: { data: BarDatum[]; emptyLabel: string }) {
  if (data.length === 0) return <ChartEmpty label={emptyLabel} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="flex flex-col gap-md">
      {data.map((d, i) => {
        const pct = Math.max(3, Math.round((d.value / max) * 100));
        return (
          <li key={`${d.label}-${i}`} className="flex flex-col gap-xs">
            <div className="flex items-center justify-between gap-md text-body-sm">
              <span className="text-text-default truncate font-medium">{d.label}</span>
              <span className="text-text-muted tabular-nums">{d.display ?? d.value}</span>
            </div>
            <div className="h-2.5 rounded-pill bg-surface-sunken overflow-hidden">
              <div
                className="h-full rounded-pill bg-gradient-to-r from-accent to-terracotta-500"
                style={{ width: `${pct}%` }}
                aria-hidden
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Vertical column chart (good for revenue/bookings over time). */
export function ColumnChart({
  data,
  emptyLabel,
  barClass = 'bg-primary',
}: {
  data: BarDatum[];
  emptyLabel: string;
  /** Tailwind bg for the bar fill (e.g. 'bg-accent'). */
  barClass?: string;
}) {
  if (data.length === 0) return <ChartEmpty label={emptyLabel} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-sm">
      {/* Plot area with three faint gridlines behind the bars. */}
      <div className="relative h-44 sm:h-52">
        <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
          <span className="border-t border-border" />
          <span className="border-t border-border/70" />
          <span className="border-t border-border/70" />
          <span className="border-t border-border" />
        </div>
        <div className="relative flex h-full items-end gap-sm overflow-x-auto">
          {data.map((d, i) => {
            const pct = Math.max(2, Math.round((d.value / max) * 100));
            return (
              <div
                key={`${d.label}-${i}`}
                className="group flex min-w-[2rem] flex-1 flex-col items-center justify-end"
              >
                <div
                  className={`w-full max-w-[2.75rem] rounded-t-md ${barClass} opacity-90 transition-opacity duration-fast group-hover:opacity-100`}
                  style={{ height: `${pct}%` }}
                  title={d.display ?? String(d.value)}
                  aria-hidden
                />
              </div>
            );
          })}
        </div>
      </div>
      {/* Axis labels aligned under each column. */}
      <div className="flex gap-sm">
        {data.map((d, i) => (
          <span
            key={`${d.label}-${i}`}
            className="min-w-[2rem] flex-1 text-center text-overline text-text-muted tabular-nums"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Inline SVG line chart with a soft area fill (good for review-rating trend). */
export function LineChart({
  points,
  emptyLabel,
  min = 0,
  max = 5,
}: {
  points: { label: string; value: number }[];
  emptyLabel: string;
  min?: number;
  max?: number;
}) {
  if (points.length === 0) return <ChartEmpty label={emptyLabel} />;
  const width = 100;
  const height = 40;
  const span = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * step : width / 2;
    const y = height - ((p.value - min) / span) * height;
    return { x, y };
  });
  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  const area = `${line} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`;
  const gid = `line-fill-${points.length}-${Math.round(points[0]!.value * 10)}`;

  return (
    <div className="flex flex-col gap-sm">
      <div className="relative h-32">
        <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
          <span className="border-t border-border" />
          <span className="border-t border-border/70" />
          <span className="border-t border-border" />
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="relative h-full w-full"
          role="img"
          aria-label="trend"
        >
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C97B5A" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#C97B5A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gid})`} />
          <path
            d={line}
            fill="none"
            stroke="#C97B5A"
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={1.6}
              fill="#fff"
              stroke="#C97B5A"
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-overline text-text-muted">
        {points.map((p, i) => (
          <span key={`${p.label}-${i}`} className="tabular-nums">
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A titled chart card. */
export function ChartCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card-surface p-lg sm:p-xl flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h3 className="font-display text-heading-3 font-semibold text-primary">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
