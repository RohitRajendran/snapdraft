import { formatFeet, parseFtIn } from '../geometry/geometry';
import type { UnitSystem } from '../../types';

export const M_PER_FT = 0.3048;
export const FT_PER_M = 1 / M_PER_FT;

// Metric nudge increments expressed in feet for use alongside NUDGE_FT/FINE_NUDGE_FT
export const NUDGE_METRIC_FT = 0.05 * FT_PER_M; // 5 cm
export const FINE_NUDGE_METRIC_FT = 0.01 * FT_PER_M; // 1 cm

export function formatMetric(ft: number): string {
  const m = ft * M_PER_FT;
  // Values below 1 cm can't be represented with 2 decimal meter places; show in mm instead.
  if (m < 0.01) {
    return `${Math.round(m * 1000)} mm`;
  }
  // 2 decimal places, strip trailing zeros (e.g. 3.50 → "3.5 m", 3.00 → "3 m")
  const s = m.toFixed(2).replace(/\.?0+$/, '');
  return `${s} m`;
}

export function formatDimension(ft: number, unit: UnitSystem): string {
  return unit === 'metric' ? formatMetric(ft) : formatFeet(ft);
}

/**
 * Parse a metric dimension string into decimal feet.
 * Accepts: "3.5 m", "3.5", "3.5m", "350 cm", "350cm", "3 m 50 cm", "3 m 50",
 *          "3500 mm", "3500mm", "3 m 500 mm"
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

  // "3 m 500 mm" (meters + millimeters)
  const mMm = s.match(/^(\d+(?:\.\d+)?)\s*m\s+(\d+(?:\.\d+)?)\s*mm$/);
  if (mMm) {
    return (parseFloat(mMm[1]) + parseFloat(mMm[2]) / 1000) * FT_PER_M;
  }

  // "3500 mm" or "3500mm"
  const mm = s.match(/^(\d+(?:\.\d+)?)\s*mm$/);
  if (mm) return (parseFloat(mm[1]) / 1000) * FT_PER_M;

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
