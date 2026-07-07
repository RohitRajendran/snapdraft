# SnapDraft Design System

SnapDraft uses a **Technical / Blueprint** design language: warm cream surfaces, blueprint blue accents, and a deliberate tension between mechanical monospace headings and clean geometric body text. The aesthetic references drafting tools and architectural drawings without being nostalgic about it.

This document captures the design rules in force. Read it before building new pages or components — it saves you from reverse-engineering the stylesheet.

---

## 1. Design Tokens

CSS custom properties defined in `:root`. Always use these — never hardcode raw values.

### Backgrounds & Surfaces

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f5f0e8` | Page background, form field backgrounds |
| `--blueprint-bg` | `rgba(74,111,165,0.06)` | Tinted content areas, furniture fill in SVGs |

### Ink (Text) Scale

Five stops from near-black to mid-gray. Use in order of hierarchy.

| Token | Value | Use |
|---|---|---|
| `--ink-dark` | `#1a1a1a` | Headings, primary emphasis, dark section text |
| `--ink` | `#2c2c2c` | Default body text, standard UI labels |
| `--ink-mid` | `#4a4a4a` | Secondary body text, descriptions |
| `--ink-light` | `#6a6a6a` | Tertiary text, footer, disabled states |

### Brand Blues

Reserved for SVG illustrations — not for UI chrome, labels, chips, or borders.

| Token | Value | Use |
|---|---|---|
| `--blue` | `#2c4a7a` | SVG room fills, illustration accents |
| `--blueprint` | `#2d5490` | Door arcs, SVG furniture strokes, active states |

### Borders

| Token | Value | Use |
|---|---|---|
| `--border` | `#c8c4bc` | Card edges, input borders, dividers |
| `--border-light` | `#d0ccc4` | Section dividers, subtle separators |
| `--grid-minor` | `#ccd9e8` | Fine grid lines in canvas SVGs |
| `--grid-major` | `#a8bcd4` | Major grid lines in canvas SVGs |

### Shadows

| Token | Value | Use |
|---|---|---|
| `--shadow` | `0 2px 16px rgba(0,0,0,0.08)` | Tooltips, floating UI elements |
| `--shadow-card` | `0 2px 16px rgba(0,0,0,0.06)` | Cards, panels |

### Radii

| Token | Value | Use |
|---|---|---|
| `--radius-btn` | `8px` | Buttons, small chips, tooltips |
| `--radius-card` | `12px` | Feature cards, modals, dropdowns |

### Font Families

| Token | Value | Use |
|---|---|---|
| `--font` | `'Courier New', monospace` | Headings, logo wordmark, keyboard key badges, dimension input |
| `--font-body` | `'Josefin Sans', sans-serif` | All other text: labels, buttons, inputs, captions, panel body |

Josefin Sans must be loaded via Google Fonts in the page `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;600;700&display=swap" rel="stylesheet">
```

### Interactive States

| Token | Value | Use |
|---|---|---|
| `--surface-hover` | `#ece8e0` | Hover background on cream and glass surfaces |
| `--surface-float` | `rgba(255,255,255,0.95)` | Floating panel / toolbar background (frosted white) |
| `--focus-ring` | `#4a6fa5` | Focus outline on all interactive elements — exception to the "no blue in UI" rule; blue focus rings are an accessibility best practice |

### Semantic Colors

| Token | Value | Use |
|---|---|---|
| `--color-destructive` | `#cc4444` | Delete actions, error borders, error text |
| `--color-destructive-hover` | `#b83333` | Hover state for destructive buttons |
| `--color-success` | `#2a7a4a` | Confirmation / done actions (mobile selection bar) |

---

## 2. Typography

The typography system follows a 5-layer architecture: **Scale → Primitive Tokens → Roles → Semantic Tokens → Text Styles**. Changes at any layer propagate automatically — you should never need to hunt down raw pixel values in rules.

### Layer 1: Scale

Minor Third ratio (×1.2) from a 16px base. All sizes are derived from this sequence. Fluid values use `clamp()` to preserve hierarchy across viewport widths without per-breakpoint overrides.

| Token | Value | Step |
|---|---|---|
| `--ts-xs` | `11px` | −2 |
| `--ts-sm` | `12px` | −1 |
| `--ts-base` | `16px` | 0 (base) |
| `--ts-md` | `18px` | +1 |
| `--ts-lg` | `clamp(22px, 2.4vw, 34px)` | +2 fluid |
| `--ts-xl` | `clamp(26px, 3vw, 40px)` | +3 fluid |
| `--ts-2xl` | `clamp(28px, 3.5vw, 48px)` | +4 fluid |
| `--ts-3xl` | `clamp(34px, 5vw, 68px)` | +5 fluid |

