import { test, expect } from '@playwright/test';

/**
 * The marketing page is a standalone static file in public/. Netlify rewrites
 * `/` to it in production (netlify.toml); under `vite preview` it is served
 * from dist/ at its real path, so these tests address it directly.
 */
const HOME = '/home.html';

test.describe('marketing home page', () => {
  test('renders all three app mockups', async ({ page }) => {
    await page.goto(HOME);

    for (const id of ['shot-draw', 'shot-properties', 'shot-plans']) {
      await expect(page.getByTestId(id)).toBeVisible();
      // Canvas artwork is generated into each shot; an empty region means
      // `npm run generate:marketing-canvas` was not run.
      await expect(page.getByTestId(id).locator('svg.shot-canvas')).toBeAttached();
    }
  });

  test('the drawing mockup shows the real toolbar', async ({ page }) => {
    await page.goto(HOME);
    const toolbar = page.getByTestId('shot-draw').locator('.sd-toolbar');

    await expect(toolbar).toBeVisible();
    for (const label of ['Select', 'Wall', 'Box', 'Measure', 'Undo', 'Redo', 'Help']) {
      await expect(toolbar.getByText(label, { exact: true })).toBeVisible();
    }
    // Wall is the active tool in this shot; redo is disabled with nothing to redo.
    await expect(toolbar.locator('.sd-group.is-active')).toHaveCount(1);
    await expect(toolbar.locator('.sd-tool.is-disabled')).toHaveCount(1);
  });

  test('the properties mockup shows the real panel fields', async ({ page }) => {
    await page.goto(HOME);
    const panel = page.getByTestId('shot-properties').locator('.sd-panel');

    await expect(panel).toBeVisible();
    await expect(panel.locator('.sd-panel-title')).toHaveText('Box');
    for (const label of ['Width', 'Length', 'Rotation (°)', 'Label']) {
      await expect(panel.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(panel.locator('.sd-delete')).toHaveText('Delete');
    // The panel floats at the app's own offsets rather than docking to the edge.
    await expect(panel).toHaveCSS('width', '220px');
  });

  test('the plans mockup shows the real manager dialog', async ({ page }) => {
    await page.goto(HOME);
    const modal = page.getByTestId('shot-plans').locator('.sd-modal');

    await expect(modal).toBeVisible();
    await expect(modal.locator('.sd-modal-title')).toHaveText('Floor Plans');
    await expect(modal.locator('.sd-item')).toHaveCount(3);
    await expect(modal.locator('.sd-item.is-active')).toHaveCount(1);
    await expect(modal.getByText('Import Plan')).toBeVisible();
    await expect(modal.getByText('New Floor Plan')).toBeVisible();
  });

  for (const [name, width] of [
    ['desktop', 1280],
    ['tablet', 820],
    ['mobile', 390],
  ] as const) {
    test(`does not scroll sideways on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(HOME);
      await page.waitForTimeout(200);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('shots scale down to fit their column', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(HOME);

    for (const id of ['shot-draw', 'shot-properties', 'shot-plans']) {
      const fit = page.getByTestId(id);
      const box = await fit.boundingBox();
      expect(box, `${id} has no layout box`).not.toBeNull();
      expect(box!.width).toBeLessThanOrEqual(390);
    }
  });

  test('links into the app', async ({ page }) => {
    await page.goto(HOME);
    await expect(page.locator('a[href="/app"]').first()).toBeVisible();
  });
});
