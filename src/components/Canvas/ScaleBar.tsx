import { useToolStore } from '../../store/useToolStore';
import { PIXELS_PER_FOOT } from '../../utils/geometry';
import styles from './ScaleBar.module.css';

// Show a scale bar representing a round number of feet
function niceLength(zoom: number): number {
  const feetPerBar = 80 / (zoom * PIXELS_PER_FOOT); // aim for ~80px wide bar
  const candidates = [0.5, 1, 2, 5, 10, 20, 50, 100];
  return candidates.find(c => c >= feetPerBar) ?? 100;
}

export function ScaleBar() {
  const { zoom } = useToolStore();
  const feet = niceLength(zoom);
  const barPx = feet * PIXELS_PER_FOOT * zoom;

  return (
    <div className={styles.container} data-testid="scale-bar">
      <div className={styles.label}>
        {feet === 0.5 ? `6"` : `${feet} ft`}
      </div>
      <div className={styles.bar} style={{ width: barPx }} />
      <div className={styles.unit}>1 □ = 1 ft</div>
    </div>
  );
}
