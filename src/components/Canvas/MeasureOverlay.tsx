import { Group, Line, Rect, Text } from 'react-konva';
import { distance, formatFeet } from '../../utils/geometry';
import type { Point } from '../../types';

type Props = {
  start: Point;
  end?: Point | null;
  zoom: number;
  worldToBase: (pt: Point) => { x: number; y: number };
};

const TAPE_YELLOW = '#f5c518';
const TAPE_EDGE = '#c4961a';
const BODY_OUTLINE = '#5a4000';

/** Small tape measure body icon centered at origin, tape slot facing +x. */
function TapeBody({
  bw,
  bh,
  br,
  sw,
  zoom,
}: {
  bw: number;
  bh: number;
  br: number;
  sw: number;
  zoom: number;
}) {
  return (
    <>
      {/* Main yellow housing */}
      <Rect
        x={-bw / 2}
        y={-bh / 2}
        width={bw}
        height={bh}
        fill={TAPE_YELLOW}
        stroke={BODY_OUTLINE}
        strokeWidth={1.5 / zoom}
        cornerRadius={br}
      />
      {/* Dark grip strip on right side */}
      <Rect
        x={bw / 2 - bw * 0.28}
        y={-bh / 2 + br}
        width={bw * 0.28}
        height={bh - br * 2}
        fill={TAPE_EDGE}
      />
      {/* Tape slot (dark slot the tape exits from on the right) */}
      <Rect
        x={bw / 2 - bw * 0.28 - 1 / zoom}
        y={-sw / 2}
        width={2 / zoom}
        height={sw}
        fill={BODY_OUTLINE}
      />
    </>
  );
}

export function MeasureOverlay({ start, end, zoom, worldToBase }: Props) {
  const a = worldToBase(start);

  // Constant screen-space sizes
  const BW = 20 / zoom; // body width
  const BH = 14 / zoom; // body height
  const BR = 3 / zoom; // body corner radius
  const TW = 5 / zoom; // tape strip width
  const HOOK_HALF = 6 / zoom; // half-height of the end hook

  // No end yet: show tape measure body only (no direction, face right)
  if (!end) {
    return (
      <Group listening={false} x={a.x} y={a.y}>
        <TapeBody bw={BW} bh={BH} br={BR} sw={TW} zoom={zoom} />
      </Group>
    );
  }

  const b = worldToBase(end);
  const dist = distance(start, end);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);

  if (len < 1e-6) return null;

  const ux = dx / len;
  const uy = dy / len;
  const perp = { x: -uy, y: ux };
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

  // Foot tick marks along the tape
  const ticks: Array<{ x: number; y: number; major: boolean }> = [];
  const wholeFeet = Math.floor(dist);
  for (let f = 1; f <= wholeFeet; f++) {
    const t = f / dist;
    ticks.push({ x: a.x + t * dx, y: a.y + t * dy, major: true });
  }
  // Half-foot ticks for spans over 2 ft
  if (dist > 2) {
    const halfSteps = Math.floor(dist * 2);
    for (let f = 1; f <= halfSteps; f++) {
      if (f % 2 === 0) continue; // skip whole-foot positions
      const t = (f * 0.5) / dist;
      ticks.push({ x: a.x + t * dx, y: a.y + t * dy, major: false });
    }
  }

  return (
    <Group listening={false}>
      {/* ── Tape strip ── */}
      <Line points={[a.x, a.y, b.x, b.y]} stroke={TAPE_YELLOW} strokeWidth={TW} lineCap="butt" />
      {/* Top edge */}
      <Line
        points={[
          a.x + perp.x * (TW / 2),
          a.y + perp.y * (TW / 2),
          b.x + perp.x * (TW / 2),
          b.y + perp.y * (TW / 2),
        ]}
        stroke={TAPE_EDGE}
        strokeWidth={1 / zoom}
      />
      {/* Bottom edge */}
      <Line
        points={[
          a.x - perp.x * (TW / 2),
          a.y - perp.y * (TW / 2),
          b.x - perp.x * (TW / 2),
          b.y - perp.y * (TW / 2),
        ]}
        stroke={TAPE_EDGE}
        strokeWidth={1 / zoom}
      />

      {/* ── Tick marks ── */}
      {ticks.map((tick, i) => {
        const h = tick.major ? 3.5 / zoom : 2 / zoom;
        return (
          <Line
            key={i}
            points={[
              tick.x + perp.x * h,
              tick.y + perp.y * h,
              tick.x - perp.x * h,
              tick.y - perp.y * h,
            ]}
            stroke={TAPE_EDGE}
            strokeWidth={1 / zoom}
          />
        );
      })}

      {/* ── Tape measure body at start, rotated toward end ── */}
      <Group x={a.x} y={a.y} rotation={angleDeg}>
        <TapeBody bw={BW} bh={BH} br={BR} sw={TW} zoom={zoom} />
      </Group>

      {/* ── End hook (metal tang perpendicular to tape) ── */}
      <Group x={b.x} y={b.y} rotation={angleDeg}>
        {/* Hook plate */}
        <Rect
          x={-2.5 / zoom}
          y={-HOOK_HALF}
          width={5 / zoom}
          height={HOOK_HALF * 2}
          fill={BODY_OUTLINE}
          cornerRadius={1 / zoom}
        />
        {/* Small lip at bottom of hook */}
        <Rect
          x={-2.5 / zoom}
          y={HOOK_HALF - 3 / zoom}
          width={7 / zoom}
          height={3 / zoom}
          fill={BODY_OUTLINE}
          cornerRadius={1 / zoom}
        />
      </Group>

      {/* ── Distance label ── */}
      {dist > 0.05 && (
        <Text
          x={mid.x + 8 / zoom}
          y={mid.y - 16 / zoom}
          text={formatFeet(dist)}
          fontSize={12 / zoom}
          fontFamily="Courier New"
          fontStyle="bold"
          fill={BODY_OUTLINE}
          padding={2}
        />
      )}
    </Group>
  );
}
