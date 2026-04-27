import { test, expect } from '@playwright/test';
import LZString from 'lz-string';
import { setup, dismissHelp } from './helpers';

const validImportPlan = {
  id: 'import-original-id',
  version: 1,
  name: 'Imported Plan',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  elements: [] as unknown[],
};

test.describe('Import / Export / QR', () => {
  test.beforeEach(({ page }) => setup(page));

  test('share button is visible per plan', async ({ page }) => {
    await page.getByTestId('plans-button').click();
    await expect(page.getByTestId('floorplan-manager')).toBeVisible();

    const plans = JSON.parse(
      await page.evaluate(() => localStorage.getItem('snapdraft_floorplans') ?? '[]'),
    ) as Array<{ id: string }>;
    expect(plans.length).toBeGreaterThan(0);
    await expect(page.getByTestId(`share-plan-${plans[0].id}`)).toBeVisible();
  });

  test('import button is visible in footer', async ({ page }) => {
    await page.getByTestId('plans-button').click();
    await expect(page.getByTestId('import-plan')).toBeVisible();
  });

  test('importing valid JSON closes the manager and adds the plan', async ({ page }) => {
    await page.getByTestId('plans-button').click();
    await expect(page.getByTestId('floorplan-manager')).toBeVisible();

    await page.getByTestId('import-file-input').setInputFiles({
      name: 'test.snapdraft.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(validImportPlan)),
    });

    await expect(page.getByTestId('floorplan-manager')).not.toBeVisible();

    await page.getByTestId('plans-button').click();
    await expect(
      page.getByTestId('floorplan-manager').getByText('Imported Plan'),
    ).toBeVisible();
  });

  test('importing malformed JSON shows error', async ({ page }) => {
    await page.getByTestId('plans-button').click();

    await page.getByTestId('import-file-input').setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('not valid json {{{'),
    });

    await expect(page.getByTestId('import-error')).toBeVisible();
    await expect(page.getByTestId('import-error')).toContainText('not valid JSON');
  });

  test('importing unknown version shows error', async ({ page }) => {
    const futurePlan = { ...validImportPlan, version: 999 };
    await page.getByTestId('plans-button').click();

    await page.getByTestId('import-file-input').setInputFiles({
      name: 'future.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(futurePlan)),
    });

    await expect(page.getByTestId('import-error')).toBeVisible();
  });

  test('imported plan gets a different id than original', async ({ page }) => {
    await page.getByTestId('plans-button').click();

    await page.getByTestId('import-file-input').setInputFiles({
      name: 'test.snapdraft.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(validImportPlan)),
    });

    await expect(page.getByTestId('floorplan-manager')).not.toBeVisible();

    const plans = (await page.evaluate(() =>
      JSON.parse(localStorage.getItem('snapdraft_floorplans') ?? '[]'),
    )) as Array<{ id: string; name: string }>;
    const imported = plans.find((plan) => plan.name === 'Imported Plan');
    expect(imported).toBeDefined();
    expect(imported!.id).not.toBe('import-original-id');
  });

  test('share modal opens with QR canvas, copy link, and download buttons', async ({ page }) => {
    await page.getByTestId('plans-button').click();

    const plans = JSON.parse(
      await page.evaluate(() => localStorage.getItem('snapdraft_floorplans') ?? '[]'),
    ) as Array<{ id: string }>;
    await page.getByTestId(`share-plan-${plans[0].id}`).click();

    await expect(page.getByTestId('share-modal')).toBeVisible();
    await expect(page.getByTestId('qr-canvas')).toBeVisible();
    await expect(page.getByTestId('copy-link-btn')).toBeVisible();
    await expect(page.getByTestId('download-plan-btn')).toBeVisible();
  });

  test('copy link button writes URL with ?plan= to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.getByTestId('plans-button').click();

    const plans = JSON.parse(
      await page.evaluate(() => localStorage.getItem('snapdraft_floorplans') ?? '[]'),
    ) as Array<{ id: string }>;
    await page.getByTestId(`share-plan-${plans[0].id}`).click();
    await expect(page.getByTestId('share-modal')).toBeVisible();

    await page.getByTestId('copy-link-btn').click();
    await expect(page.getByTestId('copy-link-btn')).toContainText('Copied!');

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('?plan=');
  });

  test('navigating to a ?plan= URL auto-imports the plan', async ({ page }) => {
    const planToShare = {
      id: 'share-source-id',
      version: 1,
      name: 'Shared Via URL',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      elements: [],
    };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(planToShare));

    await page.goto(`/?plan=${compressed}`);
    await dismissHelp(page);

    const plans = (await page.evaluate(() =>
      JSON.parse(localStorage.getItem('snapdraft_floorplans') ?? '[]'),
    )) as Array<{ name: string }>;

    expect(plans.some((plan) => plan.name === 'Shared Via URL')).toBe(true);
    expect(page.url()).not.toContain('?plan=');
  });

  test('share modal closes on backdrop click', async ({ page }) => {
    await page.getByTestId('plans-button').click();

    const plans = JSON.parse(
      await page.evaluate(() => localStorage.getItem('snapdraft_floorplans') ?? '[]'),
    ) as Array<{ id: string }>;
    await page.getByTestId(`share-plan-${plans[0].id}`).click();
    await expect(page.getByTestId('share-modal')).toBeVisible();

    await page.getByTestId('share-modal').click({ position: { x: 10, y: 10 } });
    await expect(page.getByTestId('share-modal')).not.toBeVisible();
  });
});
