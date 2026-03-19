import { Line, Circle } from 'react-konva';
import type Konva from 'konva'
import { useToolStore } from '../../store/useToolStore';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import type { Wall } from '../../types';
import { ftToPx, pxToFt, snapToGrid, findNearestEndpoint, distance, SNAP_RADIUS_FT } from '../../utils/geometry';
import type { Point } from '../../types';

type Props = {
  wall: Wall;
  selected: boolean;
  onSelect: () => void;
  onEndpointDrag?: (wallId: string, pointIndex: number, newPos: Point) => void;
};

export function WallElement({ wall, selected, onSelect, onEndpointDrag }: Props) {
  const { zoom, activeTool } = useToolStore();
  const { updateElement } = useFloorplanStore();

  const flatPoints = wall.points.flatMap(p => [ftToPx(p.x), ftToPx(p.y)]);

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const dxFt = pxToFt(node.x());
    const dyFt = pxToFt(node.y());

    // Compute candidate positions after drag
    const candidates = wall.points.map(p => ({ x: p.x + dxFt, y: p.y + dyFt }));

    // Gather other walls' endpoints to snap to
    const allElements = useFloorplanStore.getState().activePlan()?.elements ?? [];
    const otherEndpoints: Point[] = [];
    for (const el of allElements) {
      if (el.type === 'wall' && el.id !== wall.id) {
        otherEndpoints.push(...el.points);
      }
    }

    // Find the best endpoint-to-endpoint snap across all candidate points
    let adjustment: Point | null = null;
    let bestDist = SNAP_RADIUS_FT;
    for (const candidate of candidates) {
      const nearest = findNearestEndpoint(candidate, otherEndpoints);
      if (nearest) {
        const d = distance(candidate, nearest);
        if (d < bestDist) {
          bestDist = d;
          adjustment = { x: nearest.x - candidate.x, y: nearest.y - candidate.y };
        }
      }
    }

    let finalPoints: Point[];
    if (adjustment) {
      finalPoints = candidates.map(p => ({ x: p.x + adjustment!.x, y: p.y + adjustment!.y }));
    } else {
      // Fall back to grid-snapped delta
      const snappedDx = snapToGrid(dxFt);
      const snappedDy = snapToGrid(dyFt);
      if (snappedDx === 0 && snappedDy === 0) {
        node.position({ x: 0, y: 0 });
        return;
      }
      finalPoints = wall.points.map(p => ({ x: p.x + snappedDx, y: p.y + snappedDy }));
    }

    updateElement(wall.id, { points: finalPoints });
    node.position({ x: 0, y: 0 });
  }

  return (
    <>
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
      {/* Endpoint handles — visible when selected in select mode */}
      {selected && activeTool === 'select' && wall.points.map((pt, idx) => {
        const bx = ftToPx(pt.x);
        const by = ftToPx(pt.y);
        return (
          <Circle
            key={idx}
            x={bx}
            y={by}
            radius={6 / zoom}
            fill="#0066cc"
            stroke="white"
            strokeWidth={2 / zoom}
            draggable
            onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
              const node = e.target;
              // node position is absolute in base coords
              const rawFt = { x: pxToFt(node.x()), y: pxToFt(node.y()) };

              // Snap to other endpoints first, then grid
              const allElements = useFloorplanStore.getState().activePlan()?.elements ?? [];
              const otherEndpoints: Point[] = [];
              for (const el of allElements) {
                if (el.type === 'wall' && el.id !== wall.id) {
                  otherEndpoints.push(...el.points);
                } else if (el.type === 'wall' && el.id === wall.id) {
                  // Can snap to own other endpoints
                  el.points.forEach((p, i) => { if (i !== idx) otherEndpoints.push(p); });
                }
              }

              const snapped = findNearestEndpoint(rawFt, otherEndpoints) ??
                { x: snapToGrid(rawFt.x), y: snapToGrid(rawFt.y) };

              const newPoints = wall.points.map((p, i) => i === idx ? snapped : p);
              updateElement(wall.id, { points: newPoints });
              // Reset handle position — wall will rerender with correct coords
              node.position({ x: ftToPx(snapped.x), y: ftToPx(snapped.y) });

              onEndpointDrag?.(wall.id, idx, snapped);
            }}
            hitStrokeWidth={12 / zoom}
          />
        );
      })}
    </>
  );
}
