// Usage: npm run generate:marketing-canvas
//
// Regenerates the floor-plan canvas artwork embedded in public/home.html, and the plan on the
// social sharing card (scripts/og-image/og-image.html; then run npm run generate:og-image).
//
// The marketing page fakes the app UI. The *chrome* (top bar, toolbar, panels)
// is hand-written HTML/CSS that mirrors the component CSS modules; the *canvas*
// is drawn here, from the app's own default plan and the app's own render rules,
// so it cannot quietly drift away from what the app actually draws.
//
// Node 26 strips TypeScript types on import, so we read the real source directly.
//
// Output: the marked regions in those two files
//           <!-- BEGIN:canvas-<id> --> ... <!-- END:canvas-<id> -->

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSampleElements } from '../../src/utils/samplePlan.ts';
import { PIXELS_PER_FOOT, formatFeet } from '../../src/utils/geometry/geometry.ts';
import { DEFAULT_BOX_COLOR, hexToRgba } from '../../src/utils/colors/colors.ts';
import {
  BOX_LABEL_FONT_FAMILY,
  BOX_LABEL_LINE_HEIGHT,
  fitBoxLabel,
} from '../../src/utils/boxLabel/boxLabel.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME_HTML = path.resolve(__dirname, '../../public/home.html');
const OG_HTML = path.resolve(__dirname, '../og-image/og-image.html');

// ── Render constants, copied from the components that own them ──────────────
// Every stroke width and font size below is a *screen* pixel value in the app:
// the Konva stage scales by `zoom` and the components divide by `zoom` to
// compensate, so these stay constant no matter how far you zoom. Only the
// feet -> pixel scale changes. That is why this renderer can take a `zoom` and
// leave every other number alone.
const R = {
  // Grid.tsx
  gridBg: '#f5f0e8',
  gridMinor: { stroke: '#ccd9e8', width: 0.5 },
  gridMajor: { stroke: '#a8bcd4', width: 0.75 },
  majorEvery: 5, // ft
  // WallElement.tsx
  wall: { stroke: '#2c2c2c', width: 3 },
  wallSelected: '#0066cc',
  jambHalfFt: 0.25, // JAMB_HALF_FT
  opening: { stroke: '#2c2c2c', jambWidth: 2, glazingWidth: 1, leafWidth: 1.5 },
  doorFill: 'rgba(255,255,255,0.3)',
  // BoxElement.tsx
  box: {
    width: 1.5,
    selectedWidth: 2,
    fillOpacity: 0.06,
    selectedFillOpacity: 0.1,
    dash: '4 3',
    radius: 1,
    labelFill: '#2c2c2c', // --ink
    accent: '#0066cc', // SELECTION_ACCENT
    haloInset: 3,
    haloWidth: 1,
    haloDash: '3 3',
    haloRadius: 2,
    handleOffset: 22, // HANDLE_OFFSET_PX
    handleRadius: 6,
    handleLineWidth: 1.5,
    handleRingWidth: 2,
  },
  // DrawingCanvas.tsx
  ghostWall: { stroke: '#b8c9e0', width: 3, dash: '6 4' },
  ghostLabel: { fill: '#2d5490', size: 11 },
  chainVertex: { fill: '#2c2c2c', radius: 5 },
  snapEndpoint: { stroke: '#0066cc', fill: 'rgba(0,102,204,0.12)', radius: 8, width: 2 },
};

const n = (v) => Math.round(v * 100) / 100;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Geometry helpers, mirroring WallElement.tsx ─────────────────────────────

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function segPoint(a, b, fraction) {
  return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
}

// WallElement.tsx computeSegmentParts — solid runs between openings.
function solidRuns(segLen, segOpenings) {
  const sorted = [...segOpenings].sort((a, b) => a.offset - b.offset);
  const runs = [];
  let pos = 0;
  for (const op of sorted) {
    const gapStart = Math.min(Math.max(op.offset, pos), segLen);
    const gapEnd = Math.min(gapStart + op.width, segLen);
    if (gapStart > pos + 0.001) runs.push([pos, gapStart]);
    pos = gapEnd;
  }
  if (pos < segLen - 0.001) runs.push([pos, segLen]);
  return runs;
}

/**
 * A view maps world feet onto SVG user units.
 * `zoom` is the app's zoom level; the scale is PIXELS_PER_FOOT * zoom, exactly
 * as the Konva stage computes it.
 */
function makeView({ zoom, originFt }) {
  const s = PIXELS_PER_FOOT * zoom;
  return {
    zoom,
    s,
    originFt,
    x: (ft) => n((ft - originFt.x) * s),
    y: (ft) => n((ft - originFt.y) * s),
    len: (ft) => n(ft * s),
  };
}

