# SnapDraft — Agent Guide

Floor plan sketching tool for web and iPad. Client-side only, no backend.

## Stack

| Concern | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Rendering | Konva.js via `react-konva` |
| State | Zustand |
| Persistence | `localStorage` (JSON) |
| Build | Vite |
| Unit tests | Vitest + React Testing Library |
| E2E tests | Playwright (chromium + iPad) |
| CI/CD | GitHub Actions + Netlify |

## Commands

```bash
npm run dev          # dev server
npm run build        # type-check + production build
npm run type-check   # tsc --noEmit only
npm run test         # vitest unit tests (run once)
npm run test:watch   # vitest watch mode
npm run test:e2e     # playwright (requires built app on :4173)
npm run lint         # eslint
```

E2E tests require a running preview server. The playwright config starts one automatically via `webServer`.

## Architecture

### Coordinate system

All data is stored in **world coordinates (feet)**. Never store pixel values in state or on disk.

```
World (ft)  →  Base px  →  Screen px
  x, y         x * 40       Konva stage transform
```

- `PIXELS_PER_FOOT = 40` is the base scale (zoom = 1)
- The Konva `<Stage>` has `x={pan.x} y={pan.y} scaleX={zoom} scaleY={zoom}`
- Elements draw at `ftToPx(worldCoord)` — the stage transform handles zoom/pan visually
- To convert screen → world: `stage.getRelativePointerPosition()` then `pxToFt(pos.x)`
- Never use `stage.getPointerPosition()` for world coordinate math — it ignores the stage transform

### Key files

```
src/
  types/index.ts              Wall, Box, Element, FloorPlan types
  utils/geometry.ts           ftToPx, pxToFt, snap, parseFtIn, formatFeet
  utils/storage.ts            localStorage read/write (no side effects)
  store/
    useFloorplanStore.ts      Plans + elements; persists to localStorage on every mutation
    useToolStore.ts           Active tool, chain state, zoom, pan, selection
  hooks/useSnap.ts            Grid snapping + endpoint snapping
  components/
    Canvas/
      DrawingCanvas.tsx       Main Konva stage; all pointer/wheel event handling
      Grid.tsx                Adaptive grid (5ft/1ft/0.5ft based on zoom)
      WallElement.tsx         Renders a wall chain
      BoxElement.tsx          Renders a draggable box
      TopBar.tsx              Plan name + Plans button
      ScaleBar.tsx            Bottom-right scale indicator
      MultiSelectBar.tsx      Floating bar when 2+ items selected
    Toolbar/                  3-tool selector (wall default) + help button
    PropertiesPanel/          Single-select dimension editing
      FtInInput.tsx           Ft/in aware input component
    FloorplanManager/         List, create, rename, delete plans
    HelpOverlay/              Cheat sheet, shown on first visit
```

### Data model

```typescript
type Wall = {
  id: string;
  type: 'wall';
  points: Point[];   // array of {x, y} in feet; consecutive pairs = segments
};

type Box = {
  id: string;
  type: 'box';
  x: number; y: number;     // top-left in feet
  width: number; height: number; // in feet
  rotation: number;          // degrees
  label?: string;
};
```

### Drawing tools

| Tool | Default | Interaction |
|---|---|---|
| Wall | **Yes** | Drag or click to draw segments; chain auto-continues from last endpoint; double-tap or Escape to end |
| Box | No | Drag to create; both corners snap to grid |
| Select | No | Tap to select; drag marquee to multi-select; drag selected box to move |

Wall chain state lives in `useToolStore` (`chainPoints`, `isChainArmed`). Switching tools clears the chain and selection.

### Snap behavior

Priority order (highest first):

1. **Endpoint** — snaps to an existing wall endpoint within `SNAP_RADIUS_FT`
2. **Wall centerline** — nearest point on any wall segment
3. **Axis** — locks H or V from the active chain origin (only during wall drawing)
4. **Grid** — nearest whole foot (or 0.5 ft when Shift is held)

Snap is applied in `useSnap.ts`; raw world coords come from `getRelativePointerPosition()`.

### Zoom / pan

