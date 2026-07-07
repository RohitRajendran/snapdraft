import { useRef, useState } from 'react';
import { Line, Circle, Arc, Rect } from 'react-konva';
import type Konva from 'konva';
import { useToolStore } from '../../../store/useToolStore/useToolStore';
import { useFloorplanStore } from '../../../store/useFloorplanStore/useFloorplanStore';
import type { Wall, Opening, Point } from '../../../types';
import {
  ftToPx,
  pxToFt,
  snapToGrid,
  findNearestEndpoint,
  distance,
  SNAP_RADIUS_FT,
  getWallSnapIncrement,
} from '../../../utils/geometry/geometry';

// ── Gap computation ──────────────────────────────────────────────────

type SegmentPart =
  | { kind: 'solid'; from: number; to: number }
  | { kind: 'gap'; from: number; to: number; opening: Opening };

function computeSegmentParts(segLen: number, segOpenings: Opening[]): SegmentPart[] {
  const sorted = [...segOpenings].sort((opA, opB) => opA.offset - opB.offset);
  const parts: SegmentPart[] = [];
  let pos = 0;

  for (const op of sorted) {
    const gapStart = Math.min(Math.max(op.offset, pos), segLen);
    const gapEnd = Math.min(gapStart + op.width, segLen);
    if (gapStart > pos + 0.001) parts.push({ kind: 'solid', from: pos, to: gapStart });
    if (gapEnd > gapStart + 0.001)
      parts.push({ kind: 'gap', from: gapStart, to: gapEnd, opening: op });
    pos = gapEnd;
  }

  if (pos < segLen - 0.001) parts.push({ kind: 'solid', from: pos, to: segLen });
  return parts;
}

// Interpolate a world point along a segment at a given fraction [0, 1]
function segPoint(segStart: Point, segEnd: Point, fraction: number): Point {
  return {
    x: segStart.x + (segEnd.x - segStart.x) * fraction,
    y: segStart.y + (segEnd.y - segStart.y) * fraction,
  };
}

// ── Opening symbol renderers ─────────────────────────────────────────

