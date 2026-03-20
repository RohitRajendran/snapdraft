import { useRef, useState } from 'react';
import { X, Pencil, Plus } from 'lucide-react';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import styles from './FloorplanManager.module.css';

type Props = {
  onClose: () => void;
};

export function FloorplanManager({ onClose }: Props) {
  const { plans, activeId, createPlan, deletePlan, renamePlan, setActivePlan } =
    useFloorplanStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = 'floorplan-manager-title';

  useFocusTrap(panelRef, onClose);

  function handleCreate() {
    createPlan('Untitled Plan');
    onClose();
  }

  function handleSelect(id: string) {
    setActivePlan(id);
    onClose();
  }

  function startRename(id: string, currentName: string) {
    setEditingId(id);
    setEditingName(currentName);
  }

  function commitRename(id: string) {
    if (editingName.trim()) renamePlan(id, editingName.trim());
    setEditingId(null);
  }

  return (
    <div className={styles.backdrop} onClick={onClose} data-testid="floorplan-manager">
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Floor Plans
          </h2>
          <button className={styles.close} onClick={onClose} aria-label="Close floor plans">
            <X size={16} />
          </button>
        </div>

        <ul className={styles.list} role="list">
          {plans.length === 0 && <li className={styles.empty}>No plans yet. Create one below.</li>}
          {plans.map((plan) => (
            <li
              key={plan.id}
              className={`${styles.item} ${plan.id === activeId ? styles.active : ''}`}
            >
              {editingId === plan.id ? (
                <input
                  className={styles.nameInput}
                  value={editingName}
                  autoFocus
                  maxLength={50}
                  aria-label={`Rename plan: ${plan.name}`}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => commitRename(plan.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(plan.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  data-testid={`rename-input-${plan.id}`}
                />
              ) : (
                <button
                  className={styles.name}
                  onClick={() => handleSelect(plan.id)}
                  onDoubleClick={() => startRename(plan.id, plan.name)}
                  aria-label={plan.id === activeId ? `${plan.name} (active)` : plan.name}
                  aria-current={plan.id === activeId ? 'true' : undefined}
                  data-testid={`plan-${plan.id}`}
                >
                  {plan.name}
                </button>
              )}
              <div className={styles.actions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => startRename(plan.id, plan.name)}
                  aria-label={`Rename "${plan.name}"`}
                  title="Rename"
                >
                  <Pencil size={14} />
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => {
                    if (window.confirm(`Delete "${plan.name}"? This cannot be undone.`)) {
                      deletePlan(plan.id);
                    }
                  }}
                  aria-label={`Delete "${plan.name}"`}
                  title="Delete"
                  data-testid={`delete-plan-${plan.id}`}
                >
                  <X size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <button className={styles.createBtn} onClick={handleCreate} data-testid="create-plan">
          <Plus size={16} /> New Floor Plan
        </button>
      </div>
    </div>
  );
}
