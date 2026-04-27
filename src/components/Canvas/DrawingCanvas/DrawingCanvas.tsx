import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group } from 'react-konva';
import type Konva from 'konva';
import { nanoid } from 'nanoid';
import { useFloorplanStore } from '../../../store/useFloorplanStore/useFloorplanStore';
import { useToolStore } from '../../../store/useToolStore/useToolStore';
import { useSnap } from '../../../hooks/useSnap/useSnap';
import { Grid } from '../Grid/Grid';
import { WallElement } from '../WallElement/WallElement';
import { BoxElement } from '../BoxElement/BoxElement';
import { MeasureOverlay } from '../MeasureOverlay/MeasureOverlay';
import styles from './DrawingCanvas.module.css';
import {
  ftToPx,
  pxToFt,
  distance,
  PIXELS_PER_FOOT,
  NUDGE_FT,
  FINE_NUDGE_FT,
  getWallSnapIncrement,
} from '../../../utils/geometry/geometry';
import {
  formatDimension,
  parseDimension,
  NUDGE_METRIC_FT,
  FINE_NUDGE_METRIC_FT,
} from '../../../utils/units/units';
import type { Point, Element } from '../../../types';
import {
  FIT_CONTENT_PADDING_PX,
  MOBILE_OVERLAY_CLEARANCE_PX,
  MOBILE_TOOLBAR_INSET_PX,
  shouldUseMobileOverlayLayout,
} from '../layout';