Test: if you change a scale value, does every style that references it update automatically?

### Layer 2: Semantic Tokens

Semantic tokens express **role intent**, not raw numbers. They reference scale tokens — never hardcoded values.

| Token | Scale reference | Role |
|---|---|---|
| `--text-display-size` | `var(--ts-3xl)` | Hero / display heading |
| `--text-cta-size` | `var(--ts-2xl)` | CTA section heading |
| `--text-heading-size` | `var(--ts-xl)` | Section headings |
| `--text-subheading-size` | `var(--ts-lg)` | Feature headings |
| `--text-step-size` | `var(--ts-md)` | Small headings (step titles) |
| `--text-body-size` | `var(--ts-base)` | All body text |
| `--text-label-size` | `var(--ts-sm)` | Labels, buttons, footer, captions |
| `--text-chip-size` | `var(--ts-xs)` | Compact chips and eyebrows |

Test: can you swap out a scale token without touching any CSS rule?

### Layer 3: Roles

Roles describe intent — not sizes, weights, or pixels. A role is the same across breakpoints; only the underlying scale values change.

| Role | Intent | Applies to |
|---|---|---|
| **Display** | Primary page statement, rare — one per page | `h1` |
| **Heading** | Organises major sections | `h2`, `.section-heading` |
| **Subheading** | Feature or content hierarchy | `h3`, `.feature-row-heading`, `.cta-heading` |
| **Step Title** | Small in-context heading | `h3.step-title` |
| **Body** | Primary reading flow; 16px minimum | All `p` text, `.hero-sub`, `.feature-row-body`, `.step-body`, `.everywhere-body`, `.cta-sub` |
| **Label** | UI chrome: buttons, section markers, badges | `.section-label`, `.step-label`, `.badge`, `.btn-*`, `.cta-link`, `.site-footer` |
| **Chip** | Compact capability tags and eyebrows | `.feature-chip`, `.feature-row-eyebrow`, `.hero-eyebrow` |

Test: can you explain each role without mentioning font sizes, weights, or pixels?

### Layer 4: Font Pairing

**Courier New** is used exclusively for display headings. At large sizes its fixed-width character reads as an architect's title block — mechanical precision as a design statement. Never use it for body text; it degrades readability at small sizes.

**Josefin Sans** (a geometric sans-serif, Futura-inspired) carries all body text, labels, buttons, and captions. Clean and legible at small sizes; the geometric forms complement Courier New's mechanical quality without competing with it.

