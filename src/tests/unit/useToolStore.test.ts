import { describe, it, expect, beforeEach } from 'vitest';
import { useToolStore } from '../../store/useToolStore';

beforeEach(() => {
  // Reset to initial state before each test
  useToolStore.setState({
    activeTool: 'wall',
    chainPoints: [],
    isChainArmed: false,
    selectedId: null,
    selectedIds: new Set(),
    measureStart: null,
    measureEnd: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
});

describe('initial state', () => {
  it('defaults to wall tool', () => {
    expect(useToolStore.getState().activeTool).toBe('wall');
  });

  it('has empty chain', () => {
    expect(useToolStore.getState().chainPoints).toHaveLength(0);
    expect(useToolStore.getState().isChainArmed).toBe(false);
  });

  it('has no selection', () => {
    expect(useToolStore.getState().selectedId).toBeNull();
    expect(useToolStore.getState().selectedIds.size).toBe(0);
  });

  it('defaults zoom to 1 and pan to origin', () => {
    expect(useToolStore.getState().zoom).toBe(1);
    expect(useToolStore.getState().pan).toEqual({ x: 0, y: 0 });
  });
});

describe('setActiveTool', () => {
  it('changes the active tool', () => {
    useToolStore.getState().setActiveTool('select');
    expect(useToolStore.getState().activeTool).toBe('select');

    useToolStore.getState().setActiveTool('box');
    expect(useToolStore.getState().activeTool).toBe('box');
  });

  it('clears chain when switching tools', () => {
    useToolStore.getState().addChainPoint({ x: 1, y: 1 });
    expect(useToolStore.getState().isChainArmed).toBe(true);

    useToolStore.getState().setActiveTool('select');
    expect(useToolStore.getState().chainPoints).toHaveLength(0);
    expect(useToolStore.getState().isChainArmed).toBe(false);
  });

  it('clears selection when switching tools', () => {
    useToolStore.getState().setSelectedId('el-1');
    useToolStore.getState().setActiveTool('box');
    expect(useToolStore.getState().selectedId).toBeNull();
    expect(useToolStore.getState().selectedIds.size).toBe(0);
  });
});

describe('wall chain', () => {
  it('addChainPoint arms the chain', () => {
    useToolStore.getState().addChainPoint({ x: 0, y: 0 });
    expect(useToolStore.getState().isChainArmed).toBe(true);
    expect(useToolStore.getState().chainPoints).toHaveLength(1);
  });

  it('addChainPoint appends multiple points', () => {
    useToolStore.getState().addChainPoint({ x: 0, y: 0 });
    useToolStore.getState().addChainPoint({ x: 5, y: 0 });
    useToolStore.getState().addChainPoint({ x: 5, y: 4 });
    expect(useToolStore.getState().chainPoints).toHaveLength(3);
    expect(useToolStore.getState().chainPoints[2]).toEqual({ x: 5, y: 4 });
  });

  it('endChain clears points and disarms', () => {
    useToolStore.getState().addChainPoint({ x: 0, y: 0 });
    useToolStore.getState().addChainPoint({ x: 5, y: 0 });
    useToolStore.getState().endChain();
    expect(useToolStore.getState().chainPoints).toHaveLength(0);
    expect(useToolStore.getState().isChainArmed).toBe(false);
  });

  it('endChain on empty chain is a no-op', () => {
    useToolStore.getState().endChain();
    expect(useToolStore.getState().isChainArmed).toBe(false);
    expect(useToolStore.getState().chainPoints).toHaveLength(0);
  });
});

describe('selection', () => {
  it('setSelectedId selects a single element', () => {
    useToolStore.getState().setSelectedId('el-1');
    expect(useToolStore.getState().selectedId).toBe('el-1');
    expect(useToolStore.getState().selectedIds).toContain('el-1');
    expect(useToolStore.getState().selectedIds.size).toBe(1);
  });

  it('setSelectedId with null clears selection', () => {
    useToolStore.getState().setSelectedId('el-1');
    useToolStore.getState().setSelectedId(null);
    expect(useToolStore.getState().selectedId).toBeNull();
    expect(useToolStore.getState().selectedIds.size).toBe(0);
  });

  it('toggleSelectedId adds to an existing selection', () => {
    useToolStore.getState().setSelectedId('el-1');
    useToolStore.getState().toggleSelectedId('el-2');
    expect(useToolStore.getState().selectedIds).toEqual(new Set(['el-1', 'el-2']));
    expect(useToolStore.getState().selectedId).toBeNull();
  });

  it('toggleSelectedId removes an already-selected element', () => {
    useToolStore.getState().setSelectedIds(new Set(['el-1', 'el-2']));
    useToolStore.getState().toggleSelectedId('el-2');
    expect(useToolStore.getState().selectedIds).toEqual(new Set(['el-1']));
    expect(useToolStore.getState().selectedId).toBe('el-1');
  });

  it('setSelectedIds updates multi-selection', () => {
    const ids = new Set(['el-1', 'el-2', 'el-3']);
    useToolStore.getState().setSelectedIds(ids);
    expect(useToolStore.getState().selectedIds.size).toBe(3);
    expect(useToolStore.getState().selectedId).toBeNull(); // >1 so no single selectedId
  });

  it('setSelectedIds with one item also sets selectedId', () => {
    useToolStore.getState().setSelectedIds(new Set(['el-1']));
    expect(useToolStore.getState().selectedId).toBe('el-1');
  });

  it('clearSelection empties both selectedId and selectedIds', () => {
    useToolStore.getState().setSelectedIds(new Set(['el-1', 'el-2']));
    useToolStore.getState().clearSelection();
    expect(useToolStore.getState().selectedId).toBeNull();
    expect(useToolStore.getState().selectedIds.size).toBe(0);
  });
});

describe('zoom and pan', () => {
  it('setZoom updates the zoom level', () => {
    useToolStore.getState().setZoom(2.5);
    expect(useToolStore.getState().zoom).toBe(2.5);
  });

  it('setPan updates the pan offset', () => {
    useToolStore.getState().setPan({ x: 100, y: -50 });
    expect(useToolStore.getState().pan).toEqual({ x: 100, y: -50 });
  });
});

describe('measure tool state', () => {
  it('startMeasurement sets the first point and clears any finished measurement', () => {
    useToolStore.getState().completeMeasurement({ x: 4, y: 4 });
    useToolStore.getState().startMeasurement({ x: 1, y: 2 });
    expect(useToolStore.getState().measureStart).toEqual({ x: 1, y: 2 });
    expect(useToolStore.getState().measureEnd).toBeNull();
  });

  it('completeMeasurement finalizes the second point', () => {
    useToolStore.getState().startMeasurement({ x: 1, y: 2 });
    useToolStore.getState().completeMeasurement({ x: 5, y: 6 });
    expect(useToolStore.getState().measureStart).toEqual({ x: 1, y: 2 });
    expect(useToolStore.getState().measureEnd).toEqual({ x: 5, y: 6 });
  });

  it('clearMeasurement clears both points', () => {
    useToolStore.getState().startMeasurement({ x: 1, y: 2 });
    useToolStore.getState().completeMeasurement({ x: 5, y: 6 });
    useToolStore.getState().clearMeasurement();
    expect(useToolStore.getState().measureStart).toBeNull();
    expect(useToolStore.getState().measureEnd).toBeNull();
  });

  it('switching tools clears a finished measurement', () => {
    useToolStore.getState().startMeasurement({ x: 1, y: 2 });
    useToolStore.getState().completeMeasurement({ x: 5, y: 6 });
    useToolStore.getState().setActiveTool('select');
    expect(useToolStore.getState().measureStart).toBeNull();
    expect(useToolStore.getState().measureEnd).toBeNull();
  });
});
