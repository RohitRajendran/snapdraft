import { test, expect } from '@playwright/test';

test.describe('SnapDraft', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Dismiss help overlay if shown
    const help = page.getByTestId('help-overlay');
    if (await help.isVisible()) {
      await page.keyboard.press('Escape');
    }
  });

  test('loads and shows the app', async ({ page }) => {
    await expect(page.getByTestId('drawing-canvas')).toBeVisible();
    await expect(page.getByTestId('tool-select')).toBeVisible();
    await expect(page.getByTestId('tool-wall')).toBeVisible();
    await expect(page.getByTestId('tool-box')).toBeVisible();
  });

  test('can switch tools via toolbar', async ({ page }) => {
    await page.getByTestId('tool-wall').click();
    await expect(page.getByTestId('tool-wall')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('tool-box').click();
    await expect(page.getByTestId('tool-box')).toHaveAttribute('aria-pressed', 'true');
  });

  test('can switch tools via keyboard shortcuts', async ({ page }) => {
    await page.keyboard.press('w');
    await expect(page.getByTestId('tool-wall')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('b');
    await expect(page.getByTestId('tool-box')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('s');
    await expect(page.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true');
  });

  test('opens help overlay', async ({ page }) => {
    await page.getByTestId('tool-help').click();
    await expect(page.getByTestId('help-overlay')).toBeVisible();
  });

  test('dismisses help overlay', async ({ page }) => {
    await page.getByTestId('tool-help').click();
    await page.getByTestId('help-overlay').click();
    await expect(page.getByTestId('help-overlay')).not.toBeVisible();
  });

  test('can create a new floor plan', async ({ page }) => {
    await page.getByTestId('plans-button').click();
    await expect(page.getByTestId('floorplan-manager')).toBeVisible();
    await page.getByTestId('create-plan').click();
    await expect(page.getByTestId('floorplan-manager')).not.toBeVisible();
  });

  test('can draw a box on the canvas', async ({ page }) => {
    await page.getByTestId('tool-box').click();
    const canvas = page.getByTestId('drawing-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 120, cy + 80);
    await page.mouse.up();

    // Switch to select and click the box
    await page.getByTestId('tool-select').click();
    await page.mouse.click(cx + 60, cy + 40);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
  });

  test('can delete a selected element', async ({ page }) => {
    // Draw a box first
    await page.getByTestId('tool-box').click();
    const canvas = page.getByTestId('drawing-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 120, cy + 80);
    await page.mouse.up();

    // Select it
    await page.getByTestId('tool-select').click();
    await page.mouse.click(cx + 60, cy + 40);

    // Delete via button
    await page.getByTestId('delete-element').click();
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });
});
