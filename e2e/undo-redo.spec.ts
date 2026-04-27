import { test, expect } from '@playwright/test';
import { setup, drawBox, drawWall, canvasCenter, getActivePlanElements } from './helpers';

test.describe('Undo and Redo', () => {
  test.beforeEach(({ page }) => setup(page));

  test('undo becomes enabled after drawing', async ({ page }) => {
    await expect(page.getByTestId('tool-undo')).toBeDisabled();
    await drawBox(page);
    await expect(page.getByTestId('tool-undo')).toBeEnabled();
  });

  test('undo removes a drawn box (properties panel disappears)', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();

    await page.getByTestId('tool-undo').click();
    // Box gone — clicking where it was should deselect
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });

  test('redo re-adds the box after undo', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-undo').click();
    await expect(page.getByTestId('tool-redo')).toBeEnabled();
    await page.getByTestId('tool-redo').click();

    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
  });

  test('Cmd+Z / Cmd+Shift+Z keyboard shortcuts work', async ({ page }) => {
    await drawBox(page);
    await expect(page.getByTestId('tool-undo')).toBeEnabled();
    await page.keyboard.press('Meta+z');
    await expect(page.getByTestId('tool-undo')).toBeDisabled();
    await expect(page.getByTestId('tool-redo')).toBeEnabled();
    await page.keyboard.press('Meta+Shift+z');
    await expect(page.getByTestId('tool-undo')).toBeEnabled();
  });

  test('drawing after undo clears redo history', async ({ page }) => {
    await drawBox(page);
    await page.getByTestId('tool-undo').click();
    await expect(page.getByTestId('tool-redo')).toBeEnabled();
    await drawBox(page, 100, 100);
    await expect(page.getByTestId('tool-redo')).toBeDisabled();
  });

  test('multi-select drag across walls and boxes is one undo step and persists across reload', async ({
    page,
  }) => {
    const leftBox = await drawBox(page, -260, -120);
    await drawBox(page, -20, -120);
    await drawBox(page, 220, -120);

    const { centerX, centerY } = await canvasCenter(page);
    await drawWall(page, centerX - 260, centerY + 120, centerX - 80, centerY + 120);
    await drawWall(page, centerX + 20, centerY + 120, centerX + 200, centerY + 120);

    const beforeDrag = await getActivePlanElements(page);

    await page.getByTestId('tool-select').click();
    await page.mouse.move(centerX - 320, centerY - 180);
    await page.mouse.down();
    await page.mouse.move(centerX + 280, centerY + 180, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByTestId('multi-select-bar')).toContainText('5');

    await page.mouse.move(leftBox.centerX, leftBox.centerY);
    await page.mouse.down();
    await page.mouse.move(leftBox.centerX + 120, leftBox.centerY + 80, { steps: 10 });
    await page.mouse.up();

    const afterDrag = await getActivePlanElements(page);
    expect(afterDrag).not.toEqual(beforeDrag);

    await page.keyboard.press('Meta+z');
    await expect.poll(async () => getActivePlanElements(page)).toEqual(beforeDrag);

    await page.keyboard.press('Meta+Shift+z');
    await expect.poll(async () => getActivePlanElements(page)).toEqual(afterDrag);

    await page.reload();
    const helpOverlay = page.getByTestId('help-overlay');
    if (await helpOverlay.isVisible()) {
      await page.keyboard.press('Escape');
    }
    await expect.poll(async () => getActivePlanElements(page)).toEqual(afterDrag);
  });
});
