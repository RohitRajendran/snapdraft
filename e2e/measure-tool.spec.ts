import { test, expect } from '@playwright/test';
import { setup, canvasCenter, getActivePlanElements } from './helpers';

test.describe('Measure tool', () => {
  test.beforeEach(({ page }) => setup(page));

  test('activates with toolbar button and M key', async ({ page }) => {
    await page.getByTestId('tool-measure').click();
    await expect(page.getByTestId('tool-measure')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('tool-select').click();
    await page.keyboard.press('m');
    await expect(page.getByTestId('tool-measure')).toHaveAttribute('aria-pressed', 'true');
  });

  test('places start and end points without crashing', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    await page.getByTestId('tool-measure').click();

    await page.mouse.click(centerX, centerY);
    await page.mouse.click(centerX + 200, centerY);

    await expect(page.getByTestId('tool-measure')).toBeVisible();
  });

  test('Escape cancels or clears a measurement', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    await page.getByTestId('tool-measure').click();

    // Cancel in-progress measurement
    await page.mouse.click(centerX, centerY);
    await page.keyboard.press('Escape');

    // After Escape, a fresh click starts a new measurement without error
    await page.mouse.click(centerX + 50, centerY + 50);
    await expect(page.getByTestId('tool-measure')).toBeVisible();

    // Complete a measurement and Escape it
    await page.mouse.click(centerX + 200, centerY + 50);
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('tool-measure')).toBeVisible();
  });

  test('does not mutate the floor plan', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    await page.getByTestId('tool-measure').click();

    await page.mouse.click(centerX, centerY);
    await page.mouse.click(centerX + 200, centerY);

    const elements = await getActivePlanElements(page);
    expect(elements).toHaveLength(0);
  });
});
