import { useState, useEffect } from 'react';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import { useToolStore } from '../../store/useToolStore';
import type { Box } from '../../types';
import styles from './PropertiesPanel.module.css';

export function PropertiesPanel() {
  const { activePlan, updateElement, deleteElement } = useFloorplanStore();
  const { selectedId, setSelectedId } = useToolStore();

  const plan = activePlan();
  const element = plan?.elements.find(el => el.id === selectedId) ?? null;

  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [rotation, setRotation] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!element || element.type !== 'box') return;
    setWidth(String(element.width));
    setHeight(String(element.height));
    setRotation(String(element.rotation));
    setLabel(element.label ?? '');
  }, [element]);

  if (!element) return null;

  function handleDelete() {
    if (!selectedId) return;
    deleteElement(selectedId);
    setSelectedId(null);
  }

  function applyBoxChanges() {
    if (!selectedId || element?.type !== 'box') return;
    const updates: Partial<Box> = {};
    const w = parseFloat(width);
    const h = parseFloat(height);
    const r = parseFloat(rotation);
    if (!isNaN(w) && w > 0) updates.width = w;
    if (!isNaN(h) && h > 0) updates.height = h;
    if (!isNaN(r)) updates.rotation = r % 360;
    if (label.trim()) updates.label = label.trim();
    updateElement(selectedId, updates);
  }

  return (
    <div className={styles.panel} data-testid="properties-panel">
      <div className={styles.header}>
        <span className={styles.title}>
          {element.type === 'wall' ? 'Wall' : 'Box'}
        </span>
        <button
          className={styles.deleteBtn}
          onClick={handleDelete}
          aria-label="Delete element"
          data-testid="delete-element"
        >
          Delete
        </button>
      </div>

      {element.type === 'box' && (
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
              onBlur={applyBoxChanges}
              onKeyDown={e => e.key === 'Enter' && applyBoxChanges()}
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
              onBlur={applyBoxChanges}
              onKeyDown={e => e.key === 'Enter' && applyBoxChanges()}
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
              onBlur={applyBoxChanges}
              onKeyDown={e => e.key === 'Enter' && applyBoxChanges()}
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
              onBlur={applyBoxChanges}
              onKeyDown={e => e.key === 'Enter' && applyBoxChanges()}
            />
          </label>
        </div>
      )}
    </div>
  );
}
