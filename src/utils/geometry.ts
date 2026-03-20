import type { Element, Point } from '../types';

export const PIXELS_PER_FOOT = 40;
export const SNAP_RADIUS_FT = 0.4;
export const GRID_SNAP_FT = 1;
export const WALL_SNAP_FT = 1 / 12;
export const FINE_WALL_SNAP_FT = 1 / 48;
export const NUDGE_FT = 1 / 12; // Arrow key nudge: 1 inch
export const FINE_NUDGE_FT = 1 / 48; // Shift+Arrow key nudge: 1/4 inch

export function ftToPx(ft: number): number {
  return ft * PIXELS_PER_FOOT;
}

export function pxToFt(px: number): number {
  return px / PIXELS_PER_FOOT;
}

export function snapToGrid(value: number, increment = GRID_SNAP_FT): number {
  return Math.round(value / increment) * increment;
}

export function snapPointToGrid(point: Point, increment = GRID_SNAP_FT): Point {
  return {
    x: snapToGrid(point.x, increment),
    y: snapToGrid(point.y, increment),
  };
}

export function getWallSnapIncrement(fine = false): number {
  return fine ? FINE_WALL_SNAP_FT : WALL_SNAP_FT;
}

export function snapWallPoint(point: Point, fine = false): Point {
  return snapPointToGrid(point, getWallSnapIncrement(fine));
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function findNearestEndpoint(
  point: Point,
  endpoints: Point[],
  radiusFt = SNAP_RADIUS_FT,
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

/**
 * Returns the nearest point on segment a→b to point p.
 */
export function nearestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: a.x, y: a.y };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/**
 * BFS from `movedPt` across wall endpoint connections.
 * Returns IDs of all walls reachable from `movedPt`, excluding `excludeId`.
 * Used to cascade translations when a wall's endpoint moves due to a resize.
 *
 * For open chains (L, U shapes) every connected wall is returned.
 * For closed rooms the cycle is detected via the visited set and the last
 * wall in the cycle is included but will end up disconnected from the
 * resized wall's fixed endpoint — the trade-off of a simple translate cascade.
 */
export function collectConnectedWallIds(
  movedPt: Point,
  excludeId: string,
  allElements: Element[],
): string[] {
  const visited = new Set<string>([excludeId]);
  const queue: Point[] = [movedPt];
  const result: string[] = [];

  while (queue.length > 0) {
    const pt = queue.shift()!;
    for (const el of allElements) {
      if (el.type !== 'wall' || visited.has(el.id)) continue;
      for (const ep of el.points) {
        if (distance(ep, pt) < 0.01) {
          visited.add(el.id);
          result.push(el.id);
          // Cascade further: queue all OTHER endpoints of this wall
          for (const otherEp of el.points) {
            if (distance(otherEp, ep) >= 0.01) queue.push(otherEp);
          }
          break;
        }
      }
    }
  }
  return result;
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
 * Parse a ft/in string entered by the user into decimal feet.
 * Supports: 5'6", 5' 6", 5'6, 5', 6", 5.5, 5 6
 * Returns null if unparseable.
 */
export function parseFtIn(input: string): number | null {
  const s = input
    .trim()
    .replace(/\u2019/g, "'")
    .replace(/\u201D/g, '"');
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
