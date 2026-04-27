import { test, expect } from '@playwright/test';
import { setup } from './helpers';

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
