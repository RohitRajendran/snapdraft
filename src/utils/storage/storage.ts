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
