import { test, expect } from '@playwright/test';
import { setup } from './helpers';

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

  test.describe('About tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByTestId('tool-help').click();
      await page.getByRole('tab', { name: 'About' }).click();
    });

    test('switches to about tab and shows origin story', async ({ page }) => {
      await expect(page.getByRole('tab', { name: 'About' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(page.getByText('— Rohit')).toBeVisible();
    });

    test('shows GitHub and Email links', async ({ page }) => {
      await expect(page.getByRole('link', { name: 'GitHub' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Email' })).toBeVisible();
    });

    test('help tab content is hidden when about is active', async ({ page }) => {
      await expect(page.getByTestId('help-save-note')).not.toBeVisible();
    });
  });
});
