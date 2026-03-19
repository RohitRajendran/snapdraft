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

  // Selected element
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  // View
  scale: number; // pixels per foot
  setScale: (scale: number) => void;
  offset: { x: number; y: number };
  setOffset: (offset: { x: number; y: number }) => void;

  // First-use hints
  shownHints: Set<ToolType>;
  markHintShown: (tool: ToolType) => void;
};

export const useToolStore = create<ToolStore>((set) => ({
  activeTool: 'select',
  setActiveTool: (activeTool) => set({ activeTool, selectedId: null }),

  chainPoints: [],
  isChainArmed: false,
  addChainPoint: (point) =>
    set(state => ({
      chainPoints: [...state.chainPoints, point],
      isChainArmed: true,
    })),
  endChain: () => set({ chainPoints: [], isChainArmed: false }),

  selectedId: null,
  setSelectedId: (selectedId) => set({ selectedId }),

  scale: 40,
  setScale: (scale) => set({ scale }),
  offset: { x: 0, y: 0 },
  setOffset: (offset) => set({ offset }),

  shownHints: new Set(),
  markHintShown: (tool) =>
    set(state => ({ shownHints: new Set([...state.shownHints, tool]) })),
}));
