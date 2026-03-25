import { useRef, useState } from 'react';
import { Line, Circle } from 'react-konva';
import type Konva from 'konva';
import { useToolStore } from '../../../store/useToolStore/useToolStore';
import { useFloorplanStore } from '../../../store/useFloorplanStore/useFloorplanStore';
import type { Wall, Point } from '../../../types';
import {
  ftToPx,
  pxToFt,
  snapToGrid,
  findNearestEndpoint,
  distance,
  SNAP_RADIUS_FT,
  getWallSnapIncrement,
} from '../../../utils/geometry/geometry';

function moveOtherSelected(
  node: Konva.Node,
  selfId: string,
  dxFt: number,
  dyFt: number,
  ids: Set<string>,
) {
  const stage = node.getStage();
  if (!stage) return;
  const allEls = useFloorplanStore.getState().activePlan()?.elements ?? [];
  for (const id of ids) {
    if (id === selfId) continue;
    const el = allEls.find((e) => e.id === id);
    if (!el) continue;
    const other = stage.findOne(`#sd-${id}`);
    if (!other) continue;
    if (el.type === 'box') {
      other.x(ftToPx(el.x + el.width / 2 + dxFt));
      other.y(ftToPx(el.y + el.height / 2 + dyFt));
    } else if (el.type === 'wall') {
      other.x(ftToPx(dxFt));
      other.y(ftToPx(dyFt));
    }
  }
}

type Props = {
  wall: Wall;
  selected: boolean;
  onSelect: (extendSelection: boolean) => void;
  onGroupDrag?: (id: string, dxFt: number, dyFt: number, targetIds?: Set<string>) => void;
  onEndpointDrag?: (wallId: string, pointIndex: number, newPos: Point) => void;
};

