import { test, expect, type Page } from '@playwright/test';
import { dismissHelp } from './helpers';

type Seed = Record<string, unknown>;

/** Seed a plan and reload; a plan with content opens fitted, in select mode. */
async function seed(page: Page, elements: Seed[]) {
  await page.goto('/');
  await page.evaluate((els) => {
    localStorage.clear();
    const id = 'test-mask-plan';
    localStorage.setItem('snapdraft_active', id);
    localStorage.setItem(
      'snapdraft_floorplans',
      JSON.stringify([
        {
          id,
          version: 2,
          name: 'Mask',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          elements: els,
        },
      ]),
    );
  }, elements);
  await page.reload();
  await dismissHelp(page);
}

/** Whether a grid line is drawn near a world point, read from the grid layer's own canvas. Konva redraws on the next frame, so callers poll. */
async function gridVisibleAt(page: Page, worldX: number, worldY: number) {
  return page.evaluate(
    ({ worldX, worldY }) => {
      const stage = (window as unknown as { Konva: { stages: never[] } }).Konva.stages[0] as {
        x(): number;
        y(): number;
        scaleX(): number;
        getLayers(): { getCanvas(): { _canvas: HTMLCanvasElement; getPixelRatio(): number } }[];
      };
      const layer = stage.getLayers()[0].getCanvas();
      const ratio = layer.getPixelRatio();
      const x = Math.round((worldX * 40 * stage.scaleX() + stage.x()) * ratio);
      const y = Math.round((worldY * 40 * stage.scaleX() + stage.y()) * ratio);
      const context = layer._canvas.getContext('2d')!;
      const { data } = context.getImageData(x - 3, y, 7, 1);
      // Any pixel in the short run that isn't plain paper (#f5f0e8) is a grid line.
      for (let i = 0; i < data.length; i += 4) {
        const away =
          Math.abs(data[i] - 0xf5) + Math.abs(data[i + 1] - 0xf0) + Math.abs(data[i + 2] - 0xe8);
        if (away > 6) return true;
      }
      return false;
    },
    { worldX, worldY },
  );
}

async function screenPoint(page: Page, worldX: number, worldY: number) {
  const offset = await page.evaluate(
    ({ worldX, worldY }) => {
      const stage = (window as unknown as { Konva: { stages: never[] } }).Konva.stages[0] as {
        x(): number;
        y(): number;
        scaleX(): number;
      };
      return {
        x: worldX * 40 * stage.scaleX() + stage.x(),
        y: worldY * 40 * stage.scaleX() + stage.y(),
      };
    },
    { worldX, worldY },
  );
  const bounds = (await page.getByTestId('drawing-canvas').boundingBox())!;
  return { x: bounds.x + offset.x, y: bounds.y + offset.y };
}

async function pressAt(page: Page, worldX: number, worldY: number) {
  const at = await screenPoint(page, worldX, worldY);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
}

async function dragTo(page: Page, worldX: number, worldY: number) {
  const to = await screenPoint(page, worldX, worldY);
  await page.mouse.move(to.x, to.y, { steps: 8 });
}

const box = (id: string, x: number, y: number, width = 6, length = 6) => ({
  id,
  type: 'box',
  x,
  y,
  width,
  length,
  rotation: 0,
});

test.describe('Boxes hide the grid', () => {
  test('the grid shows around a box but not inside it, and the mask follows a drag', async ({
    page,
  }) => {
    await seed(page, [box('a', 2, 2)]);
    // x = 5 is a major grid line; y = 5.5 stays off the horizontal lines.
    await expect.poll(() => gridVisibleAt(page, 5, 5.5)).toBe(false);
    await expect.poll(() => gridVisibleAt(page, 10, 5.5)).toBe(true);

    await pressAt(page, 4, 4);
    await dragTo(page, 11, 4);
    // Mid-drag: the old spot shows the grid again and the new one hides it.
    await expect.poll(() => gridVisibleAt(page, 5, 5.5)).toBe(true);
    await expect.poll(() => gridVisibleAt(page, 10, 5.5)).toBe(false);
    await page.mouse.up();
    await expect.poll(() => gridVisibleAt(page, 5, 5.5)).toBe(true);
    await expect.poll(() => gridVisibleAt(page, 10, 5.5)).toBe(false);
  });

  test('a group drag moves the masks of the other selected boxes too', async ({ page }) => {
    await seed(page, [box('a', 2, 2), box('b', 2, 12)]);
    const other = await screenPoint(page, 4, 14);
    const first = await screenPoint(page, 4, 4);
    await page.mouse.click(first.x, first.y);
    await page.keyboard.down('Shift');
    await page.mouse.click(other.x, other.y);
    await page.keyboard.up('Shift');
    await expect.poll(() => gridVisibleAt(page, 5, 15.5)).toBe(false);

    await pressAt(page, 4, 4);
    await dragTo(page, 11, 4);
    await expect.poll(() => gridVisibleAt(page, 5, 15.5)).toBe(true);
    await expect.poll(() => gridVisibleAt(page, 10, 15.5)).toBe(false);
    await page.mouse.up();
  });

  test('dragging a selected wall moves the mask of a box selected with it', async ({ page }) => {
    await seed(page, [
      {
        id: 'w',
        type: 'wall',
        points: [
          { x: 2, y: 0 },
          { x: 8, y: 0 },
        ],
      },
      box('a', 2, 2),
    ]);
    const wall = await screenPoint(page, 4, 0);
    const inBox = await screenPoint(page, 4, 4);
    await page.mouse.click(wall.x, wall.y);
    await page.keyboard.down('Shift');
    await page.mouse.click(inBox.x, inBox.y);
    await page.keyboard.up('Shift');

    await pressAt(page, 4, 0);
    await dragTo(page, 11, 0);
    await expect.poll(() => gridVisibleAt(page, 5, 5.5)).toBe(true);
    await expect.poll(() => gridVisibleAt(page, 10, 5.5)).toBe(false);
    await page.mouse.up();
  });
});
