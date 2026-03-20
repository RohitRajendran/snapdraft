import { describe, it, expect } from 'vitest';
import {
  ftToPx,
  pxToFt,
  snapToGrid,
  snapPointToGrid,
  distance,
  findNearestEndpoint,
  nearestPointOnSegment,
  formatFeet,
  parseFtIn,
  collectConnectedWallIds,
  PIXELS_PER_FOOT,
  SNAP_RADIUS_FT,
  GRID_SNAP_FT,
  WALL_SNAP_FT,
  FINE_WALL_SNAP_FT,
  getWallSnapIncrement,
  snapWallPoint,
} from '../../utils/geometry';
import type { Element } from '../../types';

describe('ftToPx / pxToFt', () => {
  it('converts feet to pixels', () => {
    expect(ftToPx(1)).toBe(PIXELS_PER_FOOT);
    expect(ftToPx(10)).toBe(PIXELS_PER_FOOT * 10);
  });

  it('converts pixels to feet', () => {
    expect(pxToFt(PIXELS_PER_FOOT)).toBe(1);
    expect(pxToFt(0)).toBe(0);
  });

  it('round-trips correctly', () => {
    expect(pxToFt(ftToPx(5))).toBe(5);
  });
});

describe('snapToGrid', () => {
  it('snaps to nearest whole foot', () => {
    expect(snapToGrid(1.4)).toBe(1);
    expect(snapToGrid(1.6)).toBe(2);
    expect(snapToGrid(0)).toBe(0);
  });

  it('supports inch snap increments for wall drawing', () => {
    expect(snapToGrid(1.1, WALL_SNAP_FT)).toBeCloseTo(13 / 12);
    expect(snapToGrid(1.13, WALL_SNAP_FT)).toBeCloseTo(14 / 12);
  });

  it('supports quarter-inch snap increments for fine wall drawing', () => {
    expect(snapToGrid(1.1, FINE_WALL_SNAP_FT)).toBeCloseTo(53 / 48);
    expect(snapToGrid(1.106, FINE_WALL_SNAP_FT)).toBeCloseTo(53 / 48);
  });

  it('defaults to the one-foot grid increment', () => {
    expect(GRID_SNAP_FT).toBe(1);
  });
});

describe('snapPointToGrid', () => {
  it('snaps both axes', () => {
    expect(snapPointToGrid({ x: 1.4, y: 2.6 })).toEqual({ x: 1, y: 3 });
  });

  it('supports non-foot increments', () => {
    expect(snapPointToGrid({ x: 1.1, y: 2.2 }, WALL_SNAP_FT)).toEqual({
      x: 13 / 12,
      y: 26 / 12,
    });
  });
});

describe('wall snap helpers', () => {
  it('returns inch snap by default', () => {
    expect(getWallSnapIncrement()).toBe(WALL_SNAP_FT);
    expect(getWallSnapIncrement(false)).toBe(WALL_SNAP_FT);
  });

  it('returns quarter-inch snap for fine mode', () => {
    expect(getWallSnapIncrement(true)).toBe(FINE_WALL_SNAP_FT);
  });

  it('snaps wall points to inches by default', () => {
    expect(snapWallPoint({ x: 2.21, y: 1.04 })).toEqual({
      x: 27 / 12,
      y: 1,
    });
  });

  it('snaps wall points to quarter inches in fine mode', () => {
    const snapped = snapWallPoint({ x: 2.21, y: 1.04 }, true);
    expect(snapped.x).toBeCloseTo(106 / 48);
    expect(snapped.y).toBeCloseTo(50 / 48);
  });
});

describe('distance', () => {
  it('calculates distance between two points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(distance({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
  });
});

describe('findNearestEndpoint', () => {
  const endpoints = [
    { x: 0, y: 0 },
    { x: 5, y: 5 },
    { x: 10, y: 0 },
  ];

  it('returns nearest endpoint within radius', () => {
    expect(findNearestEndpoint({ x: 0.1, y: 0.1 }, endpoints)).toEqual({ x: 0, y: 0 });
  });

  it('returns null when nothing is within radius', () => {
    expect(findNearestEndpoint({ x: 3, y: 3 }, endpoints)).toBeNull();
  });

  it('uses custom radius', () => {
    // point at (3,3), closest is (5,5) at distance ~2.83 — within radius 3
    expect(findNearestEndpoint({ x: 3, y: 3 }, endpoints, 3)).toEqual({ x: 5, y: 5 });
    // same point, radius 1 — nothing
    expect(findNearestEndpoint({ x: 3, y: 3 }, endpoints, 1)).toBeNull();
  });

  it('returns null for empty endpoint list', () => {
    expect(findNearestEndpoint({ x: 0, y: 0 }, [])).toBeNull();
  });

  it('snaps to off-grid endpoint without grid pre-snap', () => {
    // Endpoint at 6.333 ft (76"), cursor at 6.4 ft — within SNAP_RADIUS_FT
    const offGridPt = { x: 6 + 4 / 12, y: 0 }; // 6'4"
    const cursor = { x: 6.4, y: 0.1 };
    expect(findNearestEndpoint(cursor, [offGridPt])).toEqual(offGridPt);
  });
});

