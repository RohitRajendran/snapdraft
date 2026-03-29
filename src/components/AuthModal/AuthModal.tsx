import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap/useFocusTrap';
import { useAuthStore } from '../../store/useAuthStore/useAuthStore';
import styles from './AuthModal.module.css';

type Mode = 'signin' | 'signup';

type Props = {
  onClose: () => void;
};

const titleId = 'auth-modal-title';

export function AuthModal({ onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { signIn, signUp, clearError } = useAuthStore();

  useFocusTrap(cardRef, onClose);

  function switchMode(next: Mode) {
    clearError();
    setMode(next);
    setEmail('');
    setPassword('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    clearError();
    if (mode === 'signin') {
      await signIn(email, password);
      // If sign-in succeeded, the auth store's onAuthStateChange will update
      // the user. We close the modal only on success (no error set).
      if (!useAuthStore.getState().error) {
        onClose();
      }
    } else {
      await signUp(email, password);
      // After sign-up the error field holds the confirmation message.
    }
    setSubmitting(false);
  }

  const isSignup = mode === 'signup';
  const statusMsg = useAuthStore((s) => s.error);

  return (
    <div className={styles.backdrop} onClick={onClose} data-testid="auth-modal">
      <div
        ref={cardRef}
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span id={titleId} className={styles.title}>
            {isSignup ? 'Create Account' : 'Sign In'}
          </span>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <p className={styles.subtitle}>
          {isSignup
            ? 'Sync your plans across devices and collaborate with others.'
            : 'Sign in to sync your plans across devices.'}
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.label} htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className={styles.input}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="auth-email"
          />

          <label className={styles.label} htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            className={styles.input}
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="auth-password"
          />

          {statusMsg && (
            <p
              className={
                statusMsg.startsWith('Check')
                  ? styles.infoMsg
                  : styles.errorMsg
              }
              role="alert"
              data-testid="auth-status"
            >
              {statusMsg}
            </p>
          )}

          <button
            className={styles.submitBtn}
            type="submit"
            disabled={submitting}
            data-testid="auth-submit"
          >
            {submitting
              ? isSignup
                ? 'Creating account…'
                : 'Signing in…'
              : isSignup
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <div className={styles.switchRow}>
          {isSignup ? (
            <>
              Already have an account?{' '}
              <button className={styles.switchBtn} onClick={() => switchMode('signin')}>
                Sign in
              </button>
            </>
          ) : (
            <>
              No account yet?{' '}
              <button className={styles.switchBtn} onClick={() => switchMode('signup')}>
                Create one
              </button>
            </>
          )}
        </div>

        <div className={styles.guestRow}>
          <button className={styles.guestBtn} onClick={onClose} data-testid="auth-guest">
            Continue without signing in
          </button>
        </div>
      </div>
    </div>
  );
}
