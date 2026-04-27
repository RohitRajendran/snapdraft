import { formatFeet, parseFtIn } from '../geometry/geometry';
import type { UnitSystem } from '../../types';

export const M_PER_FT = 0.3048;
export const FT_PER_M = 1 / M_PER_FT;

// Metric nudge increments expressed in feet for use alongside NUDGE_FT/FINE_NUDGE_FT
export const NUDGE_METRIC_FT = 0.05 * FT_PER_M; // 5 cm
export const FINE_NUDGE_METRIC_FT = 0.01 * FT_PER_M; // 1 cm

export function formatMetric(ft: number): string {
  const m = ft * M_PER_FT;
  // 2 decimal places, strip trailing zeros (e.g. 3.50 → "3.5 m", 3.00 → "3 m")
  const s = m.toFixed(2).replace(/\.?0+$/, '');
  return `${s} m`;
}

export function formatDimension(ft: number, unit: UnitSystem): string {
  return unit === 'metric' ? formatMetric(ft) : formatFeet(ft);
}

/**
 * Parse a metric dimension string into decimal feet.
 * Accepts: "3.5 m", "3.5", "3.5m", "350 cm", "350cm", "3 m 50 cm", "3 m 50"
 * Bare numbers are treated as meters.
 * Returns null if unparseable.
 */
export function parseMetric(input: string): number | null {
  const s = input.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!s) return null;

  // "3 m 50 cm" or "3 m 50" (meters + centimeters)
  const mCm = s.match(/^(\d+(?:\.\d+)?)\s*m\s+(\d+(?:\.\d+)?)\s*(?:cm)?$/);
  if (mCm) {
    return (parseFloat(mCm[1]) + parseFloat(mCm[2]) / 100) * FT_PER_M;
  }

  // "350 cm" or "350cm"
  const cm = s.match(/^(\d+(?:\.\d+)?)\s*cm$/);
  if (cm) return (parseFloat(cm[1]) / 100) * FT_PER_M;

  // "3.5 m", "3.5m", or bare "3.5" / "3" (treated as meters)
  const m = s.match(/^(\d+(?:\.\d+)?)\s*m?$/);
  if (m) return parseFloat(m[1]) * FT_PER_M;

  return null;
}

export function parseDimension(input: string, unit: UnitSystem): number | null {
  return unit === 'metric' ? parseMetric(input) : parseFtIn(input);
}
