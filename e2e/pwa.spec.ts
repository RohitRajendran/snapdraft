import { test, expect } from '@playwright/test';
import { setupEmpty, drawBox } from './helpers';

test('the installed app reloads offline with the saved plan', async ({ page, context }) => {
  await setupEmpty(page);
  await page.goto('/app');
  await drawBox(page);

  const savedPlans = await page.evaluate(() => localStorage.getItem('snapdraft_floorplans'));
  expect(JSON.parse(savedPlans!)[0].elements).toHaveLength(1);

  // Wait for precaching and activation, then ensure navigation uses the worker.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
      });
    }
  });

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByTestId('drawing-canvas')).toBeVisible();
  await expect(page.getByTestId('tool-select-pan')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('help-overlay')).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('snapdraft_floorplans'))).toBe(savedPlans);
});