const DRAG_THRESHOLD_FT = 0.3;
const CLOSE_CHAIN_RADIUS_FT = 0.5;
const DOUBLE_TAP_MS = 300;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function elementOverlapsRect(el: Element, rx: number, ry: number, rw: number, rh: number): boolean {
  if (el.type === 'box') {
    return rectsOverlap(el.x, el.y, el.width, el.height, rx, ry, rw, rh);
  }
  return el.points.some((p) => p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh);
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
  const [dimInputError, setDimInputError] = useState(false);
  const [mobileDimInputOpen, setMobileDimInputOpen] = useState(false);
  const [lastPlacedWallId, setLastPlacedWallId] = useState<string | null>(null);
  const dimInputRef = useRef<HTMLInputElement>(null);
  const lastWallTapRef = useRef<{ time: number; point: Point | null }>({ time: 0, point: null });
  const touchGestureRef = useRef<{
    initialDist: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    initialMidpoint: { x: number; y: number };
    initialAngle: number;
    selectedBoxId: string | null;
    initialBoxRotation: number;
    panelWasOpen: boolean;
  } | null>(null);
  const isTwoFingerActiveRef = useRef(false);

  const { activePlan, addElement, updateElements, deleteElements } = useFloorplanStore();
  const {
    activeTool,
    selectedIds,
    setSelectedIds,
    clearSelection,
    chainPoints,
    isChainArmed,
    addChainPoint,
    endChain,
    measureStart,
    measureEnd,
    startMeasurement,
    completeMeasurement,
    clearMeasurement,
    zoom,
    setZoom,
    pan,
    setPan,
    unit,
  } = useToolStore();

  const plan = activePlan();
  const elements = plan?.elements ?? [];

  // Reads from refs/store so it can be called from inside the keydown useEffect
  // without needing to be added to its dependency array.
  const fitToContent = useCallback(() => {
    const els = useFloorplanStore.getState().activePlan()?.elements ?? [];
    if (els.length === 0 || !containerRef.current) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const el of els) {
      if (el.type === 'wall') {
        for (const p of el.points) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
      } else {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
      }
    }

    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;
    const usesMobileOverlayLayout = shouldUseMobileOverlayLayout(width);
    const bottomInset = usesMobileOverlayLayout ? MOBILE_TOOLBAR_INSET_PX : 0;
    const contentW = ftToPx(maxX - minX) || 1;
    const contentH = ftToPx(maxY - minY) || 1;
    const newZoom = Math.max(
      MIN_ZOOM,
      Math.min(
        MAX_ZOOM,
        Math.min(
          (width - FIT_CONTENT_PADDING_PX * 2) / contentW,
          (height - FIT_CONTENT_PADDING_PX * 2 - bottomInset) / contentH,
        ),
      ),
    );
    useToolStore.setState({
      zoom: newZoom,
      pan: {
        x: (width - contentW * newZoom) / 2 - ftToPx(minX) * newZoom,
        y: (height - bottomInset - contentH * newZoom) / 2 - ftToPx(minY) * newZoom,
      },
    });
  }, []);
  // Pass the last chain point so useSnap can axis-snap off-grid walls to H/V
  const chainOrigin =
    isChainArmed && chainPoints.length > 0 ? chainPoints[chainPoints.length - 1] : null;
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

  // ── Two-finger touch: pinch → zoom, translate → pan ─────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function getTouchDist(t1: Touch, t2: Touch) {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function getTouchMidpoint(t1: Touch, t2: Touch) {
      return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
    }

    function getTouchAngle(touches: TouchList) {
      const t1 = touches[0];
      const t2 = touches[1];
      return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
    }

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        isTwoFingerActiveRef.current = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const { zoom: currentZoom, pan: currentPan } = useToolStore.getState();

        // Find selected box for rotation
        const toolState = useToolStore.getState();
        const selIds = toolState.selectedIds;
        let selectedBoxId: string | null = null;
        let initialBoxRotation = 0;
        if (selIds.size === 1) {
          const [id] = selIds;
          const el = useFloorplanStore
            .getState()
            .activePlan()
            ?.elements.find((e) => e.id === id);
          if (el?.type === 'box') {
            selectedBoxId = id;
            initialBoxRotation = el.rotation;
            useFloorplanStore.getState().snapshotForUndo();
          }
        }

        // Hide the properties panel during the gesture
        const panelWasOpen = toolState.propertiesPanelOpen;
        useToolStore.getState().setPropertiesPanelOpen(false);

        touchGestureRef.current = {
          initialDist: getTouchDist(t1, t2),
          initialZoom: currentZoom,
          initialPan: { ...currentPan },
          initialMidpoint: getTouchMidpoint(t1, t2),
          initialAngle: getTouchAngle(e.touches),
          selectedBoxId,
          initialBoxRotation,
          panelWasOpen,
        };
        // Cancel any in-progress single-finger action
        setPointerDown(null);
        setMarquee(null);
        e.preventDefault();
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && touchGestureRef.current) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const {
          initialDist,
          initialZoom,
          initialPan,
          initialMidpoint,
          initialAngle,
          selectedBoxId,
          initialBoxRotation,
        } = touchGestureRef.current;

        const currentDist = getTouchDist(t1, t2);
        const currentMidpoint = getTouchMidpoint(t1, t2);

        const scaleRatio = currentDist / initialDist;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialZoom * scaleRatio));

        // Keep the initial pinch midpoint anchored in world space
        const worldUnderMidpoint = {
          x: (initialMidpoint.x - initialPan.x) / initialZoom,
          y: (initialMidpoint.y - initialPan.y) / initialZoom,
        };

        useToolStore.setState({
          zoom: newZoom,
          pan: {
            x: currentMidpoint.x - worldUnderMidpoint.x * newZoom,
            y: currentMidpoint.y - worldUnderMidpoint.y * newZoom,
          },
        });

        // Apply rotation to selected box
        if (selectedBoxId !== null) {
          const deltaAngle = getTouchAngle(e.touches) - initialAngle;
          const raw = initialBoxRotation + deltaAngle;
          const snapped = Math.round((((raw % 360) + 360) % 360) / 5) * 5;
          useFloorplanStore.getState().updateElementSilent(selectedBoxId, { rotation: snapped });
        }
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        if (touchGestureRef.current) {
          useToolStore.getState().setPropertiesPanelOpen(touchGestureRef.current.panelWasOpen);
        }
        touchGestureRef.current = null;
        // Brief delay so the finger-lift pointer event doesn't trigger a tap
        setTimeout(() => {
          isTwoFingerActiveRef.current = false;
        }, 50);
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // On mount: if the active plan has content, fit it to screen and switch to select tool.
  // Otherwise leave the default wall tool so the user can start drawing immediately.
  useEffect(() => {
    const els = useFloorplanStore.getState().activePlan()?.elements ?? [];
    if (els.length > 0) {
      useToolStore.getState().setActiveTool('select');
      fitToContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetWallInputUi = useCallback(() => {
    setDimInput('');
    setDimInputError(false);
    setMobileDimInputOpen(false);
    setLastPlacedWallId(null);
    lastWallTapRef.current = { time: 0, point: null };
  }, []);

  const cancelTransientState = useCallback(() => {
    endChain();
    clearSelection();
    clearMeasurement();
    resetWallInputUi();
    dimInputRef.current?.blur();
  }, [clearMeasurement, clearSelection, endChain, resetWallInputUi]);

  const rollbackLastMobileWall = useCallback(() => {
    if (lastPlacedWallId) {
      deleteElements([lastPlacedWallId]);
    }
    cancelTransientState();
  }, [cancelTransientState, deleteElements, lastPlacedWallId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Escape always cancels regardless of focus
      if (e.key === 'Escape') {
        cancelTransientState();
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        fitToContent();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const ids = useToolStore.getState().selectedIds;
        if (ids.size > 0) {
          deleteElements(ids);
          clearSelection();
        }
      }
      // Undo: Cmd+Z (Mac) / Ctrl+Z (Win)
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        useFloorplanStore.getState().undo();
      }
      // Redo: Cmd+Shift+Z / Ctrl+Shift+Z / Ctrl+Y
      if (
        (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
        (e.key === 'y' && e.ctrlKey)
      ) {
        e.preventDefault();
        useFloorplanStore.getState().redo();
      }
      // Arrow keys: move selected elements — 1/4" default, 1/16" with Shift
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const ids = useToolStore.getState().selectedIds;
        if (ids.size === 0) return;
        e.preventDefault();
        const { unit: currentUnit } = useToolStore.getState();
        const step = e.shiftKey
          ? currentUnit === 'metric'
            ? FINE_NUDGE_METRIC_FT
            : FINE_NUDGE_FT
          : currentUnit === 'metric'
            ? NUDGE_METRIC_FT
            : NUDGE_FT;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const store = useFloorplanStore.getState();
        const allEls = store.activePlan()?.elements ?? [];
        const updates: Record<string, Partial<Element>> = {};
        ids.forEach((id) => {
          const el = allEls.find((e) => e.id === id);
          if (!el) return;
          if (el.type === 'wall') {
            updates[id] = { points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
          } else if (el.type === 'box') {
            updates[id] = { x: el.x + dx, y: el.y + dy };
          }
        });
        store.updateElements(updates);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancelTransientState, clearSelection, deleteElements, fitToContent]);

  const getPointerWorld = useCallback((): Point | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getRelativePointerPosition();
    if (!pos) return null;
    return { x: pxToFt(pos.x), y: pxToFt(pos.y) };
  }, []);

  const worldToBase = useCallback(
    (pt: Point) => ({
      x: ftToPx(pt.x),
      y: ftToPx(pt.y),
    }),
    [],
  );

  const isCanvasBackgroundTarget = useCallback((target: Konva.Node) => {
    const stage = stageRef.current;
    if (!stage) return false;
    return target === stage || target.getParent() === stage;
  }, []);

  // ── Pointer events ──────────────────────────────────────────────

  function handlePointerDown(e: Konva.KonvaEventObject<PointerEvent>) {
    if (isTwoFingerActiveRef.current) return;
    const world = getPointerWorld();
    if (!world) return;

    if (activeTool === 'select') {
      // Only clear selection when clicking empty canvas
      if (isCanvasBackgroundTarget(e.target)) clearSelection();
      setPointerDown({ pos: world, time: Date.now() });
      return;
    }

    // Wall and box tools: allow starting on any point including over elements.
    // Elements in drawing mode only respond to select-tool taps.
    setPointerDown({ pos: world, time: Date.now() });
  }

  function handlePointerMove(e: Konva.KonvaEventObject<PointerEvent>) {
    if (isTwoFingerActiveRef.current) return;
    const world = getPointerWorld();
    if (!world) return;

    if (activeTool === 'measure') {
      // Measure tool: fully free — no snapping of any kind
      setCursor(measureEnd ? null : world);
      setCursorSnappedToEndpoint(false);
      setCursorSnappedToSegment(false);
      setCursorSnappedToAxis(false);
    } else {
      const gridIncrement =
        activeTool === 'wall' ? getWallSnapIncrement(Boolean(e.evt?.shiftKey)) : undefined;
      const { point, snappedToEndpoint, snappedToSegment, snappedToAxis } = snapWithInfo(
        world,
        gridIncrement,
      );
      setCursor(point);
      setCursorSnappedToEndpoint(snappedToEndpoint);
      setCursorSnappedToSegment(snappedToSegment);
      setCursorSnappedToAxis(snappedToAxis);
    }

    if (activeTool === 'select' && pointerDown) {
      if (distance(pointerDown.pos, world) > DRAG_THRESHOLD_FT) {
        setMarquee({ start: pointerDown.pos, end: world });
      }
    }
  }

  function handlePointerUp(e: Konva.KonvaEventObject<PointerEvent>) {
    if (isTwoFingerActiveRef.current) return;
    const world = getPointerWorld();
    if (!world || !pointerDown) {
      setPointerDown(null);
      setMarquee(null);
      return;
    }

    const dragDist = distance(pointerDown.pos, world);
    const isDrag = dragDist > DRAG_THRESHOLD_FT;
    const wallSnapIncrement = getWallSnapIncrement(Boolean(e.evt?.shiftKey));
    const snappedEnd = activeTool === 'wall' ? snap(world, wallSnapIncrement) : snap(world);

    if (activeTool === 'measure') {
      // Use raw world coords — measure tool intentionally bypasses snapping
      if (!measureStart || measureEnd) {
        startMeasurement(world);
      } else {
        completeMeasurement(world);
        setCursor(null);
      }
      setPointerDown(null);
      return;
    }

    if (activeTool === 'wall') {
      const now = e.evt.timeStamp;
      const previousTap = lastWallTapRef.current;
      const didDoubleTapLastEndpoint =
        isChainArmed &&
        !isDrag &&
        chainPoints.length > 0 &&
        previousTap.point != null &&
        now - previousTap.time < DOUBLE_TAP_MS &&
        distance(previousTap.point, snappedEnd) < CLOSE_CHAIN_RADIUS_FT &&
        distance(chainPoints[chainPoints.length - 1], snappedEnd) < CLOSE_CHAIN_RADIUS_FT;

      if (didDoubleTapLastEndpoint) {
        endChain();
        resetWallInputUi();
        setPointerDown(null);
        setMarquee(null);
        return;
      }
      lastWallTapRef.current = { time: now, point: snappedEnd };
      setDimInput(''); // clear typed value when placing via click
      handleWallInput(snappedEnd, snap(pointerDown.pos, wallSnapIncrement));
    } else if (activeTool === 'box') {
      lastWallTapRef.current = { time: 0, point: null };
      if (isDrag) handleBoxDraw(snap(pointerDown.pos), snappedEnd);
    } else if (activeTool === 'select') {
      lastWallTapRef.current = { time: 0, point: null };
      if (isDrag && marquee) {
        const rx = Math.min(marquee.start.x, marquee.end.x);
        const ry = Math.min(marquee.start.y, marquee.end.y);
        const rw = Math.abs(marquee.end.x - marquee.start.x);
        const rh = Math.abs(marquee.end.y - marquee.start.y);
        const hit = elements.filter((el) => elementOverlapsRect(el, rx, ry, rw, rh));
        setSelectedIds(new Set(hit.map((el) => el.id)));
        if (hit.length === 1 && !shouldUseMobileOverlayLayout(window.innerWidth)) {
          useToolStore.getState().setPropertiesPanelOpen(true);
        }
      } else if (isCanvasBackgroundTarget(e.target)) {
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

      // Click on the last placed endpoint → end the chain (no new wall)
      if (distance(endPt, lastPt) < CLOSE_CHAIN_RADIUS_FT) {
        endChain();
        resetWallInputUi();
        return;
      }

      // Close the shape if end is near the chain's first point
      if (distance(endPt, firstPt) < CLOSE_CHAIN_RADIUS_FT && chainPoints.length >= 2) {
        commitWall([lastPt, firstPt]);
        endChain();
        resetWallInputUi();
        return;
      }

      commitWall([lastPt, endPt]);
      addChainPoint(endPt);
    } else {
      // Start a new chain
      if (distance(startPt, endPt) > DRAG_THRESHOLD_FT) {
        // Drag: create first wall segment immediately
        commitWall([startPt, endPt]);
        addChainPoint(startPt);
        addChainPoint(endPt);
      } else {
        // Click: just arm the chain — wait for a second point before committing
        addChainPoint(endPt);
      }
    }
  }

  function commitWall(points: Point[]) {
    if (points.length < 2) return;
    const id = nanoid();
    addElement({ id, type: 'wall', points });
    setLastPlacedWallId(id);
  }

  // Commit a wall at an exact typed length, in the direction of the current cursor from the last chain point.
  function commitWallAtTypedLength(lengthFt: number) {
    if (!isChainArmed || chainPoints.length === 0) return;
    const lastPt = chainPoints[chainPoints.length - 1];

    if (usesMobileOverlayLayout && lastPlacedWallId && chainPoints.length >= 2) {
      const startPt = chainPoints[chainPoints.length - 2];
      const rawDx = lastPt.x - startPt.x;
      const rawDy = lastPt.y - startPt.y;
      const mag = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
      const dx = mag > 0.01 ? rawDx / mag : 1;
      const dy = mag > 0.01 ? rawDy / mag : 0;
      const endPt: Point = { x: startPt.x + dx * lengthFt, y: startPt.y + dy * lengthFt };

      updateElements({
        [lastPlacedWallId]: {
          points: [startPt, endPt],
        },
      });
      useToolStore.setState((state) => ({
        chainPoints: [...state.chainPoints.slice(0, -1), endPt],
        isChainArmed: true,
      }));
      setCursor(endPt);
      setDimInput('');
      setDimInputError(false);
      setMobileDimInputOpen(false);
      dimInputRef.current?.blur();
      return;
    }

    // Direction: toward cursor, or horizontal if no cursor movement
    let dx = 1,
      dy = 0;
    if (cursor) {
      const rawDx = cursor.x - lastPt.x;
      const rawDy = cursor.y - lastPt.y;
      const mag = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
      if (mag > 0.01) {
        dx = rawDx / mag;
        dy = rawDy / mag;
      }
    }

    const endPt: Point = { x: lastPt.x + dx * lengthFt, y: lastPt.y + dy * lengthFt };
    commitWall([lastPt, endPt]);
    addChainPoint(endPt);
    setCursor(endPt);
    setDimInput('');
    setDimInputError(false);
    if (usesMobileOverlayLayout) {
      setMobileDimInputOpen(false);
      dimInputRef.current?.blur();
    }
  }

  function handleBoxDraw(start: Point, end: Point) {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    if (width < 0.5 || height < 0.5) return;
    addElement({ id: nanoid(), type: 'box', x, y, width, height, rotation: 0 });
  }

  // ── Wheel: pinch/Ctrl+scroll → zoom, two-finger scroll → pan ────
  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    if (e.evt.ctrlKey) {
      // Pinch gesture on trackpad or Ctrl+scroll on mouse → zoom toward cursor
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const scaleBy = 1.08;
      const newZoom =
        e.evt.deltaY < 0 ? Math.min(zoom * scaleBy, MAX_ZOOM) : Math.max(zoom / scaleBy, MIN_ZOOM);
      const worldUnderCursor = {
        x: (pointer.x - pan.x) / zoom,
        y: (pointer.y - pan.y) / zoom,
      };
      setPan({
        x: pointer.x - worldUnderCursor.x * newZoom,
        y: pointer.y - worldUnderCursor.y * newZoom,
      });
      setZoom(newZoom);
    } else {
      // Two-finger scroll on trackpad or scroll wheel → pan
      setPan({
        x: pan.x - e.evt.deltaX,
        y: pan.y - e.evt.deltaY,
      });
    }
  }

  // ── Multi-select group drag ───────────────────────────────────────
  // Called by WallElement / BoxElement when a selected element is dragged.
  // If multiple elements are selected, apply the same delta to all of them.
  const handleGroupDrag = useCallback(
    (draggedId: string, dxFt: number, dyFt: number, targetIds?: Set<string>) => {
      const ids = targetIds && targetIds.size > 0 ? targetIds : useToolStore.getState().selectedIds;
      const targets = ids.size > 1 ? ids : new Set([draggedId]);
      const allEls = useFloorplanStore.getState().activePlan()?.elements ?? [];
      const updates: Record<string, Partial<Element>> = {};
      for (const id of targets) {
        const el = allEls.find((e) => e.id === id);
        if (!el) continue;
        if (el.type === 'wall') {
          updates[id] = { points: el.points.map((p) => ({ x: p.x + dxFt, y: p.y + dyFt })) };
        } else if (el.type === 'box') {
          updates[id] = { x: el.x + dxFt, y: el.y + dyFt };
        }
      }
      // Reset wall node translations after the store commit. Box nodes are already at
      // their absolute positions during the live drag, so zeroing them here corrupts the view.
      const stage = stageRef.current;
      if (stage) {
        for (const id of targets) {
          if (id === draggedId) continue;
          const el = allEls.find((element) => element.id === id);
          if (!el || el.type !== 'wall') continue;
          const node = stage.findOne(`#sd-${id}`);
          if (node) node.position({ x: 0, y: 0 });
        }
      }
      updateElements(updates);
    },
    [updateElements],
  );

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
    return { x: mid.x, y: mid.y, label: formatDimension(len, unit) };
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
      labelW: formatDimension(Math.abs(end.x - start.x), unit),
      labelH: formatDimension(Math.abs(end.y - start.y), unit),
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
  const usesMobileOverlayLayout = shouldUseMobileOverlayLayout(size.width);
  const mobileWallControlsVisible =
    usesMobileOverlayLayout && activeTool === 'wall' && isChainArmed && chainPoints.length > 0;

  // Dimension input — anchored to the last chain point so it stays still while typing
  const showDimInput =
    activeTool === 'wall' &&
    isChainArmed &&
    chainPoints.length > 0 &&
    (!usesMobileOverlayLayout || mobileDimInputOpen);
  const lastChainPt = chainPoints[chainPoints.length - 1] ?? null;
  const dimInputScreenPos =
    showDimInput && lastChainPt
      ? {
          x: lastChainPt.x * PIXELS_PER_FOOT * zoom + pan.x + 14,
          y: lastChainPt.y * PIXELS_PER_FOOT * zoom + pan.y - 36,
        }
      : null;

  // Auto-focus the dim input whenever the chain gains a new point on desktop,
  // or when it is explicitly opened on mobile.
  useEffect(() => {
    if (showDimInput && dimInputRef.current && (!usesMobileOverlayLayout || mobileDimInputOpen)) {
      dimInputRef.current.focus();
      dimInputRef.current.select();
    }
  }, [showDimInput, chainPoints.length, usesMobileOverlayLayout, mobileDimInputOpen]);

  const measurePreviewEnd = activeTool === 'measure' && measureStart && !measureEnd ? cursor : null;

  // Current ghost length as placeholder
  const ghostLengthFt =
    isChainArmed && chainPoints.length > 0 && cursor
      ? distance(chainPoints[chainPoints.length - 1], cursor)
      : null;

  const cursorStyle = activeTool === 'select' ? (marquee ? 'crosshair' : 'default') : 'crosshair';
  const fitButtonBottom = mobileWallControlsVisible
    ? MOBILE_OVERLAY_CLEARANCE_PX + 68
    : usesMobileOverlayLayout
      ? MOBILE_OVERLAY_CLEARANCE_PX
      : 20;

  return (
    <div
      ref={containerRef}
      className={styles.canvas}
      style={{ cursor: cursorStyle }}
      role="application"
      aria-label="Floor plan canvas. Use toolbar to select drawing tools."
      tabIndex={0}
      data-testid="drawing-canvas"
      data-zoom={zoom}
      data-pan-x={pan.x}
      data-pan-y={pan.y}
      data-element-count={elements.length}
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
          {elements.map((el) =>
            el.type === 'wall' ? (
              <WallElement
                key={el.id}
                wall={el}
                selected={selectedIds.has(el.id)}
                onSelect={(extendSelection) => {
                  if (activeTool !== 'select') return;
                  const toolStore = useToolStore.getState();
                  const isMobile = shouldUseMobileOverlayLayout(window.innerWidth);
                  if (extendSelection) {
                    toolStore.toggleSelectedId(el.id);
                    const single = useToolStore.getState().selectedIds.size === 1;
                    toolStore.setPropertiesPanelOpen(!isMobile && single);
                  } else {
                    const alreadySelected =
                      toolStore.selectedIds.has(el.id) && toolStore.selectedIds.size === 1;
                    toolStore.setSelectedId(el.id);
                    if (!isMobile || alreadySelected) {
                      toolStore.setPropertiesPanelOpen(true);
                    }
                  }
                }}
                onGroupDrag={handleGroupDrag}
              />
            ) : (
              <BoxElement
                key={el.id}
                box={el}
                selected={selectedIds.has(el.id)}
                onSelect={(extendSelection) => {
                  if (activeTool !== 'select') return;
                  const toolStore = useToolStore.getState();
                  const isMobile = shouldUseMobileOverlayLayout(window.innerWidth);
                  if (extendSelection) {
                    toolStore.toggleSelectedId(el.id);
                    const single = useToolStore.getState().selectedIds.size === 1;
                    toolStore.setPropertiesPanelOpen(!isMobile && single);
                  } else {
                    const alreadySelected =
                      toolStore.selectedIds.has(el.id) && toolStore.selectedIds.size === 1;
                    toolStore.setSelectedId(el.id);
                    if (!isMobile || alreadySelected) {
                      toolStore.setPropertiesPanelOpen(true);
                    }
                  }
                }}
                onGroupDrag={handleGroupDrag}
              />
            ),
          )}

          {/* Ghost line — wall preview */}
          {ghostPoints && (
            <Line
              points={ghostPoints}
              stroke="#b8c9e0"
              strokeWidth={3 / zoom}
              lineCap="square"
              lineJoin="miter"
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
                x={ghostBox.x}
                y={ghostBox.y}
                width={ghostBox.width}
                height={ghostBox.height}
                stroke="#2d5490"
                strokeWidth={1.5 / zoom}
                dash={[6 / zoom, 4 / zoom]}
                fill="rgba(74,111,165,0.05)"
              />
              <Text
                x={ghostBox.x + 4 / zoom}
                y={ghostBox.y + 4 / zoom}
                text={`${ghostBox.labelW} × ${ghostBox.labelH}`}
                fontSize={11 / zoom}
                fontFamily="Courier New"
                fill="#2d5490"
              />
            </Group>
          )}

          {/* Marquee selection rect */}
          {marqueeRect && (
            <Rect
              x={marqueeRect.x}
              y={marqueeRect.y}
              width={marqueeRect.width}
              height={marqueeRect.height}
              stroke="#0066cc"
              strokeWidth={1 / zoom}
              dash={[4 / zoom, 3 / zoom]}
              fill="rgba(0,102,204,0.06)"
              listening={false}
            />
          )}

          {/* Armed chain dot */}
          {isChainArmed &&
            chainPoints.length > 0 &&
            (() => {
              const last = chainPoints[chainPoints.length - 1];
              const b = worldToBase(last);
              return <Circle x={b.x} y={b.y} radius={5 / zoom} fill="#2c2c2c" listening={false} />;
            })()}

          {/* Endpoint snap indicator — ring around existing endpoint when cursor is near it */}
          {showEndpointSnap &&
            (() => {
              const b = worldToBase(cursor!);
              return (
                <Circle
                  x={b.x}
                  y={b.y}
                  radius={8 / zoom}
                  stroke="#0066cc"
                  strokeWidth={2 / zoom}
                  fill="rgba(0,102,204,0.12)"
                  listening={false}
                />
              );
            })()}

          {/* Segment snap indicator — small square when cursor snaps to a point along a wall */}
          {showSegmentSnap &&
            (() => {
              const b = worldToBase(cursor!);
              const s = 7 / zoom;
              return (
                <Rect
                  x={b.x - s / 2}
                  y={b.y - s / 2}
                  width={s}
                  height={s}
                  stroke="#e07b00"
                  strokeWidth={2 / zoom}
                  fill="rgba(224,123,0,0.15)"
                  listening={false}
                />
              );
            })()}

          {/* Axis snap indicator — diamond when cursor is locked to H or V from chain origin */}
          {showAxisSnap &&
            (() => {
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

          {activeTool === 'measure' && measureStart && (
            <MeasureOverlay
              start={measureStart}
              end={measurePreviewEnd ?? measureEnd}
              zoom={zoom}
              worldToBase={worldToBase}
            />
          )}
        </Layer>
      </Stage>

      {/* Dimension input — type exact length while drawing a wall */}
      {showDimInput && dimInputScreenPos && (
        <input
          ref={dimInputRef}
          className={`${styles.dimInput} ${dimInputError ? styles.dimInputError : styles.dimInputOk}`}
          type="text"
          value={dimInput}
          placeholder={
            ghostLengthFt != null && ghostLengthFt > 0.05
              ? formatDimension(ghostLengthFt, unit)
              : 'length'
          }
          onChange={(e) => {
            setDimInput(e.target.value);
            setDimInputError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const ft = parseDimension(dimInput, unit);
              if (ft != null && ft > 0) {
                setDimInputError(false);
                commitWallAtTypedLength(ft);
              } else if (dimInput.trim() !== '') {
                setDimInputError(true);
                setTimeout(() => setDimInputError(false), 800);
              }
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              cancelTransientState();
            }
            // Don't let other keys (S/W/B) change the tool while typing
            e.stopPropagation();
          }}
          style={{
            left: Math.max(4, Math.min(dimInputScreenPos.x, size.width - 120)),
            top: Math.max(4, dimInputScreenPos.y),
          }}
          data-testid="dim-input"
        />
      )}

      {mobileWallControlsVisible && (
        <div className={styles.mobileWallBar} data-testid="mobile-wall-controls">
          <button
            type="button"
            className={styles.mobileWallButton}
            onClick={() => {
              setMobileDimInputOpen((open) => {
                const next = !open;
                if (!next) {
                  setDimInput('');
                  setDimInputError(false);
                  dimInputRef.current?.blur();
                }
                return next;
              });
            }}
            data-testid="mobile-wall-length"
          >
            {mobileDimInputOpen ? 'Hide Length' : 'Length'}
          </button>
          <button
            type="button"
            className={styles.mobileWallButton}
            onClick={() => {
              endChain();
              resetWallInputUi();
              dimInputRef.current?.blur();
            }}
            data-testid="mobile-wall-done"
          >
            Done
          </button>
          <button
            type="button"
            className={`${styles.mobileWallButton} ${styles.mobileWallCancel}`}
            onClick={rollbackLastMobileWall}
            data-testid="mobile-wall-cancel"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Fit-to-content button — always visible so it works even when keyboard focus is elsewhere */}
      <button
        className={styles.fitButton}
        onClick={fitToContent}
        title="Fit all content in view (F)"
        aria-label="Fit all content in view"
        style={{
          bottom: fitButtonBottom,
          left: usesMobileOverlayLayout ? 12 : 20,
        }}
        data-testid="fit-to-content"
      >
        ⤢ Fit
      </button>
    </div>
  );
}