Load Josefin Sans from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;600;700&display=swap" rel="stylesheet">
```

### Layer 5: Text Styles (CSS Classes)

Text styles are the usable surface — they reference semantic tokens only, contain no hardcoded values, and add no new logic. Don't create a new class unless it represents a genuinely new role. Body text classes don't override `font-size`; they inherit it from `body`.

| Role | Semantic token | Font | Weight | Line-height | Letter-spacing | CSS class(es) |
|---|---|---|---|---|---|---|
| **Display** | `--text-display-size` | Courier New | 700 | 1.08 | 0.02em | `h1` |
| **Heading** | `--text-heading-size` | Courier New | 700 | 1.12 | 0.03em | `h2`, `.section-heading` |
| **Subheading** | `--text-subheading-size` / `--text-cta-size` | Courier New | 700 | 1.1–1.15 | 0.02–0.03em | `h3`, `.feature-row-heading`, `.cta-heading` |
| **Step Title** | `--text-step-size` | Courier New | 700 | 1.5 | 0.04em | `.step-title` |
| **Body** | `--text-body-size` (on `body`) | Josefin Sans | 400 | 1.75–1.85 | — | `.hero-sub`, `.feature-row-body`, `.everywhere-body`, `.step-body`, `.cta-sub` — inherit, no override |
| **Label** | `--text-label-size` | Josefin Sans | 700 | default | 0.04–0.14em | `.section-label`, `.step-label`, `.badge`, `.btn-*`, `.cta-link`, `.site-footer` |
| **Chip** | `--text-chip-size` | Josefin Sans | 700 | default | 0.06–0.14em | `.feature-chip`, `.feature-row-eyebrow`, `.hero-eyebrow` |

### All-Caps Rules

Labels (`.section-label`, `.hero-eyebrow`, `.feature-row-eyebrow`, `.step-label`, `.cta-link`, `.btn-primary`, `.btn-secondary`) are `text-transform: uppercase`. **Always pair uppercase with generous letter-spacing (≥ 0.06em).** Cramped all-caps is a common failure mode — the letters blur together without tracking room.

| Usage | Letter-spacing |
|---|---|
| Buttons, badges | 0.06–0.08em |
| Section labels, eyebrows | 0.12–0.14em |
| Nav logo | 0.12em |

### Responsive Typography

`clamp()` is used for all heading sizes. The pattern is `clamp(min, fluid, max)` where the fluid value is a viewport unit. Roles remain semantically the same at all sizes — a Title is still a Title on mobile, just smaller.

### Decorative Number (`step-number`)

The large faded step counters (`.step-number`) use Courier New at 88px, weight 700, color `rgba(44,74,122,0.07)`, letter-spacing `-0.04em`. These are purely decorative — `aria-hidden="true"` on every instance.

---

## 3. Color System

The color system uses two layers: **primitive tokens** (raw values) and **semantic tokens** (purpose-driven aliases). Always reference tokens, never raw values. Blueprint blue is reserved for the SVG illustrations — UI chrome uses the neutral ink scale.

### Layer 1: Primitive Tokens

| Token | Value | Notes |
|---|---|---|
| `--bg` | `#f5f0e8` | Warm cream — the base surface |
| `--bg-rgb` | `245,240,232` | Channel triplet for `rgba(var(--bg-rgb), α)` opacity variants |
| `--ink-dark` | `#1a1a1a` | Near-black |
| `--ink` | `#2c2c2c` | Default text |
| `--ink-mid` | `#4a4a4a` | Secondary text, UI labels |
| `--ink-light` | `#6a6a6a` | Tertiary, footer, disabled |
| `--blue` | `#2c4a7a` | Blueprint accent — illustrations only |
| `--blueprint` | `#2d5490` | Blueprint stroke — illustrations only |
| `--blueprint-bg` | `rgba(74,111,165,0.06)` | Furniture fill in SVG floor plans |
| `--blueprint-tint` | `rgba(74,111,165,0.08)` | Slightly stronger tint — SVG only |
| `--blueprint-border` | `rgba(74,111,165,0.18)` | SVG element borders |
| `--border` | `#c8c4bc` | Standard border |
| `--border-light` | `#d0ccc4` | Subtle separator |
| `--grid-minor` | `#ccd9e8` | Fine grid lines in canvas SVGs |
| `--grid-major` | `#a8bcd4` | Major grid lines in canvas SVGs |
| `--color-destructive` | `#cc4444` | Error / delete actions |

### Layer 2: Semantic Tokens

| Token | Resolves to | Use |
|---|---|---|
| `--surface-header` | `rgba(var(--bg-rgb),0.92)` | Sticky nav background (frosted) |
| `--surface-alt` | `rgba(255,255,255,0.35)` | Alternate section bg (`#how`, `#everywhere`) |
| `--shadow` | `0 2px 16px rgba(0,0,0,0.08)` | Tooltips, floating elements |
| `--shadow-card` | `0 2px 16px rgba(0,0,0,0.06)` | Cards, panels |

### Semantic Use

Don't reach for raw hex values. Map intent to the token scale.

| Intent | Light surface | Dark surface (`#cta`) |
|---|---|---|
| Primary text | `var(--ink-dark)` | `var(--bg)` |
| Body text | `var(--ink-mid)` | `rgba(var(--bg-rgb),0.8)` |
| Tertiary / muted | `var(--ink-light)` | `rgba(255,255,255,0.65)` |
| UI labels, eyebrows | `var(--ink-mid)` | — |
| Surface | `var(--bg)` | `var(--ink-dark)` |
| Alternate surface | `var(--surface-alt)` | — |
| Destructive | `var(--color-destructive)` | — |

**Blueprint blue (`--blue`, `--blueprint`) is for SVG illustrations only.** Do not apply it to UI text, labels, chips, or borders.

### Background Hierarchy

Four surface levels:

1. `var(--bg)` — default page background
2. `var(--surface-alt)` — alternate sections for subtle rhythm
3. `white` — panels, cards, form fields
4. `var(--ink-dark)` — CTA section; inverts all text and button colors

### Accessibility

