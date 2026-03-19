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
  thickness: number; // default 0.5 ft (6 inches)
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

- Default: snap to nearest whole foot
- Shift held: snap to 0.5 ft (6 inches)
- Endpoint snap: if cursor is within `SNAP_RADIUS_FT` of an existing wall endpoint, snaps to it
- Snap is applied in `useSnap.ts`; raw world coords come from `getRelativePointerPosition()`

### Zoom / pan

- Scroll wheel or pinch: zoom toward cursor, clamped to `[0.25, 6]`
- Two-finger drag: pan (handled by touch events on the stage)
- Grid adapts: 5ft grid below zoom 0.4, 1ft grid normal, 0.5ft grid above zoom 3
- Stroke widths and dash sizes are divided by `zoom` so they appear constant on screen

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

Before writing a test, check if `data-testid` attributes exist on the target element. Add them if missing — don't select by text or class.

E2E `beforeEach` clears localStorage and reloads the page, then dismisses the help overlay with Escape. If a test relies on the help overlay itself, handle it explicitly.

When adding a new geometry utility, add corresponding unit tests in `geometry.test.ts`.

## What to avoid

- Don't add a backend. All persistence is `localStorage`.
- Don't use `stage.getPointerPosition()` for drawing math — it ignores the stage transform.
- Don't store derived view state (zoom, pan, cursor) in the floorplan store. It belongs in `useToolStore`.
- Don't add features outside MLP scope without user confirmation: preset furniture shapes, metric units, export, undo/redo, multi-floor, 3D view.
- Don't add error boundaries, loading spinners, or retry logic for localStorage — it never throws by design.
- Don't debounce persistence — it adds complexity with no meaningful benefit at this data size.
