import { useCallback } from 'react';
import type { Point, Element } from '../types';
import {
  snapPointToGrid,
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

type SnapResult = {
  point: Point;
  snappedToEndpoint: boolean;
  snappedToSegment: boolean;
};

export function useSnap(elements: Element[]) {
  const snap = useCallback(
    (rawPoint: Point, halfSnap = false): Point => {
      // Priority 1: snap to existing wall endpoint
      const endpoints = collectEndpoints(elements);
      const nearestEndpt = findNearestEndpoint(rawPoint, endpoints);
      if (nearestEndpt) return nearestEndpt;

      // Priority 2: snap to nearest point on any wall segment
      const nearestSeg = findNearestOnSegments(rawPoint, elements);
      if (nearestSeg) return nearestSeg;

      // Priority 3: grid snap
      return snapPointToGrid(rawPoint, halfSnap);
    },
    [elements]
  );

  const snapWithInfo = useCallback(
    (rawPoint: Point, halfSnap = false): SnapResult => {
      // Priority 1: snap to existing wall endpoint
      const endpoints = collectEndpoints(elements);
      const nearestEndpt = findNearestEndpoint(rawPoint, endpoints);
      if (nearestEndpt) return { point: nearestEndpt, snappedToEndpoint: true, snappedToSegment: false };

      // Priority 2: snap to nearest point on any wall segment
      const nearestSeg = findNearestOnSegments(rawPoint, elements);
      if (nearestSeg) return { point: nearestSeg, snappedToEndpoint: false, snappedToSegment: true };

      // Priority 3: grid snap
      return { point: snapPointToGrid(rawPoint, halfSnap), snappedToEndpoint: false, snappedToSegment: false };
    },
    [elements]
  );

  return { snap, snapWithInfo };
}

// Export helpers for testing
export { collectEndpoints, findNearestOnSegments };
