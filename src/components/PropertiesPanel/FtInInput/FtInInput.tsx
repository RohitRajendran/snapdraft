import { useState, useId } from 'react';
import { formatFeet, parseFtIn } from '../../../utils/geometry/geometry';
import styles from './FtInInput.module.css';

type Props = {
  value: number; // in feet
  onChange: (ft: number) => void;
  min?: number;
  label: string;
  testId?: string;
};

/**
 * An input that displays and accepts feet/inches notation.
 * Shows e.g. "5' 6"" and accepts: 5'6", 5'6, 5 6, 6", 5.5, etc.
 * Uses a draft pattern: shows the prop value when not focused,
 * and the user's typed value while focused.
 */
export function FtInInput({ value, onChange, min = 0.5, label, testId }: Props) {
  const hintId = useId();
  const [draft, setDraft] = useState<string | null>(null);

  const displayValue = draft ?? formatFeet(value);

  function commit() {
    if (draft === null) return;
    const parsed = parseFtIn(draft);
    if (parsed !== null && parsed >= min) {
      onChange(parsed);
    }
    setDraft(null);
  }

  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        className={styles.input}
        type="text"
        inputMode="decimal"
        value={displayValue}
        placeholder={`e.g. 10' 6"`}
        aria-describedby={hintId}
        onFocus={() => setDraft(formatFeet(value))}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
        data-testid={testId}
        autoComplete="off"
      />
      <span id={hintId} className={styles.hint}>
        Accepts: 10&apos; 6&quot;, 10&apos;6, 10.5, or 6&quot;
      </span>
    </label>
  );
}
