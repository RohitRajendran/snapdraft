import { useRef } from 'react';
import { Group, Rect, Text, Circle, Line } from 'react-konva';
import type Konva from 'konva';
import { useToolStore } from '../../store/useToolStore';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import type { Box } from '../../types';
import { ftToPx, pxToFt, snapToGrid, formatFeet } from '../../utils/geometry';

const HANDLE_OFFSET_PX = 22; // distance above top-center for rotation handle (screen px, divided by zoom)

type Props = {
  box: Box;
  selected: boolean;
  onSelect: () => void;
  onGroupDrag?: (id: string, dxFt: number, dyFt: number) => void;
};

export function BoxElement({ box, selected, onSelect, onGroupDrag }: Props) {
  const { updateElement } = useFloorplanStore();
  const { activeTool, zoom } = useToolStore();
  const groupRef = useRef<Konva.Group>(null);

  const bx = ftToPx(box.x);
  const by = ftToPx(box.y);
  const bw = ftToPx(box.width);
  const bh = ftToPx(box.height);

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const dxFt = pxToFt(node.x()) - box.x;
    const dyFt = pxToFt(node.y()) - box.y;

    const ids = useToolStore.getState().selectedIds;

    if (ids.size > 1 && onGroupDrag) {
      node.position({ x: ftToPx(box.x), y: ftToPx(box.y) });
      onGroupDrag(box.id, snapToGrid(dxFt), snapToGrid(dyFt));
      return;
    }

    const newXFt = snapToGrid(pxToFt(node.x()), false);
    const newYFt = snapToGrid(pxToFt(node.y()), false);
    updateElement(box.id, { x: newXFt, y: newYFt });
    node.position({ x: ftToPx(newXFt), y: ftToPx(newYFt) });
  }

  function handleRotatePointerDown(e: Konva.KonvaEventObject<PointerEvent>) {
    e.cancelBubble = true; // prevent group drag
    const stage = e.target.getStage();
    const group = groupRef.current;
    if (!stage || !group) return;

    function computeRotation() {
      const pos = stage!.getPointerPosition();
      if (!pos) return;
      const abs = group!.getAbsolutePosition();
      const s = stage!.scaleX(); // zoom
      const cx = abs.x + (bw / 2) * s;
      const cy = abs.y + (bh / 2) * s;
      const rawAngle = Math.atan2(pos.y - cy, pos.x - cx) * 180 / Math.PI + 90;
      // Snap to 5° increments; hold Shift to snap to 15°
      const snap = 5;
      return Math.round(rawAngle / snap) * snap;
    }

    function onMove() {
      const rot = computeRotation();
      if (rot != null) updateElement(box.id, { rotation: rot });
    }

    function onUp() {
      stage!.off('pointermove.rot');
      stage!.off('pointerup.rot');
    }

    stage.on('pointermove.rot', onMove);
    stage.on('pointerup.rot', onUp);
  }

  const label = box.label || `${formatFeet(box.width)} × ${formatFeet(box.height)}`;
  const handleOffset = HANDLE_OFFSET_PX / zoom;

  return (
    <Group
      ref={groupRef}
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
      {/* Rotation handle — appears above the box when selected */}
      {selected && activeTool === 'select' && (
        <>
          {/* Stem line from top-center to handle */}
          <Line
            points={[bw / 2, 0, bw / 2, -handleOffset]}
            stroke="#0066cc"
            strokeWidth={1.5 / zoom}
            listening={false}
          />
          <Circle
            x={bw / 2}
            y={-handleOffset}
            radius={6 / zoom}
            fill="#0066cc"
            stroke="white"
            strokeWidth={2 / zoom}
            hitStrokeWidth={12 / zoom}
            onPointerDown={handleRotatePointerDown}
          />
        </>
      )}
    </Group>
  );
}
