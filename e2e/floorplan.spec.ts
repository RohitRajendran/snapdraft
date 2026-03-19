import { test, expect } from '@playwright/test';

test.describe('SnapDraft', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage so help overlay and default plan are created fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Dismiss help overlay with Escape
    const help = page.getByTestId('help-overlay');
    if (await help.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(help).not.toBeVisible();
    }
  });

  test('loads and shows the app', async ({ page }) => {
    await expect(page.getByTestId('drawing-canvas')).toBeVisible();
    await expect(page.getByTestId('tool-select')).toBeVisible();
    await expect(page.getByTestId('tool-wall')).toBeVisible();
    await expect(page.getByTestId('tool-box')).toBeVisible();
  });

  test('wall tool is active by default', async ({ page }) => {
    await expect(page.getByTestId('tool-wall')).toHaveAttribute('aria-pressed', 'true');
  });

  test('can switch tools via toolbar', async ({ page }) => {
    await page.getByTestId('tool-box').click();
    await expect(page.getByTestId('tool-box')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('tool-select').click();
    await expect(page.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true');
  });

  test('can switch tools via keyboard shortcuts', async ({ page }) => {
    await page.keyboard.press('s');
    await expect(page.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('b');
    await expect(page.getByTestId('tool-box')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('w');
    await expect(page.getByTestId('tool-wall')).toHaveAttribute('aria-pressed', 'true');
  });

  test('opens and closes help overlay with Escape', async ({ page }) => {
    await page.getByTestId('tool-help').click();
    await expect(page.getByTestId('help-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('help-overlay')).not.toBeVisible();
  });

  test('dismisses help overlay by clicking backdrop', async ({ page }) => {
    await page.getByTestId('tool-help').click();
    await expect(page.getByTestId('help-overlay')).toBeVisible();
    await page.getByTestId('help-overlay').click({ position: { x: 10, y: 10 } });
    await expect(page.getByTestId('help-overlay')).not.toBeVisible();
  });

  test('scale bar is visible', async ({ page }) => {
    await expect(page.getByTestId('scale-bar')).toBeVisible();
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
    await page.mouse.move(cx + 160, cy + 120, { steps: 10 });
    await page.mouse.up();

    // Switch to select and click the box
    await page.getByTestId('tool-select').click();
    await page.mouse.click(cx + 80, cy + 60);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
  });

  test('can delete a selected element', async ({ page }) => {
    await page.getByTestId('tool-box').click();
    const canvas = page.getByTestId('drawing-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 160, cy + 120, { steps: 10 });
    await page.mouse.up();

    await page.getByTestId('tool-select').click();
    await page.mouse.click(cx + 80, cy + 60);
    await page.getByTestId('delete-element').click();
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });

  test('can edit box dimensions in properties panel', async ({ page }) => {
    await page.getByTestId('tool-box').click();
    const canvas = page.getByTestId('drawing-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 160, cy + 120, { steps: 10 });
    await page.mouse.up();

    await page.getByTestId('tool-select').click();
    await page.mouse.click(cx + 80, cy + 60);
    await expect(page.getByTestId('properties-panel')).toBeVisible();

    const widthInput = page.getByTestId('box-width-input');
    await widthInput.fill('10');
    await widthInput.press('Enter');
    await expect(widthInput).toHaveValue('10');
  });
});
