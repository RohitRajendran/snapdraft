import { test, expect } from '@playwright/test';
import { setup, dismissHelp, canvasCenter, drawWall, getActivePlanElements, clickWallMidpoint } from './helpers';

test.describe('Wall drawing', () => {
  test.beforeEach(({ page }) => setup(page));

  test('two clicks draw a wall that shows properties panel', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    await page.getByTestId('tool-wall').click();
    await page.mouse.move(centerX - 80, centerY);
    await page.mouse.click(centerX - 80, centerY);
    await page.mouse.move(centerX + 80, centerY);
    await page.mouse.click(centerX + 80, centerY);
    await page.keyboard.press('Escape');

    await page.getByTestId('tool-select').click();
    await clickWallMidpoint(page);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await expect(page.getByTestId('properties-panel')).toContainText('Wall');
  });

  test('dimension input appears when chain is armed', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    await page.getByTestId('tool-wall').click();
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('dim-input')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('typing exact length in dimension input places wall at that length', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    await page.getByTestId('tool-wall').click();
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    // Move cursor right to set direction
    await page.mouse.move(centerX + 200, centerY);

    const dimInput = page.getByTestId('dim-input');
    await dimInput.fill("5'");
    await dimInput.press('Enter');

    await page.keyboard.press('Escape');
    await page.getByTestId('tool-select').click();
    await clickWallMidpoint(page);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await expect(page.getByTestId('wall-length-input')).toHaveValue("5'");
  });

  test('wall drawing snaps to inches by default', async ({ page }) => {
    await page.getByTestId('tool-wall').click();
    const canvas = page.getByTestId('drawing-canvas');
    await canvas.click({ position: { x: 40, y: 40 } });
    await canvas.click({ position: { x: 88, y: 40 } });
    await page.keyboard.press('Escape');

    const elements = await getActivePlanElements(page);
    const wall = elements.find(
      (element: { type: string; points?: Array<{ x: number; y: number }> }) =>
        element.type === 'wall',
    );
    expect(wall).toBeTruthy();
    expect(wall.points[0].x).toBeCloseTo(1);
    expect(wall.points[1].x).toBeCloseTo(26 / 12);
  });

  test('holding Shift snaps wall drawing to quarter inches', async ({ page }) => {
    await page.getByTestId('tool-wall').click();
    const canvas = page.getByTestId('drawing-canvas');
    await canvas.click({ position: { x: 40, y: 40 }, modifiers: ['Shift'] });
    await canvas.click({ position: { x: 88, y: 40 }, modifiers: ['Shift'] });
    await page.keyboard.press('Escape');

    const elements = await getActivePlanElements(page);
    const wall = elements.find(
      (element: { type: string; points?: Array<{ x: number; y: number }> }) =>
        element.type === 'wall',
    );
    expect(wall).toBeTruthy();
    expect(wall.points[0].x).toBeCloseTo(1);
    expect(wall.points[1].x).toBeCloseTo(106 / 48);
  });

  test('Escape ends wall chain', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    await page.getByTestId('tool-wall').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('dim-input')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('dim-input')).not.toBeVisible();
  });

  test('mobile wall length edits the last placed wall and can finish a chain', async ({ page }) => {
    const originalViewport = page.viewportSize();
    try {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await dismissHelp(page);

      await page.getByTestId('tool-wall').click();
      const canvas = page.getByTestId('drawing-canvas');
      await canvas.click({ position: { x: 40, y: 40 } });
      await canvas.click({ position: { x: 120, y: 40 } });

      await expect(page.getByTestId('mobile-wall-controls')).toBeVisible();
      await expect(page.getByTestId('dim-input')).not.toBeVisible();

      await page.getByTestId('mobile-wall-length').click();
      const dimInput = page.getByTestId('dim-input');
      await expect(dimInput).toBeVisible();
      await dimInput.fill("5'");
      await dimInput.press('Enter');
      await expect(dimInput).not.toBeVisible();

      await page.getByTestId('mobile-wall-done').click();
      await expect(page.getByTestId('mobile-wall-controls')).not.toBeVisible();

      const elements = await getActivePlanElements(page);
      const wall = elements.find(
        (element: { type: string; points?: Array<{ x: number; y: number }> }) =>
          element.type === 'wall',
      );
      expect(wall).toBeTruthy();
      expect(wall.points[0].x).toBeCloseTo(1);
      expect(wall.points[1].x).toBeCloseTo(6);
    } finally {
      if (originalViewport) {
        await page.setViewportSize(originalViewport);
      }
    }
  });

  test('mobile wall cancel removes the latest segment and exits drawing', async ({ page }) => {
    const originalViewport = page.viewportSize();
    try {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await dismissHelp(page);

      await page.getByTestId('tool-wall').click();
      const canvas = page.getByTestId('drawing-canvas');
      await canvas.click({ position: { x: 40, y: 40 } });
      await canvas.click({ position: { x: 120, y: 40 } });

      await expect(page.getByTestId('mobile-wall-controls')).toBeVisible();
      await page.getByTestId('mobile-wall-cancel').click();
      await expect(page.getByTestId('mobile-wall-controls')).not.toBeVisible();
      await expect(page.getByTestId('dim-input')).not.toBeVisible();

      const elements = await getActivePlanElements(page);
      expect(elements).toHaveLength(0);
    } finally {
      if (originalViewport) {
        await page.setViewportSize(originalViewport);
      }
    }
  });

  test('dragging a wall endpoint moves it without crashing', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    await drawWall(page, centerX - 80, centerY, centerX + 80, centerY);
    await page.getByTestId('tool-select').click();
    await clickWallMidpoint(page);

    const before = await getActivePlanElements(page);
    const beforeLength = Math.abs(before[0].points[1].x - before[0].points[0].x);

    // Drag the right endpoint further right
    await page.mouse.move(centerX + 80, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 160, centerY, { steps: 10 });
    await page.mouse.up();

    const after = await getActivePlanElements(page);
    const afterLength = Math.abs(after[0].points[1].x - after[0].points[0].x);
    expect(afterLength).toBeGreaterThan(beforeLength);
  });

  test('can edit wall length in properties panel', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    await drawWall(page, centerX - 80, centerY, centerX + 80, centerY);
    await page.getByTestId('tool-select').click();
    await clickWallMidpoint(page);
    const lengthInput = page.getByTestId('wall-length-input');
    await lengthInput.fill("10'");
    await lengthInput.press('Enter');
    await expect(lengthInput).toHaveValue("10'");
  });

  test('can delete a wall from properties panel', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    await drawWall(page, centerX - 80, centerY, centerX + 80, centerY);
    await page.getByTestId('tool-select').click();
    await clickWallMidpoint(page);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await page.getByTestId('delete-element').click();
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });
});
