export const BOX_COLOR_PRESETS = [
  '#2d5490', // Blueprint Blue — legacy default, unchanged from today's box color
  '#4a7a5a', // Sage Green
  '#a8654a', // Terracotta
  '#6b5a8a', // Muted Plum
  '#a68a3f', // Ochre
] as const;

export type BoxColorPreset = (typeof BOX_COLOR_PRESETS)[number];

/** Fallback used whenever box.color is undefined (backward compat). */
export const DEFAULT_BOX_COLOR: string = BOX_COLOR_PRESETS[0];

/** Canonical format shared by canvas rendering and the native color input. */
export function normalizeBoxColor(color: unknown): string | null {
  if (typeof color !== 'string' || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
    return null;
  }
  const hex = color.slice(1).toLowerCase();
  return `#${hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex}`;
}

/** Rotate through the 5 presets based on how many boxes already exist. */
export function nextBoxColor(existingBoxCount: number): string {
  return BOX_COLOR_PRESETS[existingBoxCount % BOX_COLOR_PRESETS.length];
}

export function isPresetColor(color: string): boolean {
  return (BOX_COLOR_PRESETS as readonly string[]).includes(color);
}

/** Convert a 3- or 6-digit hex color string to an rgba() string at the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const full = normalizeBoxColor(hex) ?? DEFAULT_BOX_COLOR;
  const n = parseInt(full.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
