import { create } from 'zustand';
import type { ToolType, Point } from '../types';

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
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  clearSelection: () => void;

  // View — zoom is a multiplier (1 = default, 2 = 2x zoom in)
  zoom: number;
  setZoom: (zoom: number) => void;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
};

export const useToolStore = create<ToolStore>((set) => ({
  activeTool: 'wall', // Default to wall tool on new session
  setActiveTool: (activeTool) => set({
    activeTool,
    selectedId: null,
    selectedIds: new Set(),
    chainPoints: [],
    isChainArmed: false,
  }),

  chainPoints: [],
  isChainArmed: false,
  addChainPoint: (point) =>
    set(state => ({
      chainPoints: [...state.chainPoints, point],
      isChainArmed: true,
    })),
  endChain: () => set({ chainPoints: [], isChainArmed: false }),

  selectedId: null,
  setSelectedId: (selectedId) => set({
    selectedId,
    selectedIds: selectedId ? new Set([selectedId]) : new Set(),
  }),

  selectedIds: new Set(),
  setSelectedIds: (selectedIds) => set({
    selectedIds,
    selectedId: selectedIds.size === 1 ? [...selectedIds][0] : null,
  }),

  clearSelection: () => set({ selectedId: null, selectedIds: new Set() }),

  zoom: 1,
  setZoom: (zoom) => set({ zoom }),
  pan: { x: 0, y: 0 },
  setPan: (pan) => set({ pan }),
}));
