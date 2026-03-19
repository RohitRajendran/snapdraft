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
import { ftToPx, pxToFt, distance, formatFeet, parseFtIn, WALL_THICKNESS_FT, PIXELS_PER_FOOT } from '../../utils/geometry';
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
  const [cursorSnappedToSegment, setCursorSnappedToSegment] = useState(false);
  const [cursorSnappedToAxis, setCursorSnappedToAxis] = useState(false);
  const [pointerDown, setPointerDown] = useState<{ pos: Point; time: number } | null>(null);
  const [marquee, setMarquee] = useState<{ start: Point; end: Point } | null>(null);
  const [dimInput, setDimInput] = useState('');
  const dimInputRef = useRef<HTMLInputElement>(null);
  const lastTapRef = useRef<number>(0);

  const { activePlan, addElement, updateElement } = useFloorplanStore();
  const {
    activeTool, selectedIds, setSelectedIds, clearSelection,
    chainPoints, isChainArmed, addChainPoint, endChain,
    zoom, setZoom, pan, setPan,
  } = useToolStore();

  const plan = activePlan();
  const elements = plan?.elements ?? [];
  // Pass the last chain point so useSnap can axis-snap off-grid walls to H/V
  const chainOrigin = (isChainArmed && chainPoints.length > 0)
    ? chainPoints[chainPoints.length - 1]
    : null;
  const { snap, snapWithInfo } = useSnap(elements, chainOrigin);

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
      if (e.key === 'Escape') { endChain(); clearSelection(); setDimInput(''); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const ids = useToolStore.getState().selectedIds;
        if (ids.size > 0) {
          ids.forEach(id => useFloorplanStore.getState().deleteElement(id));
          clearSelection();
        }
      }
      // Undo: Cmd+Z (Mac) / Ctrl+Z (Win)
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        useFloorplanStore.getState().undo();
      }
      // Redo: Cmd+Shift+Z / Ctrl+Shift+Z / Ctrl+Y
      if ((e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
          (e.key === 'y' && e.ctrlKey)) {
        e.preventDefault();
        useFloorplanStore.getState().redo();
      }
      // Arrow keys: move selected elements — 1 ft, or 0.5 ft with Shift
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const ids = useToolStore.getState().selectedIds;
        if (ids.size === 0) return;
        e.preventDefault();
        const step = e.shiftKey ? 0.5 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const store = useFloorplanStore.getState();
        const allEls = store.activePlan()?.elements ?? [];
        ids.forEach(id => {
          const el = allEls.find(e => e.id === id);
          if (!el) return;
          if (el.type === 'wall') {
            store.updateElement(id, { points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) });
          } else if (el.type === 'box') {
            store.updateElement(id, { x: el.x + dx, y: el.y + dy });
          }
        });
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

    const { point, snappedToEndpoint, snappedToSegment, snappedToAxis } = snapWithInfo(world);
    setCursor(point);
    setCursorSnappedToEndpoint(snappedToEndpoint);
    setCursorSnappedToSegment(snappedToSegment);
    setCursorSnappedToAxis(snappedToAxis);

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
      setDimInput(''); // clear typed value when placing via click
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

  // Commit a wall at an exact typed length, in the direction of the current cursor from the last chain point.
  function commitWallAtTypedLength(lengthFt: number) {
    if (!isChainArmed || chainPoints.length === 0) return;
    const lastPt = chainPoints[chainPoints.length - 1];

    // Direction: toward cursor, or horizontal if no cursor movement
    let dx = 1, dy = 0;
    if (cursor) {
      const rawDx = cursor.x - lastPt.x;
      const rawDy = cursor.y - lastPt.y;
      const mag = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
      if (mag > 0.01) { dx = rawDx / mag; dy = rawDy / mag; }
    }

    const endPt: Point = { x: lastPt.x + dx * lengthFt, y: lastPt.y + dy * lengthFt };
    commitWall([lastPt, endPt]);
    addChainPoint(endPt);
    setCursor(endPt);
    setDimInput('');
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

  // ── Multi-select group drag ───────────────────────────────────────
  // Called by WallElement / BoxElement when a selected element is dragged.
  // If multiple elements are selected, apply the same delta to all of them.
  const handleGroupDrag = useCallback((draggedId: string, dxFt: number, dyFt: number) => {
    const ids = useToolStore.getState().selectedIds;
    const targets = ids.size > 1 ? ids : new Set([draggedId]);
    const allEls = useFloorplanStore.getState().activePlan()?.elements ?? [];
    targets.forEach(id => {
      const el = allEls.find(e => e.id === id);
      if (!el) return;
      if (el.type === 'wall') {
        updateElement(id, { points: el.points.map(p => ({ x: p.x + dxFt, y: p.y + dyFt })) });
      } else if (el.type === 'box') {
        updateElement(id, { x: el.x + dxFt, y: el.y + dyFt });
      }
    });
  }, [updateElement]);

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

  // Show snap indicators only when wall tool is active
  const showEndpointSnap = activeTool === 'wall' && cursorSnappedToEndpoint && cursor;
  const showSegmentSnap = activeTool === 'wall' && cursorSnappedToSegment && cursor;
  const showAxisSnap = activeTool === 'wall' && cursorSnappedToAxis && cursor;

  // Dimension input — anchored to the last chain point so it stays still while typing
  const showDimInput = activeTool === 'wall' && isChainArmed && chainPoints.length > 0;
  const lastChainPt = chainPoints[chainPoints.length - 1] ?? null;
  const dimInputScreenPos = showDimInput && lastChainPt ? {
    x: lastChainPt.x * PIXELS_PER_FOOT * zoom + pan.x + 14,
    y: lastChainPt.y * PIXELS_PER_FOOT * zoom + pan.y - 36,
  } : null;

  // Auto-focus the dim input whenever the chain gains a new point
  useEffect(() => {
    if (showDimInput && dimInputRef.current) {
      dimInputRef.current.focus();
      dimInputRef.current.select();
    }
  }, [showDimInput, chainPoints.length]);

  // Current ghost length as placeholder
  const ghostLengthFt = (isChainArmed && chainPoints.length > 0 && cursor)
    ? distance(chainPoints[chainPoints.length - 1], cursor)
    : null;

  const cursorStyle = activeTool === 'select' ? (marquee ? 'crosshair' : 'default') : 'crosshair';

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', cursor: cursorStyle, position: 'relative' }}
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
                onGroupDrag={handleGroupDrag}
              />
            ) : (
              <BoxElement
                key={el.id}
                box={el}
                selected={selectedIds.has(el.id)}
                onSelect={() => activeTool === 'select' && useToolStore.getState().setSelectedId(el.id)}
                onGroupDrag={handleGroupDrag}
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

          {/* Segment snap indicator — small square when cursor snaps to a point along a wall */}
          {showSegmentSnap && (() => {
            const b = worldToBase(cursor!);
            const s = 7 / zoom;
            return (
              <Rect
                x={b.x - s / 2} y={b.y - s / 2}
                width={s} height={s}
                stroke="#e07b00"
                strokeWidth={2 / zoom}
                fill="rgba(224,123,0,0.15)"
                listening={false}
              />
            );
          })()}

          {/* Axis snap indicator — diamond when cursor is locked to H or V from chain origin */}
          {showAxisSnap && (() => {
            const b = worldToBase(cursor!);
            const r = 6 / zoom;
            return (
              <Line
                points={[b.x, b.y - r, b.x + r, b.y, b.x, b.y + r, b.x - r, b.y, b.x, b.y - r]}
                stroke="#22aa55"
                strokeWidth={2 / zoom}
                fill="rgba(34,170,85,0.15)"
                closed
                listening={false}
              />
            );
          })()}
        </Layer>
      </Stage>

      {/* Dimension input — type exact length while drawing a wall */}
      {showDimInput && dimInputScreenPos && (
        <input
          ref={dimInputRef}
          type="text"
          value={dimInput}
          placeholder={ghostLengthFt != null && ghostLengthFt > 0.05 ? formatFeet(ghostLengthFt) : "length"}
          onChange={e => setDimInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const ft = parseFtIn(dimInput);
              if (ft != null && ft > 0) {
                commitWallAtTypedLength(ft);
              }
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setDimInput('');
              dimInputRef.current?.blur();
            }
            // Don't let other keys (S/W/B) change the tool while typing
            e.stopPropagation();
          }}
          style={{
            position: 'absolute',
            left: Math.max(4, Math.min(dimInputScreenPos.x, size.width - 120)),
            top: Math.max(4, dimInputScreenPos.y),
            width: 100,
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            fontWeight: 700,
            background: 'rgba(255,255,255,0.97)',
            border: '1.5px solid #2d5490',
            borderRadius: 4,
            padding: '4px 8px',
            color: '#2c2c2c',
            outline: 'none',
            pointerEvents: 'auto',
            zIndex: 200,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          data-testid="dim-input"
        />
      )}
    </div>
  );
}
