import { test, expect } from '@playwright/test';
import { setupEmpty, canvasCenter, drawWall, getActivePlanElements } from './helpers';

// Place a window at the centre of a 10ft horizontal wall and switch to select, ready to drag.
async function placeWindowAtCenter(page: Parameters<typeof setupEmpty>[0]) {
  await setupEmpty(page);
  const { centerX, centerY } = await canvasCenter(page);
  await drawWall(page, centerX - 200, centerY, centerX + 200, centerY);
  await page.keyboard.press('n');
  await page.mouse.move(centerX, centerY);
  await page.mouse.click(centerX, centerY);
  // Switch to select so the opening's hit rect becomes draggable.
  await page.keyboard.press('v');
  return { centerX, centerY };
}

// Draw a horizontal 10ft wall centred on the canvas, return its screen midpoint
async function drawTestWall(page: Parameters<typeof drawWall>[0]) {
  const { centerX, centerY } = await canvasCenter(page);
  // At zoom=1, 1ft = 40px. Draw a wall 200px (5ft) left to 200px (5ft) right of centre
  const x1 = centerX - 200;
  const x2 = centerX + 200;
  await drawWall(page, x1, centerY, x2, centerY);
  return { wallMidX: centerX, wallMidY: centerY };
}

test.describe('openings', () => {
  test('place door with D shortcut adds a door element', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    // Press D to activate door tool
    await page.keyboard.press('d');
    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('data-active-tool', 'door');

    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    const elements = await getActivePlanElements(page);
    const doors = elements.filter((el: { type: string }) => el.type === 'door');
    expect(doors).toHaveLength(1);
  });

  test('place window with N shortcut adds a window element', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    await page.keyboard.press('n');
    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('data-active-tool', 'window');

    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX + 40, centerY);
    await page.mouse.click(centerX + 40, centerY);

    const elements = await getActivePlanElements(page);
    const windows = elements.filter((el: { type: string }) => el.type === 'window');
    expect(windows).toHaveLength(1);
  });

  test('placing a door selects it and opens properties panel', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    await page.keyboard.press('d');
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await expect(page.getByTestId('properties-panel')).toContainText('Door');
  });

  test('door properties panel shows width input and facing toggles', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    await page.keyboard.press('d');
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    await expect(page.getByTestId('opening-width-input')).toBeVisible();
    await expect(page.getByTestId('facing-left')).toBeVisible();
    await expect(page.getByTestId('facing-right')).toBeVisible();
  });

  test('window properties panel has no facing toggles', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    await page.keyboard.press('n');
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    await expect(page.getByTestId('opening-width-input')).toBeVisible();
    await expect(page.getByTestId('facing-left')).not.toBeVisible();
    await expect(page.getByTestId('facing-right')).not.toBeVisible();
  });

  test('toggle door facing persists to localStorage', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    await page.keyboard.press('d');
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    await page.getByTestId('facing-right').click();

    const elements = await getActivePlanElements(page);
    const door = elements.find((el: { type: string }) => el.type === 'door');
    expect(door?.facing).toBe('right');
  });

  test('toggle door hinge persists to localStorage', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    await page.keyboard.press('d');
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    // Default hinge should be start; hinge toggles should be visible for doors
    await expect(page.getByTestId('hinge-start')).toBeVisible();
    await expect(page.getByTestId('hinge-end')).toBeVisible();

    await page.getByTestId('hinge-end').click();

    const elements = await getActivePlanElements(page);
    const door = elements.find((el: { type: string }) => el.type === 'door');
    expect(door?.hinge).toBe('end');
  });

  test('door hinge defaults to start and can round-trip back', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    await page.keyboard.press('d');
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    // New door stored with hinge=start
    let elements = await getActivePlanElements(page);
    let door = elements.find((el: { type: string }) => el.type === 'door');
    expect(door?.hinge).toBe('start');

    // Toggle to end then back to start
    await page.getByTestId('hinge-end').click();
    await page.getByTestId('hinge-start').click();

    elements = await getActivePlanElements(page);
    door = elements.find((el: { type: string }) => el.type === 'door');
    expect(door?.hinge).toBe('start');
  });

  test('window properties panel has no hinge toggles', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    await page.keyboard.press('n');
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    await expect(page.getByTestId('hinge-start')).not.toBeVisible();
    await expect(page.getByTestId('hinge-end')).not.toBeVisible();
  });

  test('delete door via properties panel removes it', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    await page.keyboard.press('d');
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    await page.getByTestId('delete-element').click();

    const elements = await getActivePlanElements(page);
    const doors = elements.filter((el: { type: string }) => el.type === 'door');
    expect(doors).toHaveLength(0);
  });

  test('deleting host wall also removes its door', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    await page.keyboard.press('d');
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    // Should have 1 wall + 1 door
    let elements = await getActivePlanElements(page);
    expect(elements).toHaveLength(2);

    // Switch to select, then click the wall outside the door's hit area (door is near center,
    // so click 150px to the left to hit the wall segment without the opening)
    await page.getByTestId('tool-select-pan').click();
    await page.mouse.click(centerX - 300, centerY); // click empty canvas to deselect
    await page.mouse.click(centerX - 150, centerY); // click wall away from door
    await page.keyboard.press('Delete');

    elements = await getActivePlanElements(page);
    expect(elements).toHaveLength(0);
  });

  test('delete door via keyboard Delete key removes it', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    await page.keyboard.press('d');
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    // Door is selected immediately after placement
    await page.keyboard.press('Delete');

    const elements = await getActivePlanElements(page);
    const doors = elements.filter((el: { type: string }) => el.type === 'door');
    expect(doors).toHaveLength(0);
  });

  test('door width change persists to localStorage', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    await page.keyboard.press('d');
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    // Fill a new width value and commit with Enter
    const widthInput = page.getByTestId('opening-width-input');
    await widthInput.fill("2'");
    await widthInput.press('Enter');

    const elements = await getActivePlanElements(page);
    const door = elements.find((el: { type: string }) => el.type === 'door');
    expect(door?.width).toBeCloseTo(2, 1);
  });

  test('door is re-selectable after deselection', async ({ page }) => {
    await setupEmpty(page);
    await drawTestWall(page);

    await page.keyboard.press('d');
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    // Read committed position
    const elements = await getActivePlanElements(page);
    const door = elements.find((el: { type: string }) => el.type === 'door');
    const doorScreenX = centerX - 200 + (door.offset + door.width / 2) * 40;

    // Switch to select and deselect with Escape
    await page.keyboard.press('v');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();

    // Click the door gap — should reselect and show properties panel
    await page.mouse.click(doorScreenX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await expect(page.getByTestId('properties-panel')).toContainText('Door');
  });

  test('Wall/Door/Window group shows in toolbar', async ({ page }) => {
    await setupEmpty(page);
    await expect(page.getByTestId('tool-wall-group-toggle')).toBeVisible();
  });

  test('Door tool activates from toolbar dropdown', async ({ page }) => {
    await setupEmpty(page);
    await page.getByTestId('tool-wall-group-toggle').click();
    await page.getByTestId('tool-door').click();
    // Dropdown closes after selection; the main group button reflects the active tool.
    await expect(page.getByTestId('tool-wall-group')).toHaveAttribute('data-active-tool', 'door');
  });
});

