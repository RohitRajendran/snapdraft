import { useState, useEffect } from 'react';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import { useToolStore } from '../../store/useToolStore';
import type { Box, Wall } from '../../types';
import { distance, formatFeet, segmentLength } from '../../utils/geometry';
import styles from './PropertiesPanel.module.css';

function WallProperties({ wall, onDelete }: { wall: Wall; onDelete: () => void }) {
  const { updateElement } = useFloorplanStore();

  const segments = wall.points.length >= 2
    ? wall.points.slice(0, -1).map((pt, i) => ({
        from: pt,
        to: wall.points[i + 1],
        length: segmentLength(pt, wall.points[i + 1]),
      }))
    : [];

  const totalLength = segments.reduce((sum, s) => sum + s.length, 0);
  const isSimple = segments.length === 1;

  const [lengthInput, setLengthInput] = useState(totalLength.toFixed(2));

  useEffect(() => {
    setLengthInput(totalLength.toFixed(2));
  }, [totalLength]);

  function applyLength() {
    if (!isSimple) return;
    const newLen = parseFloat(lengthInput);
    if (isNaN(newLen) || newLen <= 0) return;
    const start = wall.points[0];
    const end = wall.points[1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const currentLen = distance(start, end);
    if (currentLen === 0) return;
    const scale = newLen / currentLen;
    updateElement(wall.id, {
      points: [
        start,
        { x: start.x + dx * scale, y: start.y + dy * scale },
      ],
    });
  }

  return (
    <div className={styles.fields}>
      <div className={styles.row}>
        <span className={styles.fieldLabel}>Total length</span>
        <span className={styles.value}>{formatFeet(totalLength)}</span>
      </div>
      {isSimple && (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Set length (ft)</span>
          <input
            className={styles.input}
            type="number"
            step="0.5"
            min="0.5"
            value={lengthInput}
            onChange={e => setLengthInput(e.target.value)}
            onBlur={applyLength}
            onKeyDown={e => e.key === 'Enter' && applyLength()}
          />
        </label>
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
  const [width, setWidth] = useState(String(box.width));
  const [height, setHeight] = useState(String(box.height));
  const [rotation, setRotation] = useState(String(box.rotation));
  const [label, setLabel] = useState(box.label ?? '');

  useEffect(() => {
    setWidth(String(box.width));
    setHeight(String(box.height));
    setRotation(String(box.rotation));
    setLabel(box.label ?? '');
  }, [box.id, box.width, box.height, box.rotation, box.label]);

  function apply() {
    const updates: Partial<Box> = {};
    const w = parseFloat(width);
    const h = parseFloat(height);
    const r = parseFloat(rotation);
    if (!isNaN(w) && w > 0) updates.width = w;
    if (!isNaN(h) && h > 0) updates.height = h;
    if (!isNaN(r)) updates.rotation = ((r % 360) + 360) % 360;
    if (label.trim()) updates.label = label.trim();
    else updates.label = undefined;
    updateElement(box.id, updates);
  }

  return (
    <div className={styles.fields}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Width (ft)</span>
        <input
          className={styles.input}
          type="number"
          step="0.5"
          min="0.5"
          value={width}
          onChange={e => setWidth(e.target.value)}
          onBlur={apply}
          onKeyDown={e => e.key === 'Enter' && apply()}
          data-testid="box-width-input"
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Height (ft)</span>
        <input
          className={styles.input}
          type="number"
          step="0.5"
          min="0.5"
          value={height}
          onChange={e => setHeight(e.target.value)}
          onBlur={apply}
          onKeyDown={e => e.key === 'Enter' && apply()}
          data-testid="box-height-input"
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Rotation (°)</span>
        <input
          className={styles.input}
          type="number"
          step="45"
          value={rotation}
          onChange={e => setRotation(e.target.value)}
          onBlur={apply}
          onKeyDown={e => e.key === 'Enter' && apply()}
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
          onBlur={apply}
          onKeyDown={e => e.key === 'Enter' && apply()}
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
  // Only show single-select properties panel (multi-select handled by MultiSelectBar)
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
