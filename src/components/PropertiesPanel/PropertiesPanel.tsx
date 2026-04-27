import { useState } from 'react';
import { useFloorplanStore } from '../../store/useFloorplanStore/useFloorplanStore';
import { useToolStore } from '../../store/useToolStore/useToolStore';
import type { Box, Element, Wall } from '../../types';
import { collectConnectedWallIds } from '../../utils/geometry/geometry';
import { formatDimension } from '../../utils/units/units';
import { shouldUseMobileOverlayLayout } from '../Canvas/layout';
import { FtInInput } from './FtInInput/FtInInput';
import styles from './PropertiesPanel.module.css';

function WallProperties({
  wall,
  onDelete,
  showDelete,
}: {
  wall: Wall;
  onDelete: () => void;
  showDelete: boolean;
}) {
  const { updateElements, activePlan } = useFloorplanStore();
  const allElements = activePlan()?.elements ?? [];

  const segments =
    wall.points.length >= 2
      ? wall.points.slice(0, -1).map((pt, i) => {
          const to = wall.points[i + 1];
          const dx = to.x - pt.x;
          const dy = to.y - pt.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          return { from: pt, to, len };
        })
      : [];

  const totalLen = segments.reduce((sum, s) => sum + s.len, 0);
  const isSimple = segments.length === 1;
  const unit = useToolStore((s) => s.unit);

  function applySegmentLength(segIdx: number, newLen: number) {
    if (newLen <= 0) return;
    const seg = segments[segIdx];
    if (seg.len === 0) return;
    const scale = newLen / seg.len;
    const dx = seg.to.x - seg.from.x;
    const dy = seg.to.y - seg.from.y;
    const newTo = { x: seg.from.x + dx * scale, y: seg.from.y + dy * scale };
    const delta = { x: newTo.x - seg.to.x, y: newTo.y - seg.to.y };

    // Updated points for the resized wall (from stays fixed, points after segIdx shift).
    const newPoints = wall.points.map((p, i) => {
      if (i <= segIdx) return p;
      return { x: p.x + delta.x, y: p.y + delta.y };
    });

    // Cascade: translate every wall reachable from the moved endpoint by the same delta,
    // so connected walls stay attached. All updates land in one atomic history entry.
    const cascadeIds = collectConnectedWallIds(seg.to, wall.id, allElements);

    const updates: Record<string, Partial<Element>> = { [wall.id]: { points: newPoints } };
    for (const cid of cascadeIds) {
      const connectedWall = allElements.find((el) => el.id === cid);
      if (!connectedWall || connectedWall.type !== 'wall') continue;
      updates[cid] = {
        points: connectedWall.points.map((p) => ({ x: p.x + delta.x, y: p.y + delta.y })),
      };
    }
    updateElements(updates);
  }

  return (
    <div className={styles.fields}>
      <div className={styles.row}>
        <span className={styles.fieldLabel}>Total length</span>
        <span className={styles.value}>{formatDimension(totalLen, unit)}</span>
      </div>
      {segments.map((seg, i) => (
        <FtInInput
          key={i}
          label={isSimple ? 'Length' : `Segment ${i + 1}`}
          value={seg.len}
          onChange={(newLen) => applySegmentLength(i, newLen)}
          min={0.1}
          testId={isSimple ? 'wall-length-input' : `wall-segment-${i}-input`}
        />
      ))}
      {showDelete && (
        <button
          className={styles.deleteBtn}
          onClick={onDelete}
          aria-label="Delete wall"
          data-testid="delete-element"
        >
          Delete
        </button>
      )}
    </div>
  );
}

function BoxProperties({
  box,
  onDelete,
  showDelete,
}: {
  box: Box;
  onDelete: () => void;
  showDelete: boolean;
}) {
  const { updateElement } = useFloorplanStore();
  const [rotationDraft, setRotationDraft] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState<string | null>(null);

  const rotationDisplay = rotationDraft ?? String(box.rotation);
  const labelDisplay = labelDraft ?? box.label ?? '';

  function commitRotation() {
    if (rotationDraft === null) return;
    const r = parseFloat(rotationDraft);
    if (!isNaN(r)) updateElement(box.id, { rotation: ((r % 360) + 360) % 360 });
    setRotationDraft(null);
  }

  function commitLabel() {
    if (labelDraft === null) return;
    updateElement(box.id, { label: labelDraft.trim() || undefined });
    setLabelDraft(null);
  }

  return (
    <div className={styles.fields}>
      <FtInInput
        label="Width"
        value={box.width}
        onChange={(w) => updateElement(box.id, { width: w })}
        min={0.1}
        testId="box-width-input"
      />
      <FtInInput
        label="Height"
        value={box.height}
        onChange={(h) => updateElement(box.id, { height: h })}
        min={0.1}
        testId="box-height-input"
      />
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Rotation (°)</span>
        <input
          className={styles.input}
          type="number"
          step="45"
          value={rotationDisplay}
          aria-label="Rotation in degrees"
          onFocus={() => setRotationDraft(String(box.rotation))}
          onChange={(e) => setRotationDraft(e.target.value)}
          onBlur={commitRotation}
          onKeyDown={(e) => e.key === 'Enter' && commitRotation()}
          data-testid="box-rotation-input"
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Label</span>
        <input
          className={styles.input}
          type="text"
          placeholder="e.g. Bed"
          value={labelDisplay}
          aria-label="Box label"
          onFocus={() => setLabelDraft(box.label ?? '')}
          onChange={(e) => setLabelDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => e.key === 'Enter' && commitLabel()}
          data-testid="box-label-input"
        />
      </label>
      {showDelete && (
        <button
          className={styles.deleteBtn}
          onClick={onDelete}
          aria-label="Delete box"
          data-testid="delete-element"
        >
          Delete
        </button>
      )}
    </div>
  );
}

export function PropertiesPanel() {
  const { activePlan, deleteElement } = useFloorplanStore();
  const { selectedId, selectedIds, setSelectedId, propertiesPanelOpen } = useToolStore();

  const plan = activePlan();
  const element =
    selectedIds.size === 1 ? (plan?.elements.find((el) => el.id === selectedId) ?? null) : null;

  function handleDelete() {
    if (!selectedId) return;
    deleteElement(selectedId);
    setSelectedId(null);
  }

  if (!element || !propertiesPanelOpen) return null;

  const showDelete = !shouldUseMobileOverlayLayout(window.innerWidth);

  return (
    <div
      className={styles.panel}
      role="complementary"
      aria-label="Element properties"
      data-testid="properties-panel"
    >
      <div className={styles.header}>
        <h2 className={styles.title}>{element.type === 'wall' ? 'Wall' : 'Box'}</h2>
      </div>
      {element.type === 'wall' ? (
        <WallProperties
          key={element.id}
          wall={element as Wall}
          onDelete={handleDelete}
          showDelete={showDelete}
        />
      ) : (
        <BoxProperties
          key={element.id}
          box={element as Box}
          onDelete={handleDelete}
          showDelete={showDelete}
        />
      )}
    </div>
  );
}
