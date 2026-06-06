/**
 * Inline SVG icon set for the hotel dashboard (no icon-library dependency).
 *
 * Every icon is a thin-stroke, 24×24 line glyph that inherits `currentColor`
 * and accepts a `className` for sizing. Decorative by default (`aria-hidden`);
 * pass an `title` only when an icon is the sole content of an interactive
 * control (we generally label those with `aria-label` on the control instead).
 *
 * Server-safe (no client hooks).
 */

import type { ReactNode, SVGProps } from 'react';

// Omit `ref` so spreading `...rest` onto <svg> never carries the legacy string-ref
// type (which conflicts across React 18/19 type resolutions under a flat node_modules).
export type IconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
  /** Pixel size for width/height (default 20). */
  size?: number;
};

function Svg({ size = 20, className, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ── Brand mark ──────────────────────────────────────────────────────────── */

/** Stylized key/host emblem for the sidebar brand lockup. */
export function BrandMark({ size = 28, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="6" fill="currentColor" opacity="0.16" />
      <path
        d="M7 16.5V9.2c0-.5.27-.96.7-1.2L12 5.4l4.3 2.6c.43.24.7.7.7 1.2v7.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 16.5v-3.2a2 2 0 0 1 4 0v3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Nav icons ───────────────────────────────────────────────────────────── */

export function HomeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </Svg>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9h17M8 2.5v4M16 2.5v4" />
      <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" />
    </Svg>
  );
}

export function BookingIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </Svg>
  );
}

export function MessageIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-4 3v-3H6.5A2.5 2.5 0 0 1 4 14.5v-7A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5z" />
    </Svg>
  );
}

export function BuildingIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4H12v17" />
      <path d="M12 9h6.5A1.5 1.5 0 0 1 20 10.5V21" />
      <path d="M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2" />
      <path d="M3 21h18" />
    </Svg>
  );
}

export function StarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m12 3.5 2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.78 6.99 19.5l.99-5.79L3.78 9.62l5.82-.85z" />
    </Svg>
  );
}

export function StarFilledIcon({ size = 16, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d="m12 3.5 2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.78 6.99 19.5l.99-5.79L3.78 9.62l5.82-.85z" />
    </svg>
  );
}

export function ChartIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 4v15a1 1 0 0 0 1 1h15" />
      <path d="M8 16v-4M12 16V8M16 16v-6M20 16v-9" />
    </Svg>
  );
}

export function WalletIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="6" width="17" height="13" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M16.5 14.5h.01" />
      <path d="M16 6V4.8A1.8 1.8 0 0 0 13.8 3L5 5" />
    </Svg>
  );
}

export function UsersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6" />
      <path d="M17.5 14.2A5.5 5.5 0 0 1 20.5 19" />
    </Svg>
  );
}

/* ── Topbar / UI affordances ─────────────────────────────────────────────── */

export function SearchIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.2-3.2" />
    </Svg>
  );
}

export function GlobeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.3 2.3 3.5 5.3 3.5 8.5S14.3 18.2 12 20.5c-2.3-2.3-3.5-5.3-3.5-8.5S9.7 5.8 12 3.5Z" />
    </Svg>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

export function MenuIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function LogoutIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 4h3.5A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M10 12h9" />
      <path d="m13 8 4 4-4 4" />
    </Svg>
  );
}

export function ArrowRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 12h15" />
      <path d="m13 5 7 7-7 7" />
    </Svg>
  );
}

export function TrendUpIcon({ size = 14, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d="m4 16 5.5-5.5 4 4L20 8" />
      <path d="M15 8h5v5" />
    </svg>
  );
}

export function TrendDownIcon({ size = 14, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d="m4 8 5.5 5.5 4-4L20 16" />
      <path d="M15 16h5v-5" />
    </svg>
  );
}

export function CheckCircleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </Svg>
  );
}

export function BellIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z" />
      <path d="M10.5 19a2 2 0 0 0 3 0" />
    </Svg>
  );
}

export function LoginIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10" />
      <path d="M14 12H5" />
      <path d="m11 8 4 4-4 4" />
    </Svg>
  );
}
