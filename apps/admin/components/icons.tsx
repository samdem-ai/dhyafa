/**
 * Inline SVG icon set for the admin dashboard.
 *
 * Dependency-free (no icon library): each icon is a tiny presentational
 * Server-Component-safe function that forwards `className` so callers control
 * size + color via Tailwind (`h-5 w-5 text-…`). Icons inherit `currentColor`
 * and use `1.6` stroke for the calm, editorial line weight in the design brief.
 *
 * Direction note: glyphs are symmetric or get mirrored by the caller with the
 * `rtl:-scale-x-100` utility where a chevron/arrow implies reading direction.
 */

export interface IconProps {
  className?: string;
}

/** Shared <svg> wrapper — 24px box, round caps/joins, stroke = currentColor. */
function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

// ─── Navigation icons ────────────────────────────────────────────────────────

export function OverviewIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5" />
      <rect x="13.5" y="12" width="7.5" height="9" rx="1.5" />
      <rect x="3" y="15.5" width="7.5" height="5.5" rx="1.5" />
    </Svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M16.5 5.2a3 3 0 0 1 0 5.6" />
      <path d="M17 14.2a5.2 5.2 0 0 1 3.5 5.3" />
    </Svg>
  );
}

export function ListingIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5h4v5" />
    </Svg>
  );
}

export function BookingIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.2" />
      <path d="M3.5 9h17" />
      <path d="M8 3v3.5M16 3v3.5" />
      <path d="m8.5 14 2.2 2.2 4-4.4" />
    </Svg>
  );
}

export function PaymentIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.2" />
      <path d="M3 9.5h18" />
      <path d="M7 14.5h4" />
    </Svg>
  );
}

export function ReviewIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 4.5l2.1 4.4 4.8.6-3.5 3.3.9 4.7L12 15.8 7.2 17.5l.9-4.7L4.6 9.5l4.8-.6z" />
    </Svg>
  );
}

export function DisputeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M20 11.5a7.5 7.5 0 0 1-10.8 6.7L4 19.5l1.3-5.2A7.5 7.5 0 1 1 20 11.5Z" />
      <path d="M12 8.5v3.2" />
      <path d="M12 15h.01" />
    </Svg>
  );
}

export function ContentIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" />
      <path d="M7.5 9h9M7.5 12.5h9M7.5 16h5" />
    </Svg>
  );
}

export function AuditIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9 4.5h7.5a2 2 0 0 1 2 2V20H7.5a2 2 0 0 1-2-2V8" />
      <path d="M5.5 8 9 4.5V7a1 1 0 0 1-1 1z" />
      <path d="M9.5 12.5h5M9.5 16h5" />
    </Svg>
  );
}

// ─── UI / utility icons ──────────────────────────────────────────────────────

export function SearchIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m20 20-4.5-4.5" />
    </Svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 6 18 18M18 6 6 18" />
    </Svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5S14.4 18.2 12 20.5C9.6 18.2 8.4 15.2 8.4 12S9.6 5.8 12 3.5Z" />
    </Svg>
  );
}

export function SignOutIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M15 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H15" />
      <path d="M18.5 12H10" />
      <path d="m15.5 8.5 3.5 3.5-3.5 3.5" />
    </Svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M12 3.6l2.5 5.1 5.6.8-4 3.9.95 5.6L12 16.4l-5 2.6.95-5.6-4-3.9 5.6-.8z" />
    </svg>
  );
}

export function TrendUpIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m4 16 5-5 3.5 3.5L20 7" />
      <path d="M15 7h5v5" />
    </Svg>
  );
}

export function TrendDownIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m4 8 5 5 3.5-3.5L20 17" />
      <path d="M15 17h5v-5" />
    </Svg>
  );
}

export function InboxIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3.5 13.5 6 5.5a2 2 0 0 1 1.9-1.4h8.2A2 2 0 0 1 18 5.5l2.5 8" />
      <path d="M3.5 13.5H8a1 1 0 0 1 1 .8 3 3 0 0 0 6 0 1 1 0 0 1 1-.8h4.5V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    </Svg>
  );
}
