# SnapDraft — Agent Guide

SnapDraft is a client-side floor plan sketching tool for web and iPad. There is no backend; plans live in `localStorage`.

Use this file as the source of truth for agent work in this repo. Keep it factual, implementation-oriented, and aligned with the current codebase.

## Working Rules

- Start by checking the actual code before changing behavior. This guide is a shortcut, not a substitute for reading the implementation.
- Keep all persisted model data in world coordinates (feet). Never store pixel values in state, types, or `localStorage`.
- Prefer small, targeted changes. Avoid broad refactors unless the task requires them.
- Do not overwrite unrelated user changes in a dirty worktree.
- Every code change must include tests in the same session. Update existing tests when behavior changes.
- Before adding new selectors in tests, look for an existing `data-testid`. If one is missing, add one instead of relying on text or CSS classes.

## Stack

| Concern | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Rendering | Konva.js via `react-konva` |
| State | Zustand |
| Persistence | `localStorage` JSON |
| Unit tests | Vitest + React Testing Library |
| E2E tests | Playwright (`chromium`, `iPad`) |
| Linting | ESLint |
| Formatting | Prettier |

## Commands

```bash
npm run dev           # Vite dev server
npm run build         # TypeScript project build + production bundle
npm run build:preview # Production bundle only
npm run preview       # Preview built app
npm run type-check    # tsc --noEmit
npm run lint          # ESLint
npm run test          # Vitest once
npm run test:watch    # Vitest watch mode
npm run test:ui       # Vitest UI
npm run test:e2e      # Playwright; starts preview server via webServer
npm run format        # Prettier write for src TS/TSX
npm run format:check  # Prettier check
npm run spell:check   # cspell for src TS/TSX
```

`playwright.config.ts` starts the preview server automatically with `npm run build:preview && npm run preview`, using `http://localhost:4173`.

## Project Shape

```text
src/
  App.tsx                              App shell; creates default plan on first load
  types/index.ts                       Point, Wall, Box, Element, ToolType, FloorPlan
  utils/geometry.ts                    Coordinate conversion, snapping, dimensions, nudging
  utils/storage.ts                     localStorage read/write helpers
  store/
    useFloorplanStore.ts               Plans, elements, persistence, undo/redo history
    useToolStore.ts                    Active tool, chain state, selection, measure, zoom, pan
  hooks/
    useSnap.ts                         Endpoint/segment/axis/grid snapping
    useFocusTrap.ts                    Overlay/dialog focus handling
  components/
    Canvas/
      DrawingCanvas.tsx                Main stage, pointer/keyboard/wheel handling
      Grid.tsx                         Adaptive grid
      WallElement.tsx                  Wall rendering and editing affordances
      BoxElement.tsx                   Box rendering and dragging
      MeasureOverlay.tsx               Measurement overlay for measure tool
      MultiSelectBar.tsx               Actions for multi-selection
      ScaleBar.tsx                     Scale indicator
      TopBar.tsx                       Plan name and plan manager entry point
      layout.ts                        Overlay/mobile layout constants
    Toolbar/                           Tool switcher, undo/redo, help
    PropertiesPanel/                   Single-selection editing
    FloorplanManager/                  Create, rename, delete, switch plans
    HelpOverlay/                       Help modal shown on first visit
src/tests/unit/                        Unit tests
e2e/                                   Playwright scenarios
```

## Data Model

```ts
type Point = { x: number; y: number }; // feet

type Wall = {
  id: string;
  type: 'wall';
  points: Point[]; // connected chain in feet
};

type Box = {
  id: string;
  type: 'box';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  label?: string;
};

type ToolType = 'select' | 'wall' | 'box' | 'measure';
```

`FloorPlan` stores `id`, `name`, timestamps, and `elements`.

## Core Invariants

### Coordinates and transforms

- World data is stored in feet.
- `PIXELS_PER_FOOT = 40` is the base render scale at zoom `1`.
- The Konva stage applies visual pan/zoom with `x`, `y`, `scaleX`, and `scaleY`.
- Draw elements using base coordinates via `ftToPx(...)`; let the stage transform handle zoom and pan.
- For screen-to-world math, use `stage.getRelativePointerPosition()` and convert with `pxToFt(...)`.
- Never use `stage.getPointerPosition()` for world-space drawing logic.

### Snapping

