import { useState, useId } from 'react';
import { useToolStore } from '../../../store/useToolStore/useToolStore';
import { formatDimension, parseDimension, FT_PER_M } from '../../../utils/units/units';
import styles from './FtInInput.module.css';

const MIN_METRIC_FT = 0.001 * FT_PER_M; // 1 mm

type Props = {
  value: number; // in feet
  onChange: (ft: number) => void;
  min?: number;
  label: string;
  testId?: string;
};

export function FtInInput({ value, onChange, min = 0.5, label, testId }: Props) {
  const unit = useToolStore((s) => s.unit);
  const hintId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [prevUnit, setPrevUnit] = useState(unit);

  // Adjust state during render (React-approved pattern) to discard a stale draft
  // when the unit changes, so it is never parsed with the wrong unit system.
  if (prevUnit !== unit) {
    setPrevUnit(unit);
    setDraft(null);
  }

  const displayValue = draft ?? formatDimension(value, unit);

  function commit() {
    if (draft === null) return;
    const parsed = parseDimension(draft, unit);
    const effectiveMin = unit === 'metric' ? Math.min(min, MIN_METRIC_FT) : min;
    if (parsed !== null && parsed >= effectiveMin) {
      onChange(parsed);
    }
    setDraft(null);
  }

  const placeholder = unit === 'metric' ? 'e.g. 3.5 m' : 'e.g. 10\' 6"';
  const hintText =
    unit === 'metric'
      ? 'Accepts: 3.5 m, 350 cm, 3500 mm, 3 m 50 cm'
      : 'Accepts: 10\' 6", 10\'6, 10.5, or 6"';

  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        className={styles.input}
        type="text"
        inputMode="decimal"
        value={displayValue}
        placeholder={placeholder}
        aria-describedby={hintId}
        onFocus={() => setDraft(formatDimension(value, unit))}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
        data-testid={testId}
        autoComplete="off"
      />
      <span id={hintId} className={styles.hint}>
        {hintText}
      </span>
    </label>
  );
}