test.describe('window auto-sizing', () => {
  test('window resizes to fill a slot narrower than the default width', async ({ page }) => {
    // Draw a 5ft wall (200px at zoom 1), place a 3ft door at center, which leaves 1ft
    // on each side. A window placed in either slot should auto-size to 1ft.
    await setupEmpty(page);
    const { centerX, centerY } = await canvasCenter(page);
    await drawWall(page, centerX - 100, centerY, centerX + 100, centerY);

    // Place door at wall center → 3ft door at offset 1ft, occupying [1ft, 4ft]
    await page.keyboard.press('d');
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    // Switch to window, hover in the 1ft left slot (20px from wall left edge = 0.5ft from start)
    await page.keyboard.press('n');
    await page.mouse.move(centerX - 80, centerY); // 0.5ft from wall start
    await page.mouse.click(centerX - 80, centerY);

    const elements = await getActivePlanElements(page);
    const win = elements.find((el: { type: string }) => el.type === 'window');
    // Slot is 1ft wide → window auto-sizes to 1ft, not the 3ft default
    expect(win).toBeDefined();
    expect(win.width).toBeCloseTo(1, 1);
  });

  test('window uses default width when slot is large enough', async ({ page }) => {
    // 10ft wall, 3ft door at center leaves 3.5ft on each side — fits the 3ft default.
    await setupEmpty(page);
    const { centerX, centerY } = await canvasCenter(page);
    await drawWall(page, centerX - 200, centerY, centerX + 200, centerY);

    await page.keyboard.press('d');
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);

    // Left slot center: 1.75ft from start → screen centerX - 200 + 1.75*40 = centerX - 130
    await page.keyboard.press('n');
    await page.mouse.move(centerX - 130, centerY);
    await page.mouse.click(centerX - 130, centerY);

    const elements = await getActivePlanElements(page);
    const win = elements.find((el: { type: string }) => el.type === 'window');
    expect(win).toBeDefined();
    expect(win.width).toBeCloseTo(3, 1); // default width preserved
  });
});