- All body text on `--bg` meets WCAG AA (4.5:1 minimum). Don't introduce new color combinations without checking contrast.
- Focus ring: `2px solid #4a6fa5`, `offset: 1–2px`. Apply to all interactive elements.
- Disabled states use `opacity: 0.35` rather than a separate color.

---

## 4. Spacing Scale

Spacing uses two layers, mirroring the typography token approach.

### Layer 1: Scale (4pt grid, 8pt preferred)

All tokens are 4pt multiples. When adding new spacing, reach for an 8pt value first; use a 4pt value only when the layout demands tighter control.

| Token | Value | Notes |
|---|---|---|
| `--space-1` | `4px` | Micro gaps, icon margins |
| `--space-2` | `8px` | Tight internal gaps, margins between label and title |
| `--space-3` | `12px` | Chip padding, label margin-bottom |
| `--space-4` | `16px` | Heading margin, sub-section gap |
| `--space-5` | `20px` | Eyebrow margin, footer padding |
| `--space-6` | `24px` | CTA links gap, mobile horizontal padding |
| `--space-8` | `32px` | — |
| `--space-10` | `40px` | Steps grid gap, desktop horizontal padding |
| `--space-12` | `48px` | Hero padding, section heading margin |
| `--space-14` | `56px` | Mobile section padding |
| `--space-16` | `64px` | Feature row gap |
| `--space-20` | `80px` | Standard section padding |
| `--space-25` | `100px` | CTA section padding |

**Off-grid exceptions** (component-internal, kept as raw values, not tokenized): button padding `10px 18px`, badge padding `10px 14px`, feature chip padding `4px 10px`. These are intentional — don't "correct" them.

### Layer 2: Semantic Tokens

Named patterns for values that repeat across the structural skeleton of the page.

| Token | Reference | Value | Use |
|---|---|---|---|
| `--space-content-h` | `--space-10` | 40px | Section horizontal padding (desktop) |
| `--space-content-h-sm` | `--space-6` | 24px | Section horizontal padding (mobile) |
| `--space-section-v` | `--space-20` | 80px | Standard section vertical padding |
| `--space-section-v-sm` | `--space-14` | 56px | Mobile section vertical padding |
| `--space-hero-v` | `--space-12` | 48px | Hero padding, major element vertical rhythm |
| `--space-feature-gap` | `--space-16` | 64px | Two-column feature row gap |
| `--space-grid-gap` | `--space-10` | 40px | Steps / use-cases grid gap |
| `--space-cta-v` | `--space-25` | 100px | CTA section vertical padding |

### Rules

1. All structural spacing must reference a `--space-*` token — no raw pixel values in section padding, container gaps, or major margins
2. Micro-spacing internal to components (button padding, badge padding) may use raw values — don't over-tokenize
3. New spacing values must land on the 4pt grid; prefer 8pt multiples
4. Changing a semantic token updates everywhere it's used — that's the point

---

## 5. Layout & Grid

### Content Container

Max-width `1160px`, centered, horizontal padding `40px` desktop / `24px` mobile.

```css
.inner {
  max-width: 1160px;
  margin: 0 auto;
  padding: 0 40px;
}
```

### Breakpoints

| Breakpoint | What changes |
|---|---|
| `≤ 1160px` | Content container at max-width |
| `≤ 860px` | Hero, feature rows, everywhere section collapse to single column; horizontal padding drops to 24px |
| `≤ 480px` | Hero CTAs stack vertically; badge grid collapses to single column |

### Feature Row Pattern

Two-column grid with 64px gap, items vertically centered. Add `.flip` to reverse visual order (image left, text right → text right, image left).

```css
.feature-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
}
.feature-row.flip .feature-row-visual { order: -1; }
```

At `≤ 860px`, collapses to single column and `.flip` order is reset.

---

## 6. Shadows & Elevation

Three elevation tiers:

| Tier | Value | Use |
|---|---|---|
| **Low** (card) | `0 2px 16px rgba(0,0,0,0.06)` | Cards, panels — `var(--shadow-card)` |
| **Mid** (feature visual) | `0 8px 40px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)` | Feature row visuals, hero SVG wrapper |
| **High** (modal) | `0 4px 20px rgba(0,0,0,0.14)` or `drop-shadow(0 8px 32px rgba(0,0,0,0.14))` | Dropdowns, overlays, modals |

Hero wrapper uses `0 4px 24px rgba(0,0,0,0.1)` (a named variant, between Mid and High).

Sticky/floating UI (header, toolbar) combines a low shadow with `backdrop-filter: blur(8px)` on a semi-transparent background rather than a hard shadow.

