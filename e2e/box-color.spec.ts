import { test, expect, type Page } from '@playwright/test';
import { setupEmpty, drawBox, getActivePlanElements, canvasCenter, dismissHelp } from './helpers';

const PRESET_COUNT = 5;

/** Seed a plan with a single box (no color field) and reload so fit-to-content centers it. */
async function setupSingleLegacyBox(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    const id = 'test-legacy-box-plan';
    localStorage.setItem('snapdraft_active', id);
    localStorage.setItem(
      'snapdraft_floorplans',
      JSON.stringify([
        {
          id,
          version: 2,
          name: 'Legacy',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          elements: [
            { id: 'legacy-box', type: 'box', x: 0, y: 0, width: 4, length: 3, rotation: 0 },
          ],
        },
      ]),
    );
  });
  await page.reload();
  await dismissHelp(page);
}

test.describe('Box color', () => {
  test.beforeEach(({ page }) => setupEmpty(page));

  test('newly drawn boxes rotate through the 5 preset colors', async ({ page }) => {
    const centers = [];
    for (let i = 0; i < 6; i++) {
      const offsetX = -300 + i * 100;
      centers.push(await drawBox(page, offsetX, -200, 80, 80));
    }
    await page.getByTestId('tool-select-pan').click();
    for (let i = 0; i < 6; i++) {
      await page.mouse.click(centers[i].centerX, centers[i].centerY);
      const expectedIndex = i % PRESET_COUNT;
      await expect(page.getByTestId(`box-color-swatch-${expectedIndex}`)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    }
  });

  test('selecting a preset swatch changes the box color', async ({ page }) => {
    const center = await drawBox(page);
    await page.getByTestId('tool-select-pan').click();
    await page.mouse.click(center.centerX, center.centerY);

    await expect(page.getByTestId('box-color-swatch-0')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('box-color-swatch-1').click();

    await expect(page.getByTestId('box-color-swatch-1')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('box-color-swatch-0')).toHaveAttribute('aria-pressed', 'false');
  });

  test('custom color picker updates the box color and shows the pencil badge', async ({ page }) => {
    const center = await drawBox(page);
    await page.getByTestId('tool-select-pan').click();
    await page.mouse.click(center.centerX, center.centerY);

    const hiddenInput = page.getByTestId('box-color-custom-input');
    // jsdom/Playwright can't drive the native OS color chooser; set the value directly and
    // dispatch the events React listens for, simulating what a real pick would produce.
    await hiddenInput.evaluate((el: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!
        .set!;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, '#ff00aa');

    await expect(page.getByTestId('box-color-custom')).toHaveCSS(
      'background-color',
      'rgb(255, 0, 170)',
    );
    await expect(page.getByTestId('box-color-pencil-badge')).toBeVisible();

    const elements = await getActivePlanElements(page);
    const box = elements.find((el: { type: string }) => el.type === 'box');
    expect(box.color).toBe('#ff00aa');
  });

  test('color persists after reload', async ({ page }) => {
    const center = await drawBox(page);
    await page.getByTestId('tool-select-pan').click();
    await page.mouse.click(center.centerX, center.centerY);
    await page.getByTestId('box-color-swatch-2').click();

    const beforeReload = await getActivePlanElements(page);
    const boxBefore = beforeReload.find((el: { type: string }) => el.type === 'box');

    await page.reload();
    await dismissHelp(page);

    const afterReload = await getActivePlanElements(page);
    const boxAfter = afterReload.find((el: { type: string }) => el.type === 'box');
    expect(boxAfter.color).toBe(boxBefore.color);
  });
});

test.describe('Box color — legacy plan', () => {
  test.beforeEach(({ page }) => setupSingleLegacyBox(page));

  test('a legacy box with no color field still renders the default blue', async ({ page }) => {
    const { centerX, centerY } = await canvasCenter(page);
    await page.mouse.click(centerX, centerY);
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await expect(page.getByTestId('box-color-swatch-0')).toHaveAttribute('aria-pressed', 'true');
  });
});
