# SnapDraft

SnapDraft is a browser-based floor plan sketching tool. Draw walls, place boxes, measure distances, and iterate on room layouts without creating an account or sending data to a backend.

Plans are saved locally in your browser with `localStorage`. If you clear site data or switch browsers/devices, your plans will not follow you.

## Highlights

- Draw wall chains by clicking points or dragging
- Place boxes for furniture, fixtures, or room blocks
- Measure distances without changing the plan
- Edit dimensions using feet-and-inches input such as `5'6"`, `5 6`, `6"`, or `5.5`
- Select single or multiple elements, then move, rename, resize, or delete them
- Undo and redo changes from the toolbar or keyboard shortcuts
- Zoom, pan, and fit content on both desktop and touch devices
- Manage multiple saved plans directly in the browser

## Quick Start

### Requirements

- Node.js LTS (`.nvmrc` used)
- npm

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Available Scripts

```bash
npm run dev           # Vite dev server
npm run build         # TypeScript build + production bundle
npm run build:preview # Production bundle only
npm run preview       # Preview the built app locally
npm run type-check    # TypeScript checks only
npm run lint          # ESLint
npm run test          # Vitest once
npm run test:watch    # Vitest in watch mode
npm run test:ui       # Vitest UI
npm run test:e2e      # Playwright end-to-end tests
npm run format        # Prettier write for src TS/TSX
npm run format:check  # Prettier check
npm run spell:check   # cspell for src TS/TSX
```

## How It Works

SnapDraft stores plan data in world coordinates measured in feet. Rendering is handled client-side with Konva, while pan and zoom are applied through the stage transform. That keeps geometry consistent while letting the UI scale smoothly across desktop and iPad interactions.

The app starts with a default plan on first load. If a saved plan already has content, the canvas fits that content on open.

## Tools and Shortcuts

| Tool | Shortcut | Use |
|---|---|---|
| Select | `S` | Select, marquee-select, drag, edit, and delete elements |
| Wall | `W` | Draw connected wall segments by clicking or dragging |
| Box | `B` | Drag to create a box |
| Measure | `M` | Click two points to measure distance without changing the plan |

Other useful shortcuts:

- `Escape`: cancel wall drawing, clear selection, or dismiss the help flow
- `Backspace` or `Delete`: remove selected elements
- `Cmd+Z` / `Ctrl+Z`: undo
- `Cmd+Shift+Z` / `Ctrl+Shift+Z` / `Ctrl+Y`: redo
- `F`: fit content to the viewport
- `?`: open help
- Arrow keys: nudge selected elements
- `Shift` + Arrow keys: fine nudge selected elements

## Dimension Input

Dimension fields accept common architectural shorthand:

| Input | Meaning |
|---|---|
| `5'6"` | 5 feet 6 inches |
| `5' 6"` | 5 feet 6 inches |
| `5'6` | 5 feet 6 inches |
| `5 6` | 5 feet 6 inches |
| `5'` | 5 feet |
| `6"` | 6 inches |
| `5.5` | 5.5 feet |

## Testing

Unit tests live under `src/tests/unit/`. End-to-end tests live under `e2e/`.

Typical workflows:

```bash
npm run test
npm run test:e2e
npm run build
```

Playwright uses the preview server defined in `playwright.config.ts` and starts it automatically on `http://localhost:4173`.

## CI

GitHub Actions runs:

- `npm run format:check`
- `npm run lint`
- `npm run spell:check`
- `npm run type-check`
- `npm run test`
- `npm run test:e2e`

## Tech Stack

- React 19
- TypeScript
- Vite
- Konva with `react-konva`
- Zustand
- Vitest + React Testing Library
- Playwright
- ESLint + Prettier

## Project Structure

```text
src/
  components/   UI and canvas components
  hooks/        Shared hooks such as snapping and focus management
  store/        Zustand stores for floor plan data and tool state
  tests/unit/   Unit tests
  types/        Shared TypeScript models
  utils/        Geometry and storage helpers
e2e/            Playwright tests
```

## Contributing Notes

- Keep persisted geometry in feet, not pixels.
- Use `stage.getRelativePointerPosition()` for world-coordinate math.
- Prefer `data-testid` selectors for UI tests.
