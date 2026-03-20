import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  FLOORPLAN_VERSION,
  loadFloorPlans,
  saveFloorPlans,
  loadActiveId,
  saveActiveId,
  exportFloorPlan,
  parseImportedPlan,
  encodePlanToUrl,
  decodePlanFromUrl,
} from './storage';
import type { FloorPlan } from '../../types';

const mockPlan: FloorPlan = {
  id: 'test-1',
  version: FLOORPLAN_VERSION,
  name: 'Test Plan',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  elements: [],
};

beforeEach(() => {
  localStorage.clear();
});

describe('loadFloorPlans', () => {
  it('returns empty array when nothing stored', () => {
    expect(loadFloorPlans()).toEqual([]);
  });

  it('returns stored plans', () => {
    localStorage.setItem('snapdraft_floorplans', JSON.stringify([mockPlan]));
    expect(loadFloorPlans()).toEqual([mockPlan]);
  });

  it('upgrades legacy plans without a per-plan version', () => {
    const legacyPlan = {
      id: mockPlan.id,
      name: mockPlan.name,
      createdAt: mockPlan.createdAt,
      updatedAt: mockPlan.updatedAt,
      elements: mockPlan.elements,
    };
    localStorage.setItem('snapdraft_floorplans', JSON.stringify([legacyPlan]));

    expect(loadFloorPlans()).toEqual([mockPlan]);
    expect(JSON.parse(localStorage.getItem('snapdraft_floorplans')!)).toEqual([mockPlan]);
  });

  it('returns empty array on corrupt data', () => {
    localStorage.setItem('snapdraft_floorplans', 'not-json{{{');
    expect(loadFloorPlans()).toEqual([]);
  });

  it('ignores plans with unsupported versions', () => {
    localStorage.setItem(
      'snapdraft_floorplans',
      JSON.stringify([{ ...mockPlan, version: FLOORPLAN_VERSION + 1 }]),
    );

    expect(loadFloorPlans()).toEqual([]);
  });
});

describe('saveFloorPlans', () => {
  it('persists plans to localStorage', () => {
    saveFloorPlans([mockPlan]);
    const stored = JSON.parse(localStorage.getItem('snapdraft_floorplans')!);
    expect(stored).toEqual([mockPlan]);
  });
});

describe('loadActiveId / saveActiveId', () => {
  it('returns null when nothing stored', () => {
    expect(loadActiveId()).toBeNull();
  });

  it('round-trips the active id', () => {
    saveActiveId('abc-123');
    expect(loadActiveId()).toBe('abc-123');
  });
});

describe('exportFloorPlan', () => {
  it('triggers a download with the correct filename and blob URL', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    let capturedAnchor: HTMLAnchorElement | null = null;
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) capturedAnchor = node;
      return node;
    });
    const removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation((node) => node);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    exportFloorPlan(mockPlan);

    expect(createObjectURL).toHaveBeenCalled();
    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor!.download).toBe('Test Plan.snapdraft.json');
    expect(capturedAnchor!.href).toContain('blob:');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('sanitizes filename — strips special chars', () => {
    const plan = { ...mockPlan, name: '!@#My Plan!@#' };
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    global.URL.revokeObjectURL = vi.fn();

    let capturedAnchor: HTMLAnchorElement | null = null;
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) capturedAnchor = node;
      return node;
    });
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    exportFloorPlan(plan);

    expect(capturedAnchor!.download).toBe('My Plan.snapdraft.json');

    vi.restoreAllMocks();
  });

  it('falls back to "floorplan" when name is all special chars', () => {
    const plan = { ...mockPlan, name: '!!!###' };
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    global.URL.revokeObjectURL = vi.fn();

    let capturedAnchor: HTMLAnchorElement | null = null;
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) capturedAnchor = node;
      return node;
    });
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    exportFloorPlan(plan);

    expect(capturedAnchor!.download).toBe('floorplan.snapdraft.json');

    vi.restoreAllMocks();
  });
});

