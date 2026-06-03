/**
 * Dependency-free SVG charts for the dashboard (no Recharts / chart lib).
 *
 * Server-Component-safe: deterministic, prop-driven, no client state. Two shapes:
 *   • <BarChart>  — categorical daily series (e.g. bookings/day).
 *   • <LineChart> — trend line with an area fill (e.g. GMV/day).
 *
 * RTL: when `rtl` is true the series is drawn right-to-left so the most-recent
 * point sits where an Arabic reader expects "latest" (the start of the line).
 * Values are unitless; the caller renders its own labels/legend.
 */

interface SeriesPoint {
  /** X label (short, e.g. day-of-month). */
  label: string;
  value: number;
}

const VIEWBOX_W = 600;
const VIEWBOX_H = 160;
const PAD = 8;

function maxValue(points: SeriesPoint[]): number {
  return points.reduce((m, p) => (p.value > m ? p.value : m), 0);
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
  const slot = (VIEWBOX_W - PAD * 2) / n;
  const barW = Math.max(2, slot * 0.6);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
      className="w-full h-40"
    >
      {data.map((p, i) => {
        const h = (p.value / max) * (VIEWBOX_H - PAD * 2);
        const x = PAD + i * slot + (slot - barW) / 2;
        const y = VIEWBOX_H - PAD - h;
        return (
          <rect
            key={`${p.label}-${i}`}
            x={x}
            y={y}
            width={barW}
            height={Math.max(0, h)}
            rx={2}
            className="fill-accent"
          >
            <title>{`${p.label}: ${p.value}`}</title>
          </rect>
        );
      })}
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
  const step = n > 1 ? (VIEWBOX_W - PAD * 2) / (n - 1) : 0;

  const coords = data.map((p, i) => {
    const x = PAD + i * step;
    const y = VIEWBOX_H - PAD - (p.value / max) * (VIEWBOX_H - PAD * 2);
    return { x, y, p };
  });

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const first = coords[0];
  const last = coords[coords.length - 1];
  // coords is non-empty (guarded above); fall back defensively for the type checker.
  const baseline = VIEWBOX_H - PAD;
  const area =
    first && last
      ? `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
      : line;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
      className="w-full h-40"
    >
      <path d={area} className="fill-primary/10" />
      <path
        d={line}
        fill="none"
        className="stroke-primary"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={2.5} className="fill-primary">
          <title>{`${c.p.label}: ${c.p.value}`}</title>
        </circle>
      ))}
    </svg>
  );
}
