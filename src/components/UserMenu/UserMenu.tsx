import { useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore/useAuthStore';
import styles from './UserMenu.module.css';

function initials(email: string): string {
  const parts = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const email = user.email ?? '';
  const label = initials(email);

  function handleSignOut() {
    setOpen(false);
    signOut();
  }

  return (
    <div ref={containerRef} className={styles.container} data-testid="user-menu">
      <button
        className={styles.avatar}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Account: ${email}`}
        aria-expanded={open}
        aria-haspopup="true"
        data-testid="user-avatar"
      >
        {label}
      </button>

      {open && (
        <>
          {/* Dismiss on outside click */}
          <div className={styles.scrim} onClick={() => setOpen(false)} />
          <div className={styles.menu} role="menu" data-testid="user-menu-dropdown">
            <div className={styles.emailRow} title={email}>
              {email}
            </div>
            <button
              className={styles.menuItem}
              role="menuitem"
              onClick={handleSignOut}
              data-testid="sign-out-btn"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
