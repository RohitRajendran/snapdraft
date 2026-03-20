import LZString from 'lz-string';
import type { FloorPlan } from '../../types';

const STORAGE_KEY = 'snapdraft_floorplans';
const ACTIVE_KEY = 'snapdraft_active';
export const FLOORPLAN_VERSION = 1;

type LegacyFloorPlan = Omit<FloorPlan, 'version'> & {
  version?: unknown;
};

function normalizeFloorPlan(plan: LegacyFloorPlan): FloorPlan | null {
  if (typeof plan !== 'object' || plan === null) return null;

  if (plan.version === undefined) {
    return { ...plan, version: FLOORPLAN_VERSION };
  }

  if (plan.version === FLOORPLAN_VERSION) {
    return plan as FloorPlan;
  }

  return null;
}

export function loadFloorPlans(): FloorPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const rawPlans = parsed;

    const plans = rawPlans
      .map((plan) => normalizeFloorPlan(plan as LegacyFloorPlan))
      .filter((plan): plan is FloorPlan => plan !== null);

    const needsMigration = rawPlans.some(
      (plan) =>
        typeof plan === 'object' &&
        plan !== null &&
        (!('version' in plan) || (plan as { version?: unknown }).version === undefined),
    );

    if (needsMigration) {
      saveFloorPlans(plans);
    }

    return plans;
  } catch {
    return [];
  }
}

export function saveFloorPlans(plans: FloorPlan[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'floorplan';
}

export function exportFloorPlan(plan: FloorPlan): void {
  const json = JSON.stringify(plan, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(plan.name)}.snapdraft.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportedPlan(raw: unknown): FloorPlan | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string') return null;
  if (typeof obj.name !== 'string') return null;
  if (typeof obj.createdAt !== 'string') return null;
  if (typeof obj.updatedAt !== 'string') return null;
  if (!Array.isArray(obj.elements)) return null;

  for (const el of obj.elements) {
    if (typeof el !== 'object' || el === null) return null;
    const elem = el as Record<string, unknown>;
    if (typeof elem.id !== 'string') return null;
    if (elem.type === 'wall') {
      if (!Array.isArray(elem.points)) return null;
      for (const pt of elem.points) {
        if (typeof pt !== 'object' || pt === null) return null;
        const p = pt as Record<string, unknown>;
        if (typeof p.x !== 'number' || typeof p.y !== 'number') return null;
      }
    } else if (elem.type === 'box') {
      if (typeof elem.x !== 'number' || !isFinite(elem.x as number)) return null;
      if (typeof elem.y !== 'number' || !isFinite(elem.y as number)) return null;
      if (typeof elem.width !== 'number' || !isFinite(elem.width as number)) return null;
      if (typeof elem.height !== 'number' || !isFinite(elem.height as number)) return null;
      if (typeof elem.rotation !== 'number' || !isFinite(elem.rotation as number)) return null;
      if (elem.label !== undefined && typeof elem.label !== 'string') return null;
    } else {
      return null;
    }
  }

  return normalizeFloorPlan(raw as LegacyFloorPlan);
}

export function encodePlanToUrl(plan: FloorPlan): string {
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(plan));
  return window.location.origin + window.location.pathname + '?plan=' + compressed;
}

export function decodePlanFromUrl(href: string): FloorPlan | null {
  try {
    const url = new URL(href);
    const param = url.searchParams.get('plan');
    if (!param) return null;
    const decompressed = LZString.decompressFromEncodedURIComponent(param);
    if (!decompressed) return null;
    const parsed = JSON.parse(decompressed) as unknown;
    return parseImportedPlan(parsed);
  } catch {
    return null;
  }
}
