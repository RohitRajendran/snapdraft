import { useToolStore } from '../../../store/useToolStore/useToolStore';
import { useFloorplanStore } from '../../../store/useFloorplanStore/useFloorplanStore';
import styles from './MultiSelectBar.module.css';

export function MultiSelectBar() {
  const { selectedIds, clearSelection } = useToolStore();
  const { deleteElements } = useFloorplanStore();

  if (selectedIds.size < 2) return null;

  function handleDeleteAll() {
    deleteElements(selectedIds);
    clearSelection();
  }

  return (
    <div
      className={styles.bar}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="multi-select-bar"
    >
      <span className={styles.count} aria-label={`${selectedIds.size} items selected`}>
        {selectedIds.size} items selected
      </span>
      <button
        className={styles.deleteBtn}
        onClick={handleDeleteAll}
        aria-label="Delete all selected items"
        data-testid="delete-selected"
      >
        Delete all
      </button>
      <button className={styles.clearBtn} onClick={clearSelection} aria-label="Clear selection">
        Clear
      </button>
    </div>
  );
}
