import { useState, useEffect } from 'react';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import { useToolStore } from '../../store/useToolStore';
import type { Box, Wall } from '../../types';
import { distance, formatFeet, segmentLength } from '../../utils/geometry';
import { FtInInput } from './FtInInput';
import styles from './PropertiesPanel.module.css';

function WallProperties({ wall, onDelete }: { wall: Wall; onDelete: () => void }) {
  const { updateElement } = useFloorplanStore();

  const segments = wall.points.length >= 2
    ? wall.points.slice(0, -1).map((pt, i) => ({
        length: segmentLength(pt, wall.points[i + 1]),
      }))
    : [];

  const totalLength = segments.reduce((sum, s) => sum + s.length, 0);
  const isSimple = segments.length === 1;

  function applyLength(newLen: number) {
    if (!isSimple || newLen <= 0) return;
    const start = wall.points[0];
    const end = wall.points[1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const currentLen = distance(start, end);
    if (currentLen === 0) return;
    const scale = newLen / currentLen;
    updateElement(wall.id, {
      points: [start, { x: start.x + dx * scale, y: start.y + dy * scale }],
    });
  }

  return (
    <div className={styles.fields}>
      <div className={styles.row}>
        <span className={styles.fieldLabel}>Total length</span>
        <span className={styles.value}>{formatFeet(totalLength)}</span>
      </div>
      {isSimple && (
        <FtInInput
          label="Set length"
          value={totalLength}
          onChange={applyLength}
          min={0.1}
          testId="wall-length-input"
        />
      )}
      {!isSimple && segments.map((seg, i) => (
        <div key={i} className={styles.row}>
          <span className={styles.fieldLabel}>Segment {i + 1}</span>
          <span className={styles.value}>{formatFeet(seg.length)}</span>
        </div>
      ))}
      <button className={styles.deleteBtn} onClick={onDelete} data-testid="delete-element">
        Delete
      </button>
    </div>
  );
}

function BoxProperties({ box, onDelete }: { box: Box; onDelete: () => void }) {
  const { updateElement } = useFloorplanStore();
  const [rotation, setRotation] = useState(String(box.rotation));
  const [label, setLabel] = useState(box.label ?? '');

  useEffect(() => {
    setRotation(String(box.rotation));
    setLabel(box.label ?? '');
  }, [box.id, box.rotation, box.label]);

  function applyRotationAndLabel() {
    const updates: Partial<Box> = {};
    const r = parseFloat(rotation);
    if (!isNaN(r)) updates.rotation = ((r % 360) + 360) % 360;
    updates.label = label.trim() || undefined;
    updateElement(box.id, updates);
  }

  return (
    <div className={styles.fields}>
      <FtInInput
        label="Width"
        value={box.width}
        onChange={w => updateElement(box.id, { width: w })}
        min={0.1}
        testId="box-width-input"
      />
      <FtInInput
        label="Height"
        value={box.height}
        onChange={h => updateElement(box.id, { height: h })}
        min={0.1}
        testId="box-height-input"
      />
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Rotation (°)</span>
        <input
          className={styles.input}
          type="number"
          step="45"
          value={rotation}
          onChange={e => setRotation(e.target.value)}
          onBlur={applyRotationAndLabel}
          onKeyDown={e => e.key === 'Enter' && applyRotationAndLabel()}
          data-testid="box-rotation-input"
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Label</span>
        <input
          className={styles.input}
          type="text"
          placeholder="e.g. Bed"
          value={label}
          onChange={e => setLabel(e.target.value)}
          onBlur={applyRotationAndLabel}
          onKeyDown={e => e.key === 'Enter' && applyRotationAndLabel()}
        />
      </label>
      <button className={styles.deleteBtn} onClick={onDelete} data-testid="delete-element">
        Delete
      </button>
    </div>
  );
}

export function PropertiesPanel() {
  const { activePlan, deleteElement } = useFloorplanStore();
  const { selectedId, selectedIds, setSelectedId } = useToolStore();

  const plan = activePlan();
  const element = selectedIds.size === 1
    ? (plan?.elements.find(el => el.id === selectedId) ?? null)
    : null;

  function handleDelete() {
    if (!selectedId) return;
    deleteElement(selectedId);
    setSelectedId(null);
  }

  if (!element) return null;

  return (
    <div className={styles.panel} data-testid="properties-panel">
      <div className={styles.header}>
        <span className={styles.title}>
          {element.type === 'wall' ? 'Wall' : 'Box'}
        </span>
      </div>
      {element.type === 'wall'
        ? <WallProperties wall={element as Wall} onDelete={handleDelete} />
        : <BoxProperties box={element as Box} onDelete={handleDelete} />
      }
    </div>
  );
}
