import { useState, useEffect, useRef } from 'react';
import { ftToInput, parseFtIn } from '../../utils/geometry';
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
 */
export function FtInInput({ value, onChange, min = 0.5, label, testId }: Props) {
  const [raw, setRaw] = useState(ftToInput(value));
  const [invalid, setInvalid] = useState(false);
  const isFocused = useRef(false);

  // Sync display when value changes externally (but not while editing)
  useEffect(() => {
    if (!isFocused.current) {
      setRaw(ftToInput(value));
      setInvalid(false);
    }
  }, [value]);

  function handleFocus() {
    isFocused.current = true;
  }

  function commit() {
    isFocused.current = false;
    const parsed = parseFtIn(raw);
    if (parsed !== null && parsed >= min) {
      setInvalid(false);
      setRaw(ftToInput(parsed));
      onChange(parsed);
    } else {
      setInvalid(true);
      // Reset to last valid value
      setRaw(ftToInput(value));
      setInvalid(false);
    }
  }

  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        className={`${styles.input} ${invalid ? styles.invalid : ''}`}
        type="text"
        inputMode="decimal"
        value={raw}
        placeholder={`e.g. 10' 6"`}
        onFocus={handleFocus}
        onChange={e => { setRaw(e.target.value); setInvalid(false); }}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        data-testid={testId}
        autoComplete="off"
      />
    </label>
  );
}
