// Usage: npm run generate:promo-graphics
//
// Step 1 of 2: captures raw app screenshots at 1270×760 from the dev server
// (npm run dev, default port 5174). Assumes the default bedroom plan is loaded.
//
// Output: tmp/gallery/01-canvas.png
//         tmp/gallery/02-properties.png
//         tmp/gallery/03-plans-manager.png
//         tmp/gallery/04-measure.png

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../tmp/gallery');
fs.mkdirSync(OUT, { recursive: true });
const DEV_URL = 'http://localhost:5174';

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`✓ ${name}.png`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1270, height: 760 } });
const page = await ctx.newPage();

// ── 1. Main canvas — bedroom plan ────────────────────────────────────────────
await page.goto(DEV_URL, { waitUntil: 'networkidle' });
await page.keyboard.press('Escape'); // dismiss help overlay
await page.waitForTimeout(300);
await shot(page, '01-canvas');

// ── 2. Properties panel open ──────────────────────────────────────────────────
// The bedroom is 14×10 ft at 40 px/ft; at zoom=1 the room spans ~560×400 px.
// The stage is centered, so clicking near (635, 380) lands on the bed.
await page.keyboard.press('s'); // switch to select tool
await page.waitForTimeout(100);
await page.mouse.click(635, 380);
await page.waitForTimeout(400);
await shot(page, '02-properties');

// ── 3. Plans manager ─────────────────────────────────────────────────────────
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
await page.getByTestId('plans-button').click();
await page.waitForTimeout(400);
await shot(page, '03-plans-manager');
await page.keyboard.press('Escape');

// ── 4. Measure tool — full-width span ────────────────────────────────────────
// Room is 14 ft wide at 40 px/ft = 560 px. Stage is centered at x≈635.
// Left wall inner edge ≈ x=222, right wall inner edge ≈ x=1047.
// Clicking just inside each wall at mid-height (y≈400) gives a clean full-width span.
await page.getByTestId('tool-measure').click();
await page.waitForTimeout(100);
await page.mouse.click(235, 400); // left anchor
await page.waitForTimeout(150);
await page.mouse.move(1040, 400); // hover right anchor — don't click, keeps label visible
await page.waitForTimeout(300);
await shot(page, '04-measure');

await browser.close();
console.log('\nGallery screenshots saved to tmp/gallery/');
