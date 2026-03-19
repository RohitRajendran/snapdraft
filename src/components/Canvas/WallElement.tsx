import { Line, Circle } from 'react-konva';
import type Konva from 'konva';
import { useToolStore } from '../../store/useToolStore';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import type { Wall, Point } from '../../types';
import { ftToPx, pxToFt, snapToGrid, findNearestEndpoint, distance, SNAP_RADIUS_FT } from '../../utils/geometry';

type Props = {
  wall: Wall;
  selected: boolean;
  onSelect: () => void;
  onGroupDrag?: (id: string, dxFt: number, dyFt: number) => void;
  onEndpointDrag?: (wallId: string, pointIndex: number, newPos: Point) => void;
};

export function WallElement({ wall, selected, onSelect, onGroupDrag, onEndpointDrag }: Props) {
  const { zoom, activeTool } = useToolStore();
  const { updateElement } = useFloorplanStore();

  const flatPoints = wall.points.flatMap(p => [ftToPx(p.x), ftToPx(p.y)]);

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const dxFt = pxToFt(node.x());
    const dyFt = pxToFt(node.y());
    node.position({ x: 0, y: 0 });

    const ids = useToolStore.getState().selectedIds;

    // Multi-select: delegate all movement to parent handler
    if (ids.size > 1 && onGroupDrag) {
      onGroupDrag(wall.id, snapToGrid(dxFt), snapToGrid(dyFt));
      return;
    }

    // Single wall drag — try to snap endpoints to nearby wall endpoints
    const candidates = wall.points.map(p => ({ x: p.x + dxFt, y: p.y + dyFt }));
    const allElements = useFloorplanStore.getState().activePlan()?.elements ?? [];
    const otherEndpoints: Point[] = [];
    for (const el of allElements) {
      if (el.type === 'wall' && el.id !== wall.id) {
        otherEndpoints.push(...el.points);
      }
    }

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
      const snappedDx = snapToGrid(dxFt);
      const snappedDy = snapToGrid(dyFt);
      if (snappedDx === 0 && snappedDy === 0) return;
      finalPoints = wall.points.map(p => ({ x: p.x + snappedDx, y: p.y + snappedDy }));
    }

    updateElement(wall.id, { points: finalPoints });
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
              const rawFt = { x: pxToFt(node.x()), y: pxToFt(node.y()) };

              const allElements = useFloorplanStore.getState().activePlan()?.elements ?? [];

              // Check if the dragged endpoint is shared with another wall
              const draggedPt = wall.points[idx];
              const isConnected = allElements.some(el =>
                el.type === 'wall' && el.id !== wall.id &&
                el.points.some(p => distance(p, draggedPt) < 0.05)
              );

              // If connected, redirect the resize to the OTHER (free) endpoint
              const targetIdx = isConnected ? (idx === 0 ? wall.points.length - 1 : 0) : idx;

              // Gather snap candidates (all other endpoints + own non-target points)
              const otherEndpoints: Point[] = [];
              for (const el of allElements) {
                if (el.type === 'wall' && el.id !== wall.id) {
                  otherEndpoints.push(...el.points);
                } else if (el.type === 'wall' && el.id === wall.id) {
                  el.points.forEach((p, i) => { if (i !== targetIdx) otherEndpoints.push(p); });
                }
              }

              const snapped = findNearestEndpoint(rawFt, otherEndpoints) ??
                { x: snapToGrid(rawFt.x), y: snapToGrid(rawFt.y) };

              const newPoints = wall.points.map((p, i) => i === targetIdx ? snapped : p);
              updateElement(wall.id, { points: newPoints });

              // Reset handle to its unchanged position if we redirected the drag
              if (isConnected) {
                node.position({ x: ftToPx(draggedPt.x), y: ftToPx(draggedPt.y) });
              } else {
                node.position({ x: ftToPx(snapped.x), y: ftToPx(snapped.y) });
              }

              onEndpointDrag?.(wall.id, targetIdx, snapped);
            }}
            hitStrokeWidth={12 / zoom}
          />
        );
      })}
    </>
  );
}
