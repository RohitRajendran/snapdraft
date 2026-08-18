import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { PIXELS_PER_FOOT } from '../utils/geometry/geometry';
import { createSampleElements } from '../utils/samplePlan';

/**
 * The marketing page (public/home.html) recreates the app's UI in hand-written
 * HTML/CSS. Nothing at runtime keeps those recreations honest, so this suite
 * diffs the values most likely to drift against the components that own them.
 *
 * When a component changes and one of these fails, update home.html to match —
 * the component is the source of truth, never the other way round.
 */

const root = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

const home = read('public/home.html');
/** home.html writes non-ASCII glyphs as numeric entities; decode for text assertions. */
const homeText = home.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

/** Pull one CSS rule body out of a stylesheet by selector. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm'));
  if (!match) throw new Error(`no rule for "${selector}"`);
  return match[2];
}

/** Read a single declaration's value out of a rule body. */
function decl(css: string, selector: string, property: string): string {
  const body = rule(css, selector);
  const match = body.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`));
  if (!match) throw new Error(`no "${property}" in "${selector}"`);
  // Collapse whitespace so `rgba(0,0,0,.08)` and `rgba(0, 0, 0, .08)` compare equal.
  return match[1].trim().replace(/\s+/g, ' ').replace(/,\s/g, ',');
}

describe('marketing mockups mirror the app', () => {
  describe('toolbar', () => {
    const app = read('src/components/Toolbar/Toolbar.module.css');

    it.each([
      ['border-radius', '.toolbar', '.sd-toolbar'],
      ['padding', '.toolbar', '.sd-toolbar'],
      ['gap', '.toolbar', '.sd-toolbar'],
      ['min-width', '.tool', '.sd-tool'],
      ['min-height', '.tool', '.sd-tool'],
      ['padding', '.tool', '.sd-tool'],
      ['border-radius', '.tool', '.sd-tool'],
      ['width', '.icon', '.sd-icon'],
      ['font-size', '.label', '.sd-toollabel'],
      ['letter-spacing', '.label', '.sd-toollabel'],
      ['padding', '.selectPanMain', '.sd-group-main'],
      ['padding', '.selectPanFooter', '.sd-group-foot'],
      ['border-top', '.selectPanFooter', '.sd-group-foot'],
    ])('%s matches on %s', (property, appSelector, mockSelector) => {
      expect(decl(home, mockSelector, property)).toBe(decl(app, appSelector, property));
    });

    it('labels use the body font, not the monospace display font', () => {
      expect(decl(app, '.label', 'font-family')).toBe('var(--font-body)');
      expect(decl(home, '.sd-toollabel', 'font-family')).toBe('var(--font-body)');
    });

    it('disabled tools fade rather than recolor', () => {
      expect(decl(home, '.sd-tool.is-disabled', 'opacity')).toBe(
        decl(app, '.tool:disabled', 'opacity'),
      );
    });
  });

  describe('properties panel', () => {
    const app = read('src/components/PropertiesPanel/PropertiesPanel.module.css');
    const ftIn = read('src/components/PropertiesPanel/FtInInput/FtInInput.module.css');

    it.each([
      ['width', '.sd-panel'],
      ['right', '.sd-panel'],
      ['top', '.sd-panel'],
      ['border-radius', '.sd-panel'],
      ['padding', '.sd-panel'],
      ['background', '.sd-panel'],
    ])('%s matches on %s', (property, mockSelector) => {
      expect(decl(home, mockSelector, property)).toBe(decl(app, '.panel', property));
    });

    it('the title is a compact uppercase label', () => {
      expect(decl(home, '.sd-panel-title', 'font-size')).toBe(decl(app, '.title', 'font-size'));
      expect(decl(home, '.sd-panel-title', 'letter-spacing')).toBe(
        decl(app, '.title', 'letter-spacing'),
      );
    });

    it('inputs are white and use the body font at 14px', () => {
      expect(decl(ftIn, '.input', 'background')).toBe('white');
      expect(decl(home, '.sd-input', 'background')).toBe('white');
      expect(decl(home, '.sd-input', 'font-size')).toBe(decl(ftIn, '.input', 'font-size'));
      expect(decl(home, '.sd-input', 'font-family')).toBe(decl(ftIn, '.input', 'font-family'));
      expect(decl(home, '.sd-input', 'min-height')).toBe(decl(ftIn, '.input', 'min-height'));
    });

    it('delete is outlined in the destructive color', () => {
      expect(decl(home, '.sd-delete', 'border')).toBe(decl(app, '.deleteBtn', 'border'));
      expect(decl(home, '.sd-delete', 'color')).toBe(decl(app, '.deleteBtn', 'color'));
    });
  });

  describe('plans manager', () => {
    const app = read('src/components/FloorplanManager/FloorplanManager.module.css');
    const tsx = read('src/components/FloorplanManager/FloorplanManager.tsx');

    it.each([
      ['width', '.panel', '.sd-modal'],
      ['padding', '.panel', '.sd-modal'],
      ['border-radius', '.panel', '.sd-modal'],
      ['background', '.panel', '.sd-modal'],
      ['padding', '.item', '.sd-item'],
      ['border-radius', '.item', '.sd-item'],
    ])('%s matches on %s', (property, appSelector, mockSelector) => {
      expect(decl(home, mockSelector, property)).toBe(decl(app, appSelector, property));
    });

    it('the modal panel is cream, not white', () => {
      expect(decl(app, '.panel', 'background')).toBe('var(--bg)');
    });

    it('uses the real dialog title and button labels', () => {
      for (const label of ['Floor Plans', 'Import Plan', 'New Floor Plan']) {
        expect(tsx).toContain(label);
        expect(home).toContain(label);
      }
    });

    it('shows no invented thumbnails, timestamps or chevrons', () => {
      const modal = home.slice(home.indexOf('sd-backdrop'), home.indexOf('</section>'));
      for (const invented of ['Last edited', 'Yesterday', 'days ago', 'NEW PLAN']) {
        expect(modal).not.toContain(invented);
      }
    });
  });

  describe('canvas chrome', () => {
    const scaleBar = read('src/components/Canvas/ScaleBar/ScaleBar.tsx');
    const scaleCss = read('src/components/Canvas/ScaleBar/ScaleBar.module.css');
    const canvasCss = read('src/components/Canvas/DrawingCanvas/DrawingCanvas.module.css');
    const canvasTsx = read('src/components/Canvas/DrawingCanvas/DrawingCanvas.tsx');
    const topBarCss = read('src/components/Canvas/TopBar/TopBar.module.css');

    it('uses the scale bar string the app renders', () => {
      const label = scaleBar.match(/'(1 □ = 1 ft)'/)?.[1];
      expect(label).toBeDefined();
      expect(homeText).toContain(label!);
    });

    it('scale bar styling matches', () => {
      expect(decl(home, '.sd-scale', 'font-size')).toBe(decl(scaleCss, '.scaleLabel', 'font-size'));
      expect(decl(home, '.sd-scale', 'padding')).toBe(decl(scaleCss, '.container', 'padding'));
      expect(decl(home, '.sd-scale', 'border-radius')).toBe(
        decl(scaleCss, '.container', 'border-radius'),
      );
    });

    it('uses the fit button label the app renders', () => {
      const label = canvasTsx.match(/([⤢↙⤡])\s*Fit/)?.[1];
      expect(label).toBeDefined();
      expect(homeText).toContain(`${label} Fit`);
    });

    it('fit button styling matches', () => {
      for (const property of [
        'padding',
        'font-size',
        'font-weight',
        'background',
        'border-radius',
      ]) {
        expect(decl(home, '.sd-fit', property)).toBe(decl(canvasCss, '.fitButton', property));
      }
    });

    it('the dimension input keeps the monospace display font', () => {
      expect(decl(home, '.sd-diminput', 'font-family')).toBe(
        decl(canvasCss, '.dimInput', 'font-family'),
      );
      expect(decl(home, '.sd-diminput', 'width')).toBe(decl(canvasCss, '.dimInput', 'width'));
    });

    it('top bar height and logo styling match', () => {
      expect(decl(home, '.sd-topbar', 'height')).toBe(decl(topBarCss, '.bar', 'height'));
      expect(decl(home, '.sd-topbar', 'padding')).toBe(decl(topBarCss, '.bar', 'padding'));
      expect(decl(home, '.sd-logo', 'font-size')).toBe(decl(topBarCss, '.logo', 'font-size'));
      expect(decl(home, '.sd-logo', 'letter-spacing')).toBe(
        decl(topBarCss, '.logo', 'letter-spacing'),
      );
    });
  });

  describe('generated canvas artwork', () => {
    const canvases = [
      ...home.matchAll(/<!-- BEGIN:canvas-(\w+) -->([\s\S]*?)<!-- END:canvas-\1 -->/g),
    ];

    it('every marked region has been generated', () => {
      expect(canvases.map((c) => c[1]).sort()).toEqual(['hero', 'row1', 'row2', 'row3']);
      for (const [, id, body] of canvases) {
        expect(body, `canvas-${id} is empty — run npm run generate:marketing-canvas`).toContain(
          '<svg',
        );
      }
    });

    it('draws the grid at the app scale, bold every 5 ft', () => {
      // The hero renders at zoom 0.72; minor lines land on PIXELS_PER_FOOT * zoom.
      const hero = canvases.find((c) => c[1] === 'hero')![2];
      const majors = [...hero.matchAll(/x1="([\d.]+)" y1="0"[^>]*stroke="#a8bcd4"/g)].map((m) =>
        parseFloat(m[1]),
      );
      expect(majors.length).toBeGreaterThan(1);
      const pitch = majors[1] - majors[0];
      expect(pitch).toBeCloseTo(PIXELS_PER_FOOT * 0.72 * 5, 1);
    });

    it('draws walls, openings and boxes the way the components do', () => {
      const row = canvases.find((c) => c[1] === 'row2')![2];
      // Wall: 3px square-capped ink
      expect(row).toMatch(/stroke="#2c2c2c" stroke-width="3" stroke-linecap="square"/);
      // Door: a filled swing wedge in ink, not a dashed blue arc
      expect(row).toMatch(/fill="rgba\(255,255,255,0\.3\)" stroke="#2c2c2c"/);
      // Unselected box: dashed blueprint blue
      expect(row).toMatch(/stroke="#2d5490" stroke-width="1.5" stroke-dasharray="4 3"/);
      // Selected box: solid selection blue with a rotation handle and no corner handles
      expect(row).toMatch(/stroke="#0066cc" stroke-width="2"(?! stroke-dasharray)/);
      expect(row).toMatch(/r="6" fill="#0066cc" stroke="white"/);
    });

    it("labels boxes with the plan's real labels", () => {
      const row = canvases.find((c) => c[1] === 'row2')![2];
      for (const label of ['Bed', 'Dresser', 'Armchair']) {
        expect(row).toContain(`>${label}<`);
      }
    });

    it('suppresses only the one label the app cannot fit', () => {
      // The single deliberate deviation from the app, asserted here so it stays
      // visible. The app draws "Nightstand" (10 chars of 11px Courier, ~66px)
      // inside a 1.5ft box (60px) and it overruns onto the bed's label. See the
      // HIDE_LABELS note in scripts/marketing/render-canvas-svg.js.
      const CHAR_PX = 11 * 0.6; // Courier advance is 0.6em
      const INSET_PX = 4;
      const hidden = ['Nightstand'];

      for (const [, , body] of canvases) {
        for (const label of hidden) expect(body).not.toContain(`>${label}<`);
      }

      const boxes = createSampleElements().filter((el) => el.type === 'box');
      const usablePx = (widthFt: number) => widthFt * PIXELS_PER_FOOT - INSET_PX * 2;

      // Every label we do draw must actually fit its box...
      for (const box of boxes) {
        if (box.type !== 'box' || !box.label || hidden.includes(box.label)) continue;
        expect(
          box.label.length * CHAR_PX,
          `"${box.label}" overruns its ${box.width}ft box — hide it or shorten it`,
        ).toBeLessThanOrEqual(usablePx(box.width));
      }

      // ...and everything we hide must genuinely not fit, so the list cannot
      // quietly grow into "make the mockups prettier than the app".
      for (const label of hidden) {
        const box = boxes.find((b) => b.type === 'box' && b.label === label);
        expect(box, `nothing in the sample plan is labelled "${label}"`).toBeDefined();
        if (box?.type !== 'box') continue;
        expect(label.length * CHAR_PX).toBeGreaterThan(usablePx(box.width));
      }
    });
  });

  describe('no leftover hand-drawn approximations', () => {
    it('UI chrome does not use the monospace font where the app uses Josefin', () => {
      // Courier is legitimate for the logo, plan name, box labels and dim input only.
      for (const selector of ['.sd-toollabel', '.sd-fieldlabel', '.sd-input', '.sd-modal-title']) {
        expect(rule(home, selector)).not.toContain('var(--font)');
      }
    });

    it('does not reintroduce the invented SVG toolbar', () => {
      expect(home).not.toContain('SELECT ▾');
      expect(home).not.toContain('PLANS ⊞');
    });
  });

  describe('page-level design rules', () => {
    const sectionCount = (home.match(/<section id="/g) ?? []).length;

    it('caps eyebrows at one per three sections', () => {
      // Small uppercase wide-tracked labels above a heading. Repeating one above
      // every section is the templated rhythm DESIGN_SYSTEM.md warns about.
      const eyebrows = (home.match(/class="(hero-eyebrow|section-label)"/g) ?? []).length;
      expect(sectionCount).toBeGreaterThan(0);
      expect(eyebrows).toBeLessThanOrEqual(Math.ceil(sectionCount / 3));
    });

    it('uses one label for the one call-to-action intent', () => {
      const labels = new Set(
        [...home.matchAll(/class="btn-primary"[^>]*>([^<]+)</g)].map((m) => m[1].trim()),
      );
      expect(labels.size).toBe(1);
    });

    it('sizes the hero with dvh so the iOS address bar cannot shift it', () => {
      const hero = rule(home, '#hero');
      expect(hero).toContain('100dvh');
      expect(hero).toContain('100vh'); // fallback retained for older browsers
    });

    it('does not repeat the three-equal-column layout family', () => {
      const threeCol = (home.match(/grid-template-columns:\s*repeat\(3, 1fr\)/g) ?? []).length;
      expect(threeCol).toBeLessThanOrEqual(1);
    });
  });
});
