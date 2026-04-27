import { test, expect } from '@playwright/test';
import { setup } from './helpers';

test.describe('Tool switching', () => {
  test.beforeEach(({ page }) => setup(page));

  test('toolbar clicks and keyboard shortcuts switch tools', async ({ page }) => {
    await page.getByTestId('tool-box').click();
    await expect(page.getByTestId('tool-box')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('tool-select').click();
    await expect(page.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('s');
    await expect(page.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('b');
    await expect(page.getByTestId('tool-box')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('w');
    await expect(page.getByTestId('tool-wall')).toHaveAttribute('aria-pressed', 'true');
  });
});
