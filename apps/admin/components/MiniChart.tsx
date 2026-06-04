/**
 * Dependency-free SVG charts for the dashboard (no Recharts / chart lib).
 *
 * Server-Component-safe: deterministic, prop-driven, no client state. Two shapes:
 *   • <BarChart>  — categorical daily series (rounded terracotta bars).
 *   • <LineChart> — trend line with a soft teal gradient area fill.
 *
 * Refreshed per the design brief: faint horizontal gridlines, rounded bar caps,
 * gradient area fills, sparse readable x-labels, no heavy borders. Strokes use
 * `vectorEffect="non-scaling-stroke"` so they stay crisp under the stretched
 * (`preserveAspectRatio="none"`) viewBox.
 *
 * RTL: when `rtl` is true the series is drawn right-to-left so the most-recent
 * point sits where an Arabic reader expects "latest" (the start of the line).
 * Values are unitless; the caller renders its own title/legend.
 */

interface SeriesPoint {
  /** X label (short, e.g. day-of-month). */
  label: string;
  value: number;
}

const VIEWBOX_W = 600;
const VIEWBOX_H = 180;
const PAD_X = 6;
const PAD_TOP = 12;
const PAD_BOTTOM = 22; // room for x-axis labels
const GRID_LINES = 4;

function maxValue(points: SeriesPoint[]): number {
  return points.reduce((m, p) => (p.value > m ? p.value : m), 0);
}

/** Pick ~6 evenly-spaced label indices so the axis never crowds. */
function labelIndices(n: number, target = 6): Set<number> {
  if (n <= target) return new Set(Array.from({ length: n }, (_, i) => i));
  const step = (n - 1) / (target - 1);
  const out = new Set<number>();
  for (let i = 0; i < target; i++) out.add(Math.round(i * step));
  out.add(n - 1);
  return out;
}

function Gridlines() {
  const plotTop = PAD_TOP;
  const plotBottom = VIEWBOX_H - PAD_BOTTOM;
  const lines = Array.from({ length: GRID_LINES + 1 }, (_, i) => {
    const y = plotTop + ((plotBottom - plotTop) * i) / GRID_LINES;
    return y;
  });
  return (
    <g>
      {lines.map((y, i) => (
        <line
          key={i}
          x1={PAD_X}
          x2={VIEWBOX_W - PAD_X}
          y1={y}
          y2={y}
          className="stroke-border"
          strokeWidth={1}
          strokeDasharray={i === GRID_LINES ? undefined : '2 4'}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

function AxisLabels({ data, xAt }: { data: SeriesPoint[]; xAt: (i: number) => number }) {
  const show = labelIndices(data.length);
  const y = VIEWBOX_H - 6;
  return (
    <g>
      {data.map((p, i) =>
        show.has(i) && p.label ? (
          <text
            key={i}
            x={xAt(i)}
            y={y}
            textAnchor="middle"
            className="fill-text-muted"
            style={{ fontSize: '11px' }}
          >
            {p.label}
          </text>
        ) : null,
      )}
    </g>
  );
}

export function BarChart({
  points,
  rtl,
  ariaLabel,
}: {
  points: SeriesPoint[];
  rtl: boolean;
  ariaLabel: string;
}) {
  if (points.length === 0) return null;
  const data = rtl ? [...points].reverse() : points;
  const max = maxValue(data) || 1;
  const n = data.length;
  const slot = (VIEWBOX_W - PAD_X * 2) / n;
  const barW = Math.max(3, Math.min(slot * 0.62, 26));
  const plotH = VIEWBOX_H - PAD_TOP - PAD_BOTTOM;
  const baseline = VIEWBOX_H - PAD_BOTTOM;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
      className="h-44 w-full overflow-visible"
    >
      <defs>
        <linearGradient id="dyafa-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C97B5A" />
          <stop offset="100%" stopColor="#ECC3B0" />
        </linearGradient>
      </defs>

      <Gridlines />

      {data.map((p, i) => {
        const h = (p.value / max) * plotH;
        const x = PAD_X + i * slot + (slot - barW) / 2;
        const y = baseline - h;
        return (
          <rect
            key={`${p.label}-${i}`}
            x={x}
            y={y}
            width={barW}
            height={Math.max(0, h)}
            rx={Math.min(barW / 2, 4)}
            fill="url(#dyafa-bar)"
          >
            <title>{`${p.label}: ${p.value}`}</title>
          </rect>
        );
      })}

      <AxisLabels data={data} xAt={(i) => PAD_X + i * slot + slot / 2} />
    </svg>
  );
}

export function LineChart({
  points,
  rtl,
  ariaLabel,
}: {
  points: SeriesPoint[];
  rtl: boolean;
  ariaLabel: string;
}) {
  if (points.length === 0) return null;
  const data = rtl ? [...points].reverse() : points;
  const max = maxValue(data) || 1;
  const n = data.length;
  const plotH = VIEWBOX_H - PAD_TOP - PAD_BOTTOM;
  const baseline = VIEWBOX_H - PAD_BOTTOM;
  const step = n > 1 ? (VIEWBOX_W - PAD_X * 2) / (n - 1) : 0;

  const coords = data.map((p, i) => {
    const x = PAD_X + i * step;
    const y = baseline - (p.value / max) * plotH;
    return { x, y, p };
  });

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const first = coords[0];
  const last = coords[coords.length - 1];
  // coords is non-empty (guarded above); fall back defensively for the type checker.
  const area =
    first && last
      ? `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
      : line;

  // Per-point markers crowd long ranges; show them only for compact series.
  const showDots = n <= 14;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
      className="h-44 w-full overflow-visible"
    >
      <defs>
        <linearGradient id="dyafa-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16504C" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#16504C" stopOpacity={0} />
        </linearGradient>
      </defs>

      <Gridlines />

      <path d={area} fill="url(#dyafa-area)" />
      <path
        d={line}
        fill="none"
        className="stroke-primary"
        strokeWidth={2.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {showDots &&
        coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={3}
            className="fill-surface stroke-primary"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`${c.p.label}: ${c.p.value}`}</title>
          </circle>
        ))}

      <AxisLabels data={data} xAt={(i) => (n > 1 ? PAD_X + i * step : VIEWBOX_W / 2)} />
    </svg>
  );
}
