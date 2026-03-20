import { Circle, Group, Line, Text } from 'react-konva';
import { distance, formatFeet } from '../../utils/geometry';
import type { Point } from '../../types';

type Props = {
  start: Point;
  end?: Point | null;
  zoom: number;
  worldToBase: (pt: Point) => { x: number; y: number };
};

export function MeasureOverlay({ start, end, zoom, worldToBase }: Props) {
  const a = worldToBase(start);

  if (!end) {
    return <Circle x={a.x} y={a.y} radius={4 / zoom} fill="#cc4400" listening={false} />;
  }

  const b = worldToBase(end);
  const dist = distance(start, end);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

  return (
    <Group listening={false}>
      <Line
        points={[a.x, a.y, b.x, b.y]}
        stroke="#cc4400"
        strokeWidth={1.5 / zoom}
        dash={[6 / zoom, 4 / zoom]}
      />
      <Circle x={a.x} y={a.y} radius={4 / zoom} fill="#cc4400" />
      <Circle x={b.x} y={b.y} radius={4 / zoom} fill="#cc4400" />
      {dist > 0.05 && (
        <Text
          x={mid.x + 6 / zoom}
          y={mid.y - 16 / zoom}
          text={formatFeet(dist)}
          fontSize={12 / zoom}
          fontFamily="Courier New"
          fontStyle="bold"
          fill="#cc4400"
          padding={2}
        />
      )}
    </Group>
  );
}
