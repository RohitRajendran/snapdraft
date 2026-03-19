import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { FloorPlan, Element } from '../types';
import {
  loadFloorPlans,
  saveFloorPlans,
  loadActiveId,
  saveActiveId,
} from '../utils/storage';

type FloorplanStore = {
  plans: FloorPlan[];
  activeId: string | null;

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
};

function persist(plans: FloorPlan[], activeId: string | null) {
  saveFloorPlans(plans);
  if (activeId) saveActiveId(activeId);
}

const savedPlans = loadFloorPlans();
const savedActiveId = loadActiveId();

export const useFloorplanStore = create<FloorplanStore>((set, get) => ({
  plans: savedPlans,
  activeId: savedActiveId && savedPlans.find(p => p.id === savedActiveId)
    ? savedActiveId
    : savedPlans[0]?.id ?? null,

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
      return { plans, activeId: id };
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
      return { plans, activeId };
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
    set({ activeId: id });
  },

  addElement: (element) => {
    set(state => {
      const plans = state.plans.map(p =>
        p.id === state.activeId
          ? { ...p, elements: [...p.elements, element], updatedAt: new Date().toISOString() }
          : p
      );
      persist(plans, state.activeId);
      return { plans };
    });
  },

  updateElement: (id, updates) => {
    set(state => {
      const plans = state.plans.map(p =>
        p.id === state.activeId
          ? {
              ...p,
              updatedAt: new Date().toISOString(),
              elements: p.elements.map(el =>
                el.id === id ? ({ ...el, ...updates } as Element) : el
              ),
            }
          : p
      );
      persist(plans, state.activeId);
      return { plans };
    });
  },

  deleteElement: (id) => {
    set(state => {
      const plans = state.plans.map(p =>
        p.id === state.activeId
          ? {
              ...p,
              updatedAt: new Date().toISOString(),
              elements: p.elements.filter(el => el.id !== id),
            }
          : p
      );
      persist(plans, state.activeId);
      return { plans };
    });
  },
}));
