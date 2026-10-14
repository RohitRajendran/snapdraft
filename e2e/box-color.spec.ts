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
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!;
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

  test('Space activates a focused preset and the custom color button', async ({ page }) => {
    const center = await drawBox(page);
    await page.getByTestId('tool-select-pan').click();
    await page.mouse.click(center.centerX, center.centerY);
    const swatch = page.getByTestId('box-color-swatch-1');
    await swatch.focus();
    await page.keyboard.press('Space');
    await expect(swatch).toHaveAttribute('aria-pressed', 'true');
    // Observe the input click without opening an OS dialog in automation.
    await page.getByTestId('box-color-custom-input').evaluate((el) => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        el.setAttribute('data-opened', 'true');
      });
    });
    await page.getByTestId('box-color-custom').focus();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('box-color-custom-input')).toHaveAttribute('data-opened', 'true');
  });

  test('every swatch has a 44px touch target and stays inside the panel', async ({ page }) => {
    const center = await drawBox(page);
    await page.getByTestId('tool-select-pan').click();
    await page.mouse.click(center.centerX, center.centerY);
    const panel = (await page.getByTestId('properties-panel').boundingBox())!;
    for (const id of [
      ...Array.from({ length: 5 }, (_, i) => `box-color-swatch-${i}`),
      'box-color-custom',
    ]) {
      const swatch = (await page.getByTestId(id).boundingBox())!;
      expect(swatch.width).toBeGreaterThanOrEqual(44);
      expect(swatch.height).toBeGreaterThanOrEqual(44);
      expect(swatch.x).toBeGreaterThanOrEqual(panel.x);
      expect(swatch.x + swatch.width).toBeLessThanOrEqual(panel.x + panel.width);
    }
  });

  test('box labels stay dark on light custom colors and the muted presets', async ({ page }) => {
    const center = await drawBox(page);
    await page.getByTestId('tool-select-pan').click();
    await page.mouse.click(center.centerX, center.centerY);
    await page.getByTestId('box-label-input').fill('Readable');
    await page.getByTestId('box-label-input').blur();
    for (const color of ['#ffffff', '#4a7a5a', '#a8654a', '#a68a3f']) {
      await page.getByTestId('box-color-custom-input').evaluate((el: HTMLInputElement, color) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, color);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, color);
      // Inspect real rendered canvas pixels, excluding the box border and grid.
      await expect
        .poll(() =>
          page.getByTestId('drawing-canvas').evaluate((container) => {
            const bounds = container.getBoundingClientRect();
            const plans = JSON.parse(localStorage.getItem('snapdraft_floorplans')!);
            const activeId = localStorage.getItem('snapdraft_active');
            const box = plans
              .find((plan: { id: string }) => plan.id === activeId)
              .elements.find((el: { type: string }) => el.type === 'box');
            const zoom = Number(container.getAttribute('data-zoom'));
            const panX = Number(container.getAttribute('data-pan-x'));
            const panY = Number(container.getAttribute('data-pan-y'));
            return Array.from(container.querySelectorAll('canvas')).reduce((count, canvas) => {
              const ratio = canvas.width / bounds.width;
              const ctx = canvas.getContext('2d')!;
              const pixels = ctx.getImageData(
                (box.x * 40 * zoom + panX + 5) * ratio,
                (box.y * 40 * zoom + panY + 5) * ratio,
                55 * ratio,
                12 * ratio,
              ).data;
              for (let i = 0; i < pixels.length; i += 4) {
                if (
                  pixels[i] < 100 &&
                  pixels[i + 1] < 100 &&
                  pixels[i + 2] < 100 &&
                  pixels[i + 3] > 128
                )
                  count++;
              }
              return count;
            }, 0);
          }),
        )
        .toBeGreaterThan(5);
    }
  });

  test('a confirmed custom adjustment undoes in one step and preserves earlier edits', async ({
    page,
  }) => {
    const center = await drawBox(page);
    await page.getByTestId('tool-select-pan').click();
    await page.mouse.click(center.centerX, center.centerY);
    await page.getByTestId('box-color-custom-input').evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      for (let i = 0; i < 60; i++) {
        setter.call(el, `#1234${i.toString(16).padStart(2, '0')}`);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    expect((await getActivePlanElements(page))[0].color).toBe('#2d5490');
    await page.getByTestId('box-color-custom-input').dispatchEvent('change');
    expect((await getActivePlanElements(page))[0].color).toBe('#12343b');
    await page.getByTestId('tool-undo').click();
    expect((await getActivePlanElements(page))[0].color).toBe('#2d5490');
    await page.getByTestId('tool-redo').click();
    expect((await getActivePlanElements(page))[0].color).toBe('#12343b');
    await page.getByTestId('tool-undo').click();
    await page.getByTestId('tool-undo').click();
    expect(await getActivePlanElements(page)).toHaveLength(0);
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
