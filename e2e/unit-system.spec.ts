import { test, expect } from '@playwright/test';
import { setup, dismissHelp, canvasCenter, drawBox, drawWall, getActivePlanElements } from './helpers';

test.describe('Unit system', () => {
  test.beforeEach(({ page }) => setup(page));

  test('Preferences tab shows unit toggle with ft/in active by default', async ({ page }) => {
    await page.getByTestId('tool-help').click();
    await page.getByRole('tab', { name: 'Preferences' }).click();
    await expect(page.getByRole('tab', { name: 'Preferences' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('unit-imperial')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('unit-metric')).toHaveAttribute('aria-pressed', 'false');
  });

  test('switching to metric updates the scale bar label', async ({ page }) => {
    await page.getByTestId('tool-help').click();
    await page.getByRole('tab', { name: 'Preferences' }).click();
    await page.getByTestId('unit-metric').click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('scale-bar')).toContainText('0.3 m');
  });

  test('switching back to imperial restores the ft label', async ({ page }) => {
    await page.getByTestId('tool-help').click();
    await page.getByRole('tab', { name: 'Preferences' }).click();
    await page.getByTestId('unit-metric').click();
    await page.getByTestId('unit-imperial').click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('scale-bar')).toContainText('1 ft');
  });

  test('metric unit preference persists across page reload', async ({ page }) => {
    await page.getByTestId('tool-help').click();
    await page.getByRole('tab', { name: 'Preferences' }).click();
    await page.getByTestId('unit-metric').click();
    await page.keyboard.press('Escape');

    await page.reload();
    await dismissHelp(page);

    await expect(page.getByTestId('scale-bar')).toContainText('0.3 m');

    // Preferences tab should also reflect the persisted unit
    await page.getByTestId('tool-help').click();
    await page.getByRole('tab', { name: 'Preferences' }).click();
    await expect(page.getByTestId('unit-metric')).toHaveAttribute('aria-pressed', 'true');
  });

  test('wall properties panel shows metric lengths when unit is metric', async ({ page }) => {
    // Switch to metric first, then draw — avoids clicking through the overlay after drawing
    await page.getByTestId('tool-help').click();
    await page.getByRole('tab', { name: 'Preferences' }).click();
    await page.getByTestId('unit-metric').click();
    await page.keyboard.press('Escape');

    // Draw below the bedroom sample content (cy+250 is safely outside world y=0–10)
    const { centerX, centerY } = await canvasCenter(page);
    const wallY = centerY + 250;
    await drawWall(page, centerX - 80, wallY, centerX + 80, wallY);

    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, wallY);

    await expect(page.getByTestId('wall-length-input')).toHaveValue(/m$/);
  });

  test('box properties panel shows metric dimensions when unit is metric', async ({ page }) => {
    // Switch to metric first, then draw
    await page.getByTestId('tool-help').click();
    await page.getByRole('tab', { name: 'Preferences' }).click();
    await page.getByTestId('unit-metric').click();
    await page.keyboard.press('Escape');

    const { centerX, centerY } = await drawBox(page);

    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);

    await expect(page.getByTestId('box-width-input')).toHaveValue(/m$/);
    await expect(page.getByTestId('box-height-input')).toHaveValue(/m$/);
  });

  test('editing box width in metric stores the correct feet value', async ({ page }) => {
    // Switch to metric first, then draw
    await page.getByTestId('tool-help').click();
    await page.getByRole('tab', { name: 'Preferences' }).click();
    await page.getByTestId('unit-metric').click();
    await page.keyboard.press('Escape');

    const { centerX, centerY } = await drawBox(page);

    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, centerY);

    const widthInput = page.getByTestId('box-width-input');
    await widthInput.fill('2 m');
    await widthInput.press('Enter');

    await expect(widthInput).toHaveValue('2 m');

    // Stored value must be in feet: 2 / 0.3048 ≈ 6.5617
    const elements = await getActivePlanElements(page);
    // The drawn box is the last element (sample plan elements come first)
    const drawnBox = elements[elements.length - 1];
    expect(drawnBox.width).toBeCloseTo(2 / 0.3048, 2);
  });

  test('metric dimension input accepts m and cm in wall length field', async ({ page }) => {
    // Switch to metric first, then draw below the bedroom sample content
    await page.getByTestId('tool-help').click();
    await page.getByRole('tab', { name: 'Preferences' }).click();
    await page.getByTestId('unit-metric').click();
    await page.keyboard.press('Escape');

    const { centerX, centerY } = await canvasCenter(page);
    const wallY = centerY + 250;
    await drawWall(page, centerX - 80, wallY, centerX + 80, wallY);

    await page.getByTestId('tool-select').click();
    await page.mouse.click(centerX, wallY);

    const lengthInput = page.getByTestId('wall-length-input');
    await lengthInput.fill('3 m');
    await lengthInput.press('Enter');
    await expect(lengthInput).toHaveValue('3 m');

    await lengthInput.fill('150 cm');
    await lengthInput.press('Enter');
    await expect(lengthInput).toHaveValue('1.5 m');
  });

  test('importing a plan while metric is active shows dimensions in metric', async ({ page }) => {
    // Switch to metric
    await page.getByTestId('tool-help').click();
    await page.getByRole('tab', { name: 'Preferences' }).click();
    await page.getByTestId('unit-metric').click();
    await page.keyboard.press('Escape');

    // Import a plan with known element sizes (stored in feet, as always)
    const planWithBox = {
      id: 'import-metric-test',
      version: 1,
      name: 'Metric Import Test',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      elements: [
        {
          id: 'b1',
          type: 'box',
          // 2 m × 1 m expressed in feet
          x: 0,
          y: 0,
          width: 2 / 0.3048,
          height: 1 / 0.3048,
          rotation: 0,
          label: 'Test Box',
        },
      ],
    };

    await page.getByTestId('plans-button').click();
    await page.getByTestId('import-file-input').setInputFiles({
      name: 'metric-test.snapdraft.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(planWithBox)),
    });

    await expect(page.getByTestId('floorplan-manager')).not.toBeVisible();

    // Fit the imported plan into view (App.tsx only auto-fits on initial mount)
    await page.getByTestId('fit-to-content').click();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

    // Select the box at the centre of the now-fitted view
    await page.getByTestId('tool-select').click();
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.click(centerX, centerY);

    // Properties should display the stored feet values converted to metric
    await expect(page.getByTestId('box-width-input')).toHaveValue('2 m');
    await expect(page.getByTestId('box-height-input')).toHaveValue('1 m');
  });
});
