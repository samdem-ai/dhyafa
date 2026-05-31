export { tokens } from "./tokens.js";
export type { Tokens } from "./tokens.js";

export { fonts } from "./fonts.js";
export type { Fonts } from "./fonts.js";

// Named primitive/semantic re-exports for tree-shaking convenience
export {
  color,
  space,
  radius,
  shadow,
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  motion,
  z,
  breakpoints,
} from "./tokens.js";
