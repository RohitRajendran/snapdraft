import { describe, it, expect } from 'vitest';
import { collectEndpoints, findNearestOnSegments, axisSnap } from '../../hooks/useSnap';
import { findNearestEndpoint, WALL_SNAP_FT, FINE_WALL_SNAP_FT } from '../../utils/geometry';
import type { Element } from '../../types';

const wall = (points: { x: number; y: number }[]): Element => ({
  id: 'w1',
  type: 'wall',
  points,
});

describe('collectEndpoints', () => {
  it('returns all wall endpoints', () => {
    const elements: Element[] = [
      wall([
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ]),
      wall([
        { x: 5, y: 0 },
        { x: 5, y: 4 },
      ]),
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
    wall([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]),
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
      {
        ...wall([
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ]),
        id: 'w1',
      },
      {
        ...wall([
          { x: 0, y: 0.3 },
          { x: 10, y: 0.3 },
        ]),
        id: 'w2',
      },
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
      wall([
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ]),
      wall([
        { x: 0, y: 0.1 },
        { x: 10, y: 0.1 },
      ]),
    ];
    // cursor near (5, 0.05) — within range of both endpoint (5,0) and segment y=0.1
    // collectEndpoints finds (5,0) first
    const endpointPts = collectEndpoints(elements);
    const ep = findNearestEndpoint({ x: 5, y: 0.05 }, endpointPts);
    expect(ep).toEqual({ x: 5, y: 0 }); // endpoint wins
  });
});

describe('axisSnap', () => {
  const origin = { x: 6 + 4 / 12, y: 0 }; // 6'4" = 6.333 ft — off grid

  it('locks Y to origin when cursor is nearly horizontal', () => {
    // cursor at (10, 0.2) — dy=0.2 < SNAP_RADIUS, dx=3.666 >> dy
    const result = axisSnap({ x: 10, y: 0.2 }, origin);
    expect(result).not.toBeNull();
    expect(result!.y).toBeCloseTo(origin.y); // Y locked to off-grid value
    expect(result!.x).toBeCloseTo(10); // X grid-snapped
  });

  it('locks X to origin when cursor is nearly vertical', () => {
    // cursor at (6.4, 5) — dx=0.067 < SNAP_RADIUS, dy=5 >> dx
    const result = axisSnap({ x: 6.4, y: 5 }, origin);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(origin.x); // X locked to off-grid value
    expect(result!.y).toBeCloseTo(5); // Y grid-snapped
  });

  it('returns null when cursor is clearly diagonal', () => {
    // cursor at (10, 5) — neither dy nor dx is small enough
    expect(axisSnap({ x: 10, y: 5 }, origin)).toBeNull();
  });

  it('returns null when cursor is at the origin', () => {
    expect(axisSnap(origin, origin)).toBeNull();
  });

  it('does not apply horizontal lock when dy > SNAP_RADIUS', () => {
    // dy=0.5 > SNAP_RADIUS_FT(0.4), dx=5 — should not axis-snap
    expect(axisSnap({ x: 11, y: 0.5 }, origin)).toBeNull();
  });

  it('horizontal lock preserves off-grid Y exactly', () => {
    const offGridOrigin = { x: 0, y: 76 / 12 }; // 76" off-grid
    const result = axisSnap({ x: 5, y: 6.4 }, offGridOrigin);
    expect(result).not.toBeNull();
    expect(result!.y).toBeCloseTo(76 / 12); // exact off-grid value preserved
  });

  it('uses custom inch increments for wall drawing axis snap', () => {
    const result = axisSnap({ x: 1.1, y: 0.1 }, { x: 0, y: 0 }, WALL_SNAP_FT);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(13 / 12);
    expect(result!.y).toBe(0);
  });

  it('uses custom quarter-inch increments for fine wall drawing axis snap', () => {
    const result = axisSnap({ x: 1.1, y: 0.1 }, { x: 0, y: 0 }, FINE_WALL_SNAP_FT);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(53 / 48);
    expect(result!.y).toBe(0);
  });
});
