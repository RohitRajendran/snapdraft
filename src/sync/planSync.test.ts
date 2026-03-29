import { describe, it, expect } from 'vitest';
import { uploadPlan, downloadPlans, fetchPlanById, deletePlanFromCloud } from './planSync';
import type { FloorPlan } from '../types';

// When Supabase is not configured (no env vars in test environment), all
// functions should degrade gracefully without throwing.

const plan: FloorPlan = {
  id: 'plan-1',
  version: 1,
  name: 'Test Plan',
  elements: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('uploadPlan (no Supabase configured)', () => {
  it('resolves without error', async () => {
    await expect(uploadPlan(plan, 'user-1')).resolves.toBeUndefined();
  });
});

describe('downloadPlans (no Supabase configured)', () => {
  it('returns an empty array', async () => {
    const result = await downloadPlans('user-1');
    expect(result).toEqual([]);
  });
});

describe('fetchPlanById (no Supabase configured)', () => {
  it('returns null', async () => {
    const result = await fetchPlanById('plan-1');
    expect(result).toBeNull();
  });
});

describe('deletePlanFromCloud (no Supabase configured)', () => {
  it('resolves without error', async () => {
    await expect(deletePlanFromCloud('plan-1')).resolves.toBeUndefined();
  });
});
