import { test, expect } from '@playwright/test';
import {
  setup,
  drawBox,
  canvasCenter,
  getActivePlanElements,
  getCanvasZoom,
  getCanvasPan,
  simulatePinch,
  simulateTwist,
} from './helpers';

test.describe('Touch gestures', () => {
  test.beforeEach(({ page }) => setup(page));

  test('canvas has touch-action none to prevent browser interference', async ({ page }) => {
    const touchAction = await page
      .getByTestId('drawing-canvas')
      .evaluate((el) => window.getComputedStyle(el).touchAction);
    expect(touchAction).toBe('none');
  });

  test('two-finger pinch-out zooms in', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    const before = await getCanvasZoom(page);

    await simulatePinch(page, { midX: centerX, midY: centerY, startRadius: 40, endRadius: 120 });

    const after = await getCanvasZoom(page);
    expect(after).toBeGreaterThan(before);
  });

  test('two-finger pinch-in zooms out', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    // Start zoomed in so there is room to zoom out
    await simulatePinch(page, { midX: centerX, midY: centerY, startRadius: 40, endRadius: 160 });
    const before = await getCanvasZoom(page);

    await simulatePinch(page, { midX: centerX, midY: centerY, startRadius: 160, endRadius: 40 });

    const after = await getCanvasZoom(page);
    expect(after).toBeLessThan(before);
  });

  test('two-finger translate pans the canvas', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    const before = await getCanvasPan(page);

    // Move both fingers 80px to the right without changing pinch distance
    await simulatePinch(page, {
      midX: centerX,
      midY: centerY,
      startRadius: 60,
      endRadius: 60,
      deltaX: 80,
      deltaY: 0,
    });

    const after = await getCanvasPan(page);
    expect(after.x).toBeGreaterThan(before.x);
  });

  test('two-finger gesture does not place a wall segment', async ({ page }) => {
    // Wall tool is active by default
    const { centerX, centerY } = await canvasCenter(page);
    const elementsBefore = await getActivePlanElements(page);

    await simulatePinch(page, { midX: centerX, midY: centerY, startRadius: 40, endRadius: 120 });

    await expect.poll(() => getActivePlanElements(page)).toHaveLength(elementsBefore.length);
  });
});

test.describe('Mobile selection UX', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('tapping a box on mobile shows mobile selection bar instead of properties panel', async ({
    page,
  }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('mobile-selection-bar')).toBeVisible();
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });

  test('toolbar hides when selection bar is visible and reappears on deselect', async ({
    page,
  }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    const { box: canvasBox } = await canvasCenter(page);

    // Select box — toolbar should hide
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('mobile-selection-bar')).toBeVisible();
    await expect(page.getByTestId('drawing-toolbar')).toBeHidden();

    // Click empty upper-left corner of canvas (well away from the box) to deselect
    await page.mouse.click(canvasBox.x + 20, canvasBox.y + 20);
    await expect(page.getByTestId('mobile-selection-bar')).not.toBeVisible();
    await expect(page.getByTestId('drawing-toolbar')).toBeVisible();
  });

  test('tapping Edit opens properties panel and bar switches to Cancel/Done mode', async ({
    page,
  }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await page.getByTestId('mobile-selection-edit').click();
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await expect(page.getByTestId('mobile-selection-bar')).toBeVisible();
    await expect(page.getByTestId('mobile-selection-cancel')).toBeVisible();
    await expect(page.getByTestId('mobile-selection-done')).toBeVisible();
  });

  test('tapping Done closes properties panel and returns to selection bar', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await page.getByTestId('mobile-selection-edit').click();
    await page.getByTestId('mobile-selection-done').click();
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
    await expect(page.getByTestId('mobile-selection-edit')).toBeVisible();
  });

  test('tapping Cancel reverts property changes and closes the panel', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await page.getByTestId('mobile-selection-edit').click();

    const widthInput = page.getByTestId('box-width-input');
    const originalWidth = await widthInput.inputValue();
    await widthInput.fill("20'");
    await widthInput.press('Enter');
    expect(await widthInput.inputValue()).toBe("20'");

    await page.getByTestId('mobile-selection-cancel').click();
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
    await expect(page.getByTestId('mobile-selection-edit')).toBeVisible();

    // Re-open panel and confirm value was restored
    await page.getByTestId('mobile-selection-edit').click();
    await expect(page.getByTestId('box-width-input')).toHaveValue(originalWidth);
  });

  test('tapping Delete in the mobile selection bar removes the element', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await page.getByTestId('mobile-selection-delete').click();
    const elements = await getActivePlanElements(page);
    expect(elements).toHaveLength(0);
  });

  test('undo is enabled after drawing and redo is disabled until after an undo', async ({
    page,
  }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('mobile-selection-undo')).toBeEnabled();
    await expect(page.getByTestId('mobile-selection-redo')).toBeDisabled();
  });

  test('undo and redo buttons work for rotation without leaving the bar', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);

    await simulateTwist(page, { midX: centerX, midY: centerY, radius: 60, endAngle: 90 });
    await expect.poll(async () => (await getActivePlanElements(page))[0]?.rotation).toBe(90);

    await page.getByTestId('mobile-selection-undo').click();
    await expect.poll(async () => (await getActivePlanElements(page))[0]?.rotation).toBe(0);
    await expect(page.getByTestId('mobile-selection-redo')).toBeEnabled();

    await page.getByTestId('mobile-selection-redo').click();
    await expect.poll(async () => (await getActivePlanElements(page))[0]?.rotation).toBe(90);
  });
});

test.describe('Two-finger rotation', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('two-finger twist rotates the selected box', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);

    const before = await getActivePlanElements(page);
    expect(before[0].rotation).toBe(0);

    await simulateTwist(page, { midX: centerX, midY: centerY, radius: 60, endAngle: 90 });
    await expect.poll(async () => (await getActivePlanElements(page))[0]?.rotation).toBe(90);
  });

  test('two-finger twist rotation undoes in a single step', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);

    await simulateTwist(page, { midX: centerX, midY: centerY, radius: 60, endAngle: 90 });
    await expect.poll(async () => (await getActivePlanElements(page))[0]?.rotation).toBe(90);

    // One undo step should restore original rotation
    await page.keyboard.press('Meta+z');
    await expect.poll(async () => (await getActivePlanElements(page))[0]?.rotation).toBe(0);
  });

  test('two-finger pinch-zoom still works when no box is selected', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    const before = await getCanvasZoom(page);
    await simulatePinch(page, { midX: centerX, midY: centerY, startRadius: 40, endRadius: 120 });
    const after = await getCanvasZoom(page);
    expect(after).toBeGreaterThan(before);
  });
});
