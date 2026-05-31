import type { Config } from "tailwindcss";
import { color, space, radius, shadow, fontFamily, fontSize, lineHeight, fontWeight, motion, z, breakpoints } from "./tokens.js";

/**
 * Tailwind CSS preset for @dyafa/design-tokens.
 *
 * Usage in tailwind.config.ts:
 *   import preset from '@dyafa/design-tokens/tailwind';
 *   export default { presets: [preset], content: [...] } satisfies Config;
 */

// Convert numeric space values to Tailwind's px string format
function spaceToPx(value: number): string {
  return `${value}px`;
}

// Build spacing scale from tokens
const spacingScale = Object.fromEntries(
  Object.entries(space).map(([k, v]) => [k, spaceToPx(v)])
) as Record<keyof typeof space, string>;

// Build border-radius scale from tokens
const radiusScale = Object.fromEntries(
  Object.entries(radius).map(([k, v]) => [k, spaceToPx(v)])
) as Record<keyof typeof radius, string>;

// Build z-index scale
const zScale = Object.fromEntries(
  Object.entries(z).map(([k, v]) => [k, String(v)])
) as Record<keyof typeof z, string>;

// Build duration scale (ms as strings for Tailwind)
const durationScale = Object.fromEntries(
  Object.entries(motion.duration).map(([k, v]) => [k, `${v}ms`])
) as Record<keyof typeof motion.duration, string>;

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        // Primitives
        teal: {
          900: color["teal-900"],
          800: color["teal-800"],
          700: color["teal-700"],
          600: color["teal-600"],
          400: color["teal-400"],
          200: color["teal-200"],
          100: color["teal-100"],
        },
        terracotta: {
          700: color["terracotta-700"],
          600: color["terracotta-600"],
          500: color["terracotta-500"],
          300: color["terracotta-300"],
          100: color["terracotta-100"],
        },
        sand: {
          700: color["sand-700"],
          400: color["sand-400"],
          200: color["sand-200"],
        },
        bone: {
          100: color["bone-100"],
          200: color["bone-200"],
          300: color["bone-300"],
        },
        ink: {
          900: color["ink-900"],
          700: color["ink-700"],
          500: color["ink-500"],
          300: color["ink-300"],
        },
        // Semantics
        primary: {
          DEFAULT: color.primary,
          hover: color["primary-hover"],
          pressed: color["primary-pressed"],
        },
        accent: {
          DEFAULT: color.accent,
          hover: color["accent-hover"],
        },
        bg: color.bg,
        surface: {
          DEFAULT: color.surface,
          sunken: color["surface-sunken"],
        },
        "text-default": color.text,
        "text-muted": color["text-muted"],
        "text-on-primary": color["text-on-primary"],
        border: {
          DEFAULT: color.border,
          strong: color["border-strong"],
        },
        "focus-ring": color["focus-ring"],
        success: {
          DEFAULT: color.success,
          bg: color["success-bg"],
        },
        warning: {
          DEFAULT: color.warning,
          bg: color["warning-bg"],
        },
        error: {
          DEFAULT: color.error,
          bg: color["error-bg"],
        },
        info: {
          DEFAULT: color.info,
          bg: color["info-bg"],
        },
        "rating-star": color["rating-star"],
        overlay: color.overlay,
      },

      spacing: spacingScale,

      borderRadius: {
        ...radiusScale,
        // Alias 'card' as a named utility
        card: radiusScale.card,
        sheet: radiusScale.sheet,
      },

      boxShadow: {
        xs: shadow.xs,
        card: shadow.card,
        raised: shadow.raised,
        sheet: shadow.sheet,
        pin: shadow.pin,
      },

      fontFamily: {
        // Spread to mutable string[] — token arrays are `as const` (readonly),
        // but Tailwind's fontFamily type expects a mutable array.
        display: [...fontFamily.display],
        body: [...fontFamily.body],
        arabic: [...fontFamily.arabic],
        sans: [...fontFamily.body], // override Tailwind default
        serif: [...fontFamily.display],
      },

      fontSize: Object.fromEntries(
        Object.entries(fontSize).map(([k, size]) => {
          const lh = lineHeight[k as keyof typeof lineHeight];
          return [k, lh ? [size, { lineHeight: lh }] : size];
        })
      ),

      fontWeight: {
        regular: fontWeight.regular,
        medium: fontWeight.medium,
        semibold: fontWeight.semibold,
        bold: fontWeight.bold,
      },

      transitionTimingFunction: {
        standard: motion.easing.standard,
        decelerate: motion.easing.decelerate,
        accelerate: motion.easing.accelerate,
      },

      transitionDuration: durationScale,

      zIndex: zScale,

      screens: breakpoints,
    },
  },
};

export default preset;