// ── Element renderers ───────────────────────────────────────────────────────

function renderGrid(view, width, height) {
  const out = [`<rect width="${width}" height="${height}" fill="${R.gridBg}"/>`];
  const minFtX = view.originFt.x;
  const maxFtX = minFtX + width / view.s;
  const minFtY = view.originFt.y;
  const maxFtY = minFtY + height / view.s;

  const line = (x1, y1, x2, y2, major) => {
    const style = major ? R.gridMajor : R.gridMinor;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${style.stroke}" stroke-width="${style.width}"/>`;
  };

  for (let ft = Math.ceil(minFtX); ft <= maxFtX; ft++) {
    out.push(line(view.x(ft), 0, view.x(ft), height, ft % R.majorEvery === 0));
  }
  for (let ft = Math.ceil(minFtY); ft <= maxFtY; ft++) {
    out.push(line(0, view.y(ft), width, view.y(ft), ft % R.majorEvery === 0));
  }
  return out;
}

function renderWall(view, wall, openings, selectedId) {
  const stroke = wall.id === selectedId ? R.wallSelected : R.wall.stroke;
  const out = [];
  for (let i = 0; i < wall.points.length - 1; i++) {
    const a = wall.points[i];
    const b = wall.points[i + 1];
    const segLen = distance(a, b);
    if (segLen < 0.001) continue;
    const segOpenings = openings.filter((o) => o.wallId === wall.id && o.segmentIndex === i);
    for (const [from, to] of solidRuns(segLen, segOpenings)) {
      const p1 = segPoint(a, b, from / segLen);
      const p2 = segPoint(a, b, to / segLen);
      out.push(
        `<line x1="${view.x(p1.x)}" y1="${view.y(p1.y)}" x2="${view.x(p2.x)}" y2="${view.y(p2.y)}" ` +
          `stroke="${stroke}" stroke-width="${R.wall.width}" stroke-linecap="square"/>`,
      );
    }
  }
  return out;
}

/** Unit direction and left-hand perpendicular of a segment, in screen space. */
function segBasis(a, b) {
  const len = distance(a, b);
  const dirX = (b.x - a.x) / len;
  const dirY = (b.y - a.y) / len;
  // WallElement.tsx: left = (dirY, -dirX) with y pointing down
  return { len, dirX, dirY, perpX: dirY, perpY: -dirX };
}

// WallElement.tsx WindowSymbol — two jambs plus two glazing lines.
function renderWindow(view, opening, wall) {
  const a = wall.points[opening.segmentIndex];
  const b = wall.points[opening.segmentIndex + 1];
  const { len, perpX, perpY } = segBasis(a, b);
  const jamb = view.len(R.jambHalfFt);

  const gapStart = segPoint(a, b, opening.offset / len);
  const gapEnd = segPoint(a, b, (opening.offset + opening.width) / len);
  const px = (p, ox = 0, oy = 0) => ({ x: view.x(p.x) + ox, y: view.y(p.y) + oy });

  const out = [];
  for (const p of [gapStart, gapEnd]) {
    const s = px(p, -perpX * jamb, -perpY * jamb);
    const e = px(p, perpX * jamb, perpY * jamb);
    out.push(
      `<line x1="${n(s.x)}" y1="${n(s.y)}" x2="${n(e.x)}" y2="${n(e.y)}" ` +
        `stroke="${R.opening.stroke}" stroke-width="${R.opening.jambWidth}"/>`,
    );
  }
  for (const frac of [1 / 3, 2 / 3]) {
    const ox = perpX * jamb * (frac * 2 - 1);
    const oy = perpY * jamb * (frac * 2 - 1);
    const s = px(gapStart, ox, oy);
    const e = px(gapEnd, ox, oy);
    out.push(
      `<line x1="${n(s.x)}" y1="${n(s.y)}" x2="${n(e.x)}" y2="${n(e.y)}" ` +
        `stroke="${R.opening.stroke}" stroke-width="${R.opening.glazingWidth}"/>`,
    );
  }
  return out;
}

