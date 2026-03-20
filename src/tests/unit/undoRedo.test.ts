import { describe, it, expect, beforeEach } from 'vitest';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import type { Element } from '../../types';

const wall = (id: string): Element => ({
  id,
  type: 'wall',
  points: [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
  ],
});

const box = (id: string): Element => ({
  id,
  type: 'box',
  x: 1,
  y: 1,
  width: 4,
  height: 3,
  rotation: 0,
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

  it('bulk delete is undone in a single step', () => {
    const { addElement, deleteElements, undo, redo } = useFloorplanStore.getState();
    addElement(wall('w1'));
    addElement(wall('w2'));
    addElement(box('b1'));

    deleteElements(['w1', 'b1']);
    expect(getElements().map((el) => el.id)).toEqual(['w2']);

    undo();
    expect(getElements().map((el) => el.id)).toEqual(['w1', 'w2', 'b1']);

    redo();
    expect(getElements().map((el) => el.id)).toEqual(['w2']);
  });
});

describe('undo / redo — updateElement', () => {
  it('undo reverts an update', () => {
    const { addElement, updateElement, undo } = useFloorplanStore.getState();
    addElement(wall('w1'));
    updateElement('w1', {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    });
    undo();
    const el = getElements()[0] as Extract<Element, { type: 'wall' }>;
    expect(el.points[1].x).toBe(5);
  });

  it('undo reverts one multi-element update in a single step', () => {
    const { addElement, updateElements, undo, redo } = useFloorplanStore.getState();
    addElement(wall('w1'));
    addElement(box('b1'));

    updateElements({
      w1: {
        points: [
          { x: 2, y: 3 },
          { x: 7, y: 3 },
        ],
      },
      b1: { x: 6, y: 8 },
    });

    undo();

    const [undoneWall, undoneBox] = getElements();
    expect((undoneWall as Extract<Element, { type: 'wall' }>).points[0]).toEqual({ x: 0, y: 0 });
    expect((undoneBox as Extract<Element, { type: 'box' }>).x).toBe(1);
    expect((undoneBox as Extract<Element, { type: 'box' }>).y).toBe(1);

    redo();

    const [redoneWall, redoneBox] = getElements();
    expect((redoneWall as Extract<Element, { type: 'wall' }>).points[0]).toEqual({ x: 2, y: 3 });
    expect((redoneBox as Extract<Element, { type: 'box' }>).x).toBe(6);
    expect((redoneBox as Extract<Element, { type: 'box' }>).y).toBe(8);
  });

  it('does not create history entries for no-op updates', () => {
    const { addElement, updateElements } = useFloorplanStore.getState();
    addElement(wall('w1'));
    const pastBefore = useFloorplanStore.getState().past.length;

    updateElements({
      w1: {
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
        ],
      },
    });

    expect(useFloorplanStore.getState().past).toHaveLength(pastBefore);
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
