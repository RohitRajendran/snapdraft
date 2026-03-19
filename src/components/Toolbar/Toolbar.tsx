import { useEffect } from 'react';
import { useToolStore } from '../../store/useToolStore';
import type { ToolType } from '../../types';
import styles from './Toolbar.module.css';

const TOOLS: { type: ToolType; label: string; icon: string; key: string }[] = [
  { type: 'select', label: 'Select', icon: '↖', key: 'S' },
  { type: 'wall', label: 'Wall', icon: '✏', key: 'W' },
  { type: 'box', label: 'Box', icon: '▭', key: 'B' },
];

type Props = {
  onHelpOpen: () => void;
};

export function Toolbar({ onHelpOpen }: Props) {
  const { activeTool, setActiveTool } = useToolStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 's' || e.key === 'S') setActiveTool('select');
      if (e.key === 'w' || e.key === 'W') setActiveTool('wall');
      if (e.key === 'b' || e.key === 'B') setActiveTool('box');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setActiveTool]);

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Drawing tools">
      {TOOLS.map(tool => (
        <button
          key={tool.type}
          className={`${styles.tool} ${activeTool === tool.type ? styles.active : ''}`}
          onClick={() => setActiveTool(tool.type)}
          title={`${tool.label} (${tool.key})`}
          aria-pressed={activeTool === tool.type}
          data-testid={`tool-${tool.type}`}
        >
          <span className={styles.icon}>{tool.icon}</span>
          <span className={styles.label}>{tool.label}</span>
        </button>
      ))}
      <div className={styles.divider} />
      <button
        className={styles.tool}
        onClick={onHelpOpen}
        title="Help (?)"
        aria-label="Open help"
        data-testid="tool-help"
      >
        <span className={styles.icon}>?</span>
      </button>
    </div>
  );
}
