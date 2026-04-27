import { test, expect } from '@playwright/test';
import { setup, drawBox, canvasCenter, drawTwoBoxesAndMarqueeSelect } from './helpers';

test.describe('Multi-select', () => {
  test.beforeEach(({ page }) => setup(page));

  test('marquee-selecting two boxes shows multi-select bar', async ({ page }) => {
    await drawTwoBoxesAndMarqueeSelect(page);

    await expect(page.getByTestId('multi-select-bar')).toBeVisible();
    await expect(page.getByTestId('multi-select-bar')).toContainText('2');
  });

  test('Delete all removes all selected elements', async ({ page }) => {
    await drawTwoBoxesAndMarqueeSelect(page);

    await expect(page.getByTestId('multi-select-bar')).toBeVisible();
    await page.getByTestId('delete-selected').click();
    await expect(page.getByTestId('multi-select-bar')).not.toBeVisible();
  });

  test('Delete all is undone in a single step', async ({ page }) => {
    const firstBox = await drawBox(page, -200, -60, 80, 80);
    const secondBox = await drawBox(page, 80, -60, 80, 80);

    await page.getByTestId('tool-select').click();
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX - 240, centerY - 100);
    await page.mouse.down();
    await page.mouse.move(centerX + 200, centerY + 60, { steps: 10 });
    await page.mouse.up();

    await page.getByTestId('delete-selected').click();
    await expect(page.getByTestId('multi-select-bar')).not.toBeVisible();

    await page.keyboard.press('Meta+z');
    // Wait for React to commit the restored elements
    await page.waitForFunction(
      (count) =>
        document.querySelector('[data-testid="drawing-canvas"]')?.getAttribute('data-element-count') ===
        String(count),
      2,
    );
    // Konva repaints its hit canvas via requestAnimationFrame after React commits
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

    await page.mouse.click(firstBox.centerX, firstBox.centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await page.mouse.click(secondBox.centerX, secondBox.centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
  });

  test('Shift+click adds and removes elements from the selection', async ({ page }) => {
    const firstBox = await drawBox(page, -200, -60, 80, 80);
    const secondBox = await drawBox(page, 80, -60, 80, 80);

    await page.getByTestId('tool-select').click();
    await page.mouse.click(firstBox.centerX, firstBox.centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();

    await page.keyboard.down('Shift');
    await page.mouse.click(secondBox.centerX, secondBox.centerY);
    await page.keyboard.up('Shift');
    await expect(page.getByTestId('multi-select-bar')).toContainText('2');

    await page.keyboard.down('Shift');
    await page.mouse.click(secondBox.centerX, secondBox.centerY);
    await page.keyboard.up('Shift');
    await expect(page.getByTestId('multi-select-bar')).not.toBeVisible();
    await expect(page.getByTestId('properties-panel')).toBeVisible();
  });
});
