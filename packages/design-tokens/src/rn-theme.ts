import { color, space, radius, motion, fontFamily, fontSize, lineHeight, fontWeight, z } from "./tokens.js";

/**
 * React Native theme — same design tokens shaped for RN consumption.
 * - All spacing/radii are plain numbers (dp), no CSS units.
 * - Colors are flat hex strings (no CSS vars, no rgba for RN shadow props).
 * - Shadows split into iOS shadow* props + Android elevation.
 * - Font families are the bare string names matching expo-font load keys.
 */

// Strip rem/px units from fontSize values → numeric dp
function toNumber(value: string): number {
  if (value.endsWith("rem")) {
    return Math.round(parseFloat(value) * 16);
  }
  if (value.endsWith("px")) {
    return parseFloat(value);
  }
  return parseFloat(value);
}

const rnFontSize = Object.fromEntries(
  Object.entries(fontSize).map(([k, v]) => [k, toNumber(v)])
) as Record<keyof typeof fontSize, number>;

const rnLineHeight = Object.fromEntries(
  Object.entries(lineHeight).map(([k, v]) => [
    k,
    // line-height as a numeric multiplier × font size
    Math.round(parseFloat(v) * toNumber(fontSize[k as keyof typeof fontSize])),
  ])
) as Record<keyof typeof lineHeight, number>;

// RN shadows — iOS props + Android elevation equivalents
const rnShadow = {
  xs: {
    shadowColor: "#0E3A3A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  card: {
    shadowColor: "#0E3A3A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: "#0E3A3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  sheet: {
    shadowColor: "#0A2A2A",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 8,
  },
  pin: {
    shadowColor: "#0A2A2A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
} as const;

// Flat color object (RN doesn't nest)
const rnColor = {
  // Primitives
  teal900: color["teal-900"],
  teal800: color["teal-800"],
  teal700: color["teal-700"],
  teal600: color["teal-600"],
  teal400: color["teal-400"],
  teal200: color["teal-200"],
  teal100: color["teal-100"],
  terracotta700: color["terracotta-700"],
  terracotta600: color["terracotta-600"],
  terracotta500: color["terracotta-500"],
  terracotta300: color["terracotta-300"],
  terracotta100: color["terracotta-100"],
  sand700: color["sand-700"],
  sand400: color["sand-400"],
  sand200: color["sand-200"],
  bone100: color["bone-100"],
  bone200: color["bone-200"],
  bone300: color["bone-300"],
  ink900: color["ink-900"],
  ink700: color["ink-700"],
  ink500: color["ink-500"],
  ink300: color["ink-300"],
  white: color.white,
  black: color.black,

  // Semantics
  primary: color.primary,
  primaryHover: color["primary-hover"],
  primaryPressed: color["primary-pressed"],
  accent: color.accent,
  accentHover: color["accent-hover"],
  bg: color.bg,
  surface: color.surface,
  surfaceSunken: color["surface-sunken"],
  text: color.text,
  textMuted: color["text-muted"],
  textOnPrimary: color["text-on-primary"],
  border: color.border,
  borderStrong: color["border-strong"],
  focusRing: color["focus-ring"],
  success: color.success,
  successBg: color["success-bg"],
  warning: color.warning,
  warningBg: color["warning-bg"],
  error: color.error,
  errorBg: color["error-bg"],
  info: color.info,
  infoBg: color["info-bg"],
  ratingStar: color["rating-star"],
  // overlay is rgba — kept as string for RN (works in StyleSheet.create)
  overlay: color.overlay,
} as const;

export const rnTheme = {
  color: rnColor,
  space,                  // already numeric
  radius,                 // already numeric
  shadow: rnShadow,
  fontFamily: {
    display: fontFamily.display[0] ?? "Fraunces",
    body: fontFamily.body[0] ?? "Plus Jakarta Sans",
    arabic: fontFamily.arabic[0] ?? "IBM Plex Sans Arabic",
  },
  fontSize: rnFontSize,
  lineHeight: rnLineHeight,
  fontWeight,
  motion: {
    duration: motion.duration,   // already ms numbers
    easing: motion.easing,       // strings (used with Animated.Easing.bezier)
  },
  z,
} as const;

export type RnTheme = typeof rnTheme;
