import { test, expect } from '@playwright/test';
import { setup, setupEmpty, getCanvasPan } from './helpers';

test.describe('Tool switching', () => {
  test.beforeEach(({ page }) => setup(page));

  test('toolbar clicks and keyboard shortcuts switch tools', async ({ page }) => {
    await page.getByTestId('tool-box').click();
    await expect(page.getByTestId('tool-box')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('tool-select-pan').click();
    await expect(page.getByTestId('tool-select-pan')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('s');
    await expect(page.getByTestId('tool-select-pan')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('b');
    await expect(page.getByTestId('tool-box')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('w');
    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('aria-pressed', 'true');
  });

  test('H key activates hand tool and slot shows as active', async ({ page }) => {
    await page.keyboard.press('h');
    await expect(page.getByTestId('tool-select-pan')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('aria-pressed', 'false');
  });

  test('V key activates select tool', async ({ page }) => {
    await page.keyboard.press('h');
    await page.keyboard.press('v');
    await expect(page.getByTestId('tool-select-pan')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Select/Pan dropdown opens on footer click and shows both options', async ({ page }) => {
    await page.getByTestId('tool-select-pan-toggle').click();
    await expect(page.getByTestId('tool-select')).toBeVisible();
    await expect(page.getByTestId('tool-pan')).toBeVisible();
  });

  test('choosing Hand from Select/Pan dropdown activates pan tool', async ({ page }) => {
    await page.getByTestId('tool-select-pan-toggle').click();
    await page.getByTestId('tool-pan').click();
    await expect(page.getByTestId('tool-select-pan')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('aria-pressed', 'false');
  });

  test('choosing Select from Select/Pan dropdown activates select tool', async ({ page }) => {
    await page.keyboard.press('h');
    await page.getByTestId('tool-select-pan-toggle').click();
    await page.getByTestId('tool-select').click();
    await expect(page.getByTestId('tool-select-pan')).toHaveAttribute('aria-pressed', 'true');
  });

  test('choosing Door from Wall/Door/Window dropdown activates door tool', async ({ page }) => {
    await page.getByTestId('tool-wall-group-toggle').click();
    await page.getByTestId('tool-door').click();
    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('data-active-tool', 'door');
    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('aria-pressed', 'true');
  });

  test('choosing Window from Wall/Door/Window dropdown activates window tool', async ({ page }) => {
    await page.getByTestId('tool-wall-group-toggle').click();
    await page.getByTestId('tool-window').click();
    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('data-active-tool', 'window');
    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('aria-pressed', 'true');
  });

  test('choosing Wall from Wall/Door/Window dropdown activates wall tool', async ({ page }) => {
    // Switch to door first, then back to wall via dropdown
    await page.keyboard.press('d');
    await page.getByTestId('tool-wall-group-toggle').click();
    await page.getByTestId('tool-wall').click();
    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('data-active-tool', 'wall');
  });

  test('Wall/Door/Window dropdown closes after selecting a tool', async ({ page }) => {
    await page.getByTestId('tool-wall-group-toggle').click();
    await expect(page.getByTestId('tool-door')).toBeVisible();
    await page.getByTestId('tool-door').click();
    await expect(page.getByTestId('tool-door')).not.toBeVisible();
  });

  test('Select/Pan dropdown closes after selecting a tool', async ({ page }) => {
    await page.getByTestId('tool-select-pan-toggle').click();
    await expect(page.getByTestId('tool-pan')).toBeVisible();
    await page.getByTestId('tool-pan').click();
    await expect(page.getByTestId('tool-pan')).not.toBeVisible();
  });
});

test.describe('Pan tool', () => {
  test.beforeEach(({ page }) => setupEmpty(page));

  test('hand tool drag pans the canvas', async ({ page }) => {
    await page.keyboard.press('h');
    const canvas = page.getByTestId('drawing-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not found');

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const before = await getCanvasPan(page);

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 80, cy + 60, { steps: 8 });
    await page.mouse.up();

    const after = await getCanvasPan(page);
    expect(after.x).toBeCloseTo(before.x + 80, 0);
    expect(after.y).toBeCloseTo(before.y + 60, 0);
  });

  test('space + drag pans the canvas from any tool', async ({ page }) => {
    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('aria-pressed', 'true');

    const canvas = page.getByTestId('drawing-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not found');

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const before = await getCanvasPan(page);

    await page.keyboard.down('Space');
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 60, cy + 40, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Space');

    const after = await getCanvasPan(page);
    expect(after.x).toBeCloseTo(before.x + 60, 0);
    expect(after.y).toBeCloseTo(before.y + 40, 0);
  });

  test('space + drag returns to original tool after release', async ({ page }) => {
    await page.keyboard.press('h');
    await page.keyboard.press('w');
    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('aria-pressed', 'true');

    const canvas = page.getByTestId('drawing-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not found');

    await page.keyboard.down('Space');
    await page.mouse.move(box.x + 200, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 260, box.y + 240, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up('Space');

    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('aria-pressed', 'true');
  });
});
