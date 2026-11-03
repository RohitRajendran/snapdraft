import { Line, Rect } from 'react-konva';
import { useMemo } from 'react';
import { ftToPx, PIXELS_PER_FOOT } from '../../../utils/geometry/geometry';
import type { Box } from '../../../types';
import { boxMaskId } from './boxMask';

type Props = {
  width: number;
  height: number;
  zoom: number;
  pan: { x: number; y: number };
  boxes: Box[];
};

const GRID_STEP_FT = 1; // 1 square = 1 ft, always
const MAJOR_EVERY = 5; // bold line every 5 ft
const MIN_PX_BETWEEN = 4; // hide minor lines below this screen-pixel density

export function Grid({ width, height, zoom, pan, boxes }: Props) {
  const lines = useMemo(() => {
    const result: { points: number[]; key: string; major: boolean }[] = [];

    const screenPxPerFt = PIXELS_PER_FOOT * zoom;

    // When 1ft lines would be < MIN_PX_BETWEEN px apart on screen, only render
    // every 5ft so we don't flood the canvas — but the conceptual unit stays 1ft.
    const stepFt = screenPxPerFt < MIN_PX_BETWEEN ? MAJOR_EVERY : GRID_STEP_FT;
    const stepPx = stepFt * PIXELS_PER_FOOT;

    // Visible world area in base pixels
    const visXMin = -pan.x / zoom;
    const visYMin = -pan.y / zoom;
    const visXMax = visXMin + width / zoom;
    const visYMax = visYMin + height / zoom;

    const startXPx = Math.floor(visXMin / stepPx) * stepPx;
    const startYPx = Math.floor(visYMin / stepPx) * stepPx;

    for (let px = startXPx; px <= visXMax + stepPx; px += stepPx) {
      // major when this is a multiple of 5ft
      const major = Math.round(px / PIXELS_PER_FOOT) % MAJOR_EVERY === 0;
      result.push({
        key: `v-${px.toFixed(1)}`,
        points: [px, visYMin - stepPx, px, visYMax + stepPx],
        major,
      });
    }

    for (let py = startYPx; py <= visYMax + stepPx; py += stepPx) {
      const major = Math.round(py / PIXELS_PER_FOOT) % MAJOR_EVERY === 0;
      result.push({
        key: `h-${py.toFixed(1)}`,
        points: [visXMin - stepPx, py, visXMax + stepPx, py],
        major,
      });
    }

    return result;
  }, [width, height, zoom, pan]);

  return (
    <>
      <Rect
        x={-pan.x / zoom}
        y={-pan.y / zoom}
        width={width / zoom}
        height={height / zoom}
        fill="#f5f0e8"
        listening={false}
      />
      {lines.map(({ key, points, major }) => (
        <Line
          key={key}
          points={points}
          stroke={major ? '#a8bcd4' : '#ccd9e8'}
          strokeWidth={(major ? 0.75 : 0.5) / zoom}
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}
      {/* Boxes hide the grid. Masks live in this layer so they never cover walls or other boxes. */}
      {boxes.map((box) => (
        <Rect
          key={box.id}
          id={boxMaskId(box.id)}
          x={ftToPx(box.x + box.width / 2)}
          y={ftToPx(box.y + box.length / 2)}
          width={ftToPx(box.width)}
          height={ftToPx(box.length)}
          offsetX={ftToPx(box.width) / 2}
          offsetY={ftToPx(box.length) / 2}
          rotation={box.rotation}
          fill="#f5f0e8"
          listening={false}
        />
      ))}
    </>
  );
}