function DoorSymbol({
  segStart,
  segEnd,
  opening,
  zoom,
  isSelected,
  isDraggable,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  segStart: Point;
  segEnd: Point;
  opening: Opening;
  zoom: number;
  isSelected: boolean;
  isDraggable: boolean;
  onSelect: (extend: boolean) => void;
  onDragStart?: () => void;
  onDragMove?: (cursor: Point) => void;
  onDragEnd?: (cursor: Point) => void;
}) {
  const segLen = distance(segStart, segEnd);
  if (segLen < 0.001) return null;

  const startPx = { x: ftToPx(segStart.x), y: ftToPx(segStart.y) };
  const endPx = { x: ftToPx(segEnd.x), y: ftToPx(segEnd.y) };
  const segLenPx = Math.sqrt((endPx.x - startPx.x) ** 2 + (endPx.y - startPx.y) ** 2);
  const unitDirX = (endPx.x - startPx.x) / segLenPx;
  const unitDirY = (endPx.y - startPx.y) / segLenPx;
  const wallAngleDeg = Math.atan2(endPx.y - startPx.y, endPx.x - startPx.x) * (180 / Math.PI);

  // Perpendicular direction: left = (unitDirY, -unitDirX), right = (-unitDirY, unitDirX) in screen space
  const perpX = opening.facing === 'left' ? unitDirY : -unitDirY;
  const perpY = opening.facing === 'left' ? -unitDirX : unitDirX;

  const hingeIsStart = opening.hinge !== 'end';
  const hingeFraction = hingeIsStart
    ? opening.offset / segLen
    : (opening.offset + opening.width) / segLen;
  const hingeWorld = segPoint(segStart, segEnd, hingeFraction);
  const hingePx = { x: ftToPx(hingeWorld.x), y: ftToPx(hingeWorld.y) };
  const widthPx = ftToPx(opening.width);

  const leafTip = {
    x: hingePx.x + perpX * widthPx,
    y: hingePx.y + perpY * widthPx,
  };

  // Arc sweeps the 90° quadrant the door occupies when fully open.
  // Always clockwise=false (canvas CW / increasing angle) — only the start angle differs.
  // Using clockwise=true with a 90° sweep would produce a 270° reflex arc instead.
  // hinge=start: start angle points toward the open position; +90° CW reaches the closed direction.
  // hinge=end: closed direction is wall-backward (+180°), so start angle shifts accordingly.
  const arcRotation = hingeIsStart
    ? opening.facing === 'left'
      ? wallAngleDeg - 90
      : wallAngleDeg
    : opening.facing === 'left'
      ? wallAngleDeg + 180
      : wallAngleDeg + 90;
  const stroke = isSelected ? '#0066cc' : '#2c2c2c';

  const gapMidFraction = (opening.offset + opening.width / 2) / segLen;
  const gapMid = segPoint(segStart, segEnd, gapMidFraction);
  const gapMidPx = { x: ftToPx(gapMid.x), y: ftToPx(gapMid.y) };

  return (
    <>
      {/* Door leaf — straight line from hinge pin to the open position */}
      <Line
        points={[hingePx.x, hingePx.y, leafTip.x, leafTip.y]}
        stroke={stroke}
        strokeWidth={1.5 / zoom}
        listening={false}
      />
      {/* Swing arc — draggable and click/tap target; hitStrokeWidth enlarges the hittable border */}
      <Arc
        x={hingePx.x}
        y={hingePx.y}
        innerRadius={0}
        outerRadius={widthPx}
        angle={90}
        rotation={arcRotation}
        clockwise={false}
        fill="rgba(255,255,255,0.3)"
        stroke={stroke}
        strokeWidth={1.5 / zoom}
        hitStrokeWidth={12 / zoom}
        draggable={isDraggable}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(Boolean(e.evt?.shiftKey));
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(false);
        }}
        onDragStart={(e) => {
          e.cancelBubble = true;
          onDragStart?.();
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          e.target.setAttrs({ x: hingePx.x, y: hingePx.y });
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (pos) onDragMove?.({ x: pxToFt(pos.x), y: pxToFt(pos.y) });
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          e.target.setAttrs({ x: hingePx.x, y: hingePx.y });
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (pos) onDragEnd?.({ x: pxToFt(pos.x), y: pxToFt(pos.y) });
        }}
      />
      {/* Hit area — draggable in select mode; position is reset each frame so hit area stays on the opening */}
      <Rect
        x={gapMidPx.x}
        y={gapMidPx.y}
        width={ftToPx(opening.width)}
        height={20 / zoom}
        offsetX={ftToPx(opening.width) / 2}
        offsetY={10 / zoom}
        rotation={wallAngleDeg}
        fill="transparent"
        hitStrokeWidth={0}
        draggable={isDraggable}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(Boolean(e.evt?.shiftKey));
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(false);
        }}
        onDragStart={(e) => {
          e.cancelBubble = true;
          onDragStart?.();
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          e.target.setAttrs({ x: gapMidPx.x, y: gapMidPx.y });
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (pos) onDragMove?.({ x: pxToFt(pos.x), y: pxToFt(pos.y) });
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          e.target.setAttrs({ x: gapMidPx.x, y: gapMidPx.y });
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (pos) onDragEnd?.({ x: pxToFt(pos.x), y: pxToFt(pos.y) });
        }}
      />
    </>
  );
}

// Half the perpendicular extent of the window jamb lines (in feet)
const JAMB_HALF_FT = 0.25;

