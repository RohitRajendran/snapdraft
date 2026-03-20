import { create } from 'zustand';
import type { ToolType, Point } from '../../types';

type ToolStore = {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // Wall chain state
  chainPoints: Point[];
  isChainArmed: boolean;
  addChainPoint: (point: Point) => void;
  endChain: () => void;

  // Single + multi-select
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  toggleSelectedId: (id: string) => void;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  clearSelection: () => void;

  // Measure tool state
  measureStart: Point | null;
  measureEnd: Point | null;
  setMeasureStart: (pt: Point | null) => void;
  setMeasureEnd: (pt: Point | null) => void;
  startMeasurement: (pt: Point) => void;
  completeMeasurement: (pt: Point) => void;
  clearMeasurement: () => void;

  // View — zoom is a multiplier (1 = default, 2 = 2x zoom in)
  zoom: number;
  setZoom: (zoom: number) => void;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
};

export const useToolStore = create<ToolStore>((set) => ({
  activeTool: 'wall', // Default to wall tool on new session
  setActiveTool: (activeTool) =>
    set({
      activeTool,
      selectedId: null,
      selectedIds: new Set(),
      chainPoints: [],
      isChainArmed: false,
      measureStart: null,
      measureEnd: null,
    }),

  chainPoints: [],
  isChainArmed: false,
  addChainPoint: (point) =>
    set((state) => ({
      chainPoints: [...state.chainPoints, point],
      isChainArmed: true,
    })),
  endChain: () => set({ chainPoints: [], isChainArmed: false }),

  selectedId: null,
  setSelectedId: (selectedId) =>
    set({
      selectedId,
      selectedIds: selectedId ? new Set([selectedId]) : new Set(),
    }),
  toggleSelectedId: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return {
        selectedIds: next,
        selectedId: next.size === 1 ? [...next][0] : null,
      };
    }),

  selectedIds: new Set(),
  setSelectedIds: (selectedIds) =>
    set({
      selectedIds,
      selectedId: selectedIds.size === 1 ? [...selectedIds][0] : null,
    }),

  clearSelection: () => set({ selectedId: null, selectedIds: new Set() }),

  measureStart: null,
  measureEnd: null,
  setMeasureStart: (measureStart) => set({ measureStart }),
  setMeasureEnd: (measureEnd) => set({ measureEnd }),
  startMeasurement: (measureStart) => set({ measureStart, measureEnd: null }),
  completeMeasurement: (measureEnd) => set({ measureEnd }),
  clearMeasurement: () => set({ measureStart: null, measureEnd: null }),

  zoom: 1,
  setZoom: (zoom) => set({ zoom }),
  pan: { x: 0, y: 0 },
  setPan: (pan) => set({ pan }),
}));