---

## 7. Component Patterns

### Buttons

Two variants. Both are `uppercase`, `font-family: var(--font-body)`, `font-size: 12px`, `border-radius: var(--radius-btn)`, `padding: 10px 18px`, minimum 44px touch target.

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| **Primary** | `var(--ink)` | `var(--bg)` | none | `var(--ink-dark)` background |
| **Secondary** | `white` | `var(--ink)` | `1px solid var(--border)` | `#ece8e0` bg, `#b8b4ac` border |

Large CTA variant: `font-size: 14px; padding: 14px 32px` (used in `#cta` section).

Transition: `background 0.15s ease`.

### Navigation Header

- Height: `56px`, position `sticky`, `z-index: 100`
- Background: `rgba(245,240,232,0.92)` + `backdrop-filter: blur(8px)`
- Border-bottom: `1px solid var(--border-light)`
- Logo: Courier New, 15px, weight 700, `letter-spacing: 0.12em`, uppercase
- Desktop padding: `0 40px` → Mobile: `0 24px`

### Feature Row Visual (Card)

```css
border-radius: 12px;
overflow: hidden;
border: 1px solid var(--border);
box-shadow: 0 8px 40px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06);
```

### Badges

Two types — use `.badge` for feature lists, `.feature-chip` for tagging capabilities. Both are neutral (ink-toned), consistent with the rule that blueprint blue is reserved for SVG illustrations, not UI chrome.

| Component | Background | Border | Padding | Radius | Font size |
|---|---|---|---|---|---|
| `.badge` | `transparent` | `1px solid var(--border)` | `10px 14px` | `8px` | `12px` |
| `.feature-chip` | `transparent` | `1px solid var(--border)` | `4px 10px` | `4px` | `11px` |

Both use `color: var(--ink-mid)`, `font-weight: 700`, uppercase, `letter-spacing: 0.04–0.06em`.

### Inputs (Properties Panel)

```css
padding: 6px 8px;
border-radius: 4px;
border: 1px solid var(--border);
background: var(--bg);
font-family: var(--font);   /* Courier New — intentional, matches app UI */
font-size: 12–14px;
```

Focus: `outline: 2px solid #4a6fa5; outline-offset: 1px`.

### Tooltips

```css
background: var(--bg);
border: 1px solid var(--border);
border-radius: 6px;
padding: 8px 12px;
font-size: 12px;
box-shadow: var(--shadow);
```

Entrance: `opacity 0.15s ease, transform 0.15s ease` (fade + 4px translateY).

### Modals / Dropdowns

```css
border-radius: 10px;
background: white; /* or rgba(245,240,232,0.95) with backdrop-filter */
box-shadow: 0 4px 20px rgba(0,0,0,0.14);
```

Entrance animation: `cubic-bezier(0.16, 1, 0.3, 1)` over `150ms`. Exit: `100ms ease`.

---

## 8. Motion & Animation

| Pattern | Value | Use |
|---|---|---|
| **Standard transition** | `0.15s ease` | Background, color, border-color changes (buttons, links) |
| **Scroll reveal entrance** | `opacity + translateY(18px)`, `0.6s ease` | Sections entering viewport via IntersectionObserver |
| **Dropdown entrance** | `cubic-bezier(0.16, 1, 0.3, 1)`, `150ms` | Overlays, menus appearing |
| **Dropdown exit** | `ease`, `100ms` | Overlays, menus disappearing |
| **Furniture stagger** | `80ms` delay between items | Sequential appearance of SVG furniture elements |

Always add `@media (prefers-reduced-motion: reduce)` overrides that disable transitions and set elements immediately visible. This is already wired in `home.html` — preserve it in any new animated components.

---

## 9. Accessibility Rules

- **Touch targets**: minimum `44px` height for all interactive elements
- **Focus ring**: `outline: 2px solid #4a6fa5; outline-offset: 1–2px` on all focusable elements; never remove without an equivalent visible replacement
- **Skip link**: `.skip-link` targets `#hero-heading`; always present on new pages
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables all transitions and animations
- **SVG decorations**: mark purely decorative SVGs with `aria-hidden="true"` and add `aria-label` to meaningful ones
- **Color contrast**: verify any new text/background combination against WCAG AA (4.5:1 for normal text, 3:1 for large text ≥ 18px or bold ≥ 14px)
- **Destructive color** `#cc4444` is used for delete actions; never use it as the only signal — pair with text or icon
