// Usage: npm run generate:promo-graphics
//
// Step 2 of 2: composites raw screenshots into styled promo cards at 1270×760.
// Reads screenshots from tmp/gallery/ (produced by capture-gallery.js)
// and writes the finished cards back to the same folder.
//
// Each card has a 460 px text panel on the left and an 810 px screenshot panel
// on the right. offsetX controls which horizontal slice of the 1270 px screenshot
// is shown. A fade overlay softens the left edge of the screenshot.
//
// Output: tmp/gallery/ph1-sketch.png
//         tmp/gallery/ph2-edit.png
//         tmp/gallery/ph3-measure.png
//         tmp/gallery/ph4-plans.png

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GALLERY = path.resolve(__dirname, '../../tmp/gallery');

// Inline a screenshot as a base64 data URL so it works in a page.setContent() context.
function b64(name) {
  return `data:image/png;base64,${fs.readFileSync(path.join(GALLERY, name)).toString('base64')}`;
}

// Card definitions — one per promo graphic.
//   img       source screenshot filename from public/gallery/
//   offsetX   pixels to skip from the left of the screenshot (crops toolbar / shifts focus)
//   fadeWidth width of the left-edge fade overlay in px
//   fadeSolid opaque cream zone before the fade gradient starts (px); used to cover toolbar bleed
const cards = [
  {
    out: 'ph1-sketch.png',
    img: '01-canvas.png',
    offsetX: 0,       // show full toolbar — its edge is a natural separator
    fadeWidth: 20,    // thin fade is enough since the toolbar sits flush
    fadeSolid: 0,
    tag: 'Instant sketching',
    headline: 'From idea to\nfloor plan\nin minutes',
    body: 'Draw rooms wall by wall, drag in furniture, and see your space come together. All in your browser.',
    footer: 'No account. No download. Works everywhere.',
  },
  {
    out: 'ph2-edit.png',
    img: '02-properties.png',
    offsetX: 460,     // shift right to center the properties panel (panel sits at x≈575–807)
    fadeWidth: 130,
    fadeSolid: 0,
    tag: 'Precise editing',
    headline: 'Click anything\nto edit it',
    body: 'Adjust width, height, rotation, and label from a single panel. Changes save automatically.',
    footer: 'No account. No download. Works everywhere.',
  },
  {
    out: 'ph3-measure.png',
    img: '04-measure.png',
    offsetX: 120,     // push toolbar fully off-screen (toolbar right edge ≈ x=115)
    fadeWidth: 160,   // wide fade to smoothly reveal the canvas
    fadeSolid: 40,    // 40 px opaque block covers any toolbar-edge bleed before the gradient
    tag: 'Measure tool',
    headline: 'Measure anything,\ninstantly',
    body: 'Drop two points to see the exact distance across any part of your plan. No math, no guesswork.',
    footer: 'No account. No download. Works everywhere.',
  },
  {
    out: 'ph4-plans.png',
    img: '03-plans-manager.png',
    offsetX: 200,     // centre the plans modal in the right panel
    fadeWidth: 130,
    fadeSolid: 0,
    tag: 'Multiple plans',
    headline: 'All your plans,\nin one place',
    body: 'Create, rename, and switch between floor plans. Everything saves automatically in your browser.',
    footer: 'No account. No download. Works everywhere.',
  },
];

// Builds the HTML for a single card. The screenshot is embedded as a base64
// data URL and positioned with a negative left offset to crop the desired slice.
function buildCardHtml({ tag, headline, body, footer, img, offsetX, fadeWidth, fadeSolid }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{
    width:1270px;height:760px;overflow:hidden;background:#f5f0e8;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    display:flex;
  }

  /* ── Left text panel (460 px) ── */
  .left{
    width:460px;flex-shrink:0;padding:60px 48px;
    display:flex;flex-direction:column;
  }
  /* Matches TopBar logo style: 15px/700/0.12em uppercase */
  .logo{
    font-size:15px;font-weight:700;letter-spacing:0.12em;
    text-transform:uppercase;color:#2c2c2c;
  }
  /* Tag + headline + body are vertically centred within the remaining space */
  .content{
    flex:1;display:flex;flex-direction:column;justify-content:center;
  }
  .tag{
    display:inline-flex;align-items:center;gap:6px;
    background:rgba(45,84,144,0.11);color:#2d5490;
    font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
    padding:5px 14px;border-radius:20px;width:fit-content;
    margin-bottom:20px;
  }
  .tag::before{
    content:'';width:6px;height:6px;border-radius:50%;
    background:#2d5490;display:block;flex-shrink:0;
  }
  .headline{
    font-size:44px;font-weight:800;color:#1a1a1a;
    line-height:1.13;letter-spacing:-0.03em;
    margin-bottom:22px;white-space:pre-line;
  }
  .body{
    font-size:17px;color:#6a6060;line-height:1.65;
  }
  .footer{
    font-size:12px;font-weight:600;letter-spacing:0.05em;
    color:#b0a898;text-transform:uppercase;
    padding-bottom:4px;
  }

  /* ── Right screenshot panel (810 px) ── */
  .right{flex:1;position:relative;overflow:hidden;}
  /* Negative left shifts the 1270 px screenshot to show the desired slice */
  .screenshot{
    position:absolute;top:0;left:${-offsetX}px;
    width:1270px;height:760px;
  }
  /* Gradient fade covers the left edge of the screenshot panel */
  .fade{
    position:absolute;top:0;left:0;width:${fadeWidth}px;height:100%;
    background:linear-gradient(to right,
      #f5f0e8 0px,
      #f5f0e8 ${fadeSolid}px,
      rgba(245,240,232,0) 100%
    );
    z-index:1;pointer-events:none;
  }
  /* Subtle top/bottom vignette to frame the screenshot */
  .vignette{
    position:absolute;inset:0;pointer-events:none;z-index:1;
    background:
      linear-gradient(to bottom,rgba(245,240,232,0.55) 0%,transparent 5%),
      linear-gradient(to top,   rgba(245,240,232,0.55) 0%,transparent 5%);
  }
</style></head><body>
  <div class="left">
    <div class="logo">SnapDraft</div>
    <div class="content">
      <div class="tag">${tag}</div>
      <div class="headline">${headline}</div>
      <p class="body">${body}</p>
    </div>
    <div class="footer">${footer}</div>
  </div>
  <div class="right">
    <img class="screenshot" src="${b64(img)}"/>
    <div class="fade"></div>
    <div class="vignette"></div>
  </div>
</body></html>`;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1270, height: 760 } });
const page = await ctx.newPage();

for (const card of cards) {
  await page.setContent(buildCardHtml(card), { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(GALLERY, card.out) });
  console.log(`✓ ${card.out}`);
}

await browser.close();
console.log('\nPromo graphics saved to public/gallery/ph*.png');