function WindowSymbol({
  segStart,
  segEnd,
  opening,
  zoom,
  isSelected,
  isDraggable,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  segStart: Point;
  segEnd: Point;
  opening: Opening;
  zoom: number;
  isSelected: boolean;
  isDraggable: boolean;
  onSelect: (extend: boolean) => void;
  onDragStart?: () => void;
  onDragMove?: (cursor: Point) => void;
  onDragEnd?: (cursor: Point) => void;
}) {
  const segLen = distance(segStart, segEnd);
  if (segLen < 0.001) return null;

  const startPx = { x: ftToPx(segStart.x), y: ftToPx(segStart.y) };
  const endPx = { x: ftToPx(segEnd.x), y: ftToPx(segEnd.y) };
  const segLenPx = Math.sqrt((endPx.x - startPx.x) ** 2 + (endPx.y - startPx.y) ** 2);
  const unitDirX = (endPx.x - startPx.x) / segLenPx;
  const unitDirY = (endPx.y - startPx.y) / segLenPx;
  const wallAngleDeg = Math.atan2(endPx.y - startPx.y, endPx.x - startPx.x) * (180 / Math.PI);

  // Perpendicular unit pointing to the left side of the wall (in screen space)
  const perpX = unitDirY;
  const perpY = -unitDirX;
  const jambPx = ftToPx(JAMB_HALF_FT);

  const gapStartFraction = opening.offset / segLen;
  const gapEndFraction = (opening.offset + opening.width) / segLen;
  const gapStartWorld = segPoint(segStart, segEnd, gapStartFraction);
  const gapEndWorld = segPoint(segStart, segEnd, gapEndFraction);
  const gapStartPx = { x: ftToPx(gapStartWorld.x), y: ftToPx(gapStartWorld.y) };
  const gapEndPx = { x: ftToPx(gapEndWorld.x), y: ftToPx(gapEndWorld.y) };

  const gapMidFraction = (opening.offset + opening.width / 2) / segLen;
  const gapMid = segPoint(segStart, segEnd, gapMidFraction);
  const gapMidPx = { x: ftToPx(gapMid.x), y: ftToPx(gapMid.y) };

  const stroke = isSelected ? '#0066cc' : '#2c2c2c';

  return (
    <>
      {/* Jamb lines at each end of the opening (perpendicular to wall) */}
      <Line
        points={[
          gapStartPx.x - perpX * jambPx,
          gapStartPx.y - perpY * jambPx,
          gapStartPx.x + perpX * jambPx,
          gapStartPx.y + perpY * jambPx,
        ]}
        stroke={stroke}
        strokeWidth={2 / zoom}
        listening={false}
      />
      <Line
        points={[
          gapEndPx.x - perpX * jambPx,
          gapEndPx.y - perpY * jambPx,
          gapEndPx.x + perpX * jambPx,
          gapEndPx.y + perpY * jambPx,
        ]}
        stroke={stroke}
        strokeWidth={2 / zoom}
        listening={false}
      />
      {/* Glazing: two parallel lines representing the glass pane */}
      {[1 / 3, 2 / 3].map((frac) => {
        const glazingOffsetX = perpX * jambPx * (frac * 2 - 1);
        const glazingOffsetY = perpY * jambPx * (frac * 2 - 1);
        return (
          <Line
            key={frac}
            points={[
              gapStartPx.x + glazingOffsetX,
              gapStartPx.y + glazingOffsetY,
              gapEndPx.x + glazingOffsetX,
              gapEndPx.y + glazingOffsetY,
            ]}
            stroke={stroke}
            strokeWidth={1 / zoom}
            listening={false}
          />
        );
      })}
      {/* Hit area — draggable in select mode; position is reset each frame so hit area stays on the opening */}
      <Rect
        x={gapMidPx.x}
        y={gapMidPx.y}
        width={ftToPx(opening.width)}
        height={20 / zoom}
        offsetX={ftToPx(opening.width) / 2}
        offsetY={10 / zoom}
        rotation={wallAngleDeg}
        fill="transparent"
        hitStrokeWidth={0}
        draggable={isDraggable}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(Boolean(e.evt?.shiftKey));
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(false);
        }}
        onDragStart={(e) => {
          e.cancelBubble = true;
          onDragStart?.();
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          e.target.setAttrs({ x: gapMidPx.x, y: gapMidPx.y });
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (pos) onDragMove?.({ x: pxToFt(pos.x), y: pxToFt(pos.y) });
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          e.target.setAttrs({ x: gapMidPx.x, y: gapMidPx.y });
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (pos) onDragEnd?.({ x: pxToFt(pos.x), y: pxToFt(pos.y) });
        }}
      />
    </>
  );
}

// ── Multi-select drag helper ─────────────────────────────────────────

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
      other.y(ftToPx(el.y + el.length / 2 + dyFt));
    } else if (el.type === 'wall') {
      other.x(ftToPx(dxFt));
      other.y(ftToPx(dyFt));
    }
  }
}

// ── Props ────────────────────────────────────────────────────────────

type Props = {
  wall: Wall;
  openings: Opening[];
  selected: boolean;
  onSelect: (extendSelection: boolean) => void;
  onOpeningSelect?: (id: string, extend: boolean) => void;
  onOpeningDragStart?: (id: string, type: 'door' | 'window') => void;
  onOpeningDragMove?: (cursor: Point) => void;
  onOpeningDragEnd?: (cursor: Point) => void;
  onGroupDrag?: (id: string, dxFt: number, dyFt: number, targetIds?: Set<string>) => void;
  onEndpointDrag?: (wallId: string, pointIndex: number, newPos: Point) => void;
};

