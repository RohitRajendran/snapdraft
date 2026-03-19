import styles from './ScaleBar.module.css';

export function ScaleBar() {
  return (
    <div className={styles.container} data-testid="scale-bar">
      <div className={styles.unit}>1 □ = 1 ft</div>
    </div>
  );
}
