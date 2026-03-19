import { Line } from 'react-konva';
import { useMemo } from 'react';

type Props = {
  width: number;
  height: number;
  scale: number;
  offset: { x: number; y: number };
};

export function Grid({ width, height, scale, offset }: Props) {
  const lines = useMemo(() => {
    const result: { points: number[]; key: string; major: boolean }[] = [];

    // Start grid from offset
    const startX = offset.x % scale;
    const startY = offset.y % scale;

    // World coordinate of first visible grid line
    const worldStartX = Math.floor(-offset.x / scale);
    const worldStartY = Math.floor(-offset.y / scale);

    let xi = 0;
    for (let px = startX; px < width + scale; px += scale, xi++) {
      const worldX = worldStartX + xi;
      const major = worldX % 5 === 0;
      result.push({
        key: `v-${worldX}`,
        points: [px, 0, px, height],
        major,
      });
    }

    let yi = 0;
    for (let py = startY; py < height + scale; py += scale, yi++) {
      const worldY = worldStartY + yi;
      const major = worldY % 5 === 0;
      result.push({
        key: `h-${worldY}`,
        points: [0, py, width, py],
        major,
      });
    }

    return result;
  }, [width, height, scale, offset]);

  return (
    <>
      {lines.map(({ key, points, major }) => (
        <Line
          key={key}
          points={points}
          stroke={major ? '#a8bcd4' : '#ccd9e8'}
          strokeWidth={major ? 0.75 : 0.5}
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}
    </>
  );
}
