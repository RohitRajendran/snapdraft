import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { setup } from './helpers';

const newestId = /^## (\S+)/m.exec(readFileSync('CHANGELOG.md', 'utf8'))![1];

/** Reload as someone who has used the app before, with the given changelog marker. */
async function reloadAsReturning(page: Page, seen: string | null) {
  await page.evaluate((value) => {
    localStorage.setItem('snapdraft_help_seen', '1');
    if (value === null) localStorage.removeItem('snapdraft_changelog_seen');
    else localStorage.setItem('snapdraft_changelog_seen', value);
  }, seen);
  await page.reload();
}

test.describe("What's new", () => {
  test.beforeEach(({ page }) => setup(page));

  const card = (page: Page) => page.getByTestId('whats-new-card');

  test('first-time visitors see help, not news', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByTestId('help-overlay')).toBeVisible();
    await expect(card(page)).not.toBeVisible();

    await page.reload();
    await expect(page.getByTestId('help-overlay')).not.toBeVisible();
    await expect(card(page)).not.toBeVisible();
  });

  test('returning users are told about new features once', async ({ page }) => {
    await reloadAsReturning(page, '2000.01.01');
    await expect(card(page)).toBeVisible();
    await expect(card(page).getByRole('listitem').first()).not.toBeEmpty();

    await page.reload();
    await expect(card(page)).toBeVisible();

    await page.getByTestId('whats-new-dismiss').click();
    await expect(card(page)).not.toBeVisible();

    await page.reload();
    await expect(card(page)).not.toBeVisible();
  });

  test('people from before the changelog see the latest news only', async ({ page }) => {
    await reloadAsReturning(page, null);
    const items = await card(page).getByRole('listitem').count();
    expect(items).toBeGreaterThan(0);
    expect(items).toBeLessThanOrEqual(2);
  });

  test('nothing shows when the newest release has been seen', async ({ page }) => {
    await reloadAsReturning(page, newestId);
    await expect(page.getByTestId('tool-help')).toBeVisible();
    await expect(card(page)).not.toBeVisible();
  });

  test('the card opens the Updates tab and counts as seen', async ({ page }) => {
    await reloadAsReturning(page, '2000.01.01');
    await page.getByTestId('whats-new-open').click();

    await expect(page.getByTestId('help-overlay')).toBeVisible();
    await expect(page.getByTestId('tab-updates')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('changelog-list')).toBeVisible();
    await expect(card(page)).not.toBeVisible();

    await page.keyboard.press('Escape');
    await page.reload();
    await expect(card(page)).not.toBeVisible();
  });

  test('help reopens on the Help tab after viewing updates', async ({ page }) => {
    await reloadAsReturning(page, '2000.01.01');
    await page.getByTestId('whats-new-open').click();
    await page.keyboard.press('Escape');

    await page.getByTestId('tool-help').click();
    await expect(page.getByRole('tab', { name: 'Help' })).toHaveAttribute('aria-selected', 'true');
  });

  test('opening the Updates tab directly clears the card', async ({ page }) => {
    await reloadAsReturning(page, '2000.01.01');
    await page.getByTestId('tool-help').click();
    await page.getByTestId('tab-updates').click();
    await page.keyboard.press('Escape');
    await expect(card(page)).not.toBeVisible();
  });

  test('the card leaves the tools usable', async ({ page }) => {
    await reloadAsReturning(page, '2000.01.01');
    await expect(card(page)).toBeVisible();

    await page.getByTestId('tool-box').click();
    await expect(page.getByTestId('tool-box')).toHaveAttribute('aria-pressed', 'true');
    await expect(card(page)).toBeVisible();
  });

  test('the card steps aside while something is selected', async ({ page }) => {
    await reloadAsReturning(page, '2000.01.01');
    await expect(card(page)).toBeVisible();

    // Drag a marquee across the plan.
    await page.getByTestId('tool-select-pan').click();
    const canvas = (await page.locator('canvas').first().boundingBox())!;
    await page.mouse.move(canvas.x + 150, canvas.y + canvas.height - 10);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width - 10, canvas.y + 10, { steps: 5 });
    await page.mouse.up();
    await expect(card(page)).not.toBeVisible();

    // It hasn't been dismissed, so it comes back once the selection clears.
    await page.keyboard.press('Escape');
    await expect(card(page)).toBeVisible();
  });

  test('card and tabs fit a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await reloadAsReturning(page, '2000.01.01');

    const box = (await card(page).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);

    await page.getByTestId('whats-new-open').click();
    const tabs = page.getByRole('tablist');
    const overflow = await tabs.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
