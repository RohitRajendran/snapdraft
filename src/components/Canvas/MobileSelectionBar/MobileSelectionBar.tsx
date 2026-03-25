import { useRef } from 'react';
import { Undo2, Redo2, SlidersHorizontal, Trash2, Check, X } from 'lucide-react';
import { useToolStore } from '../../../store/useToolStore/useToolStore';
import { useFloorplanStore } from '../../../store/useFloorplanStore/useFloorplanStore';
import { shouldUseMobileOverlayLayout } from '../layout';
import type { Element } from '../../../types';
import styles from './MobileSelectionBar.module.css';

export function MobileSelectionBar() {
  const { selectedIds, selectedId, clearSelection, setPropertiesPanelOpen, propertiesPanelOpen } =
    useToolStore();
  const { activePlan, deleteElements, undo, redo, past, future, updateElementSilent } =
    useFloorplanStore();

  const editSnapshotRef = useRef<Element | null>(null);

  const isMobile = shouldUseMobileOverlayLayout(window.innerWidth);
  if (!isMobile || selectedIds.size !== 1) return null;

  const plan = activePlan();
  const element = plan?.elements.find((el) => el.id === selectedId) ?? null;
  if (!element) return null;

  function handleEdit() {
    editSnapshotRef.current = { ...element } as Element;
    setPropertiesPanelOpen(true);
  }

  function handleCancel() {
    const snapshot = editSnapshotRef.current;
    if (snapshot) {
      updateElementSilent(snapshot.id, snapshot);
      editSnapshotRef.current = null;
    }
    setPropertiesPanelOpen(false);
  }

  function handleDelete() {
    deleteElements(selectedIds);
    clearSelection();
  }

  if (propertiesPanelOpen) {
    return (
      <div
        className={styles.bar}
        role="toolbar"
        aria-label="Editing actions"
        data-testid="mobile-selection-bar"
      >
        <button
          className={styles.cancelBtn}
          onClick={handleCancel}
          aria-label="Cancel editing"
          data-testid="mobile-selection-cancel"
        >
          <span className={styles.icon}>
            <X />
          </span>
          <span>Cancel</span>
        </button>
        <button
          className={styles.doneBtn}
          onClick={() => setPropertiesPanelOpen(false)}
          aria-label="Done editing"
          data-testid="mobile-selection-done"
        >
          <span className={styles.icon}>
            <Check />
          </span>
          <span>Done</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={styles.bar}
      role="toolbar"
      aria-label="Selection actions"
      data-testid="mobile-selection-bar"
    >
      <button
        className={styles.btn}
        onClick={undo}
        disabled={past.length === 0}
        aria-label="Undo"
        data-testid="mobile-selection-undo"
      >
        <span className={styles.icon}>
          <Undo2 />
        </span>
        <span>Undo</span>
      </button>
      <button
        className={styles.btn}
        onClick={redo}
        disabled={future.length === 0}
        aria-label="Redo"
        data-testid="mobile-selection-redo"
      >
        <span className={styles.icon}>
          <Redo2 />
        </span>
        <span>Redo</span>
      </button>
      <button
        className={styles.editBtn}
        onClick={handleEdit}
        aria-label="Edit element properties"
        data-testid="mobile-selection-edit"
      >
        <span className={styles.icon}>
          <SlidersHorizontal />
        </span>
        <span>Edit</span>
      </button>
      <button
        className={styles.deleteBtn}
        onClick={handleDelete}
        aria-label="Delete selected element"
        data-testid="mobile-selection-delete"
      >
        <span className={styles.icon}>
          <Trash2 />
        </span>
        <span>Delete</span>
      </button>
    </div>
  );
}