export function WallElement({
  wall,
  openings,
  selected,
  onSelect,
  onOpeningSelect,
  onOpeningDragStart,
  onOpeningDragMove,
  onOpeningDragEnd,
  onGroupDrag,
  onEndpointDrag,
}: Props) {
  const { zoom, activeTool, selectedIds } = useToolStore();
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

    if (ids.size > 1 && onGroupDrag) {
      onGroupDrag(wall.id, snapToGrid(dxFt), snapToGrid(dyFt), ids);
      return;
    }

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

  // Build visible wall segments with gaps cut out for openings
  const visibleSegments: { points: number[]; key: string }[] = [];
  for (let segIdx = 0; segIdx < wall.points.length - 1; segIdx++) {
    const segStart = wall.points[segIdx];
    const segEnd = wall.points[segIdx + 1];
    const segLen = distance(segStart, segEnd);
    if (segLen < 0.001) continue;
    const segOpenings = openings.filter((o) => o.segmentIndex === segIdx);
    const parts = computeSegmentParts(segLen, segOpenings);
    for (const part of parts) {
      if (part.kind !== 'solid') continue;
      const partStart = segPoint(segStart, segEnd, part.from / segLen);
      const partEnd = segPoint(segStart, segEnd, part.to / segLen);
      visibleSegments.push({
        points: [ftToPx(partStart.x), ftToPx(partStart.y), ftToPx(partEnd.x), ftToPx(partEnd.y)],
        key: `${wall.id}-${segIdx}-${part.from}`,
      });
    }
  }

  const wallStroke = selected ? '#0066cc' : '#2c2c2c';

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

      {/* Invisible drag-target — handles all pointer events for the wall */}
      <Line
        id={`sd-${wall.id}`}
        x={0}
        y={0}
        points={flatPoints}
        stroke="rgba(0,0,0,0)"
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

      {/* Visible wall segments (with gaps for openings) */}
      {visibleSegments.map((seg) => (
        <Line
          key={seg.key}
          points={seg.points}
          stroke={wallStroke}
          strokeWidth={3 / zoom}
          lineCap="square"
          lineJoin="miter"
          listening={false}
        />
      ))}

      {/* Opening symbols */}
      {wall.points.slice(0, -1).map((segStart, segIdx) => {
        const segEnd = wall.points[segIdx + 1];
        const segLen = distance(segStart, segEnd);
        if (segLen < 0.001) return null;
        return openings
          .filter((o) => o.segmentIndex === segIdx)
          .map((op) =>
            op.type === 'door' ? (
              <DoorSymbol
                key={op.id}
                segStart={segStart}
                segEnd={segEnd}
                opening={op}
                zoom={zoom}
                isSelected={selectedIds.has(op.id)}
                isDraggable={activeTool === 'select'}
                onSelect={(extend) => onOpeningSelect?.(op.id, extend)}
                onDragStart={() => onOpeningDragStart?.(op.id, 'door')}
                onDragMove={onOpeningDragMove}
                onDragEnd={onOpeningDragEnd}
              />
            ) : (
              <WindowSymbol
                key={op.id}
                segStart={segStart}
                segEnd={segEnd}
                opening={op}
                zoom={zoom}
                isSelected={selectedIds.has(op.id)}
                isDraggable={activeTool === 'select'}
                onSelect={(extend) => onOpeningSelect?.(op.id, extend)}
                onDragStart={() => onOpeningDragStart?.(op.id, 'window')}
                onDragMove={onOpeningDragMove}
                onDragEnd={onOpeningDragEnd}
              />
            ),
          );
      })}

      {/* Endpoint snap ring */}
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
          const ptPxX = ftToPx(pt.x);
          const ptPxY = ftToPx(pt.y);

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
              x={ptPxX}
              y={ptPxY}
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

                const draggedPt = wall.points[idx];
                const connected = allElements.some(
                  (el) =>
                    el.type === 'wall' &&
                    el.id !== wall.id &&
                    el.points.some((p) => distance(p, draggedPt) < 0.05),
                );

                const resolvedIdx = connected ? (idx === 0 ? wall.points.length - 1 : 0) : idx;
                const otherEndpoints = getOtherEndpoints(resolvedIdx);
                const snapIncrement = getWallSnapIncrement(Boolean(e.evt?.shiftKey));

                const snapped = findNearestEndpoint(rawFt, otherEndpoints) ?? {
                  x: snapToGrid(rawFt.x, snapIncrement),
                  y: snapToGrid(rawFt.y, snapIncrement),
                };

                const newPoints = wall.points.map((p, i) => (i === resolvedIdx ? snapped : p));
                updateElement(wall.id, { points: newPoints });

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
