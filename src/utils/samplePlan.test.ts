import { describe, it, expect } from 'vitest';
import { createSampleElements } from './samplePlan';

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

  it('includes four wall elements (one per side)', () => {
    const walls = createSampleElements().filter((el) => el.type === 'wall');
    expect(walls).toHaveLength(4);
  });

  it('includes a door and a window opening', () => {
    const elements = createSampleElements();
    const doors = elements.filter((el) => el.type === 'door');
    const windows = elements.filter((el) => el.type === 'window');
    expect(doors).toHaveLength(1);
    expect(windows).toHaveLength(1);
  });

  it('openings reference valid wall IDs', () => {
    const elements = createSampleElements();
    const wallIds = new Set(elements.filter((el) => el.type === 'wall').map((el) => el.id));
    const openings = elements.filter((el) => el.type === 'door' || el.type === 'window');
    for (const opening of openings) {
      if (opening.type === 'door' || opening.type === 'window') {
        expect(wallIds.has(opening.wallId)).toBe(true);
      }
    }
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
      } else if (el.type === 'box') {
        expect(el.x).toBeLessThan(MAX_FT);
        expect(el.y).toBeLessThan(MAX_FT);
        expect(el.width).toBeLessThan(MAX_FT);
        expect(el.height).toBeLessThan(MAX_FT);
      }
    }
  });
});
