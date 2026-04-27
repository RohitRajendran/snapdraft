import { expect, type Page } from '@playwright/test';

/**
 * Navigate to the app, clear all localStorage, reload, and dismiss the help overlay.
 * Call this in `test.beforeEach` for any test that needs a clean canvas with no prior state.
 */
export async function setup(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await dismissHelp(page);
}

/**
 * Dismiss the help overlay if it is currently visible by pressing Escape.
 * Safe to call even when the overlay is not visible — it is a no-op in that case.
 */
export async function dismissHelp(page: Page) {
  const help = page.getByTestId('help-overlay');
  if (await help.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(help).not.toBeVisible();
  }
}

/**
 * Return the centre of the drawing canvas in page (screen) coordinates, plus its bounding box.
 *
 * Use `centerX` / `centerY` as the origin when computing screen positions relative to the canvas
 * centre. Use `box` when you need the full bounding rect (e.g. to click a corner or compute
 * world-to-screen transforms).
 *
 * @throws if the canvas element is not found in the DOM.
 */
export async function canvasCenter(page: Page) {
  const canvas = page.getByTestId('drawing-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  return { centerX, centerY, box };
}

/**
 * Switch to the box tool and drag to draw a rectangle on the canvas.
 *
 * The drag starts at `(canvasCenterX + offsetX, canvasCenterY + offsetY)` and ends
 * `boxWidth` pixels to the right and `boxHeight` pixels down from there.
 *
 * @param offsetX  Horizontal offset from the canvas centre to the top-left corner of the box.
 * @param offsetY  Vertical offset from the canvas centre to the top-left corner of the box.
 * @param boxWidth  Width of the drag in screen pixels (default 160).
 * @param boxHeight Height of the drag in screen pixels (default 120).
 * @returns The screen centre of the drawn box, useful for clicking to select it afterwards.
 */
export async function drawBox(
  page: Page,
  offsetX = 0,
  offsetY = 0,
  boxWidth = 160,
  boxHeight = 120,
) {
  await page.getByTestId('tool-box').click();
  const { centerX, centerY } = await canvasCenter(page);
  const startX = centerX + offsetX;
  const startY = centerY + offsetY;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + boxWidth, startY + boxHeight, { steps: 10 });
  await page.mouse.up();
  return { centerX: startX + boxWidth / 2, centerY: startY + boxHeight / 2 };
}

/**
 * Switch to the wall tool, click two screen points to draw a wall segment, then press Escape
 * to end the chain so subsequent actions start from a clean state.
 *
 * @param fromX  Screen X of the first wall endpoint.
 * @param fromY  Screen Y of the first wall endpoint.
 * @param toX    Screen X of the second wall endpoint.
 * @param toY    Screen Y of the second wall endpoint.
 */
export async function drawWall(
  page: Page,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  await page.getByTestId('tool-wall').click();
  await page.mouse.move(fromX, fromY);
  await page.mouse.click(fromX, fromY);
  await page.mouse.move(toX, toY);
  await page.mouse.click(toX, toY);
  await page.keyboard.press('Escape');
}

/**
 * Read the active floor plan's element array directly from localStorage.
 *
 * Returns the `elements` array of whichever plan is currently active (identified by the
 * `snapdraft_active` key). Returns an empty array when there is no active plan or no elements.
 *
 * Useful for asserting that drawing operations persisted the correct world-coordinate values
 * without going through the UI.
 */
export async function getActivePlanElements(page: Page) {
  return page.evaluate(() => {
    const plans = JSON.parse(localStorage.getItem('snapdraft_floorplans') || '[]');
    const activeId = localStorage.getItem('snapdraft_active');
    return plans.find((plan: { id: string }) => plan.id === activeId)?.elements ?? [];
  });
}

/**
 * Click the midpoint of a wall element on the canvas to select it.
 *
 * Reads wall positions from localStorage (world coordinates in feet), converts the midpoint to
 * screen coordinates using the base render scale of 40 px/ft at zoom 1, and clicks there.
 *
 * @param wallIndex  Zero-based index into the filtered list of wall elements (default 0).
 * @throws if the requested wall index does not exist.
 */
