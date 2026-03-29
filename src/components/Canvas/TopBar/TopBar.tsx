import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useFloorplanStore } from '../../../store/useFloorplanStore/useFloorplanStore';
import { useAuthStore } from '../../../store/useAuthStore/useAuthStore';
import { isSyncEnabled } from '../../../lib/supabase';
import { FloorplanManager } from '../../FloorplanManager/FloorplanManager';
import { AuthModal } from '../../AuthModal/AuthModal';
import { UserMenu } from '../../UserMenu/UserMenu';
import styles from './TopBar.module.css';

export function TopBar() {
  const { activePlan, renamePlan } = useFloorplanStore();
  const user = useAuthStore((s) => s.user);
  const [showManager, setShowManager] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const lastTapRef = useRef(0);

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
          aria-label="SnapDraft — open floor plans"
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
              aria-label="Plan name"
              onChange={(e) => setName(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') setEditing(false);
              }}
              data-testid="plan-name-input"
            />
          ) : (
            <button
              className={styles.nameBtn}
              onDoubleClick={startEdit}
              onTouchStart={() => {
                const now = Date.now();
                if (now - lastTapRef.current < 300) startEdit();
                lastTapRef.current = now;
              }}
              title="Double-click to rename"
              aria-label={`Current plan: ${plan?.name ?? 'No plan selected'}. Double-click to rename.`}
              data-testid="plan-name-btn"
            >
              {plan?.name ?? 'No plan selected'}
            </button>
          )}
        </div>

        <button
          className={styles.plansBtn}
          onClick={() => setShowManager(true)}
          aria-label="Manage floor plans"
          data-testid="plans-button"
        >
          Plans <ChevronDown size={14} />
        </button>

        {isSyncEnabled && (
          user ? (
            <UserMenu />
          ) : (
            <button
              className={styles.signInBtn}
              onClick={() => setShowAuth(true)}
              aria-label="Sign in to sync plans"
              data-testid="sign-in-btn"
            >
              Sign in
            </button>
          )
        )}
      </div>

      {showManager && <FloorplanManager onClose={() => setShowManager(false)} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
