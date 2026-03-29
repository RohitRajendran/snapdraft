import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { FloorPlan, Element, Point } from '../../types';
import {
  FLOORPLAN_VERSION,
  loadFloorPlans,
  saveFloorPlans,
  loadActiveId,
  saveActiveId,
} from '../../utils/storage/storage';

const MAX_HISTORY = 50;

type FloorplanStore = {
  plans: FloorPlan[];
  activeId: string | null;

  // Undo / redo — session-only, not persisted
  past: Element[][];
  future: Element[][];

  // Derived
  activePlan: () => FloorPlan | null;

  // Plan management
  createPlan: (name?: string) => string;
  importPlan: (plan: FloorPlan) => string;
  deletePlan: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  setActivePlan: (id: string) => void;

  // Element management
  addElement: (element: Element) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  updateElementSilent: (id: string, updates: Partial<Element>) => void;
  updateElements: (updates: Record<string, Partial<Element>>) => void;
  deleteElement: (id: string) => void;
  deleteElements: (ids: Iterable<string>) => void;

  // Undo snapshot without changing elements (use before a silent-update gesture)
  snapshotForUndo: () => void;

  // Undo / redo
  undo: () => void;
  redo: () => void;

  // Sync helpers — called by useSyncManager, not by UI code directly
  /** Replace a plan's elements with a version received from the cloud. Clears undo history. */
  applyRemoteElements: (planId: string, elements: Element[], remoteUpdatedAt: string) => void;
  /** Add plans from the cloud that don't exist locally. */
  mergePlans: (incoming: FloorPlan[]) => void;
};

function persist(plans: FloorPlan[], activeId: string | null) {
  saveFloorPlans(plans);
  if (activeId) saveActiveId(activeId);
}

function clonePoint(point: Point): Point {
  return { ...point };
}

function cloneElement(element: Element): Element {
  if (element.type === 'wall') {
    return {
      ...element,
      points: element.points.map(clonePoint),
    };
  }

  return { ...element };
}

function cloneElements(elements: Element[]): Element[] {
  return elements.map(cloneElement);
}

function samePoints(a: Point[], b: Point[]): boolean {
  if (a.length !== b.length) return false;

  return a.every((point, index) => point.x === b[index].x && point.y === b[index].y);
}

function sameElement(a: Element, b: Element): boolean {
  if (a.id !== b.id || a.type !== b.type) return false;

  if (a.type === 'wall' && b.type === 'wall') {
    return samePoints(a.points, b.points);
  }

  if (a.type === 'box' && b.type === 'box') {
    return (
      a.x === b.x &&
      a.y === b.y &&
      a.width === b.width &&
      a.height === b.height &&
      a.rotation === b.rotation &&
      a.label === b.label
    );
  }

  return false;
}

