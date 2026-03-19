import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import { useToolStore } from '../../store/useToolStore';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import type { Box } from '../../types';
import { ftToPx, pxToFt, snapToGrid, formatFeet } from '../../utils/geometry';

type Props = {
  box: Box;
  selected: boolean;
  onSelect: () => void;
};

export function BoxElement({ box, selected, onSelect }: Props) {
  const { updateElement } = useFloorplanStore();
  const { activeTool, zoom } = useToolStore();

  // Elements are drawn in base coordinates; Stage transform handles zoom/pan
  const bx = ftToPx(box.x);
  const by = ftToPx(box.y);
  const bw = ftToPx(box.width);
  const bh = ftToPx(box.height);

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    // node.x() / node.y() are in base stage coords (before zoom/pan)
    const newXFt = snapToGrid(pxToFt(node.x()), false);
    const newYFt = snapToGrid(pxToFt(node.y()), false);
    updateElement(box.id, { x: newXFt, y: newYFt });
    // Snap the node position visually
    node.position({ x: ftToPx(newXFt), y: ftToPx(newYFt) });
  }

  const label = box.label || `${formatFeet(box.width)} × ${formatFeet(box.height)}`;

  return (
    <Group
      x={bx}
      y={by}
      rotation={box.rotation}
      draggable={activeTool === 'select'}
      onDragEnd={handleDragEnd}
      onClick={onSelect}
      onTap={onSelect}
    >
      <Rect
        width={bw}
        height={bh}
        stroke={selected ? '#0066cc' : '#2d5490'}
        strokeWidth={(selected ? 2 : 1.5) / zoom}
        fill={selected ? 'rgba(0,102,204,0.06)' : 'rgba(74,111,165,0.06)'}
        dash={selected ? undefined : [4 / zoom, 3 / zoom]}
        cornerRadius={1}
      />
      <Text
        x={4 / zoom}
        y={4 / zoom}
        text={label}
        fontSize={11 / zoom}
        fontFamily="Courier New"
        fill={selected ? '#0066cc' : '#2d5490'}
      />
    </Group>
  );
}
