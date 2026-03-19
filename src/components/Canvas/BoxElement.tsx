import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { Box } from '../../types';
import { ftToPx, formatFeet } from '../../utils/geometry';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import { useToolStore } from '../../store/useToolStore';

type Props = {
  box: Box;
  selected: boolean;
  scale: number;
  offset: { x: number; y: number };
  onSelect: () => void;
};

export function BoxElement({ box, selected, offset, onSelect }: Props) {
  const { updateElement } = useFloorplanStore();
  const { activeTool } = useToolStore();

  const sx = ftToPx(box.x) + offset.x;
  const sy = ftToPx(box.y) + offset.y;
  const sw = ftToPx(box.width);
  const sh = ftToPx(box.height);

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const newX = (node.x() - offset.x) / ftToPx(1);
    const newY = (node.y() - offset.y) / ftToPx(1);
    const snappedX = Math.round(newX * 2) / 2;
    const snappedY = Math.round(newY * 2) / 2;
    updateElement(box.id, { x: snappedX, y: snappedY });
    node.position({ x: ftToPx(snappedX) + offset.x, y: ftToPx(snappedY) + offset.y });
  }

  const label = box.label || `${formatFeet(box.width)} × ${formatFeet(box.height)}`;

  return (
    <Group
      x={sx}
      y={sy}
      rotation={box.rotation}
      draggable={activeTool === 'select'}
      onDragEnd={handleDragEnd}
      onClick={onSelect}
      onTap={onSelect}
    >
      <Rect
        width={sw}
        height={sh}
        stroke={selected ? '#0066cc' : '#4a6fa5'}
        strokeWidth={selected ? 2 : 1.5}
        fill={selected ? 'rgba(0,102,204,0.06)' : 'rgba(74,111,165,0.06)'}
        dash={selected ? undefined : [4, 3]}
        cornerRadius={1}
      />
      {selected && (
        <Text
          x={4}
          y={4}
          text={label}
          fontSize={11}
          fontFamily="Courier New"
          fill={selected ? '#0066cc' : '#4a6fa5'}
        />
      )}
    </Group>
  );
}