function sameElements(a: Element[], b: Element[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((element, index) => sameElement(element, b[index]));
}

/** Replace active plan's elements, push current to past, clear future. */
function applyElements(state: FloorplanStore, newElements: Element[]): Partial<FloorplanStore> {
  const current = state.plans.find((p) => p.id === state.activeId)?.elements ?? [];
  if (sameElements(current, newElements)) return {};

  const nextElements = cloneElements(newElements);
  const past = [...state.past.slice(-(MAX_HISTORY - 1)), cloneElements(current)];
  const plans = state.plans.map((p) =>
    p.id === state.activeId
      ? { ...p, elements: nextElements, updatedAt: new Date().toISOString() }
      : p,
  );
  persist(plans, state.activeId);
  return { plans, past, future: [] };
}

const savedPlans = loadFloorPlans();
const savedActiveId = loadActiveId();

export const useFloorplanStore = create<FloorplanStore>((set, get) => ({
  plans: savedPlans,
  activeId:
    savedActiveId && savedPlans.find((p) => p.id === savedActiveId)
      ? savedActiveId
      : (savedPlans[0]?.id ?? null),

  past: [],
  future: [],

  activePlan: () => {
    const { plans, activeId } = get();
    return plans.find((p) => p.id === activeId) ?? null;
  },

  createPlan: (name = 'Untitled Plan') => {
    const id = nanoid();
    const plan: FloorPlan = {
      id,
      version: FLOORPLAN_VERSION,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      elements: [],
    };
    set((state) => {
      const plans = [...state.plans, plan];
      persist(plans, id);
      return { plans, activeId: id, past: [], future: [] };
    });
    return id;
  },

  importPlan: (plan) => {
    const id = nanoid();
    const now = new Date().toISOString();
    const newPlan: FloorPlan = {
      ...plan,
      id,
      createdAt: now,
      updatedAt: now,
      version: FLOORPLAN_VERSION,
    };
    set((state) => {
      const plans = [...state.plans, newPlan];
      persist(plans, id);
      return { plans, activeId: id, past: [], future: [] };
    });
    return id;
  },

  deletePlan: (id) => {
    set((state) => {
      const plans = state.plans.filter((p) => p.id !== id);
      const activeId = state.activeId === id ? (plans[0]?.id ?? null) : state.activeId;
      persist(plans, activeId);
      return { plans, activeId, past: [], future: [] };
    });
  },

  renamePlan: (id, name) => {
    set((state) => {
      const plans = state.plans.map((p) =>
        p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p,
      );
      persist(plans, state.activeId);
      return { plans };
    });
  },

  setActivePlan: (id) => {
    saveActiveId(id);
    set({ activeId: id, past: [], future: [] });
  },

  addElement: (element) => {
    set((state) => {
      const current = state.plans.find((p) => p.id === state.activeId)?.elements ?? [];
      return applyElements(state, [...current, element]);
    });
  },

  updateElement: (id, updates) => {
    set((state) => {
      const current = state.plans.find((p) => p.id === state.activeId)?.elements ?? [];
      const newElements = current.map((el) =>
        el.id === id ? ({ ...el, ...updates } as Element) : el,
      );
      return applyElements(state, newElements);
    });
  },

  updateElementSilent: (id, updates) => {
    set((state) => {
      const current = state.plans.find((p) => p.id === state.activeId)?.elements ?? [];
      const newElements = current.map((el) =>
        el.id === id ? ({ ...el, ...updates } as Element) : el,
      );
      if (sameElements(current, newElements)) return {};
      const plans = state.plans.map((p) =>
        p.id === state.activeId
          ? { ...p, elements: cloneElements(newElements), updatedAt: new Date().toISOString() }
          : p,
      );
      persist(plans, state.activeId);
      return { plans };
    });
  },

  updateElements: (updates) => {
    set((state) => {
      const current = state.plans.find((p) => p.id === state.activeId)?.elements ?? [];
      const newElements = current.map((el) =>
        updates[el.id] ? ({ ...el, ...updates[el.id] } as Element) : el,
      );
      return applyElements(state, newElements);
    });
  },

  deleteElement: (id) => {
    set((state) => {
      const current = state.plans.find((p) => p.id === state.activeId)?.elements ?? [];
      return applyElements(
        state,
        current.filter((el) => el.id !== id),
      );
    });
  },

  deleteElements: (ids) => {
    set((state) => {
      const idSet = new Set(ids);
      if (idSet.size === 0) return {};
      const current = state.plans.find((p) => p.id === state.activeId)?.elements ?? [];
      return applyElements(
        state,
        current.filter((el) => !idSet.has(el.id)),
      );
    });
  },

  snapshotForUndo: () => {
    set((state) => {
      const current = state.plans.find((p) => p.id === state.activeId)?.elements ?? [];
      if (current.length === 0) return {};
      const past = [...state.past.slice(-(MAX_HISTORY - 1)), cloneElements(current)];
      return { past, future: [] };
    });
  },

  undo: () => {
    set((state) => {
      if (state.past.length === 0) return {};
      const previous = cloneElements(state.past[state.past.length - 1]);
      const current = state.plans.find((p) => p.id === state.activeId)?.elements ?? [];
      const plans = state.plans.map((p) =>
        p.id === state.activeId
          ? { ...p, elements: previous, updatedAt: new Date().toISOString() }
          : p,
      );
      persist(plans, state.activeId);
      return {
        plans,
        past: state.past.slice(0, -1),
        future: [cloneElements(current), ...state.future.slice(0, MAX_HISTORY - 1)],
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return {};
      const next = cloneElements(state.future[0]);
      const current = state.plans.find((p) => p.id === state.activeId)?.elements ?? [];
      const plans = state.plans.map((p) =>
        p.id === state.activeId ? { ...p, elements: next, updatedAt: new Date().toISOString() } : p,
      );
      persist(plans, state.activeId);
      return {
        plans,
        past: [...state.past.slice(-(MAX_HISTORY - 1)), cloneElements(current)],
        future: state.future.slice(1),
      };
    });
  },

  applyRemoteElements: (planId, elements, remoteUpdatedAt) => {
    set((state) => {
      const plans = state.plans.map((p) =>
        p.id === planId
          ? { ...p, elements: cloneElements(elements), updatedAt: remoteUpdatedAt }
          : p,
      );
      persist(plans, state.activeId);
      // Clear undo/redo so history doesn't contain pre-sync state.
      return { plans, past: [], future: [] };
    });
  },

  mergePlans: (incoming) => {
    set((state) => {
      const existingIds = new Set(state.plans.map((p) => p.id));
      const toAdd = incoming.filter((p) => !existingIds.has(p.id));
      if (toAdd.length === 0) return {};
      const plans = [...state.plans, ...toAdd];
      persist(plans, state.activeId);
      return { plans };
    });
  },
}));
