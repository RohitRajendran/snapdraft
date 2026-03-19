import styles from './HelpOverlay.module.css';

type Props = {
  onClose: () => void;
};

const SHORTCUTS = [
  { action: 'Select tool', hint: 'S  or tap ↖' },
  { action: 'Wall tool', hint: 'W  or tap ✏' },
  { action: 'Box tool', hint: 'B  or tap ▭' },
  { action: 'Draw wall', hint: 'Drag or click points' },
  { action: 'Continue chain', hint: 'Keep drawing from endpoint' },
  { action: 'End chain', hint: 'Double-tap / Esc' },
  { action: 'Draw box', hint: 'Drag to create' },
  { action: 'Move item', hint: 'Select → drag' },
  { action: 'Delete item', hint: 'Select → Backspace / trash' },
  { action: 'Pan canvas', hint: 'Two-finger drag' },
  { action: 'Zoom', hint: 'Pinch or scroll' },
  { action: 'Half-foot snap', hint: 'Hold Shift while drawing' },
];

export function HelpOverlay({ onClose }: Props) {
  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Help"
      data-testid="help-overlay"
    >
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>SnapDraft</span>
          <button className={styles.close} onClick={onClose} aria-label="Close help">✕</button>
        </div>
        <div className={styles.grid}>
          {SHORTCUTS.map(({ action, hint }) => (
            <div key={action} className={styles.row}>
              <span className={styles.action}>{action}</span>
              <span className={styles.hint}>{hint}</span>
            </div>
          ))}
        </div>
        <p className={styles.footer}>Tap anywhere to dismiss</p>
      </div>
    </div>
  );
}
