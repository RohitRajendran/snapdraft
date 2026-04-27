import { test, expect } from '@playwright/test';
import { setup, drawBox } from './helpers';

test.describe('Box drawing', () => {
  test.beforeEach(({ page }) => setup(page));

  let boxCenter: { centerX: number; centerY: number };
  test.beforeEach(async ({ page }) => {
    boxCenter = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(boxCenter.centerX, boxCenter.centerY);
  });

  test('selecting a drawn box shows the properties panel with Box title', async ({ page }) => {
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await expect(page.getByTestId('properties-panel')).toContainText('Box');
  });

  test('can edit box width in properties panel', async ({ page }) => {
    const widthInput = page.getByTestId('box-width-input');
    await widthInput.fill("10'");
    await widthInput.press('Enter');
    await expect(widthInput).toHaveValue("10'");
  });

  test('can edit box height in properties panel', async ({ page }) => {
    const heightInput = page.getByTestId('box-height-input');
    await heightInput.fill("5'");
    await heightInput.press('Enter');
    await expect(heightInput).toHaveValue("5'");
  });

  test('can edit box rotation in properties panel', async ({ page }) => {
    const rotInput = page.getByTestId('box-rotation-input');
    await rotInput.fill('45');
    await rotInput.press('Enter');
    await expect(rotInput).toHaveValue('45');
  });

  test('can delete a box from properties panel', async ({ page }) => {
    await page.getByTestId('delete-element').click();
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });

  test('delete key removes selected box', async ({ page }) => {
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await page.keyboard.press('Delete');
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });

  test('clicking empty canvas deselects', async ({ page }) => {
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await page.getByTestId('drawing-canvas').click({ position: { x: 40, y: 40 } });
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });
});
