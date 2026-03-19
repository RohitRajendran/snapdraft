import type { Point } from '../types';

export const PIXELS_PER_FOOT = 40;
export const WALL_THICKNESS_FT = 0.5;
export const SNAP_RADIUS_FT = 0.4;
export const HALF_SNAP_MODIFIER = 0.5;

export function ftToPx(ft: number): number {
  return ft * PIXELS_PER_FOOT;
}

export function pxToFt(px: number): number {
  return px / PIXELS_PER_FOOT;
}

export function snapToGrid(value: number, halfSnap = false): number {
  const increment = halfSnap ? HALF_SNAP_MODIFIER : 1;
  return Math.round(value / increment) * increment;
}

export function snapPointToGrid(point: Point, halfSnap = false): Point {
  return {
    x: snapToGrid(point.x, halfSnap),
    y: snapToGrid(point.y, halfSnap),
  };
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function findNearestEndpoint(
  point: Point,
  endpoints: Point[],
  radiusFt = SNAP_RADIUS_FT
): Point | null {
  let nearest: Point | null = null;
  let minDist = radiusFt;
  for (const ep of endpoints) {
    const d = distance(point, ep);
    if (d <= minDist) {
      minDist = d;
      nearest = ep;
    }
  }
  return nearest;
}

export function segmentLength(a: Point, b: Point): number {
  return distance(a, b);
}

export function formatFeet(ft: number): string {
  const wholeFeet = Math.floor(ft);
  const inches = Math.round((ft - wholeFeet) * 12);
  if (inches === 12) return `${wholeFeet + 1}'`;
  if (inches === 0) return `${wholeFeet}'`;
  if (wholeFeet === 0) return `${inches}"`;
  return `${wholeFeet}' ${inches}"`;
}

/**
 * Format feet as an editable ft/in string for input fields.
 * e.g. 5.5 → "5' 6""
 */
export function ftToInput(ft: number): string {
  return formatFeet(ft);
}

/**
 * Parse a ft/in string entered by the user into decimal feet.
 * Supports: 5'6", 5' 6", 5'6, 5', 6", 5.5, 5 6
 * Returns null if unparseable.
 */
export function parseFtIn(input: string): number | null {
  const s = input.trim().replace(/\u2019/g, "'").replace(/\u201D/g, '"');
  if (!s) return null;

  // 5'6" or 5' 6" or 5'6 (feet and inches)
  const feetAndInches = s.match(/^(\d+(?:\.\d+)?)['']\s*(\d+(?:\.\d+)?)["""]?$/);
  if (feetAndInches) {
    return parseFloat(feetAndInches[1]) + parseFloat(feetAndInches[2]) / 12;
  }

  // 5' (feet only, with apostrophe)
  const feetOnly = s.match(/^(\d+(?:\.\d+)?)[''']$/);
  if (feetOnly) return parseFloat(feetOnly[1]);

  // 6" (inches only)
  const inchesOnly = s.match(/^(\d+(?:\.\d+)?)["""]$/);
  if (inchesOnly) return parseFloat(inchesOnly[1]) / 12;

  // "5 6" — two numbers separated by space, treat as feet + inches
  const spaced = s.match(/^(\d+)\s+(\d+)$/);
  if (spaced) return parseInt(spaced[1]) + parseInt(spaced[2]) / 12;

  // Plain decimal or integer (interpreted as feet)
  const decimal = parseFloat(s);
  if (!isNaN(decimal)) return decimal;

  return null;
}
