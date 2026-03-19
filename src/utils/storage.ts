import type { FloorPlan } from '../types';

const STORAGE_KEY = 'snapdraft_floorplans';
const ACTIVE_KEY = 'snapdraft_active';

export function loadFloorPlans(): FloorPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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
