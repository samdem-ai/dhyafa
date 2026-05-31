# @dyafa/design-tokens

Single source of truth for the Dyafa design system.
Aesthetic: **"Warm Mediterranean editorial"** — deep ink/teal primary, terracotta/sand accent, bone/off-white background.

## Banned fonts (never use as headline or body)

Inter, Roboto, Arial, system-ui. Headlines must be `Fraunces` (serif). Body must be `Plus Jakarta Sans`. Arabic must be `IBM Plex Sans Arabic`.

---

## Web (Next.js) — Tailwind preset

```ts
// tailwind.config.ts
import preset from '@dyafa/design-tokens/tailwind';
import type { Config } from 'tailwindcss';

export default {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}'],
} satisfies Config;
```

The preset extends `theme.extend` with:
- `colors` — full primitive ramps (teal, terracotta, sand, bone, ink) + semantic aliases (primary, accent, bg, surface, text, border, status…)
- `spacing` — `xs` 4px through `5xl` 96px
- `borderRadius` — `sm` through `full`, plus named `card` and `sheet`
- `boxShadow` — teal-tinted shadows: `xs`, `card`, `raised`, `sheet`, `pin`
- `fontFamily` — `display` (Fraunces), `body` / `sans` (Plus Jakarta Sans), `arabic` (IBM Plex Sans Arabic), `serif` (Fraunces)
- `fontSize` — editorial type scale: `display-xl` through `overline` + `price`, each with paired `lineHeight`
- `fontWeight` — `regular`, `medium`, `semibold`, `bold`
- `transitionTimingFunction` — `standard`, `decelerate`, `accelerate`
- `transitionDuration` — `instant` (80ms) through `sheet` (380ms)
- `zIndex` — `base` → `toast` (1300)
- `screens` — standard breakpoints `sm` → `2xl`

Font loading is handled by each Next.js app via `next/font/google`:

```ts
// app/layout.tsx (example)
import { Fraunces, Plus_Jakarta_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google';

const display = Fraunces({ subsets: ['latin'], axes: ['opsz', 'wght'], variable: '--font-display', display: 'swap' });
const body    = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const arabic  = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['400','500','600','700'], variable: '--font-arabic', display: 'swap' });
```

Wire the CSS variables into the Tailwind config's `fontFamily` to connect `next/font`'s zero-layout-shift loading with the token preset.

---

## React Native (Expo) — rnTheme

```ts
import { rnTheme } from '@dyafa/design-tokens/rn';

// Use directly in StyleSheet.create or a theme provider:
const styles = StyleSheet.create({
  card: {
    backgroundColor: rnTheme.color.surface,
    borderRadius: rnTheme.radius.card,       // 16 (number, no units)
    padding: rnTheme.space.lg,               // 16 (number, no units)
    ...rnTheme.shadow.card,                  // iOS shadow* + Android elevation
  },
  title: {
    fontFamily: rnTheme.fontFamily.display,  // 'Fraunces'
    fontSize: rnTheme.fontSize['heading-1'], // 26 (number)
    color: rnTheme.color.text,
  },
});
```

Font loading in Expo — bundle the `.ttf`/variable files under `assets/fonts` and load behind the splash screen:

```ts
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

await Font.loadAsync({
  'Fraunces': require('../assets/fonts/Fraunces-Variable.ttf'),
  'Plus Jakarta Sans': require('../assets/fonts/PlusJakartaSans-Variable.ttf'),
  'IBM Plex Sans Arabic': require('../assets/fonts/IBMPlexSansArabic-Regular.ttf'),
  // include additional weights as needed
});
```

`rnTheme` shape:
- `color` — flat camelCase keys, same hex values as web tokens
- `space` — numeric dp (`xs: 4`, `sm: 8`, …)
- `radius` — numeric dp (`sm: 8`, `card: 16`, …)
- `shadow` — per-token object with iOS `shadowColor/Offset/Opacity/Radius` + Android `elevation`
- `fontFamily` — bare string names (`display`, `body`, `arabic`)
- `fontSize` — numeric dp (rem × 16)
- `lineHeight` — numeric dp (ratio × fontSize)
- `fontWeight` — string (`'400'`, `'600'`, …)
- `motion.duration` — numeric ms
- `motion.easing` — cubic-bezier strings (use with `Animated.Easing.bezier`)
- `z` — numeric z-order values

---

## Raw tokens (both platforms)

```ts
import { tokens, fonts } from '@dyafa/design-tokens';

tokens.color['teal-800']   // '#0E3A3A' — brand teal
tokens.color.primary       // '#0E3A3A' — semantic alias
tokens.space.lg            // 16
tokens.radius.card         // 16
tokens.motion.duration.base // 220

fonts.display              // 'Fraunces'
fonts.body                 // 'Plus Jakarta Sans'
fonts.arabic               // 'IBM Plex Sans Arabic'
```

Token top-level keys: `color`, `space`, `radius`, `shadow`, `fontFamily`, `fontSize`, `lineHeight`, `fontWeight`, `motion`, `z`, `breakpoints`.
