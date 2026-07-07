import { describe, it, expect } from 'vitest';
import {
  BOX_COLOR_PRESETS,
  DEFAULT_BOX_COLOR,
  nextBoxColor,
  isPresetColor,
  hexToRgba,
} from './colors';

describe('BOX_COLOR_PRESETS', () => {
  it('has exactly 5 entries, all valid hex colors', () => {
    expect(BOX_COLOR_PRESETS).toHaveLength(5);
    for (const color of BOX_COLOR_PRESETS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('has the legacy blueprint blue as the first preset and default', () => {
    expect(BOX_COLOR_PRESETS[0]).toBe('#2d5490');
    expect(DEFAULT_BOX_COLOR).toBe(BOX_COLOR_PRESETS[0]);
  });
});

describe('nextBoxColor', () => {
  it('returns each preset in order for counts 0-4', () => {
    expect(nextBoxColor(0)).toBe(BOX_COLOR_PRESETS[0]);
    expect(nextBoxColor(1)).toBe(BOX_COLOR_PRESETS[1]);
    expect(nextBoxColor(2)).toBe(BOX_COLOR_PRESETS[2]);
    expect(nextBoxColor(3)).toBe(BOX_COLOR_PRESETS[3]);
    expect(nextBoxColor(4)).toBe(BOX_COLOR_PRESETS[4]);
  });

  it('wraps around after 5', () => {
    expect(nextBoxColor(5)).toBe(BOX_COLOR_PRESETS[0]);
    expect(nextBoxColor(6)).toBe(BOX_COLOR_PRESETS[1]);
  });

  it('wraps around for larger counts', () => {
    expect(nextBoxColor(11)).toBe(BOX_COLOR_PRESETS[11 % 5]);
  });
});

describe('isPresetColor', () => {
  it('returns true for each preset', () => {
    for (const color of BOX_COLOR_PRESETS) {
      expect(isPresetColor(color)).toBe(true);
    }
  });

  it('returns false for a non-preset hex color', () => {
    expect(isPresetColor('#123456')).toBe(false);
  });
});

describe('hexToRgba', () => {
  it('converts a 6-digit hex color', () => {
    expect(hexToRgba('#2d5490', 0.06)).toBe('rgba(45, 84, 144, 0.06)');
  });

  it('converts a 3-digit shorthand hex color', () => {
    expect(hexToRgba('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });

  it('passes through the alpha value unchanged', () => {
    expect(hexToRgba('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
  });
});