describe('nearestPointOnSegment', () => {
  it('projects a point onto a horizontal segment', () => {
    const result = nearestPointOnSegment({ x: 3, y: 2 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(result).toEqual({ x: 3, y: 0 });
  });

  it('projects a point onto a vertical segment', () => {
    const result = nearestPointOnSegment({ x: 2, y: 5 }, { x: 0, y: 0 }, { x: 0, y: 10 });
    expect(result).toEqual({ x: 0, y: 5 });
  });

  it('clamps to segment start when projection is before a', () => {
    const result = nearestPointOnSegment({ x: -2, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('clamps to segment end when projection is beyond b', () => {
    const result = nearestPointOnSegment({ x: 15, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(result).toEqual({ x: 10, y: 0 });
  });

  it('handles degenerate zero-length segment (returns a)', () => {
    const result = nearestPointOnSegment({ x: 5, y: 5 }, { x: 2, y: 2 }, { x: 2, y: 2 });
    expect(result).toEqual({ x: 2, y: 2 });
  });

  it('projects onto a diagonal segment', () => {
    // Segment from (0,0) to (4,4), point at (4,0) → nearest is (2,2)
    const result = nearestPointOnSegment({ x: 4, y: 0 }, { x: 0, y: 0 }, { x: 4, y: 4 });
    expect(result.x).toBeCloseTo(2);
    expect(result.y).toBeCloseTo(2);
  });

  it('returns exact point when p is on the segment', () => {
    const result = nearestPointOnSegment({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(result).toEqual({ x: 5, y: 0 });
  });
});

describe('SNAP_RADIUS_FT', () => {
  it('is a positive number', () => {
    expect(SNAP_RADIUS_FT).toBeGreaterThan(0);
  });
});

describe('formatFeet', () => {
  it('formats whole feet', () => {
    expect(formatFeet(5)).toBe("5'");
    expect(formatFeet(0)).toBe("0'");
  });

  it('formats feet and inches', () => {
    expect(formatFeet(5.5)).toBe('5\' 6"');
    expect(formatFeet(0.5)).toBe('6"');
  });

  it('handles rounding to 12 inches correctly', () => {
    expect(formatFeet(4 + 11.9 / 12)).toBe("5'"); // 11.9" rounds to 12" → next foot
  });

  it('formats 76 inches (6\'4") correctly', () => {
    expect(formatFeet(76 / 12)).toBe('6\' 4"');
  });
});

describe('collectConnectedWallIds', () => {
  // L-shape: Wall1 [A,B] → Wall2 [B,C] → Wall3 [C,D]
  const w1: Element = {
    id: 'w1',
    type: 'wall',
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
  };
  const w2: Element = {
    id: 'w2',
    type: 'wall',
    points: [
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ],
  };
  const w3: Element = {
    id: 'w3',
    type: 'wall',
    points: [
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
  };
  const all = [w1, w2, w3];

  it('returns walls connected to the moved endpoint (direct + cascaded)', () => {
    // w2's `to` endpoint is (10,10). w3 starts there. Moving (10,10) should cascade to w3.
    const ids = collectConnectedWallIds({ x: 10, y: 10 }, 'w2', all);
    expect(ids).toContain('w3');
    expect(ids).not.toContain('w2'); // excluded (the resized wall)
    expect(ids).not.toContain('w1'); // connected at w2's fixed end, not the moved end
  });

  it('returns nothing when the moved point is a free endpoint', () => {
    // (0,0) is only w1's start — nothing else connects there
    const ids = collectConnectedWallIds({ x: 0, y: 0 }, 'w1', all);
    expect(ids).toHaveLength(0);
  });

  it('cascades through a chain: moving w1 to endpoint cascades through w2 and w3', () => {
    // Move w1's `to` at (10,0): w2 connects there, and w2's other end (10,10) connects w3
    const ids = collectConnectedWallIds({ x: 10, y: 0 }, 'w1', all);
    expect(ids).toContain('w2');
    expect(ids).toContain('w3');
    expect(ids).not.toContain('w1');
  });

  it('handles a closed room without infinite loop', () => {
    // Add w4 to close the room: (0,10) → (0,0)
    const w4: Element = {
      id: 'w4',
      type: 'wall',
      points: [
        { x: 0, y: 10 },
        { x: 0, y: 0 },
      ],
    };
    const closed = [w1, w2, w3, w4];
    // Moving w1's to (10,0): w2 → w3 → w4 → back to w1 (excluded)
    const ids = collectConnectedWallIds({ x: 10, y: 0 }, 'w1', closed);
    expect(ids).toContain('w2');
    expect(ids).toContain('w3');
    expect(ids).toContain('w4');
    expect(ids).not.toContain('w1');
    expect(ids).toHaveLength(3); // no duplicates
  });
});

describe('parseFtIn', () => {
  it('parses feet and inches with quote marks', () => {
    expect(parseFtIn('5\'6"')).toBeCloseTo(5.5);
    expect(parseFtIn('5\' 6"')).toBeCloseTo(5.5);
    expect(parseFtIn("5'6")).toBeCloseTo(5.5);
  });

  it('parses feet only', () => {
    expect(parseFtIn("5'")).toBe(5);
    expect(parseFtIn("10'")).toBe(10);
  });

  it('parses inches only', () => {
    expect(parseFtIn('6"')).toBeCloseTo(0.5);
    expect(parseFtIn('12"')).toBeCloseTo(1);
  });

  it('parses space-separated feet and inches', () => {
    expect(parseFtIn('5 6')).toBeCloseTo(5.5);
    expect(parseFtIn('10 0')).toBe(10);
  });

  it('parses 76" as inches-only', () => {
    expect(parseFtIn('76"')).toBeCloseTo(76 / 12);
  });

  it('parses plain decimal (interpreted as feet)', () => {
    expect(parseFtIn('5.5')).toBe(5.5);
    expect(parseFtIn('10')).toBe(10);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseFtIn('')).toBeNull();
    expect(parseFtIn('abc')).toBeNull();
  });

  it('round-trips through formatFeet', () => {
    const values = [1, 5, 5.5, 10.25, 0.5];
    for (const v of values) {
      const formatted = formatFeet(v);
      const parsed = parseFtIn(formatted);
      expect(parsed).not.toBeNull();
      expect(parsed!).toBeCloseTo(v, 1);
    }
  });
});
