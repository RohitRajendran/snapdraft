// cspell:ignore Nightst
import { describe, it, expect } from 'vitest';
import { fitBoxLabel, readableRotation, type MeasureText } from './boxLabel';

// Every character is half the font size wide, like a narrow sans.
const measure: MeasureText = (text, size) => text.length * size * 0.5;
const fit = (label: string, width: number, height: number, rotation = 0) =>
  fitBoxLabel(label, width, height, rotation, measure);

describe('fitBoxLabel', () => {
  it('keeps one line at full size in a roomy box', () => {
    expect(fit('Bed', 100, 130)).toEqual({ lines: ['Bed'], fontSize: 12, rotation: 0 });
    expect(fit('Bed', 130, 100)).toEqual({ lines: ['Bed'], fontSize: 12, rotation: 0 });
  });

  it('draws nothing for blank labels and degenerate boxes', () => {
    expect(fit('   ', 100, 100)).toBeNull();
    expect(fit('Desk', 8, 100)).toBeNull();
    expect(fit('Desk', Infinity, 100)).toBeNull();
  });

  it('prefers flat shortened text to sideways text', () => {
    expect(fit('Nightstand', 40, 70)).toEqual({ lines: ['Nights…'], fontSize: 9, rotation: 0 });
  });

  it('reads closest to horizontal in rotated boxes', () => {
    expect(fit('Dresser', 30, 100, -90)).toEqual({
      lines: ['Dresser'],
      fontSize: 12,
      rotation: 90,
    });
  });

  it('turns text only when nothing readable fits flat', () => {
    expect(fit('Bookcase', 30, 120)).toEqual({ lines: ['Bookcase'], fontSize: 12, rotation: -90 });
  });

  it('wraps between words when two lines fit', () => {
    expect(fit('Coffee table', 70, 60)).toEqual({
      lines: ['Coffee', 'table'],
      fontSize: 12,
      rotation: 0,
    });
  });

  it('shrinks before truncating', () => {
    expect(fit('Armchair', 56, 56)?.fontSize).toBe(12);
    expect(fit('Armchair', 50, 50)).toEqual({ lines: ['Armchair'], fontSize: 10.5, rotation: 0 });
  });

  it('truncates at the end, keeping at least four characters', () => {
    expect(fit('Nightstand', 48, 30)).toEqual({ lines: ['Nightst…'], fontSize: 9, rotation: 0 });
    expect(fit('Nightstand', 30, 30)).toBeNull();
  });

  it('hides the label when no line fits across the box', () => {
    expect(fit('Shelf', 200, 18)).toBeNull();
  });

  it('matches the native app for the sample Bedroom furniture', () => {
    // Dresser: 5 ft × 1.5 ft rotated -90°, at 20 px per ft.
    expect(fit('Dresser', 100, 30, -90)?.rotation).toBe(0);
    // A rotated box reads the same at 90° and -90°.
    expect(fit('Dresser', 100, 30, 90)?.rotation).toBe(180);
  });
});

describe('readableRotation', () => {
  it.each([
    [0, false, 0],
    [-25, false, 0],
    [-90, false, 0],
    [90, false, 180],
    [180, false, 180],
    [-180, false, 180],
    [135, false, 180],
    [0, true, -90],
    [90, true, -90],
    [-90, true, 90],
    [360, false, 0],
  ])('box %d°, along length %s → %d°', (box, alongLength, expected) => {
    const extra = readableRotation(box, alongLength);
    expect(extra).toBe(expected);
    let total = (box + extra) % 360;
    if (total >= 180) total -= 360;
    else if (total < -180) total += 360;
    expect(total).toBeGreaterThanOrEqual(-90);
    expect(total).toBeLessThan(90);
  });
});
