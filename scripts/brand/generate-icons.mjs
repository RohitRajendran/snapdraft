// Usage: npm run generate:icons
//
// Draws every icon in public/ from one design: the SD monogram centred in a plan room, with a
// door swinging in from the bottom wall. It matches the SnapDraft app icon on iPhone and iPad.
//
// - Large sizes get the whole design, drafting grid included.
// - Tab sizes (brand-mark.svg, favicon.ico) drop the grid and thicken the lines, which would
//   otherwise blur together at 16 px.
// - The maskable icon shrinks the room, because Android may crop to a circle.
//
// The monogram is stored as outlines, so it looks the same on machines without Courier New.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public');

const COLORS = {
  paper: '#f5f0e8',
  ink: '#2f3137',
  door: '#2d5490',
  gridMinor: '#dfe4e6',
  gridMajor: '#c9d3dc',
};

// "SD" in Courier New Bold, tightly tracked and centred on (512, 512) in a 1024 square.
const MONOGRAM = 'M332.3 631.1Q326.5 638 323 639.9Q319.4 641.9 314.3 641.9Q304.2 641.9 298.1 635.1Q291.9 628.3 291.9 612.7V583Q291.9 567.1 298.1 560.3Q304.2 553.6 314.3 553.6Q322 553.6 327.3 557.7Q332.5 561.7 335.3 571.3Q338.1 580.9 341.1 584.3Q347.4 591 363.3 597.8Q379.2 604.7 398.1 604.7Q427.5 604.7 446.4 591Q458.4 582.6 458.4 570.3Q458.4 562.2 452.6 555Q446.8 547.8 433.7 543Q425.1 539.8 395.3 534.2Q359.2 527.6 340.7 518.1Q322.2 508.7 311.5 491.5Q300.7 474.3 300.7 454.3Q300.7 422.7 327.2 399Q353.6 375.3 395.9 375.3Q412.9 375.3 427.4 379Q441.9 382.8 453.7 390.5Q462.3 382.1 470.9 382.1Q480.6 382.1 486.7 388.9Q492.8 395.7 492.8 411.3V444.4Q492.8 460.3 486.7 467.1Q480.6 473.9 470.9 473.9Q462.7 473.9 456.7 468.9Q452 465.3 449.6 454.3Q447.3 443.4 443.6 438.6Q437.4 430.5 424.9 424.9Q412.5 419.3 396.1 419.3Q372.3 419.3 358.4 430.4Q344.6 441.4 344.6 453.5Q344.6 461.6 350.3 469.2Q356 476.9 366.9 481.2Q374.2 484.2 408.1 490.8Q441.9 497.5 460 505.4Q478.2 513.4 490.2 530.4Q502.3 547.3 502.3 570.8Q502.3 603.4 479.3 623Q448.8 648.7 401.5 648.7Q383.2 648.7 365.9 644.3Q348.6 639.9 332.3 631.1ZM522.6 598.3V426Q508.6 425.7 502 419.6Q495.3 413.5 495.3 403.8Q495.3 393.9 502.1 387.8Q508.9 381.7 524.7 381.7L616.9 381.9Q638.4 381.9 658.9 389.9Q679.4 397.8 691.9 410.1Q701.4 419.3 711.6 435.4Q721.8 451.5 726.9 467.4Q732.1 483.3 732.1 506.3V527.4Q732.1 555.3 722.6 576.9Q713.2 598.5 697.8 612.1Q682.4 625.8 668.9 632.2Q647.4 642.3 613.3 642.3H524.7Q508.9 642.3 502.1 636.2Q495.3 630.1 495.3 620.2Q495.3 610.5 502.1 604.3Q508.9 598 522.6 598.3ZM566.6 598.3H613.5Q639.7 598.3 653 590.7Q670.4 580.9 679.2 565.6Q688 550.3 688 526.1V505.2Q688 484.4 680.1 468.7Q667.6 444.2 652 435.1Q636.5 426 613 426H566.6Z';

function grid() {
  const lines = [];
  for (let i = 0; i <= 16; i++) {
    const at = i * 64;
    const major = i % 4 === 0;
    const style = `stroke="${major ? COLORS.gridMajor : COLORS.gridMinor}" stroke-width="${major ? 4 : 2}"`;
    lines.push(`<path d="M${at} 0V1024M0 ${at}H1024" ${style}/>`);
  }
  return lines.join('');
}

/** The room, door and monogram, drawn on a 1024 square. */
function room({ wall, leaf, swing, monogramScale }) {
  const m = monogramScale;
  return [
    `<path d="M600 856H168V168H856V856H800" fill="none" stroke="${COLORS.ink}" stroke-width="${wall}" stroke-linejoin="miter"/>`,
    `<path d="M786 856V670" fill="none" stroke="${COLORS.door}" stroke-width="${leaf}" stroke-linecap="round"/>`,
    `<path d="M786 670A186 186 0 0 0 600 856" fill="none" stroke="${COLORS.door}" stroke-width="${swing}"/>`,
    `<path transform="translate(512 512) scale(${m}) translate(-512 -512)" d="${MONOGRAM}" fill="${COLORS.ink}"/>`,
  ].join('');
}

const svg = (body) =>
  `<svg width="512" height="512" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">${body}</svg>\n`;

const paper = (radius = 0) =>
  `<rect width="1024" height="1024" rx="${radius}" fill="${COLORS.paper}"/>`;

const FULL = svg(paper() + grid() + room({ wall: 44, leaf: 28, swing: 20, monogramScale: 1 }));

const SMALL = svg(
  paper(224) +
    `<g transform="translate(512 512) scale(1.2) translate(-512 -512)">` +
    room({ wall: 56, leaf: 44, swing: 36, monogramScale: 1.05 }) +
    `</g>`,
);

// Android's maskable safe zone is a circle 80% as wide as the icon, so the room's corners must
// stay inside it: 40% of the width / sqrt(2) is about 28% either side of the centre.
const MASKABLE = svg(
  paper() +
    grid() +
    `<g transform="translate(512 512) scale(0.82) translate(-512 -512)">` +
    room({ wall: 44, leaf: 28, swing: 20, monogramScale: 1 }) +
    `</g>`,
);

/** An .ico is a small directory followed by the PNGs themselves. */
function ico(pngs) {
  const header = Buffer.alloc(6 + pngs.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((png) => png.data)]);
}

const browser = await chromium.launch();

async function render(source, size) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
  );
  const data = await page.screenshot({ omitBackground: true });
  await page.close();
  return data;
}

fs.writeFileSync(path.join(PUBLIC, 'brand-mark.svg'), SMALL);
for (const [file, source, size] of [
  ['icon-512.png', FULL, 512],
  ['icon-192.png', FULL, 192],
  ['apple-touch-icon.png', FULL, 180],
  ['icon-maskable-512.png', MASKABLE, 512],
]) {
  fs.writeFileSync(path.join(PUBLIC, file), await render(source, size));
  console.log(`✓ ${file}`);
}
const small = [];
for (const size of [16, 32, 48]) small.push({ size, data: await render(SMALL, size) });
fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), ico(small));
console.log('✓ favicon.ico\n✓ brand-mark.svg');

await browser.close();
