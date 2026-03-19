import { describe, it, expect } from 'vitest';
import { collectEndpoints, findNearestOnSegments } from '../../hooks/useSnap';
import { findNearestEndpoint } from '../../utils/geometry';
import type { Element } from '../../types';

const wall = (points: { x: number; y: number }[]): Element => ({
  id: 'w1',
  type: 'wall',
  points,
  thickness: 0.5,
});

describe('collectEndpoints', () => {
  it('returns all wall endpoints', () => {
    const elements: Element[] = [
      wall([{ x: 0, y: 0 }, { x: 5, y: 0 }]),
      wall([{ x: 5, y: 0 }, { x: 5, y: 4 }]),
    ];
    const pts = collectEndpoints(elements);
    expect(pts).toHaveLength(4);
    expect(pts).toContainEqual({ x: 0, y: 0 });
    expect(pts).toContainEqual({ x: 5, y: 4 });
  });

  it('ignores box elements', () => {
    const elements: Element[] = [
      { id: 'b1', type: 'box', x: 0, y: 0, width: 2, height: 2, rotation: 0 },
    ];
    expect(collectEndpoints(elements)).toHaveLength(0);
  });

  it('returns empty array for no elements', () => {
    expect(collectEndpoints([])).toHaveLength(0);
  });
});

describe('findNearestOnSegments', () => {
  const elements: Element[] = [
    wall([{ x: 0, y: 0 }, { x: 10, y: 0 }]),
  ];

  it('snaps cursor to nearest point on a horizontal wall segment', () => {
    // Cursor at (5, 0.2) — 0.2 ft above midpoint of the wall
    const result = findNearestOnSegments({ x: 5, y: 0.2 }, elements);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(5);
    expect(result!.y).toBeCloseTo(0);
  });

  it('allows connecting to an off-grid point on a wall', () => {
    // Wall from (0,0) to (10,0); cursor near (6.333, 0.15) — off grid
    const result = findNearestOnSegments({ x: 6.333, y: 0.15 }, elements);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(6.333);
    expect(result!.y).toBeCloseTo(0);
  });

  it('returns null when cursor is too far from any segment', () => {
    const result = findNearestOnSegments({ x: 5, y: 5 }, elements);
    expect(result).toBeNull();
  });

  it('returns null for empty element list', () => {
    expect(findNearestOnSegments({ x: 5, y: 0 }, [])).toBeNull();
  });

  it('ignores box elements', () => {
    const boxOnly: Element[] = [
      { id: 'b1', type: 'box', x: 0, y: 0, width: 10, height: 10, rotation: 0 },
    ];
    expect(findNearestOnSegments({ x: 5, y: 0.1 }, boxOnly)).toBeNull();
  });

  it('snaps to the closer of two overlapping segments', () => {
    const twoWalls: Element[] = [
      { ...wall([{ x: 0, y: 0 }, { x: 10, y: 0 }]), id: 'w1' },
      { ...wall([{ x: 0, y: 0.3 }, { x: 10, y: 0.3 }]), id: 'w2' },
    ];
    // Cursor at (5, 0.1) — closer to y=0 wall (dist 0.1) than y=0.3 wall (dist 0.2)
    const result = findNearestOnSegments({ x: 5, y: 0.1 }, twoWalls);
    expect(result!.y).toBeCloseTo(0);
  });
});

describe('snap priority', () => {
  it('endpoint snap takes priority over segment snap', () => {
    // Wall endpoint at (5, 0), wall segment also near (5, 0.1)
    const elements: Element[] = [
      wall([{ x: 0, y: 0 }, { x: 5, y: 0 }]),
      wall([{ x: 0, y: 0.1 }, { x: 10, y: 0.1 }]),
    ];
    // cursor near (5, 0.05) — within range of both endpoint (5,0) and segment y=0.1
    // collectEndpoints finds (5,0) first
    const endpointPts = collectEndpoints(elements);
    const ep = findNearestEndpoint({ x: 5, y: 0.05 }, endpointPts);
    expect(ep).toEqual({ x: 5, y: 0 }); // endpoint wins
  });
});
