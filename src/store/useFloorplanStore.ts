import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { FloorPlan, Element } from '../types';
import {
  loadFloorPlans,
  saveFloorPlans,
  loadActiveId,
  saveActiveId,
} from '../utils/storage';

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
  deletePlan: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  setActivePlan: (id: string) => void;

  // Element management
  addElement: (element: Element) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  deleteElement: (id: string) => void;

  // Undo / redo
  undo: () => void;
  redo: () => void;
};

function persist(plans: FloorPlan[], activeId: string | null) {
  saveFloorPlans(plans);
  if (activeId) saveActiveId(activeId);
}

/** Replace active plan's elements, push current to past, clear future. */
function applyElements(
  state: FloorplanStore,
  newElements: Element[]
): Partial<FloorplanStore> {
  const current = state.plans.find(p => p.id === state.activeId)?.elements ?? [];
  const past = [...state.past.slice(-(MAX_HISTORY - 1)), current];
  const plans = state.plans.map(p =>
    p.id === state.activeId
      ? { ...p, elements: newElements, updatedAt: new Date().toISOString() }
      : p
  );
  persist(plans, state.activeId);
  return { plans, past, future: [] };
}

const savedPlans = loadFloorPlans();
const savedActiveId = loadActiveId();

export const useFloorplanStore = create<FloorplanStore>((set, get) => ({
  plans: savedPlans,
  activeId: savedActiveId && savedPlans.find(p => p.id === savedActiveId)
    ? savedActiveId
    : savedPlans[0]?.id ?? null,

  past: [],
  future: [],

  activePlan: () => {
    const { plans, activeId } = get();
    return plans.find(p => p.id === activeId) ?? null;
  },

  createPlan: (name = 'Untitled Plan') => {
    const id = nanoid();
    const plan: FloorPlan = {
      id,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      elements: [],
    };
    set(state => {
      const plans = [...state.plans, plan];
      persist(plans, id);
      return { plans, activeId: id, past: [], future: [] };
    });
    return id;
  },

  deletePlan: (id) => {
    set(state => {
      const plans = state.plans.filter(p => p.id !== id);
      const activeId = state.activeId === id
        ? (plans[0]?.id ?? null)
        : state.activeId;
      persist(plans, activeId);
      return { plans, activeId, past: [], future: [] };
    });
  },

  renamePlan: (id, name) => {
    set(state => {
      const plans = state.plans.map(p =>
        p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p
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
    set(state => {
      const current = state.plans.find(p => p.id === state.activeId)?.elements ?? [];
      return applyElements(state, [...current, element]);
    });
  },

  updateElement: (id, updates) => {
    set(state => {
      const current = state.plans.find(p => p.id === state.activeId)?.elements ?? [];
      const newElements = current.map(el =>
        el.id === id ? ({ ...el, ...updates } as Element) : el
      );
      return applyElements(state, newElements);
    });
  },

  deleteElement: (id) => {
    set(state => {
      const current = state.plans.find(p => p.id === state.activeId)?.elements ?? [];
      return applyElements(state, current.filter(el => el.id !== id));
    });
  },

  undo: () => {
    set(state => {
      if (state.past.length === 0) return {};
      const previous = state.past[state.past.length - 1];
      const current = state.plans.find(p => p.id === state.activeId)?.elements ?? [];
      const plans = state.plans.map(p =>
        p.id === state.activeId
          ? { ...p, elements: previous, updatedAt: new Date().toISOString() }
          : p
      );
      persist(plans, state.activeId);
      return {
        plans,
        past: state.past.slice(0, -1),
        future: [current, ...state.future.slice(0, MAX_HISTORY - 1)],
      };
    });
  },

  redo: () => {
    set(state => {
      if (state.future.length === 0) return {};
      const next = state.future[0];
      const current = state.plans.find(p => p.id === state.activeId)?.elements ?? [];
      const plans = state.plans.map(p =>
        p.id === state.activeId
          ? { ...p, elements: next, updatedAt: new Date().toISOString() }
          : p
      );
      persist(plans, state.activeId);
      return {
        plans,
        past: [...state.past.slice(-(MAX_HISTORY - 1)), current],
        future: state.future.slice(1),
      };
    });
  },
}));
