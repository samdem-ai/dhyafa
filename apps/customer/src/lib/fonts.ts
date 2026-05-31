/**
 * RN font family name constants.
 *
 * @expo-google-fonts registers each font weight under its full PostScript name,
 * e.g. "Fraunces_600SemiBold". StyleSheet.create fontFamily props must use
 * these exact strings. Import from here rather than hard-coding strings across
 * every screen so a rename only needs to happen in one place.
 *
 * Naming convention: <Family><Weight>
 */

export const RN_FONTS = {
  // Fraunces (display / headline serif)
  displayRegular: 'Fraunces_400Regular',
  displaySemiBold: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',

  // Plus Jakarta Sans (body / UI sans)
  bodyRegular: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemiBold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',

  // IBM Plex Sans Arabic (all Arabic text)
  arabicRegular: 'IBMPlexSansArabic_400Regular',
  arabicMedium: 'IBMPlexSansArabic_500Medium',
  arabicSemiBold: 'IBMPlexSansArabic_600SemiBold',
  arabicBold: 'IBMPlexSansArabic_700Bold',
} as const;

export type RnFontKey = keyof typeof RN_FONTS;
