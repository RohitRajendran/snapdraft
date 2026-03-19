import { describe, it, expect } from 'vitest';
import {
  ftToPx,
  pxToFt,
  snapToGrid,
  snapPointToGrid,
  distance,
  findNearestEndpoint,
  formatFeet,
  parseFtIn,
  PIXELS_PER_FOOT,
} from '../../utils/geometry';

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

  it('snaps to half-foot when halfSnap=true', () => {
    expect(snapToGrid(1.3, true)).toBe(1.5);
    expect(snapToGrid(1.7, true)).toBe(1.5);
    expect(snapToGrid(1.8, true)).toBe(2);
  });
});

describe('snapPointToGrid', () => {
  it('snaps both axes', () => {
    expect(snapPointToGrid({ x: 1.4, y: 2.6 })).toEqual({ x: 1, y: 3 });
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
});

describe('formatFeet', () => {
  it('formats whole feet', () => {
    expect(formatFeet(5)).toBe("5'");
    expect(formatFeet(0)).toBe("0'");
  });

  it('formats feet and inches', () => {
    expect(formatFeet(5.5)).toBe("5' 6\"");
    expect(formatFeet(0.5)).toBe('6"');
  });

  it('handles rounding to 12 inches correctly', () => {
    expect(formatFeet(4 + 11.9 / 12)).toBe("5'"); // 11.9" rounds to 12" → next foot
  });
});

describe('parseFtIn', () => {
  it('parses feet and inches with quote marks', () => {
    expect(parseFtIn("5'6\"")).toBeCloseTo(5.5);
    expect(parseFtIn("5' 6\"")).toBeCloseTo(5.5);
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
