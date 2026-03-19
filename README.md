# SnapDraft

A minimal floor plan sketching tool for web and iPad. Draw rooms, place furniture, and explore layouts — all to scale, all in the browser. No account, no backend, no sync.

## Features

- **Graph paper canvas** — architect aesthetic, 1 square = 1 ft
- **Wall tool** — draw walls by dragging or clicking; chains auto-continue from the last endpoint; close a room by snapping back to the start
- **Box tool** — drag to create furniture or room elements, fully to scale
- **Select tool** — tap to select, drag to move, drag a marquee to multi-select
- **Exact dimensions** — set wall length and box width/height in feet and inches (`5'6"`, `5 6`, `6"`, `5.5` all work)
- **Scale bar** — real-time indicator in the corner showing current zoom scale
- **Zoom & pan** — scroll wheel or pinch to zoom, two-finger drag to pan; grid adapts at each zoom level
- **Local save** — plans are saved to `localStorage` automatically; no account needed
- **Multiple plans** — name, create, switch between, and delete plans
- **iPad + Apple Pencil** — optimised touch targets, stylus-friendly drawing interactions
- **Help overlay** — press `?` or tap the toolbar help button

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Commands

```bash
npm run dev          # development server with HMR
npm run build        # type-check + production build
npm run preview      # serve production build locally
npm run type-check   # TypeScript check only
npm run lint         # ESLint
npm run test         # unit tests (Vitest)
npm run test:watch   # unit tests in watch mode
npm run test:e2e     # end-to-end tests (Playwright)
```

## Drawing

| Tool | Shortcut | How to use |
|---|---|---|
| Wall | `W` | Drag or click to draw a segment. Release near the start point to close a room. Double-tap or `Escape` to end the chain. |
| Box | `B` | Drag to create. Shows live dimensions while drawing. |
| Select | `S` | Tap to select. Drag a marquee to select multiple. Drag a selected box to move it. `Backspace` to delete. |

Hold `Shift` while drawing to snap to half-foot (6") increments.

## Dimension input formats

All dimension fields accept:

| Input | Meaning |
|---|---|
| `5'6"` | 5 feet 6 inches |
| `5' 6"` | 5 feet 6 inches |
| `5'6` | 5 feet 6 inches |
| `5 6` | 5 feet 6 inches |
| `5'` | 5 feet |
| `6"` | 6 inches |
| `5.5` | 5.5 feet |

## Tech stack

- **React 18 + TypeScript** — UI and state
- **Konva.js / react-konva** — canvas rendering with stage-level zoom/pan transform
- **Zustand** — lightweight state management
- **Vite** — build tooling
- **Vitest** — unit tests
- **Playwright** — end-to-end tests (desktop + iPad)
- **GitHub Actions** — CI: lint → type-check → unit tests → E2E on every PR
- **Netlify** — hosting with preview deploys on PRs

## Project structure

```
src/
  types/           Shared TypeScript types
  utils/           geometry helpers, localStorage utils
  store/           Zustand stores (floorplan data, tool state)
  hooks/           useSnap (grid + endpoint snapping)
  components/
    Canvas/        Drawing canvas, grid, elements, scale bar
    Toolbar/       Tool selector
    PropertiesPanel/ Dimension editing panel
    FloorplanManager/ Plan list and management
    HelpOverlay/   Keyboard/gesture reference
e2e/               Playwright tests
```

See [AGENTS.md](./AGENTS.md) for architecture details and conventions.
