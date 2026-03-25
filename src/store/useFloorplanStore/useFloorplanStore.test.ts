import { describe, it, expect, beforeEach } from 'vitest';
import { useFloorplanStore } from './useFloorplanStore';
import { FLOORPLAN_VERSION } from '../../utils/storage/storage';
import type { Element } from '../../types';

const wall = (id = 'w1'): Element => ({
  id,
  type: 'wall',
  points: [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
  ],
});

const box = (id = 'b1'): Element => ({
  id,
  type: 'box',
  x: 1,
  y: 1,
  width: 4,
  height: 3,
  rotation: 0,
});

function getElements(): Element[] {
  return useFloorplanStore.getState().activePlan()?.elements ?? [];
}

beforeEach(() => {
  localStorage.clear();
  // Reset to a clean plan
  const id = useFloorplanStore.getState().createPlan('Test');
  useFloorplanStore.setState({ activeId: id, past: [], future: [] });
});

describe('createPlan', () => {
  it('creates a plan with default name', () => {
    const id = useFloorplanStore.getState().createPlan();
    const plan = useFloorplanStore.getState().plans.find((p) => p.id === id);
    expect(plan).toBeDefined();
    expect(plan!.version).toBe(FLOORPLAN_VERSION);
    expect(plan!.name).toBe('Untitled Plan');
    expect(plan!.elements).toHaveLength(0);
  });

  it('creates a plan with a custom name', () => {
    const id = useFloorplanStore.getState().createPlan('Living Room');
    const plan = useFloorplanStore.getState().plans.find((p) => p.id === id);
    expect(plan!.name).toBe('Living Room');
  });

  it('sets the new plan as active', () => {
    const id = useFloorplanStore.getState().createPlan('New');
    expect(useFloorplanStore.getState().activeId).toBe(id);
  });

  it('resets undo/redo history', () => {
    useFloorplanStore.getState().addElement(wall());
    expect(useFloorplanStore.getState().past.length).toBeGreaterThan(0);
    useFloorplanStore.getState().createPlan('Fresh');
    expect(useFloorplanStore.getState().past).toHaveLength(0);
    expect(useFloorplanStore.getState().future).toHaveLength(0);
  });
});

describe('deletePlan', () => {
  it('removes the plan from the list', () => {
    const id = useFloorplanStore.getState().createPlan('ToDelete');
    const countBefore = useFloorplanStore.getState().plans.length;
    useFloorplanStore.getState().deletePlan(id);
    expect(useFloorplanStore.getState().plans.length).toBe(countBefore - 1);
    expect(useFloorplanStore.getState().plans.find((p) => p.id === id)).toBeUndefined();
  });

  it('switches to first remaining plan when active plan is deleted', () => {
    const firstId = useFloorplanStore.getState().activeId!;
    useFloorplanStore.getState().createPlan('Other');
    useFloorplanStore.getState().setActivePlan(firstId);
    useFloorplanStore.getState().deletePlan(firstId);
    expect(useFloorplanStore.getState().activeId).not.toBe(firstId);
  });

  it('activeId becomes null when last plan is deleted', () => {
    // delete all plans
    const ids = useFloorplanStore.getState().plans.map((p) => p.id);
    ids.forEach((id) => useFloorplanStore.getState().deletePlan(id));
    expect(useFloorplanStore.getState().activeId).toBeNull();
  });
});

describe('renamePlan', () => {
  it('updates the plan name', () => {
    const id = useFloorplanStore.getState().activeId!;
    useFloorplanStore.getState().renamePlan(id, 'Renamed');
    const plan = useFloorplanStore.getState().plans.find((p) => p.id === id);
    expect(plan!.name).toBe('Renamed');
  });

  it('does not change other plans', () => {
    const id1 = useFloorplanStore.getState().activeId!;
    const id2 = useFloorplanStore.getState().createPlan('Other');
    useFloorplanStore.getState().renamePlan(id1, 'Renamed');
    const other = useFloorplanStore.getState().plans.find((p) => p.id === id2);
    expect(other!.name).toBe('Other');
  });
});

describe('setActivePlan', () => {
  it('switches the active plan', () => {
    const id2 = useFloorplanStore.getState().createPlan('Plan2');
    const id1 = useFloorplanStore.getState().plans[0].id;
    useFloorplanStore.getState().setActivePlan(id1);
    expect(useFloorplanStore.getState().activeId).toBe(id1);
    useFloorplanStore.getState().setActivePlan(id2);
    expect(useFloorplanStore.getState().activeId).toBe(id2);
  });

  it('resets undo history when switching plans', () => {
    useFloorplanStore.getState().addElement(wall());
    const id2 = useFloorplanStore.getState().createPlan('Plan2');
    useFloorplanStore.getState().setActivePlan(id2);
    expect(useFloorplanStore.getState().past).toHaveLength(0);
  });
});

