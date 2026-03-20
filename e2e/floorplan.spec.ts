import { test, expect, type Page } from '@playwright/test';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function setup(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await dismissHelp(page);
}

async function dismissHelp(page: Page) {
  const help = page.getByTestId('help-overlay');
  if (await help.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(help).not.toBeVisible();
  }
}

/** Returns the center of the canvas and helpers for drawing at offsets from it. */
async function canvasCenter(page: Page) {
  const canvas = page.getByTestId('drawing-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return { cx, cy, box };
}

/** Draw a box by dragging (in box tool mode). Returns the center of the drawn box. */
async function drawBox(page: Page, ox = 0, oy = 0, w = 160, h = 120) {
  await page.getByTestId('tool-box').click();
  const { cx, cy } = await canvasCenter(page);
  const x0 = cx + ox;
  const y0 = cy + oy;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + w, y0 + h, { steps: 10 });
  await page.mouse.up();
  return { centerX: x0 + w / 2, centerY: y0 + h / 2 };
}

/** Click twice on canvas to draw a wall segment (in wall tool mode). */
async function drawWall(page: Page, x1: number, y1: number, x2: number, y2: number) {
  await page.getByTestId('tool-wall').click();
  await page.mouse.move(x1, y1);
  await page.mouse.click(x1, y1);
  await page.mouse.move(x2, y2);
  await page.mouse.click(x2, y2);
  // End chain with Escape so next actions are clean
  await page.keyboard.press('Escape');
}

async function getActivePlanElements(page: Page) {
  return page.evaluate(() => {
    const plans = JSON.parse(localStorage.getItem('snapdraft_floorplans') || '[]');
    const activeId = localStorage.getItem('snapdraft_active');
    return plans.find((plan: { id: string }) => plan.id === activeId)?.elements ?? [];
  });
}

async function clickWallMidpoint(page: Page, wallIndex = 0) {
  const elements = await getActivePlanElements(page);
  const walls = elements.filter(
    (element: {
      type: string;
      points?: Array<{ x: number; y: number }>;
    }) => element.type === 'wall' && element.points && element.points.length >= 2,
  );
  const wall = walls[wallIndex];
  if (!wall || !wall.points) throw new Error(`Wall ${wallIndex} not found`);

  const start = wall.points[0];
  const end = wall.points[1];
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
  const { box } = await canvasCenter(page);
  await page.mouse.click(box.x + midpoint.x * 40, box.y + midpoint.y * 40);
}

