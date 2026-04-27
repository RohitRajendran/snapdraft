import { describe, it, expect } from 'vitest';
import { formatMetric, formatDimension, parseMetric, parseDimension, FT_PER_M } from './units';

describe('formatMetric', () => {
  it('formats whole feet as meters with no decimals', () => {
    // 10 ft = 3.048 m → "3.05 m"
    expect(formatMetric(10)).toBe('3.05 m');
  });

  it('strips trailing zeros', () => {
    // 1 ft = 0.3048 m → "0.3 m"
    expect(formatMetric(1)).toBe('0.3 m');
  });

  it('formats a round meter value cleanly', () => {
    // FT_PER_M ft = 1.00 m → "1 m"
    expect(formatMetric(FT_PER_M)).toBe('1 m');
  });

  it('formats fractional meters', () => {
    // 3.5 m in feet → "3.5 m"
    expect(formatMetric(3.5 * FT_PER_M)).toBe('3.5 m');
  });
});

describe('formatDimension', () => {
  it('delegates to imperial format', () => {
    expect(formatDimension(10, 'imperial')).toBe("10'");
  });

  it('delegates to metric format', () => {
    expect(formatDimension(FT_PER_M, 'metric')).toBe('1 m');
  });
});

describe('parseMetric', () => {
  it('parses bare decimal as meters', () => {
    expect(parseMetric('3.5')).toBeCloseTo(3.5 * FT_PER_M);
  });

  it('parses "3.5 m"', () => {
    expect(parseMetric('3.5 m')).toBeCloseTo(3.5 * FT_PER_M);
  });

  it('parses "3.5m" (no space)', () => {
    expect(parseMetric('3.5m')).toBeCloseTo(3.5 * FT_PER_M);
  });

  it('parses "350 cm"', () => {
    expect(parseMetric('350 cm')).toBeCloseTo(3.5 * FT_PER_M);
  });

  it('parses "350cm" (no space)', () => {
    expect(parseMetric('350cm')).toBeCloseTo(3.5 * FT_PER_M);
  });

  it('parses "3 m 50 cm"', () => {
    expect(parseMetric('3 m 50 cm')).toBeCloseTo(3.5 * FT_PER_M);
  });

  it('parses "3 m 50" (cm implied)', () => {
    expect(parseMetric('3 m 50')).toBeCloseTo(3.5 * FT_PER_M);
  });

  it('is case-insensitive ("3.5 M")', () => {
    expect(parseMetric('3.5 M')).toBeCloseTo(3.5 * FT_PER_M);
  });

  it('returns null for empty string', () => {
    expect(parseMetric('')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseMetric('abc')).toBeNull();
  });

  it('parses integer meters', () => {
    expect(parseMetric('4')).toBeCloseTo(4 * FT_PER_M);
  });
});

describe('parseDimension', () => {
  it('delegates to parseFtIn in imperial mode', () => {
    expect(parseDimension("10'", 'imperial')).toBeCloseTo(10);
  });

  it('delegates to parseMetric in metric mode', () => {
    expect(parseDimension('3.5 m', 'metric')).toBeCloseTo(3.5 * FT_PER_M);
  });
});
