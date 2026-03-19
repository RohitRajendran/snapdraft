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

  return { snap };
}
