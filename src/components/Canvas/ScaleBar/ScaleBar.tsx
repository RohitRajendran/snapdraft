import { useToolStore } from '../../../store/useToolStore/useToolStore';
import styles from './ScaleBar.module.css';

export function ScaleBar() {
  const unit = useToolStore((s) => s.unit);
  const label = unit === 'metric' ? '1 □ ≈ 0.3 m' : '1 □ = 1 ft';
  const ariaLabel =
    unit === 'metric' ? 'Scale: 1 grid square ≈ 0.3 m' : 'Scale: 1 grid square = 1 ft';

  return (
    <div className={styles.container} data-testid="scale-bar">
      <div role="status" aria-label={ariaLabel} className={styles.scaleLabel}>
        {label}
      </div>
    </div>
  );
}
