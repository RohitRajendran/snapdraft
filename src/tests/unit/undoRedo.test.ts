import { describe, it, expect, beforeEach } from 'vitest';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import type { Element } from '../../types';

const wall = (id: string): Element => ({
  id,
  type: 'wall',
  points: [{ x: 0, y: 0 }, { x: 5, y: 0 }],
  thickness: 0.5,
});

beforeEach(() => {
  localStorage.clear();
  // Reset store to a clean state with one plan
  const store = useFloorplanStore.getState();
  // Create a fresh plan and make it active
  const id = store.createPlan('Test Plan');
  useFloorplanStore.setState({ activeId: id, past: [], future: [] });
});

function getElements(): Element[] {
  return useFloorplanStore.getState().activePlan()?.elements ?? [];
}

describe('undo / redo — addElement', () => {
  it('undo removes a just-added element', () => {
    const { addElement, undo } = useFloorplanStore.getState();
    addElement(wall('w1'));
    expect(getElements()).toHaveLength(1);
    undo();
    expect(getElements()).toHaveLength(0);
  });

  it('redo re-adds the element after undo', () => {
    const { addElement, undo, redo } = useFloorplanStore.getState();
    addElement(wall('w1'));
    undo();
    redo();
    expect(getElements()).toHaveLength(1);
  });

  it('multiple undos walk back through history', () => {
    const { addElement, undo } = useFloorplanStore.getState();
    addElement(wall('w1'));
    addElement(wall('w2'));
    addElement(wall('w3'));
    undo();
    expect(getElements()).toHaveLength(2);
    undo();
    expect(getElements()).toHaveLength(1);
    undo();
    expect(getElements()).toHaveLength(0);
  });

  it('undo past empty does nothing', () => {
    const { undo } = useFloorplanStore.getState();
    undo();
    expect(getElements()).toHaveLength(0);
  });

  it('redo past end does nothing', () => {
    const { addElement, undo, redo } = useFloorplanStore.getState();
    addElement(wall('w1'));
    undo();
    redo();
    redo(); // no-op
    expect(getElements()).toHaveLength(1);
  });
});

describe('undo / redo — deleteElement', () => {
  it('undo restores deleted element', () => {
    const { addElement, deleteElement, undo } = useFloorplanStore.getState();
    addElement(wall('w1'));
    deleteElement('w1');
    expect(getElements()).toHaveLength(0);
    undo();
    expect(getElements()).toHaveLength(1);
    expect(getElements()[0].id).toBe('w1');
  });
});

describe('undo / redo — updateElement', () => {
  it('undo reverts an update', () => {
    const { addElement, updateElement, undo } = useFloorplanStore.getState();
    addElement(wall('w1'));
    updateElement('w1', { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] });
    undo();
    const el = getElements()[0] as Extract<Element, { type: 'wall' }>;
    expect(el.points[1].x).toBe(5);
  });
});

describe('future cleared on new action', () => {
  it('new action after undo clears redo history', () => {
    const { addElement, undo } = useFloorplanStore.getState();
    addElement(wall('w1'));
    undo();
    addElement(wall('w2'));
    // redo history is gone
    expect(useFloorplanStore.getState().future).toHaveLength(0);
    // only w2 exists
    expect(getElements()[0].id).toBe('w2');
  });
});

describe('history resets on plan switch', () => {
  it('past and future clear when switching plans', () => {
    const { addElement, createPlan, setActivePlan } = useFloorplanStore.getState();
    addElement(wall('w1'));
    expect(useFloorplanStore.getState().past.length).toBeGreaterThan(0);
    const id2 = createPlan('Plan 2');
    setActivePlan(id2);
    expect(useFloorplanStore.getState().past).toHaveLength(0);
    expect(useFloorplanStore.getState().future).toHaveLength(0);
  });
});

describe('past stack depth limit', () => {
  it('keeps at most 50 entries in past', () => {
    const { addElement } = useFloorplanStore.getState();
    for (let i = 0; i < 55; i++) {
      addElement({ ...wall(`w${i}`), id: `w${i}` });
    }
    expect(useFloorplanStore.getState().past.length).toBeLessThanOrEqual(50);
  });
});
