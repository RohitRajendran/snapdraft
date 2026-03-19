import { Line } from 'react-konva';
import { useToolStore } from '../../store/useToolStore';
import type { Wall } from '../../types';
import { ftToPx } from '../../utils/geometry';

type Props = {
  wall: Wall;
  selected: boolean;
  onSelect: () => void;
};

export function WallElement({ wall, selected, onSelect }: Props) {
  const { zoom } = useToolStore();

  // Elements are drawn in base coordinates (ftToPx at zoom=1)
  // The Stage transform handles zoom/pan visually
  const flatPoints = wall.points.flatMap(p => [ftToPx(p.x), ftToPx(p.y)]);

  return (
    <Line
      points={flatPoints}
      stroke={selected ? '#0066cc' : '#2c2c2c'}
      strokeWidth={(selected ? 4 : 3) / zoom}
      lineCap="round"
      lineJoin="round"
      onClick={onSelect}
      onTap={onSelect}
      hitStrokeWidth={16 / zoom}
      data-testid={`wall-${wall.id}`}
    />
  );
}
