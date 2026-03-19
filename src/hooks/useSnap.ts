import { useCallback } from 'react';
import type { Point, Element } from '../types';
import { snapPointToGrid, findNearestEndpoint } from '../utils/geometry';

function collectEndpoints(elements: Element[]): Point[] {
  const pts: Point[] = [];
  for (const el of elements) {
    if (el.type === 'wall') {
      pts.push(...el.points);
    }
  }
  return pts;
}

type SnapResult = {
  point: Point;
  snappedToEndpoint: boolean;
};

export function useSnap(elements: Element[]) {
  const snap = useCallback(
    (rawPoint: Point, halfSnap = false): Point => {
      const gridSnapped = snapPointToGrid(rawPoint, halfSnap);
      const endpoints = collectEndpoints(elements);
      const nearest = findNearestEndpoint(gridSnapped, endpoints);
      return nearest ?? gridSnapped;
    },
    [elements]
  );

  // Like snap(), but also tells you whether it snapped to an existing endpoint
  const snapWithInfo = useCallback(
    (rawPoint: Point, halfSnap = false): SnapResult => {
      const gridSnapped = snapPointToGrid(rawPoint, halfSnap);
      const endpoints = collectEndpoints(elements);
      const nearest = findNearestEndpoint(gridSnapped, endpoints);
      return nearest
        ? { point: nearest, snappedToEndpoint: true }
        : { point: gridSnapped, snappedToEndpoint: false };
    },
    [elements]
  );

  return { snap, snapWithInfo };
}
