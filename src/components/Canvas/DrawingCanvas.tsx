import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group } from 'react-konva';
import type Konva from 'konva';
import { nanoid } from 'nanoid';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import { useToolStore } from '../../store/useToolStore';
import { useSnap } from '../../hooks/useSnap';
import { Grid } from './Grid';
import { WallElement } from './WallElement';
import { BoxElement } from './BoxElement';
import { ftToPx, pxToFt, distance, formatFeet, WALL_THICKNESS_FT } from '../../utils/geometry';
import type { Point, Element } from '../../types';

const DRAG_THRESHOLD_FT = 0.3;
const CLOSE_CHAIN_RADIUS_FT = 0.5;
const DOUBLE_TAP_MS = 300;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function elementOverlapsRect(el: Element, rx: number, ry: number, rw: number, rh: number): boolean {
  if (el.type === 'box') {
    return rectsOverlap(el.x, el.y, el.width, el.height, rx, ry, rw, rh);
  }
  return el.points.some(p =>
    p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh
  );
}

export function DrawingCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [cursor, setCursor] = useState<Point | null>(null);
  const [cursorSnappedToEndpoint, setCursorSnappedToEndpoint] = useState(false);
  const [pointerDown, setPointerDown] = useState<{ pos: Point; time: number } | null>(null);
  const [marquee, setMarquee] = useState<{ start: Point; end: Point } | null>(null);
  const lastTapRef = useRef<number>(0);

  const { activePlan, addElement } = useFloorplanStore();
  const {
    activeTool, selectedIds, setSelectedIds, clearSelection,
    chainPoints, isChainArmed, addChainPoint, endChain,
    zoom, setZoom, pan, setPan,
  } = useToolStore();

  const plan = activePlan();
  const elements = plan?.elements ?? [];
  const { snap, snapWithInfo } = useSnap(elements);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape') { endChain(); clearSelection(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const ids = useToolStore.getState().selectedIds;
        if (ids.size > 0) {
          ids.forEach(id => useFloorplanStore.getState().deleteElement(id));
          clearSelection();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [endChain, clearSelection]);

  const getPointerWorld = useCallback((): Point | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getRelativePointerPosition();
    if (!pos) return null;
    return { x: pxToFt(pos.x), y: pxToFt(pos.y) };
  }, []);

  const worldToBase = useCallback((pt: Point) => ({
    x: ftToPx(pt.x),
    y: ftToPx(pt.y),
  }), []);

  // ── Pointer events ──────────────────────────────────────────────

  function handlePointerDown(e: Konva.KonvaEventObject<PointerEvent>) {
    const world = getPointerWorld();
    if (!world) return;

    if (activeTool === 'select') {
      // Only clear selection when clicking empty canvas
      if (e.target === stageRef.current) clearSelection();
      setPointerDown({ pos: world, time: Date.now() });
      return;
    }

    // Wall and box tools: allow starting on any point including over elements.
    // Elements in drawing mode only respond to select-tool taps.
    setPointerDown({ pos: world, time: Date.now() });
  }

  function handlePointerMove() {
    const world = getPointerWorld();
    if (!world) return;

    const { point, snappedToEndpoint } = snapWithInfo(world);
    setCursor(point);
    setCursorSnappedToEndpoint(snappedToEndpoint);

    if (activeTool === 'select' && pointerDown) {
      if (distance(pointerDown.pos, world) > DRAG_THRESHOLD_FT) {
        setMarquee({ start: pointerDown.pos, end: world });
      }
    }
  }

  function handlePointerUp(e: Konva.KonvaEventObject<PointerEvent>) {
    const world = getPointerWorld();
    if (!world || !pointerDown) { setPointerDown(null); setMarquee(null); return; }

    const dragDist = distance(pointerDown.pos, world);
    const isDrag = dragDist > DRAG_THRESHOLD_FT;
    const snappedEnd = snap(world);

    // Double-tap to end chain
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      endChain();
      setPointerDown(null);
      setMarquee(null);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    if (activeTool === 'wall') {
      handleWallInput(snappedEnd, snap(pointerDown.pos));
    } else if (activeTool === 'box') {
      if (isDrag) handleBoxDraw(snap(pointerDown.pos), snappedEnd);
    } else if (activeTool === 'select') {
      if (isDrag && marquee) {
        const rx = Math.min(marquee.start.x, marquee.end.x);
        const ry = Math.min(marquee.start.y, marquee.end.y);
        const rw = Math.abs(marquee.end.x - marquee.start.x);
        const rh = Math.abs(marquee.end.y - marquee.start.y);
        const hit = elements.filter(el => elementOverlapsRect(el, rx, ry, rw, rh));
        setSelectedIds(new Set(hit.map(el => el.id)));
      } else if (e.target === stageRef.current) {
        clearSelection();
      }
      setMarquee(null);
    }

    setPointerDown(null);
  }

  function handleWallInput(endPt: Point, startPt: Point) {
    if (isChainArmed && chainPoints.length > 0) {
      const lastPt = chainPoints[chainPoints.length - 1];
      const firstPt = chainPoints[0];

      // Close the shape if end is near the chain's first point
      if (distance(endPt, firstPt) < CLOSE_CHAIN_RADIUS_FT && chainPoints.length >= 2) {
        commitWall([lastPt, firstPt]);
        endChain();
        return;
      }

      commitWall([lastPt, endPt]);
      addChainPoint(endPt);
    } else {
      // Start a new chain — startPt is already snapped, may be an existing endpoint
      commitWall([startPt, endPt]);
      addChainPoint(startPt);
      addChainPoint(endPt);
    }
  }

  function commitWall(points: Point[]) {
    if (points.length < 2) return;
    addElement({ id: nanoid(), type: 'wall', points, thickness: WALL_THICKNESS_FT });
  }

  function handleBoxDraw(start: Point, end: Point) {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    if (width < 0.5 || height < 0.5) return;
    addElement({ id: nanoid(), type: 'box', x, y, width, height, rotation: 0 });
  }

  // ── Wheel zoom ───────────────────────────────────────────────────
  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.08;
    const newZoom = e.evt.deltaY < 0
      ? Math.min(zoom * scaleBy, MAX_ZOOM)
      : Math.max(zoom / scaleBy, MIN_ZOOM);

    const worldUnderCursor = {
      x: (pointer.x - pan.x) / zoom,
      y: (pointer.y - pan.y) / zoom,
    };

    setPan({
      x: pointer.x - worldUnderCursor.x * newZoom,
      y: pointer.y - worldUnderCursor.y * newZoom,
    });
    setZoom(newZoom);
  }

  // ── Ghost line (wall tool, chain armed) ──────────────────────────
  const ghostPoints = (() => {
    if (activeTool !== 'wall' || !cursor || !isChainArmed || chainPoints.length === 0) return null;
    const last = chainPoints[chainPoints.length - 1];
    const s = worldToBase(last);
    const c = worldToBase(cursor);
    return [s.x, s.y, c.x, c.y];
  })();

  // ── Ghost length label on ghost line ────────────────────────────
  const ghostLength = (() => {
    if (!ghostPoints || !isChainArmed || chainPoints.length === 0 || !cursor) return null;
    const last = chainPoints[chainPoints.length - 1];
    const len = distance(last, cursor);
    if (len < 0.1) return null;
    const mid = worldToBase({ x: (last.x + cursor.x) / 2, y: (last.y + cursor.y) / 2 });
    return { x: mid.x, y: mid.y, label: formatFeet(len) };
  })();

  // ── Ghost box ───────────────────────────────────────────────────
  const ghostBox = (() => {
    if (activeTool !== 'box' || !cursor || !pointerDown) return null;
    const start = snap(pointerDown.pos);
    const end = cursor;
    const bs = worldToBase(start);
    const be = worldToBase(end);
    return {
      x: Math.min(bs.x, be.x),
      y: Math.min(bs.y, be.y),
      width: Math.abs(be.x - bs.x),
      height: Math.abs(be.y - bs.y),
      labelW: formatFeet(Math.abs(end.x - start.x)),
      labelH: formatFeet(Math.abs(end.y - start.y)),
    };
  })();

  // ── Marquee rect ─────────────────────────────────────────────────
  const marqueeRect = (() => {
    if (!marquee) return null;
    const bs = worldToBase(marquee.start);
    const be = worldToBase(marquee.end);
    return {
      x: Math.min(bs.x, be.x),
      y: Math.min(bs.y, be.y),
      width: Math.abs(be.x - bs.x),
      height: Math.abs(be.y - bs.y),
    };
  })();

  // Show endpoint snap indicator when wall tool is active and cursor snapped to an existing endpoint
  const showEndpointSnap = activeTool === 'wall' && cursorSnappedToEndpoint && cursor;

  const cursorStyle = activeTool === 'select' ? (marquee ? 'crosshair' : 'default') : 'crosshair';

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', cursor: cursorStyle }}
      data-testid="drawing-canvas"
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={pan.x}
        y={pan.y}
        scaleX={zoom}
        scaleY={zoom}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        <Layer>
          <Grid width={size.width} height={size.height} zoom={zoom} pan={pan} />
        </Layer>

        <Layer>
          {elements.map(el =>
            el.type === 'wall' ? (
              <WallElement
                key={el.id}
                wall={el}
                selected={selectedIds.has(el.id)}
                onSelect={() => activeTool === 'select' && useToolStore.getState().setSelectedId(el.id)}
              />
            ) : (
              <BoxElement
                key={el.id}
                box={el}
                selected={selectedIds.has(el.id)}
                onSelect={() => activeTool === 'select' && useToolStore.getState().setSelectedId(el.id)}
              />
            )
          )}

          {/* Ghost line */}
          {ghostPoints && (
            <Line
              points={ghostPoints}
              stroke="#b8c9e0"
              strokeWidth={2 / zoom}
              dash={[6 / zoom, 4 / zoom]}
              listening={false}
            />
          )}

          {/* Ghost line length label */}
          {ghostLength && (
            <Text
              x={ghostLength.x + 4 / zoom}
              y={ghostLength.y - 14 / zoom}
              text={ghostLength.label}
              fontSize={11 / zoom}
              fontFamily="Courier New"
              fill="#2d5490"
              listening={false}
            />
          )}

          {/* Ghost box */}
          {ghostBox && ghostBox.width > 0 && ghostBox.height > 0 && (
            <Group listening={false}>
              <Rect
                x={ghostBox.x} y={ghostBox.y}
                width={ghostBox.width} height={ghostBox.height}
                stroke="#2d5490" strokeWidth={1.5 / zoom}
                dash={[6 / zoom, 4 / zoom]}
                fill="rgba(74,111,165,0.05)"
              />
              <Text
                x={ghostBox.x + 4 / zoom} y={ghostBox.y + 4 / zoom}
                text={`${ghostBox.labelW} × ${ghostBox.labelH}`}
                fontSize={11 / zoom} fontFamily="Courier New" fill="#2d5490"
              />
            </Group>
          )}

          {/* Marquee selection rect */}
          {marqueeRect && (
            <Rect
              x={marqueeRect.x} y={marqueeRect.y}
              width={marqueeRect.width} height={marqueeRect.height}
              stroke="#0066cc" strokeWidth={1 / zoom}
              dash={[4 / zoom, 3 / zoom]}
              fill="rgba(0,102,204,0.06)"
              listening={false}
            />
          )}

          {/* Armed chain dot */}
          {isChainArmed && chainPoints.length > 0 && (() => {
            const last = chainPoints[chainPoints.length - 1];
            const b = worldToBase(last);
            return <Circle x={b.x} y={b.y} radius={5 / zoom} fill="#2c2c2c" listening={false} />;
          })()}

          {/* Endpoint snap indicator — ring around existing endpoint when cursor is near it */}
          {showEndpointSnap && (() => {
            const b = worldToBase(cursor!);
            return (
              <Circle
                x={b.x} y={b.y}
                radius={8 / zoom}
                stroke="#0066cc"
                strokeWidth={2 / zoom}
                fill="rgba(0,102,204,0.12)"
                listening={false}
              />
            );
          })()}
        </Layer>
      </Stage>
    </div>
  );
}
