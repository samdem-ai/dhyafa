/**
 * Dependency-free charts (CSS bars + inline SVG line). Server-safe.
 * Designed for the warm-editorial palette and RTL layouts.
 */

import type { ReactNode } from 'react';

export interface BarDatum {
  label: string;
  value: number;
  /** Optional pre-formatted value shown on hover / under the bar. */
  display?: string;
}

/** Horizontal bar list (good for "top room types"). RTL-friendly. */
export function BarList({ data, emptyLabel }: { data: BarDatum[]; emptyLabel: string }) {
  if (data.length === 0) {
    return <p className="text-body-sm text-text-muted">{emptyLabel}</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="flex flex-col gap-sm">
      {data.map((d, i) => {
        const pct = Math.round((d.value / max) * 100);
        return (
          <li key={`${d.label}-${i}`} className="flex flex-col gap-xs">
            <div className="flex items-center justify-between gap-md text-body-sm">
              <span className="text-text-default truncate">{d.label}</span>
              <span className="text-text-muted tabular-nums">{d.display ?? d.value}</span>
            </div>
            <div className="h-2.5 rounded-pill bg-surface-sunken overflow-hidden">
              <div
                className="h-full rounded-pill bg-accent"
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
  barClass?: string;
}) {
  if (data.length === 0) {
    return <p className="text-body-sm text-text-muted">{emptyLabel}</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-sm h-40 sm:h-48 overflow-x-auto">
      {data.map((d, i) => {
        const pct = Math.max(2, Math.round((d.value / max) * 100));
        return (
          <div key={`${d.label}-${i}`} className="flex flex-col items-center gap-xs min-w-[2.25rem] flex-1">
            <div className="flex-1 w-full flex items-end">
              <div
                className={`w-full rounded-t-sm ${barClass}`}
                style={{ height: `${pct}%` }}
                title={d.display ?? String(d.value)}
                aria-hidden
              />
            </div>
            <span className="text-overline text-text-muted tabular-nums">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Inline SVG line chart (good for review-rating trend). */
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
  if (points.length === 0) {
    return <p className="text-body-sm text-text-muted">{emptyLabel}</p>;
  }
  const width = 100;
  const height = 40;
  const span = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * step : width / 2;
    const y = height - ((p.value - min) / span) * height;
    return { x, y };
  });
  const path = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  return (
    <div className="flex flex-col gap-xs">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-32"
        role="img"
        aria-label="trend"
      >
        <path d={path} fill="none" stroke="#C97B5A" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={1.4} fill="#0E3A3A" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
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
export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-md">
      <h3 className="font-display text-heading-3 font-semibold text-primary">{title}</h3>
      {children}
    </div>
  );
}
