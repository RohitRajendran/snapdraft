import { Line } from 'react-konva';
import type Konva from 'konva';
import { useToolStore } from '../../store/useToolStore';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import type { Wall } from '../../types';
import { ftToPx, pxToFt, snapToGrid } from '../../utils/geometry';

type Props = {
  wall: Wall;
  selected: boolean;
  onSelect: () => void;
};

export function WallElement({ wall, selected, onSelect }: Props) {
  const { zoom, activeTool } = useToolStore();
  const { updateElement } = useFloorplanStore();

  const flatPoints = wall.points.flatMap(p => [ftToPx(p.x), ftToPx(p.y)]);

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    // node.x() / node.y() is the accumulated drag offset in base px
    const dxFt = snapToGrid(pxToFt(node.x()));
    const dyFt = snapToGrid(pxToFt(node.y()));

    if (dxFt === 0 && dyFt === 0) return;

    // Translate all points by the snapped delta
    updateElement(wall.id, {
      points: wall.points.map(p => ({ x: p.x + dxFt, y: p.y + dyFt })),
    });

    // Reset node offset — the updated points carry the new position
    node.position({ x: 0, y: 0 });
  }

  return (
    <Line
      points={flatPoints}
      stroke={selected ? '#0066cc' : '#2c2c2c'}
      strokeWidth={(selected ? 4 : 3) / zoom}
      lineCap="round"
      lineJoin="round"
      draggable={activeTool === 'select'}
      onDragEnd={handleDragEnd}
      onClick={onSelect}
      onTap={onSelect}
      hitStrokeWidth={16 / zoom}
      data-testid={`wall-${wall.id}`}
    />
  );
}
