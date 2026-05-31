import type { Config } from 'tailwindcss';
import preset from '@dyafa/design-tokens/tailwind';
import { fonts } from '@dyafa/design-tokens';

const config: Config = {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Wire the three fonts to CSS variables set in layout.tsx
        display: [`var(--font-display)`, ...fonts.display.split(',').map((f) => f.trim())],
        body: [`var(--font-body)`, ...fonts.body.split(',').map((f) => f.trim())],
        arabic: [`var(--font-arabic)`, ...fonts.arabic.split(',').map((f) => f.trim())],
        // sans defaults to body stack (logical-property-safe baseline)
        sans: [`var(--font-body)`, 'system-ui', 'sans-serif'],
      },
    },
  },
};

export default config;
