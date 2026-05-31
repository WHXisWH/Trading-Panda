/** 16-color pixel palette — aligned with TradingPanda ink/bamboo tokens */

export const PIXEL_PALETTE = {
  ".": "transparent",
  K: "#1a1a1a",
  W: "#f5f5f0",
  S: "#4a4a4a",
  B: "#3d8b5a",
  R: "#c23a3a",
  P: "#d4727a",
  G: "#c8a432",
  D: "#8b7355",
  H: "#e8e8e0",
} as const;

export type PixelKey = keyof typeof PIXEL_PALETTE;
