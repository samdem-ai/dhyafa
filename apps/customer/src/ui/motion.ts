/**
 * Motion helpers — durations + easings sourced from the design tokens
 * (`theme.motion`) and mapped onto Reanimated's `Easing`. Brand motion is calm
 * and editorial: decelerate / standard curves, no overshoot except sheets.
 *
 * Always gate animations behind `useReducedMotion()` (re-exported here) so the
 * library honours the OS "Reduce Motion" preference: skip shimmer, cross-fade
 * instead of slide, snap instead of spring.
 */

import { Easing, useReducedMotion } from 'react-native-reanimated';
import { theme } from '@/theme';

/** Animation durations in ms, straight from tokens. */
export const duration = theme.motion.duration;

/**
 * Parse a CSS `cubic-bezier(a,b,c,d)` token string into the four control points.
 * Falls back to a standard curve if the string is malformed.
 */
function parseBezier(css: string): [number, number, number, number] {
  const match = css.match(/cubic-bezier\(([^)]+)\)/);
  if (!match || !match[1]) return [0.2, 0, 0, 1];
  const parts = match[1].split(',').map((n) => parseFloat(n.trim()));
  const [a, b, c, d] = parts;
  if ([a, b, c, d].some((n) => typeof n !== 'number' || Number.isNaN(n))) {
    return [0.2, 0, 0, 1];
  }
  return [a as number, b as number, c as number, d as number];
}

/** Reanimated easing factories matching the token curves. */
export const easing = {
  standard: Easing.bezier(...parseBezier(theme.motion.easing.standard)),
  decelerate: Easing.bezier(...parseBezier(theme.motion.easing.decelerate)),
  accelerate: Easing.bezier(...parseBezier(theme.motion.easing.accelerate)),
} as const;

/** Standard timing config for most enter/exit transitions. */
export const timingBase = { duration: duration.base, easing: easing.standard } as const;

/** Faster timing for micro-interactions (press, toggle). */
export const timingFast = { duration: duration.fast, easing: easing.standard } as const;

export { useReducedMotion };