// WallElement.tsx DoorSymbol — leaf line plus a 90 degree swing wedge.
function renderDoor(view, opening, wall) {
  const a = wall.points[opening.segmentIndex];
  const b = wall.points[opening.segmentIndex + 1];
  const { len, dirX, dirY } = segBasis(a, b);
  const facingLeft = opening.facing === 'left';
  const perpX = facingLeft ? dirY : -dirY;
  const perpY = facingLeft ? -dirX : dirX;
  const wallAngleDeg = (Math.atan2(dirY, dirX) * 180) / Math.PI;

  const hingeIsStart = opening.hinge !== 'end';
  const hingeFraction = hingeIsStart
    ? opening.offset / len
    : (opening.offset + opening.width) / len;
  const hinge = segPoint(a, b, hingeFraction);
  const hx = view.x(hinge.x);
  const hy = view.y(hinge.y);
  const radius = view.len(opening.width);

  // Same start-angle table as WallElement.tsx; the wedge always sweeps +90.
  const startDeg = hingeIsStart
    ? facingLeft
      ? wallAngleDeg - 90
      : wallAngleDeg
    : facingLeft
      ? wallAngleDeg + 180
      : wallAngleDeg + 90;
  const at = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: n(hx + radius * Math.cos(rad)), y: n(hy + radius * Math.sin(rad)) };
  };
  const p0 = at(startDeg);
  const p1 = at(startDeg + 90);

  const leafTip = { x: n(hx + perpX * radius), y: n(hy + perpY * radius) };

  return [
    `<path d="M ${hx} ${hy} L ${p0.x} ${p0.y} A ${radius} ${radius} 0 0 1 ${p1.x} ${p1.y} Z" ` +
      `fill="${R.doorFill}" stroke="${R.opening.stroke}" stroke-width="${R.opening.leafWidth}"/>`,
    `<line x1="${hx}" y1="${hy}" x2="${leafTip.x}" y2="${leafTip.y}" ` +
      `stroke="${R.opening.stroke}" stroke-width="${R.opening.leafWidth}"/>`,
  ];
}

// Node has no canvas to measure text, so this uses the same half-em estimate as
// measureBoxLabel's fallback. Josefin Sans is close to it.
const measureLabel = (text, fontSize) => text.length * fontSize * 0.5;

function boxPlacement(view, box) {
  const w = view.len(box.width);
  const h = view.len(box.length);
  const cx = view.x(box.x + box.width / 2);
  const cy = view.y(box.y + box.length / 2);
  return {
    w,
    h,
    transform: `translate(${cx} ${cy}) rotate(${n(box.rotation)}) translate(${n(-w / 2)} ${n(-h / 2)})`,
  };
}

// Grid.tsx: boxes hide the grid. Masks sit under the whole plan so they never cover walls or
// other boxes. They fade in with their box, so the hero never shows a hole in the grid.
function renderBoxMask(view, box, cls) {
  const { w, h, transform } = boxPlacement(view, box);
  const mask = `<rect data-box-mask transform="${transform}" width="${w}" height="${h}" fill="${R.gridBg}"/>`;
  return cls ? [`<g class="${cls}">${mask}</g>`] : [mask];
}

function renderBoxLabel(box, w, h) {
  const label = box.label || `${formatFeet(box.width)} × ${formatFeet(box.length)}`;
  const layout = fitBoxLabel(label, w, h, box.rotation, measureLabel);
  if (!layout) return [];
  const lineHeight = layout.fontSize * BOX_LABEL_LINE_HEIGHT;
  const out = [
    `  <g transform="translate(${n(w / 2)} ${n(h / 2)}) rotate(${n(layout.rotation)})" ` +
      `font-family="${BOX_LABEL_FONT_FAMILY}, sans-serif" font-size="${layout.fontSize}" ` +
      `fill="${R.box.labelFill}" text-anchor="middle" dominant-baseline="central">`,
  ];
  layout.lines.forEach((line, i) => {
    const y = n((i - (layout.lines.length - 1) / 2) * lineHeight);
    out.push(`    <text y="${y}">${esc(line)}</text>`);
  });
  out.push('  </g>');
  return out;
}

