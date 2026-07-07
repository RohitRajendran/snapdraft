import { useRef } from 'react';
import { Palette, Pencil } from 'lucide-react';
import { BOX_COLOR_PRESETS, isPresetColor } from '../../../utils/colors/colors';
import styles from './ColorPicker.module.css';

const CUSTOM_SEED_COLOR = '#888888';

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  const isCustom = !isPresetColor(value);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.row} role="group" aria-label="Box color">
      {BOX_COLOR_PRESETS.map((preset, i) => (
        <button
          key={preset}
          type="button"
          className={`${styles.swatch} ${value === preset ? styles.swatchSelected : ''}`}
          style={{ backgroundColor: preset }}
          aria-label={`Color preset ${i + 1}`}
          aria-pressed={value === preset}
          onClick={() => onChange(preset)}
          data-testid={`box-color-swatch-${i}`}
        />
      ))}

      <button
        type="button"
        className={`${styles.swatch} ${styles.customSwatch} ${isCustom ? styles.swatchSelected : ''}`}
        style={isCustom ? { backgroundColor: value } : undefined}
        title="Custom color — click to change"
        aria-label="Custom color — click to change"
        aria-pressed={isCustom}
        onClick={() => inputRef.current?.click()}
        data-testid="box-color-custom"
      >
        {!isCustom && <Palette size={14} className={styles.glyph} aria-hidden="true" />}
        <Pencil
          size={9}
          className={styles.pencilBadge}
          aria-hidden="true"
          data-testid="box-color-pencil-badge"
        />
      </button>

      <input
        ref={inputRef}
        type="color"
        className={styles.hiddenInput}
        value={isCustom ? value : CUSTOM_SEED_COLOR}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        data-testid="box-color-custom-input"
      />
    </div>
  );
}
