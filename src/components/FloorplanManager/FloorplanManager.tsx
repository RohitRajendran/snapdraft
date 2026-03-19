import { useState } from 'react';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import styles from './FloorplanManager.module.css';

type Props = {
  onClose: () => void;
};

export function FloorplanManager({ onClose }: Props) {
  const { plans, activeId, createPlan, deletePlan, renamePlan, setActivePlan } =
    useFloorplanStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Floor plans"
      data-testid="floorplan-manager"
    >
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Floor Plans</span>
          <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.list}>
          {plans.length === 0 && (
            <p className={styles.empty}>No plans yet. Create one below.</p>
          )}
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`${styles.item} ${plan.id === activeId ? styles.active : ''}`}
            >
              {editingId === plan.id ? (
                <input
                  className={styles.nameInput}
                  value={editingName}
                  autoFocus
                  onChange={e => setEditingName(e.target.value)}
                  onBlur={() => commitRename(plan.id)}
                  onKeyDown={e => {
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
                  data-testid={`plan-${plan.id}`}
                >
                  {plan.name}
                </button>
              )}
              <div className={styles.actions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => startRename(plan.id, plan.name)}
                  aria-label="Rename"
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => deletePlan(plan.id)}
                  aria-label="Delete"
                  title="Delete"
                  data-testid={`delete-plan-${plan.id}`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <button className={styles.createBtn} onClick={handleCreate} data-testid="create-plan">
          + New Floor Plan
        </button>
      </div>
    </div>
  );
}
