import { useEffect } from 'react';
import { MousePointer2, Pencil, Square, Crosshair, Undo2, Redo2, HelpCircle } from 'lucide-react';
import { useToolStore } from '../../store/useToolStore';
import { useFloorplanStore } from '../../store/useFloorplanStore';
import type { ToolType } from '../../types';
import styles from './Toolbar.module.css';

const TOOLS: { type: ToolType; label: string; icon: React.ReactNode; key: string }[] = [
  { type: 'select', label: 'Select', icon: <MousePointer2 />, key: 'S' },
  { type: 'wall', label: 'Wall', icon: <Pencil />, key: 'W' },
  { type: 'box', label: 'Box', icon: <Square />, key: 'B' },
  { type: 'measure', label: 'Measure', icon: <Crosshair />, key: 'M' },
];

type Props = {
  onHelpOpen: () => void;
};

export function Toolbar({ onHelpOpen }: Props) {
  const { activeTool, setActiveTool } = useToolStore();
  const { undo, redo, past, future } = useFloorplanStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 's' || e.key === 'S') setActiveTool('select');
      if (e.key === 'w' || e.key === 'W') setActiveTool('wall');
      if (e.key === 'b' || e.key === 'B') setActiveTool('box');
      if (e.key === 'm' || e.key === 'M') setActiveTool('measure');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setActiveTool]);

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Drawing tools">
      {TOOLS.map((tool) => (
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
        onClick={undo}
        disabled={past.length === 0}
        title="Undo (⌘Z)"
        aria-label="Undo"
        data-testid="tool-undo"
      >
        <span className={styles.icon}>
          <Undo2 />
        </span>
        <span className={styles.label}>Undo</span>
      </button>
      <button
        className={styles.tool}
        onClick={redo}
        disabled={future.length === 0}
        title="Redo (⌘⇧Z)"
        aria-label="Redo"
        data-testid="tool-redo"
      >
        <span className={styles.icon}>
          <Redo2 />
        </span>
        <span className={styles.label}>Redo</span>
      </button>
      <div className={styles.divider} />
      <button
        className={styles.tool}
        onClick={onHelpOpen}
        title="Help (?)"
        aria-label="Open help"
        data-testid="tool-help"
      >
        <span className={styles.icon}>
          <HelpCircle />
        </span>
        <span className={styles.label}>Help</span>
      </button>
    </div>
  );
}
