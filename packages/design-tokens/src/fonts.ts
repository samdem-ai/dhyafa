/**
 * Font display names consumed by next/font and expo-font.
 * Banned as headline/body: Inter, Roboto, Arial, system-ui.
 */
export const fonts = {
  display: "Fraunces",
  body: "Plus Jakarta Sans",
  arabic: "IBM Plex Sans Arabic",
} as const;

export type Fonts = typeof fonts;