export function WallElement({ wall, selected, onSelect, onGroupDrag, onEndpointDrag }: Props) {
  const { zoom, activeTool } = useToolStore();
  const { updateElement } = useFloorplanStore();
  const [endpointSnapTarget, setEndpointSnapTarget] = useState<Point | null>(null);
  const [draggingEndpoint, setDraggingEndpoint] = useState<{ idx: number; pos: Point } | null>(
    null,
  );
  const dragSelectionRef = useRef<Set<string>>(new Set());

  const flatPoints = wall.points.flatMap((p) => [ftToPx(p.x), ftToPx(p.y)]);

  function handleDragStart() {
    dragSelectionRef.current = new Set(useToolStore.getState().selectedIds);
  }

  function handleDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    const ids = dragSelectionRef.current;
    if (ids.size <= 1) return;
    const node = e.target;
    const dxFt = pxToFt(node.x());
    const dyFt = pxToFt(node.y());
    moveOtherSelected(node, wall.id, dxFt, dyFt, ids);
  }

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const dxFt = pxToFt(node.x());
    const dyFt = pxToFt(node.y());
    node.position({ x: 0, y: 0 });

    const ids = dragSelectionRef.current;
    dragSelectionRef.current = new Set();

    // Multi-select: delegate all movement to parent handler
    if (ids.size > 1 && onGroupDrag) {
      onGroupDrag(wall.id, snapToGrid(dxFt), snapToGrid(dyFt), ids);
      return;
    }

    // Single wall drag — try to snap endpoints to nearby wall endpoints
    const candidates = wall.points.map((p) => ({ x: p.x + dxFt, y: p.y + dyFt }));
    const allElements = useFloorplanStore.getState().activePlan()?.elements ?? [];
    const otherEndpoints: Point[] = [];
    for (const el of allElements) {
      if (el.type === 'wall' && el.id !== wall.id) {
        otherEndpoints.push(...el.points);
      }
    }

    let adjustment: Point | null = null;
    let bestDist = SNAP_RADIUS_FT * 4;
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
      finalPoints = candidates.map((p) => ({ x: p.x + adjustment!.x, y: p.y + adjustment!.y }));
    } else {
      const snappedDx = snapToGrid(dxFt);
      const snappedDy = snapToGrid(dyFt);
      if (snappedDx === 0 && snappedDy === 0) return;
      finalPoints = wall.points.map((p) => ({ x: p.x + snappedDx, y: p.y + snappedDy }));
    }

    updateElement(wall.id, { points: finalPoints });
  }

  function getOtherEndpoints(targetIdx: number): Point[] {
    const allElements = useFloorplanStore.getState().activePlan()?.elements ?? [];
    const pts: Point[] = [];
    for (const el of allElements) {
      if (el.type === 'wall' && el.id !== wall.id) {
        pts.push(...el.points);
      } else if (el.type === 'wall' && el.id === wall.id) {
        el.points.forEach((p, i) => {
          if (i !== targetIdx) pts.push(p);
        });
      }
    }
    return pts;
  }

  const ghostFlatPoints = draggingEndpoint
    ? wall.points
        .map((p, i) => (i === draggingEndpoint.idx ? draggingEndpoint.pos : p))
        .flatMap((p) => [ftToPx(p.x), ftToPx(p.y)])
    : null;

  return (
    <>
      {ghostFlatPoints && (
        <Line
          points={ghostFlatPoints}
          stroke="#0066cc"
          strokeWidth={3 / zoom}
          opacity={0.35}
          dash={[8 / zoom, 5 / zoom]}
          lineCap="square"
          lineJoin="miter"
          listening={false}
        />
      )}
      <Line
        id={`sd-${wall.id}`}
        x={0}
        y={0}
        points={flatPoints}
        stroke={selected ? '#0066cc' : '#2c2c2c'}
        strokeWidth={3 / zoom}
        lineCap="square"
        lineJoin="miter"
        draggable={activeTool === 'select'}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={(e) => onSelect(Boolean(e.evt?.shiftKey))}
        onTap={() => onSelect(false)}
        hitStrokeWidth={16 / zoom}
        data-testid={`wall-${wall.id}`}
      />

      {/* Endpoint snap ring shown while dragging an endpoint near another wall's endpoint */}
      {endpointSnapTarget && (
        <Circle
          x={ftToPx(endpointSnapTarget.x)}
          y={ftToPx(endpointSnapTarget.y)}
          radius={10 / zoom}
          stroke="#0066cc"
          strokeWidth={2 / zoom}
          fill="rgba(0,102,204,0.12)"
          listening={false}
        />
      )}

      {/* Endpoint handles — visible when selected in select mode */}
      {selected &&
        activeTool === 'select' &&
        wall.points.map((pt, idx) => {
          const bx = ftToPx(pt.x);
          const by = ftToPx(pt.y);

          // Determine the actual target index (may redirect to free end if connected)
          const isConnected =
            useFloorplanStore
              .getState()
              .activePlan()
              ?.elements.some(
                (el) =>
                  el.type === 'wall' &&
                  el.id !== wall.id &&
                  el.points.some((p) => distance(p, pt) < 0.05),
              ) ?? false;
          const targetIdx = isConnected ? (idx === 0 ? wall.points.length - 1 : 0) : idx;

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
              onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
                const node = e.target;
                const rawFt = { x: pxToFt(node.x()), y: pxToFt(node.y()) };
                const otherEndpoints = getOtherEndpoints(targetIdx);
                const nearest = findNearestEndpoint(rawFt, otherEndpoints);
                const snapIncrement = getWallSnapIncrement(Boolean(e.evt?.shiftKey));
                setEndpointSnapTarget(nearest ?? null);
                const snappedPos = nearest ?? {
                  x: snapToGrid(rawFt.x, snapIncrement),
                  y: snapToGrid(rawFt.y, snapIncrement),
                };
                setDraggingEndpoint({ idx: targetIdx, pos: snappedPos });
              }}
              onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                setEndpointSnapTarget(null);
                setDraggingEndpoint(null);
                const node = e.target;
                const rawFt = { x: pxToFt(node.x()), y: pxToFt(node.y()) };

                const allElements = useFloorplanStore.getState().activePlan()?.elements ?? [];

                // Check if the dragged endpoint is shared with another wall
                const draggedPt = wall.points[idx];
                const connected = allElements.some(
                  (el) =>
                    el.type === 'wall' &&
                    el.id !== wall.id &&
                    el.points.some((p) => distance(p, draggedPt) < 0.05),
                );

                // If connected, redirect the resize to the OTHER (free) endpoint
                const resolvedIdx = connected ? (idx === 0 ? wall.points.length - 1 : 0) : idx;
                const otherEndpoints = getOtherEndpoints(resolvedIdx);
                const snapIncrement = getWallSnapIncrement(Boolean(e.evt?.shiftKey));

                const snapped = findNearestEndpoint(rawFt, otherEndpoints) ?? {
                  x: snapToGrid(rawFt.x, snapIncrement),
                  y: snapToGrid(rawFt.y, snapIncrement),
                };

                const newPoints = wall.points.map((p, i) => (i === resolvedIdx ? snapped : p));
                updateElement(wall.id, { points: newPoints });

                // Reset handle to its unchanged position if we redirected the drag
                if (connected) {
                  node.position({ x: ftToPx(draggedPt.x), y: ftToPx(draggedPt.y) });
                } else {
                  node.position({ x: ftToPx(snapped.x), y: ftToPx(snapped.y) });
                }

                onEndpointDrag?.(wall.id, resolvedIdx, snapped);
              }}
              hitStrokeWidth={12 / zoom}
            />
          );
        })}
    </>
  );
}
