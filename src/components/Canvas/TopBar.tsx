import { useState } from 'react';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import { FloorplanManager } from '../FloorplanManager/FloorplanManager';
import styles from './TopBar.module.css';

export function TopBar() {
  const { activePlan, renamePlan } = useFloorplanStore();
  const [showManager, setShowManager] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const plan = activePlan();

  function startEdit() {
    if (!plan) return;
    setName(plan.name);
    setEditing(true);
  }

  function commitEdit() {
    if (plan && name.trim()) renamePlan(plan.id, name.trim());
    setEditing(false);
  }

  return (
    <>
      <div className={styles.bar}>
        <button
          className={styles.logo}
          onClick={() => setShowManager(true)}
          data-testid="open-manager"
        >
          SnapDraft
        </button>

        <div className={styles.planName}>
          {editing ? (
            <input
              className={styles.nameInput}
              value={name}
              autoFocus
              onChange={e => setName(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') setEditing(false);
              }}
              data-testid="plan-name-input"
            />
          ) : (
            <button
              className={styles.nameBtn}
              onDoubleClick={startEdit}
              onTouchStart={(e) => {
                // double-tap on touch
                const now = Date.now();
                if (now - (Number(e.currentTarget.dataset.lastTap) || 0) < 300) startEdit();
                e.currentTarget.dataset.lastTap = String(now);
              }}
              title="Double-click to rename"
              data-testid="plan-name"
            >
              {plan?.name ?? 'No plan selected'}
            </button>
          )}
        </div>

        <button
          className={styles.plansBtn}
          onClick={() => setShowManager(true)}
          data-testid="plans-button"
        >
          Plans ▾
        </button>
      </div>

      {showManager && <FloorplanManager onClose={() => setShowManager(false)} />}
    </>
  );
}
