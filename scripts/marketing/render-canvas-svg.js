// Usage: npm run generate:marketing-canvas
//
// Regenerates the floor-plan canvas artwork embedded in public/home.html.
//
// The marketing page fakes the app UI. The *chrome* (top bar, toolbar, panels)
// is hand-written HTML/CSS that mirrors the component CSS modules; the *canvas*
// is drawn here, from the app's own default plan and the app's own render rules,
// so it cannot quietly drift away from what the app actually draws.
//
// Node 26 strips TypeScript types on import, so we read the real source directly.
//
// Output: the marked regions in public/home.html
//           <!-- BEGIN:canvas-<id> --> ... <!-- END:canvas-<id> -->

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSampleElements } from '../../src/utils/samplePlan.ts';
import { PIXELS_PER_FOOT } from '../../src/utils/geometry/geometry.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME_HTML = path.resolve(__dirname, '../../public/home.html');

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
    stroke: '#2d5490',
    width: 1.5,
    fill: 'rgba(74,111,165,0.06)',
    dash: '4 3',
    radius: 1,
    labelSize: 11,
    labelInset: 4,
  },
  boxSelected: {
    stroke: '#0066cc',
    width: 2,
    fill: 'rgba(0,102,204,0.06)',
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

function renderBox(view, box, selected, cls, hideLabel) {
  const w = view.len(box.width);
  const h = view.len(box.length);
  const cx = view.x(box.x + box.width / 2);
  const cy = view.y(box.y + box.length / 2);
  const style = selected ? { ...R.box, ...R.boxSelected } : R.box;
  const dash = selected ? '' : ` stroke-dasharray="${R.box.dash}"`;

  // The animated class goes on an outer, untransformed <g>: the hero's
  // .furniture-item rule sets transform-box/transform-origin, which would
  // otherwise re-base the placement transform below and move the box.
  const parts = [];
  if (cls) parts.push(`<g class="${cls}">`);
  parts.push(
    `<g transform="translate(${cx} ${cy}) rotate(${n(box.rotation)}) translate(${n(-w / 2)} ${n(-h / 2)})">`,
    `  <rect width="${w}" height="${h}" rx="${R.box.radius}" fill="${style.fill}" ` +
      `stroke="${style.stroke}" stroke-width="${style.width}"${dash}/>`,
  );
  if (box.label && !hideLabel) {
    parts.push(
      `  <text x="${R.box.labelInset}" y="${R.box.labelInset + R.box.labelSize * 0.8}" ` +
        `font-family="Courier New, monospace" font-size="${R.box.labelSize}" fill="${style.stroke}">${esc(box.label)}</text>`,
    );
  }
  if (selected) {
    const off = R.boxSelected.handleOffset;
    parts.push(
      `  <line x1="${n(w / 2)}" y1="0" x2="${n(w / 2)}" y2="${-off}" stroke="${R.boxSelected.stroke}" stroke-width="${R.boxSelected.handleLineWidth}"/>`,
      `  <circle cx="${n(w / 2)}" cy="${-off}" r="${R.boxSelected.handleRadius}" fill="${R.boxSelected.stroke}" stroke="white" stroke-width="${R.boxSelected.handleRingWidth}"/>`,
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
 * @param {string[]} [opts.hideLabels] boxes (by label) to draw without their name
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
    hideLabels = [],
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
    plan.push(
      ...renderBox(
        view,
        box,
        box.label === selectedLabel,
        animateBoxes ? `furniture-item fi-${i}` : '',
        hideLabels.includes(box.label),
      ),
    );
  });
  plan.push(...renderDrawingState(view, drawingState));

  const body =
    dim === undefined ? plan : [`<g opacity="${dim}">`, ...plan.map((l) => `  ${l}`), '</g>'];

  return [
    `<svg class="shot-canvas" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" ` +
      (ariaLabel ? `role="img" aria-label="${esc(ariaLabel)}">` : 'aria-hidden="true">'),
    ...renderGrid(view, width, height).map((l) => `  ${l}`),
    ...body.map((l) => `  ${l}`),
    '</svg>',
  ].join('\n');
}

// ── The four canvases embedded in home.html ─────────────────────────────────
// Frame sizes are the `.shot` dimensions declared in home.html's CSS.

// A DELIBERATE DEVIATION FROM THE APP.
// The app draws box labels at a constant 11px Courier and does not clip them to
// the box (BoxElement.tsx), so a name wider than its box overruns its
// neighbours. The sample plan's nightstands are the only case: "Nightstand" is
// 10 characters -> ~66px of Courier against a 60px-wide box, and it collides
// with the bed's label. Removing the name in samplePlan.ts does not help,
// because BoxElement falls back to the dimensions ("1' 6\" x 2'", also 10
// characters). So the marketing shots suppress that one label.
//
// This is the only place these mockups knowingly differ from the app. If
// BoxElement ever clips labels (width + wrap="none" + ellipsis), delete this
// and let the shots show what the app shows.
const HIDE_LABELS = ['Nightstand'];

const CANVASES = {
  // Hero: the finished plan, centred, no chrome. Boxes carry the fade-in classes.
  hero: renderCanvas({
    width: 560,
    height: 460,
    zoom: 0.72,
    originFt: { x: -2.222, y: -2.486 },
    hideLabels: HIDE_LABELS,
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
    hideLabels: HIDE_LABELS,
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
    hideLabels: HIDE_LABELS,
    selectedLabel: 'Bed',
  }),

  // Row 3: the plan behind the plans modal. The modal's own backdrop dims it,
  // exactly as in the app, so nothing is pre-dimmed here.
  row3: renderCanvas({
    width: 680,
    height: 460,
    zoom: 0.62,
    originFt: { x: -6.21, y: -4.823 },
    hideLabels: HIDE_LABELS,
  }),
};

// ── Splice into home.html ───────────────────────────────────────────────────

let html = fs.readFileSync(HOME_HTML, 'utf8');
let updated = 0;

for (const [id, svg] of Object.entries(CANVASES)) {
  const begin = `<!-- BEGIN:canvas-${id} -->`;
  const end = `<!-- END:canvas-${id} -->`;
  const re = new RegExp(`([ \\t]*)${begin}[\\s\\S]*?${end}`);
  const match = html.match(re);
  if (!match) {
    console.error(`✗ no ${begin} ... ${end} region in public/home.html`);
    process.exitCode = 1;
    continue;
  }
  const indent = match[1];
  const block = [begin, ...svg.split('\n'), end].map((l) => (l ? indent + l : l)).join('\n');
  html = html.replace(re, () => block);
  updated++;
  console.log(`✓ canvas-${id}`);
}

fs.writeFileSync(HOME_HTML, html);
console.log(`\n${updated} canvas region(s) written to public/home.html`);
