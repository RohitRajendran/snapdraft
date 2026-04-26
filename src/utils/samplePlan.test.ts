import { describe, it, expect } from 'vitest';
import { createSampleElements } from './samplePlan';
import type { Wall } from '../types';

describe('createSampleElements', () => {
  it('returns a non-empty array of elements', () => {
    expect(createSampleElements().length).toBeGreaterThan(0);
  });

  it('generates fresh unique IDs on each call', () => {
    const ids1 = createSampleElements().map((el) => el.id);
    const ids2 = createSampleElements().map((el) => el.id);
    expect(new Set(ids1).size).toBe(ids1.length);
    expect(ids1).not.toEqual(ids2);
  });

  it('includes exactly one wall element', () => {
    const walls = createSampleElements().filter((el) => el.type === 'wall');
    expect(walls).toHaveLength(1);
  });

  it('wall has a door gap (chain does not close back to its start point)', () => {
    const wall = createSampleElements().find((el) => el.type === 'wall') as Wall;
    const first = wall.points[0];
    const last = wall.points[wall.points.length - 1];
    expect(first.x === last.x && first.y === last.y).toBe(false);
  });

  it('includes expected furniture labels', () => {
    const labels = createSampleElements()
      .filter((el) => el.type === 'box')
      .map((el) => (el.type === 'box' ? el.label : undefined));
    expect(labels).toContain('Bed');
    expect(labels).toContain('Nightstand');
    expect(labels).toContain('Dresser');
    expect(labels).toContain('Armchair');
  });

  it('all coordinates are in feet (no pixel-scale values)', () => {
    const MAX_FT = 200;
    for (const el of createSampleElements()) {
      if (el.type === 'wall') {
        for (const p of el.points) {
          expect(p.x).toBeLessThan(MAX_FT);
          expect(p.y).toBeLessThan(MAX_FT);
        }
      } else {
        expect(el.x).toBeLessThan(MAX_FT);
        expect(el.y).toBeLessThan(MAX_FT);
        expect(el.width).toBeLessThan(MAX_FT);
        expect(el.height).toBeLessThan(MAX_FT);
      }
    }
  });
});