describe('addElement', () => {
  it('adds element to active plan', () => {
    useFloorplanStore.getState().addElement(wall());
    expect(getElements()).toHaveLength(1);
  });

  it('adds element to the correct plan (not others)', () => {
    const id1 = useFloorplanStore.getState().activeId!;
    const id2 = useFloorplanStore.getState().createPlan('P2');
    useFloorplanStore.getState().setActivePlan(id1);
    useFloorplanStore.getState().addElement(wall());
    useFloorplanStore.getState().setActivePlan(id2);
    expect(getElements()).toHaveLength(0);
  });

  it('multiple elements accumulate', () => {
    useFloorplanStore.getState().addElement(wall('w1'));
    useFloorplanStore.getState().addElement(wall('w2'));
    useFloorplanStore.getState().addElement(box('b1'));
    expect(getElements()).toHaveLength(3);
  });
});

describe('updateElement', () => {
  it('updates a wall element', () => {
    useFloorplanStore.getState().addElement(wall());
    useFloorplanStore.getState().updateElement('w1', {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    });
    const el = getElements()[0] as Extract<Element, { type: 'wall' }>;
    expect(el.points[1].x).toBe(10);
  });

  it('updates a box element', () => {
    useFloorplanStore.getState().addElement(box());
    useFloorplanStore.getState().updateElement('b1', { width: 8, rotation: 45 });
    const el = getElements()[0] as Extract<Element, { type: 'box' }>;
    expect(el.width).toBe(8);
    expect(el.rotation).toBe(45);
  });

  it('partial update preserves other fields', () => {
    useFloorplanStore.getState().addElement(box());
    useFloorplanStore.getState().updateElement('b1', { width: 10 });
    const el = getElements()[0] as Extract<Element, { type: 'box' }>;
    expect(el.height).toBe(3); // unchanged
    expect(el.x).toBe(1); // unchanged
  });

  it('no-op for unknown id', () => {
    useFloorplanStore.getState().addElement(wall());
    useFloorplanStore.getState().updateElement('nonexistent', { points: [] });
    expect(getElements()).toHaveLength(1);
  });
});

describe('updateElementSilent', () => {
  it('updates the element without pushing to undo history', () => {
    useFloorplanStore.getState().addElement(box());
    const pastBefore = useFloorplanStore.getState().past.length;
    useFloorplanStore.getState().updateElementSilent('b1', { rotation: 45 });
    const el = getElements()[0] as Extract<Element, { type: 'box' }>;
    expect(el.rotation).toBe(45);
    expect(useFloorplanStore.getState().past.length).toBe(pastBefore); // no new history entry
  });

  it('does not clear future history', () => {
    useFloorplanStore.getState().addElement(box());
    useFloorplanStore.getState().updateElement('b1', { rotation: 10 });
    useFloorplanStore.getState().undo();
    const futureLength = useFloorplanStore.getState().future.length;
    expect(futureLength).toBeGreaterThan(0);
    useFloorplanStore.getState().updateElementSilent('b1', { rotation: 20 });
    expect(useFloorplanStore.getState().future.length).toBe(futureLength); // future unchanged
  });
});

describe('snapshotForUndo', () => {
  it('pushes current elements to past without changing elements', () => {
    useFloorplanStore.getState().addElement(box());
    const elementsBefore = getElements();
    const pastLengthBefore = useFloorplanStore.getState().past.length;
    useFloorplanStore.getState().snapshotForUndo();
    expect(useFloorplanStore.getState().past.length).toBe(pastLengthBefore + 1);
    expect(getElements()).toEqual(elementsBefore); // elements unchanged
  });

  it('clears future when called', () => {
    useFloorplanStore.getState().addElement(box());
    useFloorplanStore.getState().updateElement('b1', { rotation: 10 });
    useFloorplanStore.getState().undo();
    expect(useFloorplanStore.getState().future.length).toBeGreaterThan(0);
    useFloorplanStore.getState().snapshotForUndo();
    expect(useFloorplanStore.getState().future.length).toBe(0);
  });

  it('is a no-op on empty plan', () => {
    const pastBefore = useFloorplanStore.getState().past.length;
    useFloorplanStore.getState().snapshotForUndo();
    expect(useFloorplanStore.getState().past.length).toBe(pastBefore);
  });

  it('snapshot + silent updates = single undo step', () => {
    useFloorplanStore.getState().addElement(box());
    useFloorplanStore.getState().snapshotForUndo();
    useFloorplanStore.getState().updateElementSilent('b1', { rotation: 30 });
    useFloorplanStore.getState().updateElementSilent('b1', { rotation: 60 });
    useFloorplanStore.getState().updateElementSilent('b1', { rotation: 90 });
    expect((getElements()[0] as Extract<Element, { type: 'box' }>).rotation).toBe(90);
    useFloorplanStore.getState().undo();
    expect((getElements()[0] as Extract<Element, { type: 'box' }>).rotation).toBe(0); // back to original
  });
});