Snap priority is:

1. Existing wall endpoint
2. Nearest point on wall centerline
3. Axis lock from the active wall chain origin
4. Grid

This logic lives in `src/hooks/useSnap.ts`. Preserve that ordering unless the task explicitly changes snapping behavior and tests are updated with it.

### Stage rendering

- UI chrome inside the stage should keep a constant screen size, so divide those stroke widths by `zoom`.
- Wall strokes are different: do not divide wall stroke width by `zoom`.

### Store boundaries

- `useFloorplanStore` owns plans, elements, persistence, and undo/redo history.
- `useToolStore` owns ephemeral UI state: active tool, chain points, selection, measurement state, zoom, and pan.
- Do not move view-only state into the floorplan store.

### Persistence

- Storage helpers are in `src/utils/storage.ts`.
- Floor plans persist on mutating store actions.
- Undo/redo history is session-only and not persisted.
- Corrupt or missing storage data should degrade safely to empty/default state.

## Current Tooling and Behaviors

### Tools

| Tool | Behavior |
|---|---|
| `wall` | Default on a fresh empty session; click or drag to draw chained wall segments |
| `box` | Drag to create a snapped box |
| `select` | Select, marquee-select, drag, edit, and delete elements |
| `measure` | Place temporary measurement points without mutating the plan |

### App behaviors worth preserving

- On first load with no saved plans, `App.tsx` creates a default plan.
- If the active plan already has content on mount, the canvas fits content and switches to select mode.
- `Escape` cancels transient UI state: wall chain, selection, measurement state, and inline dimension entry.
- Undo/redo is available from the toolbar and keyboard shortcuts.
- Arrow keys nudge selected elements in world units, with a finer increment when `Shift` is held.

## Testing Requirements

Tests are mandatory for every code change.

### Where to add tests

| Change type | Test location |
|---|---|
| Geometry, parsing, conversion, snapping helpers | `src/tests/unit/geometry.test.ts` or `src/tests/unit/useSnap.test.ts` |
| Store mutations, persistence, undo/redo | `src/tests/unit/useFloorplanStore.test.ts` or `src/tests/unit/useToolStore.test.ts` |
| Drawing interactions, keyboard handling, cancel flows, selection, mobile UI behavior | `e2e/floorplan.spec.ts` or a new `e2e/*.spec.ts` |

### Unit test expectations

- Cover the happy path and edge cases.
- When changing snap behavior, test both priority and near-threshold cases.
- When changing parsing or formatting, test representative user inputs, invalid inputs, and boundary rounding behavior.
- When changing store actions, verify both state mutation and history/persistence behavior where relevant.

### E2E expectations

- Follow the existing setup pattern: clear `localStorage`, reload, and dismiss the help overlay unless the test is about the overlay.
- Cover user-visible workflows end to end instead of only asserting implementation details.
- Prefer stable `data-testid` selectors.

### Regression targets

Keep these covered:

- A single first click in wall mode arms the chain but does not create a wall.
- `Escape` cancels wall drawing cleanly without leaving a stray element, even when the dimension input is focused.
- Snap priority remains endpoint -> segment -> axis -> grid.
- Stored plan data remains in feet, not pixels.
- Wall stroke width is not divided by zoom.
- Undo pushes prior element state to `past`, and redo restores from `future`.

## Change Workflow

1. Inspect the relevant components, store, and tests before editing.
2. Make the smallest change that satisfies the task.
3. Add or update tests in the same session.
4. Run the narrowest useful verification first, then broader checks if the change crosses boundaries.

Typical verification choices:

- Geometry/store-only change: `npm run test -- src/tests/unit/...`
- UI interaction change: `npm run test:e2e -- e2e/...`
- Cross-cutting change: `npm run test`, then `npm run build`

## Avoid

- Do not add a backend or remote persistence.
- Do not store pixels in persisted data or Zustand model state.
- Do not hardcode `PIXELS_PER_FOOT` inside components; import shared geometry constants.
- Do not use `stage.getPointerPosition()` for drawing math.
- Do not debounce persistence without a concrete performance problem and explicit need.
- Do not introduce global CSS for component styling; prefer CSS modules, with `index.css` reserved for app-wide resets/base styles.
- Do not change feature scope casually. Large features such as export, metric units, multi-floor support, or 3D views need explicit user direction.
