import { describe, it, expect, beforeEach } from 'vitest';
import { useFloorplanStore } from '../../store/useFloorplanStore';
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

describe('persistence to localStorage', () => {
  it('saves and reloads plans', () => {
    const id = useFloorplanStore.getState().activeId!;
    useFloorplanStore.getState().renamePlan(id, 'Persisted');
    const stored = localStorage.getItem('snapdraft_floorplans');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.find((p: { id: string }) => p.id === id)?.name).toBe('Persisted');
  });

  it('saves active id', () => {
    const id = useFloorplanStore.getState().activeId!;
    useFloorplanStore.getState().setActivePlan(id);
    expect(localStorage.getItem('snapdraft_active')).toBe(id);
  });
});