function renderBox(view, box, selected, cls) {
  const { w, h, transform } = boxPlacement(view, box);
  const color = box.color ?? DEFAULT_BOX_COLOR;
  const fill = hexToRgba(color, selected ? R.box.selectedFillOpacity : R.box.fillOpacity);
  const width = selected ? R.box.selectedWidth : R.box.width;
  const dash = selected ? '' : ` stroke-dasharray="${R.box.dash}"`;

  // The animated class goes on an outer, untransformed <g>: the hero's
  // .furniture-item rule sets transform-box/transform-origin, which would
  // otherwise re-base the placement transform below and move the box.
  const parts = [];
  if (cls) parts.push(`<g class="${cls}">`);
  parts.push(
    `<g transform="${transform}">`,
    `  <rect width="${w}" height="${h}" rx="${R.box.radius}" fill="${fill}" ` +
      `stroke="${color}" stroke-width="${width}"${dash}/>`,
  );
  if (selected) {
    const inset = R.box.haloInset;
    parts.push(
      `  <rect x="${-inset}" y="${-inset}" width="${n(w + inset * 2)}" height="${n(h + inset * 2)}" rx="${R.box.haloRadius}" ` +
        `fill="none" stroke="${R.box.accent}" stroke-width="${R.box.haloWidth}" stroke-dasharray="${R.box.haloDash}"/>`,
    );
  }
  parts.push(...renderBoxLabel(box, w, h));
  if (selected) {
    const off = R.box.handleOffset;
    parts.push(
      `  <line x1="${n(w / 2)}" y1="0" x2="${n(w / 2)}" y2="${-off}" stroke="${R.box.accent}" stroke-width="${R.box.handleLineWidth}"/>`,
      `  <circle cx="${n(w / 2)}" cy="${-off}" r="${R.box.handleRadius}" fill="${R.box.accent}" stroke="white" stroke-width="${R.box.handleRingWidth}"/>`,
    );
  }
  parts.push('</g>');
  if (cls) parts.push('</g>');
  return parts;
}

// ── Optional in-progress drawing decorations (DrawingCanvas.tsx) ────────────

function renderDrawingState(view, state) {
  if (!state) return [];
  const out = [];
  const { chainFrom, ghostTo, ghostLabel, snapAt } = state;

  if (chainFrom && ghostTo) {
    out.push(
      `<line x1="${view.x(chainFrom.x)}" y1="${view.y(chainFrom.y)}" x2="${view.x(ghostTo.x)}" y2="${view.y(ghostTo.y)}" ` +
        `stroke="${R.ghostWall.stroke}" stroke-width="${R.ghostWall.width}" stroke-dasharray="${R.ghostWall.dash}" stroke-linecap="square"/>`,
    );
  }
  if (ghostLabel && chainFrom && ghostTo) {
    const mid = { x: (chainFrom.x + ghostTo.x) / 2, y: (chainFrom.y + ghostTo.y) / 2 };
    out.push(
      `<text x="${view.x(mid.x) + 8}" y="${view.y(mid.y) - 8}" font-family="Courier New, monospace" ` +
        `font-size="${R.ghostLabel.size}" fill="${R.ghostLabel.fill}">${esc(ghostLabel)}</text>`,
    );
  }
  if (chainFrom) {
    out.push(
      `<circle cx="${view.x(chainFrom.x)}" cy="${view.y(chainFrom.y)}" r="${R.chainVertex.radius}" fill="${R.chainVertex.fill}"/>`,
    );
  }
  if (snapAt) {
    out.push(
      `<circle cx="${view.x(snapAt.x)}" cy="${view.y(snapAt.y)}" r="${R.snapEndpoint.radius}" ` +
        `fill="${R.snapEndpoint.fill}" stroke="${R.snapEndpoint.stroke}" stroke-width="${R.snapEndpoint.width}"/>`,
    );
  }
  return out;
}

// ── Canvas assembly ─────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {number} opts.width         SVG width in px (matches the shot frame)
 * @param {number} opts.height        SVG height in px
 * @param {number} opts.zoom          app zoom level
 * @param {{x:number,y:number}} opts.originFt  world point at the SVG's top-left
 * @param {number[]} [opts.omitWalls]  wall indexes to leave undrawn (mid-draw shots);
 *                                     openings on an omitted wall are dropped too
 * @param {string[]} [opts.omitBoxes]  boxes (by label) to leave out entirely
 * @param {string} [opts.selectedLabel] box label to render in the selected state
 * @param {object} [opts.drawingState] in-progress wall chain decorations
 * @param {number} [opts.dim]         opacity applied to the whole plan (modal shots)
 * @param {boolean} [opts.animateBoxes] tag boxes with the hero's fade-in classes
 * @param {string} [opts.ariaLabel]   when set, the svg is labelled instead of hidden
 */