export async function clickWallMidpoint(page: Page, wallIndex = 0) {
  const elements = await getActivePlanElements(page);
  const walls = elements.filter(
    (element: { type: string; points?: Array<{ x: number; y: number }> }) =>
      element.type === 'wall' && element.points && element.points.length >= 2,
  );
  const wall = walls[wallIndex];
  if (!wall || !wall.points) throw new Error(`Wall ${wallIndex} not found`);

  const start = wall.points[0];
  const end = wall.points[1];
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const { box } = await canvasCenter(page);
  await page.mouse.click(box.x + midpoint.x * 40, box.y + midpoint.y * 40);
}

/**
 * Draw two small boxes side by side and then marquee-select both of them.
 *
 * The first box is drawn 200 px left of centre, the second 80 px right of centre.
 * After both are drawn the select tool is activated and a marquee drag covers both boxes.
 *
 * Use this as a fast path to set up a multi-selection before testing multi-select behaviour.
 */
export async function drawTwoBoxesAndMarqueeSelect(page: Page) {
  await drawBox(page, -200, -60, 80, 80);
  await drawBox(page, 80, -60, 80, 80);
  await page.getByTestId('tool-select').click();
  const { centerX, centerY } = await canvasCenter(page);
  await page.mouse.move(centerX - 240, centerY - 100);
  await page.mouse.down();
  await page.mouse.move(centerX + 200, centerY + 60, { steps: 10 });
  await page.mouse.up();
}

/**
 * Read the current zoom level from the `data-zoom` attribute on the drawing canvas.
 *
 * The canvas element exposes its live zoom as a numeric string attribute so that tests can
 * assert zoom changes without inspecting internal Konva state.
 *
 * @returns The zoom value as a number (1 = 100 %).
 */
export async function getCanvasZoom(page: Page): Promise<number> {
  const val = await page.getByTestId('drawing-canvas').getAttribute('data-zoom');
  return parseFloat(val ?? '1');
}

/**
 * Read the current pan offset from the `data-pan-x` / `data-pan-y` attributes on the canvas.
 *
 * The canvas element exposes its live pan as numeric string attributes so that tests can assert
 * pan changes without inspecting internal Konva stage state.
 *
 * @returns An object with `x` and `y` in screen pixels.
 */
export async function getCanvasPan(page: Page): Promise<{ x: number; y: number }> {
  const [panXStr, panYStr] = await Promise.all([
    page.getByTestId('drawing-canvas').getAttribute('data-pan-x'),
    page.getByTestId('drawing-canvas').getAttribute('data-pan-y'),
  ]);
  return { x: parseFloat(panXStr ?? '0'), y: parseFloat(panYStr ?? '0') };
}

/**
 * Dispatch a synthetic two-finger touch gesture on the drawing canvas.
 *
 * Fires `touchstart` → N `touchmove` steps → `touchend` with two synthetic Touch points.
 * The fingers start `startRadius` pixels apart (horizontal), move to `endRadius` pixels apart,
 * and optionally translate the midpoint by (`deltaX`, `deltaY`) over the course of the gesture.
 *
 * This covers both pinch-zoom (change `startRadius` / `endRadius`) and two-finger pan
 * (keep radii equal, vary `deltaX` / `deltaY`).
 *
 * All coordinates are page-relative (clientX / clientY).
 *
 * @param opts.midX         Starting X of the midpoint between the two fingers.
 * @param opts.midY         Starting Y of the midpoint between the two fingers.
 * @param opts.startRadius  Half-distance between fingers at the start of the gesture.
 * @param opts.endRadius    Half-distance between fingers at the end of the gesture.
 * @param opts.deltaX       Total X translation of the midpoint over the gesture (default 0).
 * @param opts.deltaY       Total Y translation of the midpoint over the gesture (default 0).
 * @param opts.steps        Number of touchmove events to dispatch (default 8).
 */
