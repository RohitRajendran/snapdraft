import { useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import styles from './HelpOverlay.module.css';

type Props = {
  onClose: () => void;
};

const GETTING_STARTED = [
  { action: 'Draw walls', hint: 'Wall tool — drag or click points.' },
  { action: 'Draw boxes', hint: 'Box tool — drag to create.' },
  { action: 'Select and edit', hint: 'Select tool — tap an item to edit.' },
  { action: 'Measure', hint: 'Measure tool — click two points.' },
];

const ADVANCED_SHORTCUTS = [
  { action: 'Select tool', hint: 'S or tap ↖' },
  { action: 'Wall tool', hint: 'W or tap ✏' },
  { action: 'Box tool', hint: 'B or tap ▭' },
  { action: 'Measure tool', hint: 'M or tap ⌖' },
  { action: 'Exact wall length', hint: "Type 10' or 5'6\" while drawing." },
  { action: 'End wall chain', hint: 'Click last point, double-tap, or Esc.' },
  { action: 'Multi-select', hint: 'Drag a marquee or Shift+click items.' },
  { action: 'Move selected', hint: 'Drag or use arrow keys.' },
  { action: 'Fine nudge', hint: 'Shift + Arrow key.' },
  { action: 'Delete item', hint: 'Backspace or trash button.' },
  { action: 'Undo / Redo', hint: '⌘Z / ⌘⇧Z (Ctrl on Windows).' },
  { action: 'Pan and zoom', hint: 'Two-finger scroll, pinch, or Ctrl + scroll.' },
  { action: 'Fit content', hint: 'F or tap Fit.' },
  { action: 'Wall snap', hint: 'Walls snap by 1"; hold Shift for 1/4".' },
];

const titleId = 'help-overlay-title';

export function HelpOverlay({ onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  useFocusTrap(cardRef, onClose);

  return (
    <div className={styles.backdrop} onClick={onClose} data-testid="help-overlay">
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
            SnapDraft
          </span>
          <button className={styles.close} onClick={onClose} aria-label="Close help">
            ✕
          </button>
        </div>
        <p className={styles.subtitle}>Sketch floor plans right in your browser.</p>
        <dl className={styles.grid}>
          {GETTING_STARTED.map(({ action, hint }) => (
            <div key={action} className={styles.row}>
              <dt className={styles.action}>{action}</dt>
              <dd className={styles.hint}>{hint}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.notice} data-testid="help-save-note">
          Your work is saved automatically in this browser on this device.
        </div>
        <details className={styles.advanced}>
          <summary className={styles.advancedSummary}>Advanced shortcuts and tips</summary>
          <dl className={styles.grid}>
            {ADVANCED_SHORTCUTS.map(({ action, hint }) => (
              <div key={action} className={styles.row}>
                <dt className={styles.action}>{action}</dt>
                <dd className={styles.hint}>{hint}</dd>
              </div>
            ))}
          </dl>
        </details>
        <div className={styles.footer}>
          <button className={styles.startBtn} onClick={onClose}>
            Start drawing
          </button>
          <span className={styles.dismiss}>or tap anywhere to dismiss · ? to reopen</span>
        </div>
      </div>
    </div>
  );
}