function renderCanvas(opts) {
  const {
    width,
    height,
    zoom,
    originFt,
    omitWalls = [],
    omitBoxes = [],
    selectedLabel,
    drawingState,
    dim,
    animateBoxes,
    ariaLabel,
  } = opts;
  const view = makeView({ zoom, originFt });
  const elements = createSampleElements();

  const walls = elements
    .filter((el) => el.type === 'wall')
    .filter((_, i) => !omitWalls.includes(i));
  const openings = elements
    .filter((el) => el.type === 'door' || el.type === 'window')
    .filter((op) => walls.some((w) => w.id === op.wallId));
  const boxes = elements.filter((el) => el.type === 'box' && !omitBoxes.includes(el.label));

  const boxClass = (i) => (animateBoxes ? `furniture-item fi-${i}` : '');
  const masks = boxes.flatMap((box, i) => renderBoxMask(view, box, boxClass(i)));

  const plan = [];
  for (const wall of walls) plan.push(...renderWall(view, wall, openings, null));
  for (const opening of openings) {
    const wall = walls.find((w) => w.id === opening.wallId);
    plan.push(
      ...(opening.type === 'door'
        ? renderDoor(view, opening, wall)
        : renderWindow(view, opening, wall)),
    );
  }
  boxes.forEach((box, i) => {
    plan.push(...renderBox(view, box, box.label === selectedLabel, boxClass(i)));
  });
  plan.push(...renderDrawingState(view, drawingState));

  const body =
    dim === undefined ? plan : [`<g opacity="${dim}">`, ...plan.map((l) => `  ${l}`), '</g>'];

  return [
    `<svg class="shot-canvas" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" ` +
      (ariaLabel ? `role="img" aria-label="${esc(ariaLabel)}">` : 'aria-hidden="true">'),
    ...renderGrid(view, width, height).map((l) => `  ${l}`),
    ...masks.map((l) => `  ${l}`),
    ...body.map((l) => `  ${l}`),
    '</svg>',
  ].join('\n');
}

// ── The four canvases embedded in home.html ─────────────────────────────────
// Frame sizes are the `.shot` dimensions declared in home.html's CSS.

const CANVASES = {
  // Hero: the finished plan, centred, no chrome. Boxes carry the fade-in classes.
  hero: renderCanvas({
    width: 560,
    height: 460,
    zoom: 0.72,
    originFt: { x: -2.222, y: -2.486 },
    animateBoxes: true,
    ariaLabel: 'Floor plan sketch of a bedroom with furniture',
  }),

  // Row 1: the app mid-draw. Three walls are down, the bottom wall is being
  // drawn right-to-left and is snapping to the left wall's endpoint, and the
  // dresser and armchair have not been placed yet.
  row1: renderCanvas({
    width: 720,
    height: 640,
    zoom: 0.85,
    originFt: { x: -4.794, y: -3.912 },
    omitWalls: [1], // bottom wall (and therefore its door)
    omitBoxes: ['Dresser', 'Armchair'],
    drawingState: {
      chainFrom: { x: 15, y: 11 },
      ghostTo: { x: 0, y: 11 },
      snapAt: { x: 0, y: 11 },
    },
  }),

  // Row 2: the finished plan with the bed selected, next to the properties panel.
  row2: renderCanvas({
    width: 720,
    height: 560,
    zoom: 0.75,
    originFt: { x: -0.5, y: -3.867 },
    selectedLabel: 'Bed',
  }),

  // Row 3: the plan behind the plans modal. The modal's own backdrop dims it,
  // exactly as in the app, so nothing is pre-dimmed here.
  row3: renderCanvas({
    width: 680,
    height: 460,
    zoom: 0.62,
    originFt: { x: -6.21, y: -4.823 },
  }),

  // The social sharing card: the whole finished plan at the app's own scale.
  og: renderCanvas({
    width: 700,
    height: 630,
    zoom: 1,
    originFt: { x: -1.25, y: -2.375 },
    ariaLabel: 'Floor plan sketch of a bedroom with furniture',
  }),
};

// ── Splice into the two pages ───────────────────────────────────────────────

const PAGES = [
  { file: HOME_HTML, ids: ['hero', 'row1', 'row2', 'row3'] },
  { file: OG_HTML, ids: ['og'] },
];

for (const { file, ids } of PAGES) {
  let html = fs.readFileSync(file, 'utf8');
  let updated = 0;
  for (const id of ids) {
    const begin = `<!-- BEGIN:canvas-${id} -->`;
    const end = `<!-- END:canvas-${id} -->`;
    const re = new RegExp(`([ \\t]*)${begin}[\\s\\S]*?${end}`);
    const match = html.match(re);
    if (!match) {
      console.error(`✗ no ${begin} ... ${end} region in ${path.basename(file)}`);
      process.exitCode = 1;
      continue;
    }
    const indent = match[1];
    const block = [begin, ...CANVASES[id].split('\n'), end]
      .map((l) => (l ? indent + l : l))
      .join('\n');
    html = html.replace(re, () => block);
    updated++;
    console.log(`✓ canvas-${id}`);
  }
  fs.writeFileSync(file, html);
  console.log(`${updated} canvas region(s) written to ${path.basename(file)}\n`);
}