export async function simulatePinch(
  page: Page,
  opts: {
    midX: number;
    midY: number;
    startRadius: number;
    endRadius: number;
    deltaX?: number;
    deltaY?: number;
    steps?: number;
  },
) {
  const { midX, midY, startRadius, endRadius, deltaX = 0, deltaY = 0, steps = 8 } = opts;

  await page.evaluate(
    ({ midX, midY, startRadius, endRadius, deltaX, deltaY, steps }) => {
      const target = document.querySelector('[data-testid="drawing-canvas"]') as HTMLElement;
      if (!target) throw new Error('canvas not found');

      function makeTouch(id: number, clientX: number, clientY: number): Touch {
        return new Touch({ identifier: id, target, clientX, clientY, pageX: clientX, pageY: clientY });
      }

      function fire(type: string, touch1: Touch, touch2: Touch) {
        const evt = new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: type === 'touchend' ? [] : [touch1, touch2],
          changedTouches: [touch1, touch2],
          targetTouches: type === 'touchend' ? [] : [touch1, touch2],
        });
        target.dispatchEvent(evt);
      }

      fire(
        'touchstart',
        makeTouch(1, midX - startRadius, midY),
        makeTouch(2, midX + startRadius, midY),
      );

      for (let step = 1; step <= steps; step++) {
        const progress = step / steps;
        const radius = startRadius + (endRadius - startRadius) * progress;
        const mx = midX + deltaX * progress;
        const my = midY + deltaY * progress;
        fire('touchmove', makeTouch(1, mx - radius, my), makeTouch(2, mx + radius, my));
      }

      const finalRadius = endRadius;
      const finalMidX = midX + deltaX;
      const finalMidY = midY + deltaY;
      fire(
        'touchend',
        makeTouch(1, finalMidX - finalRadius, finalMidY),
        makeTouch(2, finalMidX + finalRadius, finalMidY),
      );
    },
    { midX, midY, startRadius, endRadius, deltaX, deltaY, steps },
  );
}

/**
 * Dispatch a synthetic two-finger twist (rotation) gesture on the drawing canvas.
 *
 * Fires `touchstart` with both fingers horizontal, then rotates them around the midpoint
 * through `endAngle` degrees over N `touchmove` steps, finishing with `touchend`.
 *
 * A positive `endAngle` rotates counter-clockwise (standard math convention).
 *
 * All coordinates are page-relative (clientX / clientY).
 *
 * @param opts.midX      X centre of the rotation gesture.
 * @param opts.midY      Y centre of the rotation gesture.
 * @param opts.radius    Half-distance between the two fingers throughout the gesture.
 * @param opts.endAngle  Total rotation angle in degrees.
 * @param opts.steps     Number of touchmove events to dispatch (default 8).
 */
export async function simulateTwist(
  page: Page,
  opts: { midX: number; midY: number; radius: number; endAngle: number; steps?: number },
) {
  const { midX, midY, radius, endAngle, steps = 8 } = opts;

  await page.evaluate(
    ({ midX, midY, radius, endAngle, steps }) => {
      const target = document.querySelector('[data-testid="drawing-canvas"]') as HTMLElement;
      if (!target) throw new Error('canvas not found');

      function makeTouch(id: number, clientX: number, clientY: number): Touch {
        return new Touch({ identifier: id, target, clientX, clientY, pageX: clientX, pageY: clientY });
      }

      function fire(type: string, touch1: Touch, touch2: Touch) {
        const evt = new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: type === 'touchend' ? [] : [touch1, touch2],
          changedTouches: [touch1, touch2],
          targetTouches: type === 'touchend' ? [] : [touch1, touch2],
        });
        target.dispatchEvent(evt);
      }

      // Start with fingers horizontal
      fire(
        'touchstart',
        makeTouch(1, midX - radius, midY),
        makeTouch(2, midX + radius, midY),
      );

      for (let step = 1; step <= steps; step++) {
        const angleRad = ((endAngle * step) / steps) * (Math.PI / 180);
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        fire(
          'touchmove',
          makeTouch(1, midX - radius * cos, midY - radius * sin),
          makeTouch(2, midX + radius * cos, midY + radius * sin),
        );
      }

      const finalRad = endAngle * (Math.PI / 180);
      fire(
        'touchend',
        makeTouch(1, midX - radius * Math.cos(finalRad), midY - radius * Math.sin(finalRad)),
        makeTouch(2, midX + radius * Math.cos(finalRad), midY + radius * Math.sin(finalRad)),
      );
    },
    { midX, midY, radius, endAngle, steps },
  );
}
