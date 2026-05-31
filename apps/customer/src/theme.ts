/**
 * Re-exports the React Native design-token theme for the customer app.
 *
 * Import from this module (not directly from @dyafa/design-tokens/rn) so
 * app code has a stable import path that can be extended with customer-app-
 * specific overrides in the future without touching every consumer.
 *
 * USAGE
 *   import { theme, type Theme } from '@/theme';
 *   const styles = StyleSheet.create({
 *     container: { backgroundColor: theme.color.bg },
 *   });
 */

import { rnTheme } from '@dyafa/design-tokens/rn';

export const theme = rnTheme;

export type Theme = typeof rnTheme;

/**
 * Convenience helper: returns the color value for a semantic token key.
 * Avoids ad-hoc string lookups and surfaces typos at compile time.
 *
 * @example
 *   color('primary')  // → '#0E3A3A'
 *   color('accent')   // → '#C97B5A'
 */
export function color(key: keyof Theme['color']): string {
  return theme.color[key];
}

/**
 * Convenience helper: returns the spacing value (dp) for a named scale step.
 *
 * @example
 *   sp('lg')  // → 16
 */
export function sp(key: keyof Theme['space']): number {
  return theme.space[key];
}
