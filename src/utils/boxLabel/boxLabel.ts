/** How a box label is drawn inside its box, in screen pixels. */
export type BoxLabelLayout = {
  lines: string[];
  fontSize: number;
  /** Degrees relative to the box: as close to horizontal as fits, never upside down. */
  rotation: number;
};

export const BOX_LABEL_MAX_FONT = 12;
export const BOX_LABEL_MIN_FONT = 9;
export const BOX_LABEL_INSET = 4;
export const BOX_LABEL_LINE_HEIGHT = 1.2;
export const BOX_LABEL_MIN_CHARACTERS = 4;
export const BOX_LABEL_FONT_FAMILY = 'Josefin Sans';

export type MeasureText = (text: string, fontSize: number) => number;

/**
 * Extra rotation that lays text along the chosen side and keeps the total angle in
 * [-90°, 90°), so vertical text reads from bottom to top.
 */
export function readableRotation(boxRotation: number, alongLength: boolean): number {
  const extra = alongLength ? 90 : 0;
  let total = (boxRotation + extra) % 360;
  if (total >= 180) total -= 360;
  else if (total < -180) total += 360;
  const flip = total >= 90 || total < -90 ? 180 : 0;
  let result = (extra + flip) % 360;
  if (result > 180) result -= 360;
  return result;
}

function twoLines(text: string, size: number, measure: MeasureText): string[] | null {
  const words = text.split(' ').filter(Boolean);
  if (words.length < 2) return null;
  let best: string[] | null = null;
  let bestWidth = Infinity;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const width = Math.max(measure(lines[0], size), measure(lines[1], size));
    if (width < bestWidth) {
      best = lines;
      bestWidth = width;
    }
  }
  return best;
}

type Axis = { along: number; across: number; rotation: number; tilt: number };

function screenAngle(degrees: number): number {
  let angle = degrees % 360;
  if (angle >= 180) angle -= 360;
  else if (angle < -180) angle += 360;
  return angle;
}

function axisFor(width: number, height: number, boxRotation: number, alongLength: boolean): Axis {
  const rotation = readableRotation(boxRotation, alongLength);
  return {
    along: (alongLength ? height : width) - BOX_LABEL_INSET * 2,
    across: (alongLength ? width : height) - BOX_LABEL_INSET * 2,
    rotation,
    tilt: Math.abs(screenAngle(boxRotation + rotation)),
  };
}

function whole(text: string, axis: Axis, measure: MeasureText): BoxLabelLayout | null {
  for (let size = BOX_LABEL_MAX_FONT; size >= BOX_LABEL_MIN_FONT; size -= 0.5) {
    const lines = Math.floor(axis.across / (size * BOX_LABEL_LINE_HEIGHT));
    if (lines >= 1 && measure(text, size) <= axis.along) {
      return { lines: [text], fontSize: size, rotation: axis.rotation };
    }
    const split = lines >= 2 ? twoLines(text, size, measure) : null;
    if (split && split.every((line) => measure(line, size) <= axis.along)) {
      return { lines: split, fontSize: size, rotation: axis.rotation };
    }
  }
  return null;
}

function truncated(text: string, axis: Axis, measure: MeasureText): BoxLabelLayout | null {
  if (axis.across < BOX_LABEL_MIN_FONT * BOX_LABEL_LINE_HEIGHT) return null;
  const characters = Array.from(text);
  for (let count = characters.length - 1; count >= BOX_LABEL_MIN_CHARACTERS; count--) {
    const prefix = characters.slice(0, count).join('').trimEnd() + '…';
    if (measure(prefix, BOX_LABEL_MIN_FONT) <= axis.along) {
      return { lines: [prefix], fontSize: BOX_LABEL_MIN_FONT, rotation: axis.rotation };
    }
  }
  return null;
}

/**
 * Fits a box label, preferring text that reads closest to horizontal. In that direction it
 * tries one line, two lines broken between words and a smaller font down to the minimum,
 * then an ellipsis at the end if at least four characters remain. Only when neither fits
 * does the text turn to run along the box's other side. Returns null when the label can't
 * be read at this zoom. The native app follows the same rules.
 */
export function fitBoxLabel(
  label: string,
  width: number,
  height: number,
  boxRotation: number,
  measure: MeasureText,
): BoxLabelLayout | null {
  const text = label.trim();
  if (!text || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  const flat = axisFor(width, height, boxRotation, false);
  const turned = axisFor(width, height, boxRotation, true);
  const flatFirst =
    flat.tilt < turned.tilt || (flat.tilt === turned.tilt && flat.along >= turned.along);
  const axes = (flatFirst ? [flat, turned] : [turned, flat]).filter(
    (axis) => axis.along > 0 && axis.across > 0,
  );
  for (const axis of axes) {
    const layout = whole(text, axis, measure) ?? truncated(text, axis, measure);
    if (layout) return layout;
  }
  return null;
}

let measureContext: CanvasRenderingContext2D | null | undefined;

/** Measures with the label font, or estimates half an em per character without a canvas. */
export const measureBoxLabel: MeasureText = (text, fontSize) => {
  if (measureContext === undefined) {
    try {
      measureContext = document.createElement('canvas').getContext('2d');
    } catch {
      measureContext = null;
    }
  }
  if (!measureContext) return text.length * fontSize * 0.5;
  measureContext.font = `${fontSize}px "${BOX_LABEL_FONT_FAMILY}", sans-serif`;
  return measureContext.measureText(text).width;
};
