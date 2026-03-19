import { useCallback } from 'react';
import type { Point, Element } from '../types';
import {
  snapPointToGrid,
  snapToGrid,
  findNearestEndpoint,
  nearestPointOnSegment,
  distance,
  SNAP_RADIUS_FT,
} from '../utils/geometry';

function collectEndpoints(elements: Element[]): Point[] {
  const pts: Point[] = [];
  for (const el of elements) {
    if (el.type === 'wall') {
      pts.push(...el.points);
    }
  }
  return pts;
}

function findNearestOnSegments(
  point: Point,
  elements: Element[],
  radiusFt = SNAP_RADIUS_FT
): Point | null {
  let nearest: Point | null = null;
  let minDist = radiusFt;
  for (const el of elements) {
    if (el.type !== 'wall') continue;
    for (let i = 0; i < el.points.length - 1; i++) {
      const proj = nearestPointOnSegment(point, el.points[i], el.points[i + 1]);
      const d = distance(point, proj);
      if (d < minDist) {
        minDist = d;
        nearest = proj;
      }
    }
  }
  return nearest;
}

/**
 * Axis snap: when drawing from `origin`, if the raw cursor is closer to
 * horizontal or vertical than SNAP_RADIUS_FT, lock to that axis.
 * The off-grid coordinate from `origin` is preserved; the free axis is grid-snapped.
 * Returns null if neither axis is close enough.
 */
export function axisSnap(raw: Point, origin: Point, halfSnap = false): Point | null {
  const dx = Math.abs(raw.x - origin.x);
  const dy = Math.abs(raw.y - origin.y);
  // Must be meaningfully off the origin (avoid triggering on zero-length moves)
  if (dx < 0.001 && dy < 0.001) return null;

  if (dy <= SNAP_RADIUS_FT && dy < dx) {
    // Close to horizontal — lock Y to origin, grid-snap X
    return { x: snapToGrid(raw.x, halfSnap), y: origin.y };
  }
  if (dx <= SNAP_RADIUS_FT && dx < dy) {
    // Close to vertical — lock X to origin, grid-snap Y
    return { x: origin.x, y: snapToGrid(raw.y, halfSnap) };
  }
  return null;
}

type SnapResult = {
  point: Point;
  snappedToEndpoint: boolean;
  snappedToSegment: boolean;
  snappedToAxis: boolean;
};

/**
 * @param elements      All floor plan elements (for endpoint/segment snapping)
 * @param chainOrigin   Last placed wall point; enables axis snapping when provided
 */
export function useSnap(elements: Element[], chainOrigin?: Point | null) {
  const snap = useCallback(
    (rawPoint: Point, halfSnap = false): Point => {
      // 1: existing wall endpoint
      const endpoints = collectEndpoints(elements);
      const nearestEndpt = findNearestEndpoint(rawPoint, endpoints);
      if (nearestEndpt) return nearestEndpt;

      // 2: nearest point on any wall segment
      const nearestSeg = findNearestOnSegments(rawPoint, elements);
      if (nearestSeg) return nearestSeg;

      // 3: axis snap from the active chain origin (keeps off-grid walls orthogonal)
      if (chainOrigin) {
        const axisPt = axisSnap(rawPoint, chainOrigin, halfSnap);
        if (axisPt) return axisPt;
      }

      // 4: grid snap
      return snapPointToGrid(rawPoint, halfSnap);
    },
    [elements, chainOrigin]
  );

  const snapWithInfo = useCallback(
    (rawPoint: Point, halfSnap = false): SnapResult => {
      // 1: existing wall endpoint
      const endpoints = collectEndpoints(elements);
      const nearestEndpt = findNearestEndpoint(rawPoint, endpoints);
      if (nearestEndpt) return { point: nearestEndpt, snappedToEndpoint: true, snappedToSegment: false, snappedToAxis: false };

      // 2: nearest point on any wall segment
      const nearestSeg = findNearestOnSegments(rawPoint, elements);
      if (nearestSeg) return { point: nearestSeg, snappedToEndpoint: false, snappedToSegment: true, snappedToAxis: false };

      // 3: axis snap
      if (chainOrigin) {
        const axisPt = axisSnap(rawPoint, chainOrigin, halfSnap);
        if (axisPt) return { point: axisPt, snappedToEndpoint: false, snappedToSegment: false, snappedToAxis: true };
      }

      // 4: grid snap
      return { point: snapPointToGrid(rawPoint, halfSnap), snappedToEndpoint: false, snappedToSegment: false, snappedToAxis: false };
    },
    [elements, chainOrigin]
  );

  return { snap, snapWithInfo };
}

// Export helpers for testing
export { collectEndpoints, findNearestOnSegments };
