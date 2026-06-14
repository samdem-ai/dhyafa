/**
 * Text + Heading — the typographic foundation. Highest-leverage component:
 * every screen should render copy through these instead of re-declaring
 * fontFamily + fontSize + lineHeight + textAlign.
 *
 * Responsibilities:
 *  - Map a `variant` → {fontSize, lineHeight} from the design tokens.
 *    NOTE: `theme.lineHeight[*]` is an ABSOLUTE px value (already multiplied in
 *    rn-theme). Never multiply it again — pass it straight through.
 *  - Auto-select the correct font face for the active locale: Arabic (RTL) →
 *    IBM Plex Sans Arabic at the right weight; en/fr body → Plus Jakarta;
 *    en/fr headings → Fraunces (which has no Arabic, so Arabic falls back to
 *    Plex Arabic).
 *  - Default `textAlign` to the writing-direction start (logical) so RTL works
 *    without per-screen `I18nManager.isRTL ? 'right' : 'left'` consts.
 *  - Keep Dynamic Type working (`allowFontScaling` on) but cap scaling on
 *    chrome via `maxFontSizeMultiplier`.
 */

import { Text as RNText, I18nManager, type TextProps as RNTextProps } from 'react-native';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

export type TextVariant =
  | 'body'
  | 'body-lg'
  | 'body-sm'
  | 'caption'
  | 'overline'
  | 'title'
  | 'price';

export type HeadingLevel = 1 | 2 | 3 | 'display-lg' | 'display-xl';

/** Token key for a given Text variant. */
const VARIANT_TOKEN: Record<TextVariant, keyof typeof theme.fontSize> = {
  body: 'body',
  'body-lg': 'body-lg',
  'body-sm': 'body-sm',
  caption: 'caption',
  overline: 'overline',
  title: 'title',
  price: 'price',
};

/** Token key for a given Heading level. */
const HEADING_TOKEN: Record<Exclude<HeadingLevel, number> | 1 | 2 | 3, keyof typeof theme.fontSize> =
  {
    1: 'heading-1',
    2: 'heading-2',
    3: 'heading-3',
    'display-lg': 'display-lg',
    'display-xl': 'display-xl',
  };

/** True when the active UI locale is Arabic (the only RTL locale). */
function isArabic(): boolean {
  return I18nManager.isRTL;
}

/** Resolve the body/sans face for a weight, locale-aware. */
function bodyFace(weight: Weight): string {
  if (isArabic()) {
    switch (weight) {
      case 'bold':
        return RN_FONTS.arabicBold;
      case 'semibold':
        return RN_FONTS.arabicSemiBold;
      case 'medium':
        return RN_FONTS.arabicMedium;
      default:
        return RN_FONTS.arabicRegular;
    }
  }
  switch (weight) {
    case 'bold':
      return RN_FONTS.bodyBold;
    case 'semibold':
      return RN_FONTS.bodySemiBold;
    case 'medium':
      return RN_FONTS.bodyMedium;
    default:
      return RN_FONTS.bodyRegular;
  }
}

/** Resolve the display/heading face for a weight, locale-aware (Fraunces / Plex Arabic). */
function displayFace(weight: Weight): string {
  if (isArabic()) {
    // Fraunces has no Arabic glyphs — fall back to Plex Arabic for headings.
    return weight === 'regular' ? RN_FONTS.arabicSemiBold : RN_FONTS.arabicBold;
  }
  switch (weight) {
    case 'bold':
      return RN_FONTS.displayBold;
    case 'medium':
    case 'semibold':
      return RN_FONTS.displaySemiBold;
    default:
      return RN_FONTS.displayRegular;
  }
}

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: Weight;
  /** Any token color key, or a raw hex string. Defaults to `text`. */
  color?: keyof typeof theme.color | (string & {});
  /** Center the text (otherwise aligns to the writing-direction start). */
  center?: boolean;
}

function resolveColor(color: TextProps['color']): string {
  if (!color) return theme.color.text;
  if (color in theme.color) return theme.color[color as keyof typeof theme.color];
  return color as string;
}

export function Text({
  variant = 'body',
  weight = 'regular',
  color,
  center = false,
  style,
  maxFontSizeMultiplier = 1.8,
  ...rest
}: TextProps) {
  const token = VARIANT_TOKEN[variant];
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        {
          fontFamily: bodyFace(weight),
          fontSize: theme.fontSize[token],
          // Absolute px from tokens — do NOT re-multiply.
          lineHeight: theme.lineHeight[token],
          color: resolveColor(color),
          textAlign: center ? 'center' : I18nManager.isRTL ? 'right' : 'left',
          writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
      {...rest}
    />
  );
}

export interface HeadingProps extends RNTextProps {
  level?: HeadingLevel;
  weight?: Weight;
  color?: keyof typeof theme.color | (string & {});
  center?: boolean;
}

export function Heading({
  level = 2,
  weight = 'semibold',
  color,
  center = false,
  style,
  maxFontSizeMultiplier = 1.6,
  ...rest
}: HeadingProps) {
  const token = HEADING_TOKEN[level];
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        {
          fontFamily: displayFace(weight),
          fontSize: theme.fontSize[token],
          lineHeight: theme.lineHeight[token],
          color: resolveColor(color),
          textAlign: center ? 'center' : I18nManager.isRTL ? 'right' : 'left',
          writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
      {...rest}
    />
  );
}
