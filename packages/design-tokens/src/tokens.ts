/**
 * @dyafa/design-tokens — single source of truth
 * Aesthetic: "Warm Mediterranean editorial"
 * All values from docs/07-design-system-and-i18n.md
 */

// ─── Color ─────────────────────────────────────────────────────────────────

const colorPrimitives = {
  // Teal ramp
  "teal-900": "#0A2A2A",
  "teal-800": "#0E3A3A",
  "teal-700": "#16504C",
  "teal-600": "#246B63",
  "teal-400": "#5A938B",
  "teal-200": "#A8C5BF",
  "teal-100": "#D7E5E1",

  // Terracotta ramp
  "terracotta-700": "#B5634A",
  "terracotta-600": "#C97B5A",
  "terracotta-500": "#D89478",
  "terracotta-300": "#ECC3B0",
  "terracotta-100": "#F7E4DA",

  // Sand ramp
  "sand-700": "#8A7D66",
  "sand-400": "#C9BCA1",
  "sand-200": "#E8DFCD",

  // Bone ramp
  "bone-100": "#FBF8F2",
  "bone-200": "#F7F3EC",
  "bone-300": "#EFE9DD",

  // Ink ramp
  "ink-900": "#161A19",
  "ink-700": "#3A413F",
  "ink-500": "#5E6664",
  "ink-300": "#9AA09E",

  // Absolute
  white: "#FFFFFF",
  black: "#000000",
} as const;

const colorSemantic = {
  // Primary (teal)
  primary: "#0E3A3A",           // teal-800 — brand, buttons, links, headers
  "primary-hover": "#16504C",   // teal-700
  "primary-pressed": "#0A2A2A", // teal-900

  // Accent (terracotta) — rationed: CTA fill, price, active state only
  accent: "#C97B5A",            // terracotta-600
  "accent-hover": "#B5634A",    // terracotta-700

  // Backgrounds
  bg: "#F7F3EC",                // bone-200 — app canvas
  surface: "#FFFFFF",           // cards, sheets, inputs
  "surface-sunken": "#EFE9DD",  // bone-300 — wells, skeleton base

  // Text
  text: "#161A19",              // ink-900
  "text-muted": "#5E6664",      // ink-500
  "text-on-primary": "#FBF8F2", // bone-100 — on teal / terracotta

  // Borders
  border: "#E2DACB",            // sand-tinted hairlines
  "border-strong": "#C9BCA1",   // sand-400 — input borders, dividers

  // Interactive
  "focus-ring": "#C97B5A",      // terracotta-600 — 2px ring

  // Status
  success: "#2E7D5B",
  "success-bg": "#E4F0EA",
  warning: "#B5791F",
  "warning-bg": "#F8EEDA",
  error: "#B23A2E",
  "error-bg": "#F7E2DE",
  info: "#246B63",              // teal-600
  "info-bg": "#D7E5E1",         // teal-100

  // Miscellaneous
  "rating-star": "#C97B5A",     // terracotta — never yellow
  overlay: "rgba(10,42,42,.55)",// teal-tinted scrim
} as const;

export const color = {
  ...colorPrimitives,
  ...colorSemantic,
} as const;

// ─── Spacing (4px base) ──────────────────────────────────────────────────────

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
  "5xl": 96,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────

export const radius = {
  sm: 8,
  md: 12,
  card: 16,
  lg: 20,
  sheet: 24,   // top corners of bottom sheet
  pill: 999,
  full: 9999,
} as const;

// ─── Shadows (teal-tinted, low-opacity — matte editorial) ────────────────────

export const shadow = {
  xs: "0 1px 2px rgba(14,58,58,.06)",
  card: "0 2px 8px rgba(14,58,58,.08)",
  raised: "0 6px 20px rgba(14,58,58,.10)",
  sheet: "0 -8px 32px rgba(10,42,42,.16)",
  pin: "0 3px 10px rgba(10,42,42,.30)",  // map price pin
} as const;

// ─── Font Families ───────────────────────────────────────────────────────────

export const fontFamily = {
  display: ["Fraunces", "Georgia", "serif"],
  body: ["Plus Jakarta Sans", "Helvetica Neue", "sans-serif"],
  arabic: ["IBM Plex Sans Arabic", "sans-serif"],
} as const;

// ─── Font Sizes (rem on web / dp on RN — same numeric values) ────────────────

export const fontSize = {
  "display-xl": "2.75rem",   // 44px
  "display-lg": "2.125rem",  // 34px
  "heading-1": "1.625rem",   // 26px
  "heading-2": "1.3125rem",  // 21px
  "heading-3": "1.125rem",   // 18px
  title: "1.0625rem",        // 17px
  "body-lg": "1rem",         // 16px
  body: "0.9375rem",         // 15px
  "body-sm": "0.84375rem",   // 13.5px
  caption: "0.75rem",        // 12px
  overline: "0.6875rem",     // 11px
  price: "1.25rem",          // 20px
} as const;

// ─── Line Heights ─────────────────────────────────────────────────────────────

export const lineHeight = {
  "display-xl": "1.05",
  "display-lg": "1.1",
  "heading-1": "1.2",
  "heading-2": "1.25",
  "heading-3": "1.3",
  title: "1.35",
  "body-lg": "1.55",
  body: "1.5",
  "body-sm": "1.45",
  caption: "1.4",
  overline: "1.2",
  price: "1.2",
} as const;

// ─── Font Weights ─────────────────────────────────────────────────────────────

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

// ─── Motion (calm, editorial — never bouncy) ──────────────────────────────────

export const motion = {
  duration: {
    instant: 80,
    fast: 140,
    base: 220,
    slow: 320,
    sheet: 380,
  },
  easing: {
    standard: "cubic-bezier(.2,0,0,1)",
    decelerate: "cubic-bezier(0,0,0,1)",
    accelerate: "cubic-bezier(.3,0,1,1)",
  },
} as const;

// ─── Z-Index ──────────────────────────────────────────────────────────────────

export const z = {
  base: 0,
  sticky: 100,   // sticky booking widget
  header: 200,
  dropdown: 300,
  overlay: 1000,
  modal: 1100,
  sheet: 1200,
  toast: 1300,
} as const;

// ─── Breakpoints ──────────────────────────────────────────────────────────────

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

// ─── Aggregate export ─────────────────────────────────────────────────────────

export const tokens = {
  color,
  space,
  radius,
  shadow,
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  motion,
  z,
  breakpoints,
} as const;

export type Tokens = typeof tokens;