describe('parseImportedPlan', () => {
  it('returns a valid plan unchanged (version 1)', () => {
    const result = parseImportedPlan(mockPlan);
    expect(result).toEqual(mockPlan);
  });

  it('upgrades legacy plan (no version field) to current version', () => {
    const legacy = { ...mockPlan };
    delete (legacy as Partial<FloorPlan>).version;
    const result = parseImportedPlan(legacy);
    expect(result).not.toBeNull();
    expect(result!.version).toBe(FLOORPLAN_VERSION);
  });

  it('returns null for future (unsupported) version', () => {
    const futurePlan = { ...mockPlan, version: FLOORPLAN_VERSION + 1 };
    expect(parseImportedPlan(futurePlan)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(parseImportedPlan(null)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(parseImportedPlan('string')).toBeNull();
    expect(parseImportedPlan(42)).toBeNull();
    expect(parseImportedPlan([])).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(parseImportedPlan({ id: 'x', name: 'x', createdAt: 'x', updatedAt: 'x' })).toBeNull();
    expect(
      parseImportedPlan({ id: 'x', name: 'x', createdAt: 'x', updatedAt: 'x', elements: 'bad' }),
    ).toBeNull();
  });

  it('returns null for invalid wall points', () => {
    const plan = {
      ...mockPlan,
      elements: [{ id: 'w1', type: 'wall', points: [{ x: 'not-a-number', y: 0 }] }],
    };
    expect(parseImportedPlan(plan)).toBeNull();
  });

  it('returns null for missing wall points array', () => {
    const plan = { ...mockPlan, elements: [{ id: 'w1', type: 'wall', points: 'bad' }] };
    expect(parseImportedPlan(plan)).toBeNull();
  });

  it('returns valid plan with a well-formed wall element', () => {
    const plan = {
      ...mockPlan,
      elements: [
        {
          id: 'w1',
          type: 'wall',
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
          ],
        },
      ],
    };
    const result = parseImportedPlan(plan);
    expect(result).not.toBeNull();
    expect(result!.elements).toHaveLength(1);
  });

  it('returns null for invalid box fields', () => {
    const plan = {
      ...mockPlan,
      elements: [{ id: 'b1', type: 'box', x: NaN, y: 0, width: 4, height: 3, rotation: 0 }],
    };
    expect(parseImportedPlan(plan)).toBeNull();
  });

  it('returns null when box label is not a string', () => {
    const plan = {
      ...mockPlan,
      elements: [
        { id: 'b1', type: 'box', x: 0, y: 0, width: 4, height: 3, rotation: 0, label: 42 },
      ],
    };
    expect(parseImportedPlan(plan)).toBeNull();
  });

  it('accepts box with valid optional label', () => {
    const plan = {
      ...mockPlan,
      elements: [
        { id: 'b1', type: 'box', x: 0, y: 0, width: 4, height: 3, rotation: 0, label: 'Room' },
      ],
    };
    expect(parseImportedPlan(plan)).not.toBeNull();
  });

  it('returns null for unknown element type', () => {
    const plan = { ...mockPlan, elements: [{ id: 'x1', type: 'circle' }] };
    expect(parseImportedPlan(plan)).toBeNull();
  });
});

describe('encodePlanToUrl / decodePlanFromUrl', () => {
  it('roundtrip preserves plan data', () => {
    const url = encodePlanToUrl(mockPlan);
    expect(url).toContain('?plan=');
    const decoded = decodePlanFromUrl(url);
    expect(decoded).toEqual(mockPlan);
  });

  it('encodes a plan with elements correctly', () => {
    const planWithElements: FloorPlan = {
      ...mockPlan,
      elements: [
        {
          id: 'w1',
          type: 'wall',
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
          ],
        },
        { id: 'b1', type: 'box', x: 1, y: 1, width: 3, height: 2, rotation: 0 },
      ],
    };
    const url = encodePlanToUrl(planWithElements);
    const decoded = decodePlanFromUrl(url);
    expect(decoded).toEqual(planWithElements);
  });

  it('returns null for invalid compressed string', () => {
    const result = decodePlanFromUrl('http://localhost/?plan=INVALID!!!GARBAGE');
    expect(result).toBeNull();
  });

  it('returns null when plan param is missing', () => {
    expect(decodePlanFromUrl('http://localhost/')).toBeNull();
  });

  it('returns null for malformed URL', () => {
    expect(decodePlanFromUrl('not-a-url')).toBeNull();
  });
});