- **Pinch or Ctrl+scroll**: zoom toward cursor, clamped to `[0.25, 6]`
- **Two-finger scroll (no Ctrl)**: pan — `wheel` event `deltaX`/`deltaY` applied directly to pan
- Both handled in `handleWheel` via `e.evt.ctrlKey` to distinguish pinch from scroll
- Grid adapts: 5ft grid below zoom 0.4, 1ft grid normal, 0.5ft grid above zoom 3
- UI chrome stroke widths (handles, indicators, grid lines) are divided by `zoom` so they appear constant on screen; wall strokes are NOT divided (they have real-world thickness)

### Ft/in input

`parseFtIn(str)` in `geometry.ts` accepts: `5'6"`, `5' 6"`, `5'6`, `5'`, `6"`, `5 6`, `5.5`.
`formatFeet(ft)` formats as `5' 6"`. Always use these for dimension display and input parsing.
`FtInInput` component wraps both — use it for all dimension inputs.

### Persistence

`useFloorplanStore` calls `saveFloorPlans` + `saveActiveId` on every mutation. No debounce — mutations are infrequent enough. `loadFloorPlans` is called once at store init. Storage functions never throw; corrupt data returns an empty array.

## Conventions

- **No pixel values in state or types.** All stored coordinates are in feet.
- **No hardcoded `PIXELS_PER_FOOT` in components.** Import from `geometry.ts`. Elements draw at base scale; the stage transform handles zoom.
- **Touch targets ≥ 44pt** on all interactive elements (min-height/min-width in CSS).
- **`getRelativePointerPosition()`** for world coords, never `getPointerPosition()`.
- Stroke widths inside the stage must be divided by `zoom` so they appear constant.
- Zustand actions that mutate plans must call `persist()` before returning.
- CSS modules for all component styles. No global styles except `index.css` resets.

## Testing

Unit tests live in `src/tests/unit/`. E2E tests in `e2e/`.

**Tests are required for every code change.** When you fix a bug or add a feature, add or update tests in the same session — never defer to later. If a test would have caught the bug being fixed, write it. If a new user-visible behaviour was added, cover it.

### What to test and where

| Change type | Where to test |
|---|---|
| New geometry utility or snap function | `geometry.test.ts` or `useSnap.test.ts` (unit) |
| Store action / state mutation | `useFloorplanStore.test.ts` or `useToolStore.test.ts` (unit) |
| Bug fix in drawing logic (pointer events, chain, cancel) | E2E test in `e2e/` |
| New UI interaction (button, keyboard shortcut, drag) | E2E test in `e2e/` |
| Regression that's hard to E2E (edge-case math, snap priority) | Unit test |

### Unit test rules

- When adding a new geometry or snap utility, export it and add unit tests immediately.
- Cover the happy path, edge cases (empty input, zero-length, out-of-range), and any priority/ordering logic (e.g. endpoint snap beats wall-edge snap beats segment snap).
- Before writing a test, check if `data-testid` attributes exist on the target element. Add them if missing — don't select by text or class.

### E2E test rules

- E2E `beforeEach` clears localStorage and reloads the page, then dismisses the help overlay with Escape. If a test relies on the help overlay itself, handle it explicitly.
- Cover user scenarios end-to-end: draw a wall, cancel mid-draw, place furniture against a wall, undo, rename a plan, etc.
- When fixing a user-reported bug (e.g. "pressing Escape creates a dot", "Escape requires two presses"), add an E2E test that would have caught it.

### Regression targets

These areas have had bugs and must not regress — keep them covered:

- **Wall chain cancel**: single Escape clears the chain with no element created, even when the dim input is focused.
- **First click arms chain only**: clicking once in wall mode sets the start point but creates no wall element.
- **Snap priority**: endpoint → wall centerline → axis → grid.
- **Wall thickness rendering**: `strokeWidth` must NOT be divided by `zoom` for walls (only for UI chrome like handles and indicators).
- **Coordinate system**: all stored values are in feet; no pixel values in state or on disk.
- **Undo/redo**: mutations push to `past`; undo restores previous state; redo replays.

## What to avoid

- Don't add a backend. All persistence is `localStorage`.
- Don't use `stage.getPointerPosition()` for drawing math — it ignores the stage transform.
- Don't store derived view state (zoom, pan, cursor) in the floorplan store. It belongs in `useToolStore`.
- Don't add features outside MLP scope without user confirmation: preset furniture shapes, metric units, export, undo/redo, multi-floor, 3D view.
- Don't add error boundaries, loading spinners, or retry logic for localStorage — it never throws by design.
- Don't debounce persistence — it adds complexity with no meaningful benefit at this data size.
