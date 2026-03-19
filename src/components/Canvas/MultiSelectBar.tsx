import { useToolStore } from '../../store/useToolStore';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import styles from './MultiSelectBar.module.css';

export function MultiSelectBar() {
  const { selectedIds, clearSelection } = useToolStore();
  const { deleteElement } = useFloorplanStore();

  if (selectedIds.size < 2) return null;

  function handleDeleteAll() {
    selectedIds.forEach(id => deleteElement(id));
    clearSelection();
  }

  return (
    <div className={styles.bar} data-testid="multi-select-bar">
      <span className={styles.count}>{selectedIds.size} items selected</span>
      <button className={styles.deleteBtn} onClick={handleDeleteAll} data-testid="delete-selected">
        Delete all
      </button>
      <button className={styles.clearBtn} onClick={clearSelection}>
        Clear
      </button>
    </div>
  );
}