// ─── App shell ───────────────────────────────────────────────────────────────

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

  test('toolbar fits within an iPhone SE portrait viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.reload();
    const help = page.getByTestId('help-overlay');
    if (await help.isVisible()) {
      await page.keyboard.press('Escape');
    }

    const toolbar = page.locator('[role="toolbar"]');
    await expect(toolbar).toBeVisible();
    const box = await toolbar.boundingBox();
    const metrics = await toolbar.evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        overflowX: computed.overflowX,
      };
    });
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    expect(box!.y + box!.height).toBeLessThanOrEqual(568);
    expect(metrics.overflowX).toBe('auto');
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  });

  test('fit button sits above the toolbar on an iPhone SE portrait viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.reload();
    const help = page.getByTestId('help-overlay');
    if (await help.isVisible()) {
      await page.keyboard.press('Escape');
    }

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
    await page.setViewportSize({ width: 320, height: 568 });
    await page.reload();
    const help = page.getByTestId('help-overlay');
    if (await help.isVisible()) {
      await page.keyboard.press('Escape');
    }

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

// ─── Tool switching ───────────────────────────────────────────────────────────

test.describe('Tool switching', () => {
  test.beforeEach(({ page }) => setup(page));

  test('toolbar clicks switch tools', async ({ page }) => {
    await page.getByTestId('tool-box').click();
    await expect(page.getByTestId('tool-box')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('tool-select').click();
    await expect(page.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true');
  });

  test('keyboard shortcuts S/W/B switch tools', async ({ page }) => {
    await page.keyboard.press('s');
    await expect(page.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('b');
    await expect(page.getByTestId('tool-box')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('w');
    await expect(page.getByTestId('tool-wall')).toHaveAttribute('aria-pressed', 'true');
  });
});

// ─── Help overlay ─────────────────────────────────────────────────────────────

test.describe('Help overlay', () => {
  test.beforeEach(({ page }) => setup(page));

  test('opens and closes with Escape', async ({ page }) => {
    await page.getByTestId('tool-help').click();
    await expect(page.getByTestId('help-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('help-overlay')).not.toBeVisible();
  });

  test('closes by clicking backdrop', async ({ page }) => {
    await page.getByTestId('tool-help').click();
    await page.getByTestId('help-overlay').click({ position: { x: 10, y: 10 } });
    await expect(page.getByTestId('help-overlay')).not.toBeVisible();
  });

  test('shows browser save note and hides advanced help by default', async ({ page }) => {
    await page.getByTestId('tool-help').click();
    await expect(page.getByTestId('help-save-note')).toContainText(
      'saved automatically in this browser',
    );
    await expect(page.getByText('Advanced shortcuts and tips')).toBeVisible();
    await expect(page.getByText('Undo / Redo')).not.toBeVisible();
  });
});

// ─── Floor plan management ────────────────────────────────────────────────────

test.describe('Floor plan management', () => {
  test.beforeEach(({ page }) => setup(page));

  test('can create a new plan', async ({ page }) => {
    await page.getByTestId('plans-button').click();
    await expect(page.getByTestId('floorplan-manager')).toBeVisible();
    await page.getByTestId('create-plan').click();
    await expect(page.getByTestId('floorplan-manager')).not.toBeVisible();
  });

  test('can rename a plan by double-clicking its name', async ({ page }) => {
    await page.getByTestId('plan-name-btn').dblclick();
    const input = page.getByTestId('plan-name-input');
    await expect(input).toBeVisible();
    await input.fill('My Living Room');
    await input.press('Enter');
    await expect(page.getByTestId('plan-name-btn')).toContainText('My Living Room');
  });
});

// ─── Box drawing ──────────────────────────────────────────────────────────────

test.describe('Box drawing', () => {
  test.beforeEach(({ page }) => setup(page));

  test('drag creates a box and shows properties panel', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
  });

  test('properties panel shows Box title for a box', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).toContainText('Box');
  });

  test('can edit box width in properties panel', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    const widthInput = page.getByTestId('box-width-input');
    await widthInput.fill("10'");
    await widthInput.press('Enter');
    await expect(widthInput).toHaveValue("10'");
  });

  test('can edit box height in properties panel', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    const heightInput = page.getByTestId('box-height-input');
    await heightInput.fill("5'");
    await heightInput.press('Enter');
    await expect(heightInput).toHaveValue("5'");
  });

  test('can edit box rotation in properties panel', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    const rotInput = page.getByTestId('box-rotation-input');
    await rotInput.fill('45');
    await rotInput.press('Enter');
    await expect(rotInput).toHaveValue('45');
  });

  test('can delete a box from properties panel', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await page.getByTestId('delete-element').click();
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });

  test('delete key removes selected box', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await page.keyboard.press('Delete');
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });

  test('clicking empty canvas deselects', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await page.getByTestId('drawing-canvas').click({ position: { x: 40, y: 40 } });
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });
});

// ─── Wall drawing ─────────────────────────────────────────────────────────────

