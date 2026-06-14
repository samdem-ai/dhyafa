/**
 * PriceText — the single way to render a DZD amount.
 *
 * Wraps formatDZD from @dyafa/i18n and renders the result with
 * `writingDirection: 'ltr'` so the digit group + currency symbol stay together
 * and never reorder under an Arabic (RTL) ambient direction (the bidi-isolation
 * the formatter docs require at the call site).
 *
 * Variants:
 *   large         per-night price, terracotta, prominent
 *   total         the booking total, ink
 *   strikethrough was-price (muted, struck through)
 *   inline        default body-sized inline price
 */

import { Text as RNText, StyleSheet, type TextProps } from 'react-native';
import { formatDZD, type Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';
import { i18nInstance } from '@/lib/i18n';

export type PriceVariant = 'large' | 'total' | 'strikethrough' | 'inline';

export interface PriceTextProps extends Pick<TextProps, 'numberOfLines' | 'testID' | 'accessibilityLabel'> {
  amount: number;
  /** UI locale; defaults to the active i18n language. */
  locale?: Locale;
  variant?: PriceVariant;
}

function currentLocale(): Locale {
  const lang = i18nInstance.language;
  return lang === 'ar' || lang === 'fr' ? lang : 'en';
}

export function PriceText({
  amount,
  locale,
  variant = 'inline',
  ...rest
}: PriceTextProps) {
  const loc = locale ?? currentLocale();
  const text = formatDZD(amount, loc);

  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={1.6}
      style={[styles.base, styles[variant]]}
    >
      {text}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    // Keep the number + symbol as one LTR run regardless of ambient RTL.
    writingDirection: 'ltr',
    color: theme.color.text,
  },
  inline: {
    fontFamily: RN_FONTS.bodySemiBold,
    fontSize: theme.fontSize.body,
    lineHeight: theme.lineHeight.body,
  },
  large: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize.price,
    lineHeight: theme.lineHeight.price,
    color: theme.color.accent,
  },
  total: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize.price,
    lineHeight: theme.lineHeight.price,
  },
  strikethrough: {
    fontFamily: RN_FONTS.bodyRegular,
    fontSize: theme.fontSize.body,
    lineHeight: theme.lineHeight.body,
    color: theme.color.textMuted,
    textDecorationLine: 'line-through',
  },
});
