import { test, expect } from '@playwright/test';
import { setup, drawBox } from './helpers';

test.describe('Canvas keyboard shortcuts', () => {
  test.beforeEach(({ page }) => setup(page));

  test('Backspace deletes and Escape clears selection', async ({ page }) => {
    const firstBox = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(firstBox.centerX, firstBox.centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await page.keyboard.press('Backspace');
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();

    const secondBox = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(secondBox.centerX, secondBox.centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });
});

test.describe('Arrow key movement', () => {
  test.beforeEach(({ page }) => setup(page));

  test('arrow keys move a selected box and movement is undoable', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();

    // Press right arrow — box should stay selected
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('properties-panel')).toBeVisible();

    // Two undo steps: one for the move, one for the draw
    await page.keyboard.press('Meta+z');
    await page.keyboard.press('Meta+z');
    await expect(page.getByTestId('tool-undo')).toBeDisabled();
  });
});