test.describe('Wall drawing', () => {
  test.beforeEach(({ page }) => setup(page));

  test('two clicks draw a wall that shows properties panel', async ({ page }) => {
    const { cx, cy } = await canvasCenter(page);
    await page.getByTestId('tool-wall').click();
    await page.mouse.move(cx - 80, cy);
    await page.mouse.click(cx - 80, cy);
    await page.mouse.move(cx + 80, cy);
    await page.mouse.click(cx + 80, cy);
    await page.keyboard.press('Escape');

    // Select the wall
    await page.getByTestId('tool-select').click();
    await clickWallMidpoint(page);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await expect(page.getByTestId('properties-panel')).toContainText('Wall');
  });

  test('dimension input appears when chain is armed', async ({ page }) => {
    const { cx, cy } = await canvasCenter(page);
    await page.getByTestId('tool-wall').click();
    await page.mouse.move(cx, cy);
    await page.mouse.click(cx, cy);
    // Dim input should appear and auto-focus
    await expect(page.getByTestId('dim-input')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('typing exact length in dimension input places wall at that length', async ({ page }) => {
    const { cx, cy } = await canvasCenter(page);
    await page.getByTestId('tool-wall').click();
    await page.mouse.move(cx, cy);
    await page.mouse.click(cx, cy);

    // Move cursor right to set direction
    await page.mouse.move(cx + 200, cy);

    // Type exact length and commit
    const dimInput = page.getByTestId('dim-input');
    await dimInput.fill("5'");
    await dimInput.press('Enter');

    // End chain and select the wall
    await page.keyboard.press('Escape');
    await page.getByTestId('tool-select').click();
    await clickWallMidpoint(page);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    // Length should be 5'
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
    const { cx, cy } = await canvasCenter(page);
    await page.getByTestId('tool-wall').click();
    await page.mouse.click(cx, cy);
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

  test('can edit wall length in properties panel', async ({ page }) => {
    const { cx, cy } = await canvasCenter(page);
    await drawWall(page, cx - 80, cy, cx + 80, cy);
    await page.getByTestId('tool-select').click();
    await clickWallMidpoint(page);
    const lengthInput = page.getByTestId('wall-length-input');
    await lengthInput.fill("10'");
    await lengthInput.press('Enter');
    await expect(lengthInput).toHaveValue("10'");
  });

  test('can delete a wall from properties panel', async ({ page }) => {
    const { cx, cy } = await canvasCenter(page);
    await drawWall(page, cx - 80, cy, cx + 80, cy);
    await page.getByTestId('tool-select').click();
    await clickWallMidpoint(page);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await page.getByTestId('delete-element').click();
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });
});

// ─── Multi-select ─────────────────────────────────────────────────────────────

test.describe('Multi-select', () => {
  test.beforeEach(({ page }) => setup(page));

  test('marquee-selecting two boxes shows multi-select bar', async ({ page }) => {
    // Draw two boxes side by side
    await drawBox(page, -200, -60, 80, 80);
    await drawBox(page, 80, -60, 80, 80);

    // Marquee-select both
    await page.getByTestId('tool-select').click();
    const { cx, cy } = await canvasCenter(page);
    await page.mouse.move(cx - 240, cy - 100);
    await page.mouse.down();
    await page.mouse.move(cx + 200, cy + 60, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByTestId('multi-select-bar')).toBeVisible();
    await expect(page.getByTestId('multi-select-bar')).toContainText('2');
  });

  test('Delete all removes all selected elements', async ({ page }) => {
    await drawBox(page, -200, -60, 80, 80);
    await drawBox(page, 80, -60, 80, 80);

    await page.getByTestId('tool-select').click();
    const { cx, cy } = await canvasCenter(page);
    await page.mouse.move(cx - 240, cy - 100);
    await page.mouse.down();
    await page.mouse.move(cx + 200, cy + 60, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByTestId('multi-select-bar')).toBeVisible();
    await page.getByTestId('delete-selected').click();
    await expect(page.getByTestId('multi-select-bar')).not.toBeVisible();
  });

  test('Delete all is undone in a single step', async ({ page }) => {
    const firstBox = await drawBox(page, -200, -60, 80, 80);
    const secondBox = await drawBox(page, 80, -60, 80, 80);

    await page.getByTestId('tool-select').click();
    const { cx, cy } = await canvasCenter(page);
    await page.mouse.move(cx - 240, cy - 100);
    await page.mouse.down();
    await page.mouse.move(cx + 200, cy + 60, { steps: 10 });
    await page.mouse.up();

    await page.getByTestId('delete-selected').click();
    await expect(page.getByTestId('multi-select-bar')).not.toBeVisible();

    await page.keyboard.press('Meta+z');
    // Wait for React to commit the undo state change before clicking
    await expect(page.getByTestId('tool-redo')).not.toBeDisabled();

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

// ─── Undo / Redo ─────────────────────────────────────────────────────────────

test.describe('Undo and Redo', () => {
  test.beforeEach(({ page }) => setup(page));

  test('undo becomes enabled after drawing', async ({ page }) => {
    await expect(page.getByTestId('tool-undo')).toBeDisabled();
    await drawBox(page);
    await expect(page.getByTestId('tool-undo')).toBeEnabled();
  });

  test('undo removes a drawn box (properties panel disappears)', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();

    // Undo via toolbar button
    await page.getByTestId('tool-undo').click();
    // Box gone — clicking where it was should deselect
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });

  test('redo re-adds the box after undo', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-undo').click();
    await expect(page.getByTestId('tool-redo')).toBeEnabled();
    await page.getByTestId('tool-redo').click();

    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
  });

  test('Cmd+Z / Cmd+Shift+Z keyboard shortcuts work', async ({ page }) => {
    await drawBox(page);
    await expect(page.getByTestId('tool-undo')).toBeEnabled();
    await page.keyboard.press('Meta+z');
    await expect(page.getByTestId('tool-undo')).toBeDisabled();
    await expect(page.getByTestId('tool-redo')).toBeEnabled();
    await page.keyboard.press('Meta+Shift+z');
    await expect(page.getByTestId('tool-undo')).toBeEnabled();
  });

  test('drawing after undo clears redo history', async ({ page }) => {
    await drawBox(page);
    await page.getByTestId('tool-undo').click();
    await expect(page.getByTestId('tool-redo')).toBeEnabled();
    // Draw something new
    await drawBox(page, 100, 100);
    await expect(page.getByTestId('tool-redo')).toBeDisabled();
  });

  test('multi-select drag across walls and boxes is one undo step and persists across reload', async ({
    page,
  }) => {
    const leftBox = await drawBox(page, -260, -120);
    await drawBox(page, -20, -120);
    await drawBox(page, 220, -120);

    const { cx, cy } = await canvasCenter(page);
    await drawWall(page, cx - 260, cy + 120, cx - 80, cy + 120);
    await drawWall(page, cx + 20, cy + 120, cx + 200, cy + 120);

    const beforeDrag = await getActivePlanElements(page);

    await page.getByTestId('tool-select').click();
    await page.mouse.move(cx - 320, cy - 180);
    await page.mouse.down();
    await page.mouse.move(cx + 280, cy + 180, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByTestId('multi-select-bar')).toContainText('5');

    await page.mouse.move(leftBox.centerX, leftBox.centerY);
    await page.mouse.down();
    await page.mouse.move(leftBox.centerX + 120, leftBox.centerY + 80, { steps: 10 });
    await page.mouse.up();

    const afterDrag = await getActivePlanElements(page);
    expect(afterDrag).not.toEqual(beforeDrag);

    await page.keyboard.press('Meta+z');
    await expect.poll(async () => getActivePlanElements(page)).toEqual(beforeDrag);

    await page.keyboard.press('Meta+Shift+z');
    await expect.poll(async () => getActivePlanElements(page)).toEqual(afterDrag);

    await page.reload();
    const help = page.getByTestId('help-overlay');
    if (await help.isVisible()) {
      await page.keyboard.press('Escape');
    }
    await expect.poll(async () => getActivePlanElements(page)).toEqual(afterDrag);
  });
});

// ─── Arrow key movement ───────────────────────────────────────────────────────

test.describe('Arrow key movement', () => {
  test.beforeEach(({ page }) => setup(page));

  test('arrow keys move a selected box', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();

    // Press right arrow — box should still be selected (not deselected)
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('properties-panel')).toBeVisible();
  });

  test('arrow movement is undoable', async ({ page }) => {
    await drawBox(page);
    await page.getByTestId('tool-select').click();
    const { cx, cy } = await canvasCenter(page);
    await page.mouse.click(cx + 80, cy + 60);
    await page.keyboard.press('ArrowRight');

    // Two undo steps: one for the move, one for the draw
    await page.keyboard.press('Meta+z');
    await page.keyboard.press('Meta+z');
    await expect(page.getByTestId('tool-undo')).toBeDisabled();
  });
});

// ─── Measure tool ─────────────────────────────────────────────────────────────

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
    const { cx, cy } = await canvasCenter(page);
    await page.getByTestId('tool-measure').click();

    // First click: start point (body appears)
    await page.mouse.click(cx, cy);
    // Second click: end point (tape extends)
    await page.mouse.click(cx + 200, cy);

    // App still functional — toolbar is visible
    await expect(page.getByTestId('tool-measure')).toBeVisible();
  });

  test('Escape cancels an in-progress measurement', async ({ page }) => {
    const { cx, cy } = await canvasCenter(page);
    await page.getByTestId('tool-measure').click();

    await page.mouse.click(cx, cy);
    await page.keyboard.press('Escape');

    // After Escape, a fresh click starts a new measurement without error
    await page.mouse.click(cx + 50, cy + 50);
    await expect(page.getByTestId('tool-measure')).toBeVisible();
  });

  test('Escape after completed measurement clears it', async ({ page }) => {
    const { cx, cy } = await canvasCenter(page);
    await page.getByTestId('tool-measure').click();

    await page.mouse.click(cx, cy);
    await page.mouse.click(cx + 200, cy);
    await page.keyboard.press('Escape');

    // App still functional
    await expect(page.getByTestId('tool-measure')).toBeVisible();
  });

  test('does not mutate the floor plan', async ({ page }) => {
    const { cx, cy } = await canvasCenter(page);
    await page.getByTestId('tool-measure').click();

    await page.mouse.click(cx, cy);
    await page.mouse.click(cx + 200, cy);

    const elements = await getActivePlanElements(page);
    expect(elements).toHaveLength(0);
  });
});

// ─── Keyboard shortcuts in canvas ─────────────────────────────────────────────

test.describe('Canvas keyboard shortcuts', () => {
  test.beforeEach(({ page }) => setup(page));

  test('Backspace key deletes selected element', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await page.keyboard.press('Backspace');
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });

  test('Escape clears selection', async ({ page }) => {
    const { centerX, centerY } = await drawBox(page);
    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();
  });
});
