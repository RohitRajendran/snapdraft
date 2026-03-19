import { Line } from 'react-konva';
import type { Wall } from '../../types';
import { ftToPx } from '../../utils/geometry';

type Props = {
  wall: Wall;
  selected: boolean;
  scale: number;
  offset: { x: number; y: number };
  onSelect: () => void;
};

export function WallElement({ wall, selected, offset, onSelect }: Props) {
  const flatPoints = wall.points.flatMap(p => [
    ftToPx(p.x) + offset.x,
    ftToPx(p.y) + offset.y,
  ]);

  return (
    <Line
      points={flatPoints}
      stroke={selected ? '#0066cc' : '#2c2c2c'}
      strokeWidth={selected ? 4 : 3}
      lineCap="round"
      lineJoin="round"
      onClick={onSelect}
      onTap={onSelect}
      hitStrokeWidth={16}
      data-testid={`wall-${wall.id}`}
    />
  );
}
