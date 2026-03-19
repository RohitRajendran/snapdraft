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
import type { Point } from '../../types';

const DRAG_THRESHOLD_PX = 8;
const CLOSE_CHAIN_RADIUS_FT = 0.5;
const DOUBLE_TAP_MS = 300;

export function DrawingCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [cursor, setCursor] = useState<Point | null>(null);
  const [pointerDown, setPointerDown] = useState<{ pos: Point; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const { activePlan, addElement } = useFloorplanStore();
  const {
    activeTool, selectedId, setSelectedId,
    chainPoints, isChainArmed, addChainPoint, endChain,
    scale, setScale, offset, setOffset,
  } = useToolStore();

  const plan = activePlan();
  const elements = plan?.elements ?? [];
  const { snap } = useSnap(elements);

  // Resize observer
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

  // Keyboard: Escape ends chain, Delete removes selection
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape') endChain();
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        useFloorplanStore.getState().deleteElement(selectedId);
        setSelectedId(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, endChain, setSelectedId]);

  const stageToWorld = useCallback((stageX: number, stageY: number): Point => {
    return {
      x: pxToFt(stageX - offset.x),
      y: pxToFt(stageY - offset.y),
    };
  }, [offset]);

  const worldToStage = useCallback((worldPt: Point): { x: number; y: number } => {
    return {
      x: ftToPx(worldPt.x) + offset.x,
      y: ftToPx(worldPt.y) + offset.y,
    };
  }, [offset]);

  const getPointerWorld = useCallback((): Point | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return stageToWorld(pos.x, pos.y);
  }, [stageToWorld]);

  // ── Pointer events ──────────────────────────────────────────────
  function handlePointerDown(e: Konva.KonvaEventObject<PointerEvent>) {
    if (e.target !== stageRef.current && activeTool !== 'select') return;
    const world = getPointerWorld();
    if (!world) return;
    setPointerDown({ pos: world, time: Date.now() });
  }

  function handlePointerMove() {
    const world = getPointerWorld();
    if (!world) return;
    const snapped = snap(world, false);
    setCursor(snapped);
  }

  function handlePointerUp(e: Konva.KonvaEventObject<PointerEvent>) {
    const world = getPointerWorld();
    if (!world || !pointerDown) { setPointerDown(null); return; }

    const dragDist = distance(pointerDown.pos, world) * ftToPx(1);
    const isDrag = dragDist > DRAG_THRESHOLD_PX;
    const snappedEnd = snap(world);

    // Double-tap detection to end chain
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      endChain();
      setPointerDown(null);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    if (activeTool === 'wall') {
      handleWallInput(snappedEnd, isDrag, pointerDown.pos);
    } else if (activeTool === 'box') {
      if (isDrag) handleBoxDraw(snap(pointerDown.pos), snappedEnd);
    } else if (activeTool === 'select') {
      if (e.target === stageRef.current) setSelectedId(null);
    }

    setPointerDown(null);
  }

  function handleWallInput(endPt: Point, isDrag: boolean, startRaw: Point) {
    const startPt = snap(startRaw);

    if (isChainArmed && chainPoints.length > 0) {
      // Continue chain from last point
      const lastPt = chainPoints[chainPoints.length - 1];
      const segStart = lastPt;
      const segEnd = endPt;

      // Check if closing the chain
      const firstPt = chainPoints[0];
      if (distance(segEnd, firstPt) < CLOSE_CHAIN_RADIUS_FT && chainPoints.length >= 2) {
        // Close the shape
        commitWall([...chainPoints, firstPt]);
        endChain();
        return;
      }

      addChainPoint(segEnd);
      // If we have 2+ points, commit a wall segment
      if (chainPoints.length >= 1) {
        commitWall([segStart, segEnd]);
      }
    } else {
      // Start a new chain
      if (isDrag) {
        commitWall([startPt, endPt]);
        addChainPoint(endPt);
      } else {
        addChainPoint(startPt);
        addChainPoint(endPt);
        commitWall([startPt, endPt]);
      }
    }
  }

  function commitWall(points: Point[]) {
    if (points.length < 2) return;
    addElement({
      id: nanoid(),
      type: 'wall',
      points,
      thickness: WALL_THICKNESS_FT,
    });
  }

  function handleBoxDraw(start: Point, end: Point) {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    if (width < 0.5 || height < 0.5) return;
    addElement({
      id: nanoid(),
      type: 'box',
      x, y, width, height,
      rotation: 0,
    });
  }

  // ── Wheel zoom ───────────────────────────────────────────────────
  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const scaleBy = 1.08;
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const newScale = e.evt.deltaY < 0
      ? Math.min(oldScale * scaleBy, 200)
      : Math.max(oldScale / scaleBy, 10);

    const mousePointTo = {
      x: (pointer.x - offset.x) / oldScale,
      y: (pointer.y - offset.y) / oldScale,
    };

    setScale(newScale);
    setOffset({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }

  // Ghost line while drawing
  const ghostPoints = (() => {
    if (activeTool !== 'wall' || !cursor || !isChainArmed || chainPoints.length === 0) return null;
    const last = chainPoints[chainPoints.length - 1];
    const s = worldToStage(last);
    const e = worldToStage(cursor);
    return [s.x, s.y, e.x, e.y];
  })();

  // Ghost box while drawing
  const ghostBox = (() => {
    if (activeTool !== 'box' || !cursor || !pointerDown) return null;
    const start = snap(pointerDown.pos);
    const end = cursor;
    const stageStart = worldToStage(start);
    const stageEnd = worldToStage(end);
    return {
      x: Math.min(stageStart.x, stageEnd.x),
      y: Math.min(stageStart.y, stageEnd.y),
      width: Math.abs(stageEnd.x - stageStart.x),
      height: Math.abs(stageEnd.y - stageStart.y),
      labelW: formatFeet(Math.abs(end.x - start.x)),
      labelH: formatFeet(Math.abs(end.y - start.y)),
    };
  })();

  const cursorStyle =
    activeTool === 'select' ? 'default'
    : activeTool === 'wall' ? 'crosshair'
    : 'crosshair';

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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        draggable={false}
      >
        <Layer>
          <Grid
            width={size.width}
            height={size.height}
            scale={scale}
            offset={offset}
          />
        </Layer>

        <Layer>
          {elements.map(el =>
            el.type === 'wall' ? (
              <WallElement
                key={el.id}
                wall={el}
                selected={selectedId === el.id}
                scale={scale}
                offset={offset}
                onSelect={() => activeTool === 'select' && setSelectedId(el.id)}
              />
            ) : (
              <BoxElement
                key={el.id}
                box={el}
                selected={selectedId === el.id}
                scale={scale}
                offset={offset}
                onSelect={() => activeTool === 'select' && setSelectedId(el.id)}
              />
            )
          )}

          {/* Ghost line */}
          {ghostPoints && (
            <Line
              points={ghostPoints}
              stroke="#b8c9e0"
              strokeWidth={2}
              dash={[6, 4]}
              listening={false}
            />
          )}

          {/* Ghost box */}
          {ghostBox && ghostBox.width > 0 && ghostBox.height > 0 && (
            <Group listening={false}>
              <Rect
                x={ghostBox.x}
                y={ghostBox.y}
                width={ghostBox.width}
                height={ghostBox.height}
                stroke="#4a6fa5"
                strokeWidth={1.5}
                dash={[6, 4]}
                fill="rgba(74,111,165,0.05)"
              />
              <Text
                x={ghostBox.x + 4}
                y={ghostBox.y + 4}
                text={`${ghostBox.labelW} × ${ghostBox.labelH}`}
                fontSize={11}
                fontFamily="Courier New"
                fill="#4a6fa5"
              />
            </Group>
          )}

          {/* Armed chain dot */}
          {isChainArmed && chainPoints.length > 0 && (() => {
            const last = chainPoints[chainPoints.length - 1];
            const s = worldToStage(last);
            return (
              <Circle
                x={s.x}
                y={s.y}
                radius={5}
                fill="#2c2c2c"
                listening={false}
              />
            );
          })()}
        </Layer>
      </Stage>
    </div>
  );
}
