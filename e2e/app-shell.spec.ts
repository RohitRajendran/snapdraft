import { test, expect } from '@playwright/test';
import { setup, dismissHelp } from './helpers';

test.describe('App shell', () => {
  test.beforeEach(({ page }) => setup(page));

  test('loads and shows all UI regions', async ({ page }) => {
    await expect(page.getByTestId('drawing-canvas')).toBeVisible();
    await expect(page.getByTestId('tool-select')).toBeVisible();
    await expect(page.getByTestId('tool-wall')).toBeVisible();
    await expect(page.getByTestId('tool-box')).toBeVisible();
    await expect(page.getByTestId('tool-undo')).toBeVisible();
    await expect(page.getByTestId('tool-redo')).toBeVisible();
    await expect(page.getByTestId('tool-help')).toContainText('Help');
    await expect(page.getByTestId('scale-bar')).toBeVisible();
  });

  test('creates exactly one sample plan on first load', async ({ page }) => {
    const plans = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('snapdraft_floorplans') ?? '[]'),
    );
    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe('Bedroom');
    expect(plans[0].elements.length).toBeGreaterThan(0);
  });

  test('wall tool is active by default', async ({ page }) => {
    await expect(page.getByTestId('tool-wall')).toHaveAttribute('aria-pressed', 'true');
  });

  test('undo and redo start disabled', async ({ page }) => {
    await expect(page.getByTestId('tool-undo')).toBeDisabled();
    await expect(page.getByTestId('tool-redo')).toBeDisabled();
  });

  test('scale bar shows 1 sq ft label', async ({ page }) => {
    await expect(page.getByTestId('scale-bar')).toContainText('1');
  });

  test.describe('iPhone SE portrait viewport', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.reload();
      await dismissHelp(page);
    });

    test('toolbar fits within an iPhone SE portrait viewport', async ({ page }) => {
      const toolbar = page.locator('[role="toolbar"]');
      await expect(toolbar).toBeVisible();
      const toolbarBox = await toolbar.boundingBox();
      const metrics = await toolbar.evaluate((element) => {
        const computed = window.getComputedStyle(element);
        return {
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          overflowX: computed.overflowX,
        };
      });
      expect(toolbarBox).not.toBeNull();
      expect(toolbarBox!.x).toBeGreaterThanOrEqual(0);
      expect(toolbarBox!.y).toBeGreaterThanOrEqual(0);
      expect(toolbarBox!.x + toolbarBox!.width).toBeLessThanOrEqual(320);
      expect(toolbarBox!.y + toolbarBox!.height).toBeLessThanOrEqual(568);
      expect(metrics.overflowX).toBe('auto');
      expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
    });

    test('fit button sits above the toolbar on an iPhone SE portrait viewport', async ({ page }) => {
      const fitButton = page.getByTestId('fit-to-content');
      const toolbar = page.locator('[role="toolbar"]');
      await expect(fitButton).toBeVisible();
      await expect(toolbar).toBeVisible();

      const fitBox = await fitButton.boundingBox();
      const toolbarBox = await toolbar.boundingBox();
      expect(fitBox).not.toBeNull();
      expect(toolbarBox).not.toBeNull();
      expect(fitBox!.y + fitBox!.height).toBeLessThanOrEqual(toolbarBox!.y - 8);
    });

    test('scale bar sits above the toolbar on an iPhone SE portrait viewport', async ({ page }) => {
      const scaleBar = page.getByTestId('scale-bar');
      const toolbar = page.locator('[role="toolbar"]');
      await expect(scaleBar).toBeVisible();
      await expect(toolbar).toBeVisible();

      const scaleBox = await scaleBar.boundingBox();
      const toolbarBox = await toolbar.boundingBox();
      expect(scaleBox).not.toBeNull();
      expect(toolbarBox).not.toBeNull();
      expect(scaleBox!.y + scaleBox!.height).toBeLessThanOrEqual(toolbarBox!.y - 8);
    });
  });
});
