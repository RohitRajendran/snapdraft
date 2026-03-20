import styles from './ScaleBar.module.css';

export function ScaleBar() {
  return (
    <div
      className={styles.container}
      role="status"
      aria-label="Scale: 1 grid square equals 1 foot"
      data-testid="scale-bar"
    >
      <div className={styles.unit}>1 □ = 1 ft</div>
    </div>
  );
}
