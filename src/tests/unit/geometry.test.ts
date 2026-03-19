import { describe, it, expect } from 'vitest';
import {
  ftToPx,
  pxToFt,
  snapToGrid,
  snapPointToGrid,
  distance,
  findNearestEndpoint,
  formatFeet,
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
});
