import { Line, Rect } from 'react-konva';
import { useMemo } from 'react';
import { PIXELS_PER_FOOT } from '../../utils/geometry';

type Props = {
  width: number;
  height: number;
  zoom: number;
  pan: { x: number; y: number };
};

export function Grid({ width, height, zoom, pan }: Props) {
  const lines = useMemo(() => {
    const result: { points: number[]; key: string; major: boolean }[] = [];

    // Visible world area in base pixels (before zoom/pan transform)
    // The stage is transformed by zoom/pan, so visible base coords are:
    const visXMin = -pan.x / zoom;
    const visYMin = -pan.y / zoom;
    const visXMax = visXMin + width / zoom;
    const visYMax = visYMin + height / zoom;

    // Grid step: adapt to zoom level for readability
    // At low zoom, show every 5ft; at normal, every 1ft; at high zoom show 0.5ft
    let gridStepFt = 1;
    if (zoom < 0.4) gridStepFt = 5;
    else if (zoom > 3) gridStepFt = 0.5;

    const gridStepPx = gridStepFt * PIXELS_PER_FOOT;
    const majorEvery = gridStepFt === 0.5 ? 2 : 5; // major line every N grid steps

    const startXPx = Math.floor(visXMin / gridStepPx) * gridStepPx;
    const startYPx = Math.floor(visYMin / gridStepPx) * gridStepPx;

    let xi = 0;
    for (let px = startXPx; px <= visXMax + gridStepPx; px += gridStepPx, xi++) {
      const major = Math.round(xi + Math.floor(visXMin / gridStepPx)) % majorEvery === 0;
      result.push({
        key: `v-${px.toFixed(1)}`,
        points: [px, visYMin - gridStepPx, px, visYMax + gridStepPx],
        major,
      });
    }

    let yi = 0;
    for (let py = startYPx; py <= visYMax + gridStepPx; py += gridStepPx, yi++) {
      const major = Math.round(yi + Math.floor(visYMin / gridStepPx)) % majorEvery === 0;
      result.push({
        key: `h-${py.toFixed(1)}`,
        points: [visXMin - gridStepPx, py, visXMax + gridStepPx, py],
        major,
      });
    }

    return result;
  }, [width, height, zoom, pan]);

  return (
    <>
      {/* Background fill */}
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
    </>
  );
}
