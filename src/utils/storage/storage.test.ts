import { describe, it, expect, beforeEach } from 'vitest';
import {
  FLOORPLAN_VERSION,
  loadFloorPlans,
  saveFloorPlans,
  loadActiveId,
  saveActiveId,
} from './storage';
import type { FloorPlan } from '../../types';

const mockPlan: FloorPlan = {
  id: 'test-1',
  version: FLOORPLAN_VERSION,
  name: 'Test Plan',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  elements: [],
};

beforeEach(() => {
  localStorage.clear();
});

describe('loadFloorPlans', () => {
  it('returns empty array when nothing stored', () => {
    expect(loadFloorPlans()).toEqual([]);
  });

  it('returns stored plans', () => {
    localStorage.setItem('snapdraft_floorplans', JSON.stringify([mockPlan]));
    expect(loadFloorPlans()).toEqual([mockPlan]);
  });

  it('upgrades legacy plans without a per-plan version', () => {
    const legacyPlan = {
      id: mockPlan.id,
      name: mockPlan.name,
      createdAt: mockPlan.createdAt,
      updatedAt: mockPlan.updatedAt,
      elements: mockPlan.elements,
    };
    localStorage.setItem('snapdraft_floorplans', JSON.stringify([legacyPlan]));

    expect(loadFloorPlans()).toEqual([mockPlan]);
    expect(JSON.parse(localStorage.getItem('snapdraft_floorplans')!)).toEqual([mockPlan]);
  });

  it('returns empty array on corrupt data', () => {
    localStorage.setItem('snapdraft_floorplans', 'not-json{{{');
    expect(loadFloorPlans()).toEqual([]);
  });

  it('ignores plans with unsupported versions', () => {
    localStorage.setItem(
      'snapdraft_floorplans',
      JSON.stringify([{ ...mockPlan, version: FLOORPLAN_VERSION + 1 }]),
    );

    expect(loadFloorPlans()).toEqual([]);
  });
});

describe('saveFloorPlans', () => {
  it('persists plans to localStorage', () => {
    saveFloorPlans([mockPlan]);
    const stored = JSON.parse(localStorage.getItem('snapdraft_floorplans')!);
    expect(stored).toEqual([mockPlan]);
  });
});

describe('loadActiveId / saveActiveId', () => {
  it('returns null when nothing stored', () => {
    expect(loadActiveId()).toBeNull();
  });

  it('round-trips the active id', () => {
    saveActiveId('abc-123');
    expect(loadActiveId()).toBe('abc-123');
  });
});