describe('deleteElement', () => {
  it('removes the element', () => {
    useFloorplanStore.getState().addElement(wall());
    useFloorplanStore.getState().deleteElement('w1');
    expect(getElements()).toHaveLength(0);
  });

  it('only removes the matching element', () => {
    useFloorplanStore.getState().addElement(wall('w1'));
    useFloorplanStore.getState().addElement(wall('w2'));
    useFloorplanStore.getState().deleteElement('w1');
    expect(getElements()).toHaveLength(1);
    expect(getElements()[0].id).toBe('w2');
  });

  it('no-op for unknown id', () => {
    useFloorplanStore.getState().addElement(wall());
    useFloorplanStore.getState().deleteElement('nonexistent');
    expect(getElements()).toHaveLength(1);
  });
});

describe('activePlan', () => {
  it('returns null when no plans exist', () => {
    const ids = useFloorplanStore.getState().plans.map((p) => p.id);
    ids.forEach((id) => useFloorplanStore.getState().deletePlan(id));
    expect(useFloorplanStore.getState().activePlan()).toBeNull();
  });

  it('returns the active plan', () => {
    const id = useFloorplanStore.getState().activeId!;
    const plan = useFloorplanStore.getState().activePlan();
    expect(plan!.id).toBe(id);
  });
});

describe('importPlan', () => {
  it('adds the plan to the list and makes it active', () => {
    const incoming: import('../../types').FloorPlan = {
      id: 'orig-id',
      version: 1,
      name: 'Imported',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      elements: [
        {
          id: 'w1',
          type: 'wall',
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
          ],
        },
      ],
    };
    const countBefore = useFloorplanStore.getState().plans.length;
    const newId = useFloorplanStore.getState().importPlan(incoming);

    const plans = useFloorplanStore.getState().plans;
    expect(plans.length).toBe(countBefore + 1);
    expect(useFloorplanStore.getState().activeId).toBe(newId);
  });

  it('assigns a new id (does not reuse original id)', () => {
    const incoming: import('../../types').FloorPlan = {
      id: 'should-not-be-used',
      version: 1,
      name: 'Imported',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      elements: [],
    };
    const newId = useFloorplanStore.getState().importPlan(incoming);
    expect(newId).not.toBe('should-not-be-used');
    const plan = useFloorplanStore.getState().plans.find((p) => p.id === newId);
    expect(plan).toBeDefined();
  });

  it('preserves name and elements from incoming plan', () => {
    const wall: import('../../types').Element = {
      id: 'w1',
      type: 'wall',
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ],
    };
    const incoming: import('../../types').FloorPlan = {
      id: 'orig',
      version: 1,
      name: 'My Shared Plan',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      elements: [wall],
    };
    const newId = useFloorplanStore.getState().importPlan(incoming);
    const plan = useFloorplanStore.getState().plans.find((p) => p.id === newId)!;
    expect(plan.name).toBe('My Shared Plan');
    expect(plan.elements).toHaveLength(1);
    expect(plan.elements[0].id).toBe('w1');
  });

  it('sets version to FLOORPLAN_VERSION', () => {
    const incoming: import('../../types').FloorPlan = {
      id: 'orig',
      version: 0,
      name: 'Old Plan',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      elements: [],
    };
    const newId = useFloorplanStore.getState().importPlan(incoming);
    const plan = useFloorplanStore.getState().plans.find((p) => p.id === newId)!;
    expect(plan.version).toBe(FLOORPLAN_VERSION);
  });

  it('resets undo/redo history', () => {
    useFloorplanStore.getState().addElement(wall());
    expect(useFloorplanStore.getState().past.length).toBeGreaterThan(0);

    const incoming: import('../../types').FloorPlan = {
      id: 'orig',
      version: 1,
      name: 'Imported',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      elements: [],
    };
    useFloorplanStore.getState().importPlan(incoming);
    expect(useFloorplanStore.getState().past).toHaveLength(0);
    expect(useFloorplanStore.getState().future).toHaveLength(0);
  });

  it('persists the new plan to localStorage', () => {
    const incoming: import('../../types').FloorPlan = {
      id: 'orig',
      version: 1,
      name: 'Persisted Import',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      elements: [],
    };
    const newId = useFloorplanStore.getState().importPlan(incoming);
    const stored = JSON.parse(localStorage.getItem('snapdraft_floorplans')!);
    expect(stored.find((p: { id: string }) => p.id === newId)?.name).toBe('Persisted Import');
  });
});

describe('persistence to localStorage', () => {
  it('saves and reloads plans', () => {
    const id = useFloorplanStore.getState().activeId!;
    useFloorplanStore.getState().renamePlan(id, 'Persisted');
    const stored = localStorage.getItem('snapdraft_floorplans');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.find((p: { id: string }) => p.id === id)?.version).toBe(FLOORPLAN_VERSION);
    expect(parsed.find((p: { id: string }) => p.id === id)?.name).toBe('Persisted');
  });

  it('saves active id', () => {
    const id = useFloorplanStore.getState().activeId!;
    useFloorplanStore.getState().setActivePlan(id);
    expect(localStorage.getItem('snapdraft_active')).toBe(id);
  });
});
