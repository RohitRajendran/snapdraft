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
  if (inches === 0) return `${wholeFeet}'`;
  if (wholeFeet === 0) return `${inches}"`;
  return `${wholeFeet}' ${inches}"`;
}