test.describe('opening drag', () => {
  test('dragging a window along its wall updates its offset in storage', async ({ page }) => {
    const { centerX, centerY } = await placeWindowAtCenter(page);

    const elsBefore = await getActivePlanElements(page);
    const winBefore = elsBefore.find((el: { type: string }) => el.type === 'window');
    const offsetBefore = winBefore.offset as number;

    // Drag the window 80 px to the right (= 2 ft at zoom 1)
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 80, centerY, { steps: 8 });
    await page.mouse.up();

    const elsAfter = await getActivePlanElements(page);
    const winAfter = elsAfter.find((el: { type: string }) => el.type === 'window');
    expect(winAfter.offset).toBeGreaterThan(offsetBefore);
  });

  test('window is still clickable and selectable after being dragged', async ({ page }) => {
    const { centerX, centerY } = await placeWindowAtCenter(page);

    // Drag window 80 px to the right
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 80, centerY, { steps: 8 });
    await page.mouse.up();

    // Read committed position from storage
    const elsAfterDrag = await getActivePlanElements(page);
    const win = elsAfterDrag.find((el: { type: string }) => el.type === 'window');
    // Window center in screen coords: wall starts at centerX-200, so center = centerX-200 + (offset + width/2)*40
    const winScreenX = centerX - 200 + (win.offset + win.width / 2) * 40;

    // Deselect with Escape
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('properties-panel')).not.toBeVisible();

    // Click window at its committed screen position — should select and show properties panel
    await page.mouse.click(winScreenX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await expect(page.getByTestId('properties-panel')).toContainText('Window');
  });

  test('window offset is clamped when dragged past the wall end', async ({ page }) => {
    const { centerX, centerY } = await placeWindowAtCenter(page);

    // Drag far past the right end of the wall (wall ends 200 px right of center)
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 300, centerY, { steps: 10 });
    await page.mouse.up();

    const elements = await getActivePlanElements(page);
    const win = elements.find((el: { type: string }) => el.type === 'window');
    // Wall is 10 ft; opening must stay within [0, segLen - width]
    expect(win.offset).toBeGreaterThanOrEqual(0);
    expect(win.offset + win.width).toBeLessThanOrEqual(10 + 0.01);
  });

  test('dragging a door along its wall updates its offset in storage', async ({ page }) => {
    await setupEmpty(page);
    const { centerX, centerY } = await canvasCenter(page);
    await drawWall(page, centerX - 200, centerY, centerX + 200, centerY);
    await page.keyboard.press('d');
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);
    await page.keyboard.press('v'); // switch to select so the hit rect is draggable

    const elsBefore = await getActivePlanElements(page);
    const doorBefore = elsBefore.find((el: { type: string }) => el.type === 'door');
    const offsetBefore = doorBefore.offset as number;

    // Drag door 80 px to the left (= 2 ft at zoom 1)
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX - 80, centerY, { steps: 8 });
    await page.mouse.up();

    const elsAfter = await getActivePlanElements(page);
    const doorAfter = elsAfter.find((el: { type: string }) => el.type === 'door');
    expect(doorAfter.offset).toBeLessThan(offsetBefore);
  });

  test('door offset is clamped when dragged past the wall end', async ({ page }) => {
    await setupEmpty(page);
    const { centerX, centerY } = await canvasCenter(page);
    await drawWall(page, centerX - 200, centerY, centerX + 200, centerY);
    await page.keyboard.press('d');
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);
    await page.keyboard.press('v');

    // Drag far past the right end (wall ends 200 px right of center)
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 300, centerY, { steps: 10 });
    await page.mouse.up();

    const elements = await getActivePlanElements(page);
    const door = elements.find((el: { type: string }) => el.type === 'door');
    expect(door.offset).toBeGreaterThanOrEqual(0);
    expect(door.offset + door.width).toBeLessThanOrEqual(10 + 0.01);
  });

  test('dragging a door to the other side of the wall flips facing', async ({ page }) => {
    await setupEmpty(page);
    const { centerX, centerY } = await canvasCenter(page);
    await drawWall(page, centerX - 200, centerY, centerX + 200, centerY);

    // Place door slightly above the wall so initial facing is 'left'
    await page.keyboard.press('d');
    await page.mouse.move(centerX, centerY - 5);
    await page.mouse.click(centerX, centerY - 5);
    await page.keyboard.press('v');

    let elements = await getActivePlanElements(page);
    let door = elements.find((el: { type: string }) => el.type === 'door');
    expect(door.facing).toBe('left');

    const doorScreenX = centerX - 200 + (door.offset + door.width / 2) * 40;

    // Drag from the gap centre downward past the wall — cursor ends 40 px below the wall
    await page.mouse.move(doorScreenX, centerY);
    await page.mouse.down();
    await page.mouse.move(doorScreenX, centerY + 40, { steps: 8 });
    await page.mouse.up();

    elements = await getActivePlanElements(page);
    door = elements.find((el: { type: string }) => el.type === 'door');
    expect(door.facing).toBe('right');
  });

  test('door can be dragged from the arc and its offset updates', async ({ page }) => {
    await setupEmpty(page);
    const { centerX, centerY } = await canvasCenter(page);
    await drawWall(page, centerX - 200, centerY, centerX + 200, centerY);

    // Place door at centre; default facing='left' → arc extends above the wall
    await page.keyboard.press('d');
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);
    await page.keyboard.press('v');

    const elsBefore = await getActivePlanElements(page);
    const doorBefore = elsBefore.find((el: { type: string }) => el.type === 'door');
    const offsetBefore = doorBefore.offset as number;

    // Hinge is at the left edge of the gap: wall starts at centerX-200, gap starts at offset ft
    const hingeX = Math.round(centerX - 200 + doorBefore.offset * 40);

    // Start drag from inside the arc sector (20px right, 40px above the hinge — well within
    // the 3ft/120px radius and inside the quarter-circle sector)
    await page.mouse.move(hingeX + 20, centerY - 40);
    await page.mouse.down();
    // Drag 80 px to the right along the wall
    await page.mouse.move(hingeX + 100, centerY - 40, { steps: 8 });
    await page.mouse.up();

    const elsAfter = await getActivePlanElements(page);
    const doorAfter = elsAfter.find((el: { type: string }) => el.type === 'door');
    expect(doorAfter.offset).toBeGreaterThan(offsetBefore);
  });

  test('arrow keys nudge door along its wall', async ({ page }) => {
    await setupEmpty(page);
    const { centerX, centerY } = await canvasCenter(page);
    await drawWall(page, centerX - 200, centerY, centerX + 200, centerY);
    await page.keyboard.press('d');
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);
    // Door is selected; switch to select tool so keydown handler is active
    await page.keyboard.press('v');
    // Re-select the door
    const elsBefore = await getActivePlanElements(page);
    const doorBefore = elsBefore.find((el: { type: string }) => el.type === 'door');
    const doorScreenX = centerX - 200 + (doorBefore.offset + doorBefore.width / 2) * 40;
    await page.mouse.click(doorScreenX, centerY);

    const offsetBefore = doorBefore.offset as number;

    // Press ArrowRight to nudge door toward the end of the wall
    await page.keyboard.press('ArrowRight');

    const elsAfter = await getActivePlanElements(page);
    const doorAfter = elsAfter.find((el: { type: string }) => el.type === 'door');
    expect(doorAfter.offset).toBeGreaterThan(offsetBefore);
  });
});
