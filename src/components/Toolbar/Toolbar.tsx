import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MousePointer2,
  Hand,
  BrickWall,
  Blinds,
  RectangleHorizontal,
  RulerDimensionLine,
  Undo2,
  Redo2,
  HelpCircle,
  DoorOpen,
} from 'lucide-react';
import { useToolStore } from '../../store/useToolStore/useToolStore';
import { useFloorplanStore } from '../../store/useFloorplanStore/useFloorplanStore';
import { shouldUseMobileOverlayLayout } from '../Canvas/layout';
import type { ToolType } from '../../types';
import styles from './Toolbar.module.css';

const TOOLS: { type: ToolType; label: string; icon: React.ReactNode; key: string }[] = [
  { type: 'box', label: 'Box', icon: <RectangleHorizontal />, key: 'B' },
  { type: 'measure', label: 'Measure', icon: <RulerDimensionLine />, key: 'M' },
];

const WALL_GROUP_TOOLS: { type: ToolType; label: string; icon: React.ReactNode; key: string }[] = [
  { type: 'wall', label: 'Wall', icon: <BrickWall />, key: 'W' },
  { type: 'door', label: 'Door', icon: <DoorOpen />, key: 'D' },
  { type: 'window', label: 'Window', icon: <Blinds />, key: 'N' },
];

function useDropdown(activeTool: ToolType) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close immediately when the active tool changes via keyboard shortcut.
  const [prevActiveTool, setPrevActiveTool] = useState(activeTool);
  if (prevActiveTool !== activeTool) {
    setPrevActiveTool(activeTool);
    setIsOpen(false);
    setIsClosing(false);
  }

  function openDropdown() {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        setDropdownStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 8,
          left: rect.left,
          transformOrigin: 'bottom left',
        });
      } else {
        setDropdownStyle({
          position: 'fixed',
          top: rect.top,
          left: rect.right + 8,
          transformOrigin: 'top left',
        });
      }
    }
    setIsOpen(true);
    setIsClosing(false);
  }

  const closeDropdown = useCallback(
    function (immediate = false) {
      if (immediate || !isOpen) {
        setIsOpen(false);
        setIsClosing(false);
      } else {
        setIsClosing(true);
      }
    },
    [isOpen],
  );

  function handleAnimationEnd() {
    if (isClosing) {
      setIsOpen(false);
      setIsClosing(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    function handleDown(e: MouseEvent) {
      const inWrapper = wrapperRef.current?.contains(e.target as Node) ?? false;
      const inDropdown = dropdownRef.current?.contains(e.target as Node) ?? false;
      if (!inWrapper && !inDropdown) closeDropdown();
    }
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [isOpen, closeDropdown]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDropdown();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, closeDropdown]);

  return {
    isOpen,
    isClosing,
    dropdownStyle,
    wrapperRef,
    dropdownRef,
    openDropdown,
    closeDropdown,
    handleAnimationEnd,
  };
}

function SelectPanGroup({
  activeTool,
  setActiveTool,
}: {
  activeTool: ToolType;
  setActiveTool: (t: ToolType) => void;
}) {
  const {
    isOpen,
    isClosing,
    dropdownStyle,
    wrapperRef,
    dropdownRef,
    openDropdown,
    closeDropdown,
    handleAnimationEnd,
  } = useDropdown(activeTool);

  const isGroupActive = activeTool === 'select' || activeTool === 'pan';
  const currentTool = activeTool === 'pan' ? 'pan' : 'select';
  const icon = currentTool === 'pan' ? <Hand /> : <MousePointer2 />;
  const label = currentTool === 'pan' ? 'Hand' : 'Select';

  return (
    <div className={styles.selectPanWrapper} ref={wrapperRef}>
      <button
        className={`${styles.selectPanMain} ${isGroupActive ? styles.active : ''}`}
        onClick={() => setActiveTool(currentTool)}
        title={currentTool === 'pan' ? 'Hand (H)' : 'Select (V)'}
        aria-pressed={isGroupActive}
        data-testid="tool-select-pan"
      >
        <span className={styles.icon}>{icon}</span>
      </button>
      <button
        className={`${styles.selectPanFooter} ${isGroupActive ? styles.active : ''}`}
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        aria-label="Switch between Select and Hand"
        aria-haspopup="true"
        aria-expanded={isOpen}
        data-testid="tool-select-pan-toggle"
      >
        <span className={styles.selectPanFooterLabel}>{label}</span>
        <span className={styles.selectPanChevron} aria-hidden>
          ▾
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`${styles.selectPanDropdown} ${isClosing ? styles.selectPanDropdownClosing : ''}`}
            style={dropdownStyle}
            role="menu"
            onAnimationEnd={handleAnimationEnd}
          >
            <button
              className={`${styles.selectPanOption} ${activeTool === 'select' ? styles.optionActive : ''}`}
              role="menuitem"
              onClick={() => {
                setActiveTool('select');
                closeDropdown(true);
              }}
              data-testid="tool-select"
            >
              <span className={styles.optionIcon}>
                <MousePointer2 size={15} />
              </span>
              <span className={styles.optionLabel}>Select</span>
              <kbd className={styles.optionKey}>V</kbd>
            </button>
            <button
              className={`${styles.selectPanOption} ${activeTool === 'pan' ? styles.optionActive : ''}`}
              role="menuitem"
              onClick={() => {
                setActiveTool('pan');
                closeDropdown(true);
              }}
              data-testid="tool-pan"
            >
              <span className={styles.optionIcon}>
                <Hand size={15} />
              </span>
              <span className={styles.optionLabel}>Hand</span>
              <kbd className={styles.optionKey}>H</kbd>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

function WallDoorWindowGroup({
  activeTool,
  setActiveTool,
}: {
  activeTool: ToolType;
  setActiveTool: (t: ToolType) => void;
}) {
  const {
    isOpen,
    isClosing,
    dropdownStyle,
    wrapperRef,
    dropdownRef,
    openDropdown,
    closeDropdown,
    handleAnimationEnd,
  } = useDropdown(activeTool);

  const isGroupActive = activeTool === 'wall' || activeTool === 'door' || activeTool === 'window';
  const currentEntry = WALL_GROUP_TOOLS.find((t) => t.type === activeTool) ?? WALL_GROUP_TOOLS[0];

  return (
    <div className={styles.selectPanWrapper} ref={wrapperRef}>
      <button
        className={`${styles.selectPanMain} ${isGroupActive ? styles.active : ''}`}
        onClick={() => setActiveTool(currentEntry.type)}
        title={`${currentEntry.label} (${currentEntry.key})`}
        aria-pressed={isGroupActive}
        data-testid="tool-wall-group"
        data-active-tool={currentEntry.type}
      >
        <span className={styles.icon}>{currentEntry.icon}</span>
      </button>
      <button
        className={`${styles.selectPanFooter} ${isGroupActive ? styles.active : ''}`}
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        aria-label="Switch between Wall, Door and Window"
        aria-haspopup="true"
        aria-expanded={isOpen}
        data-testid="tool-wall-group-toggle"
      >
        <span className={styles.selectPanFooterLabel}>{currentEntry.label}</span>
        <span className={styles.selectPanChevron} aria-hidden>
          ▾
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`${styles.selectPanDropdown} ${isClosing ? styles.selectPanDropdownClosing : ''}`}
            style={dropdownStyle}
            role="menu"
            onAnimationEnd={handleAnimationEnd}
          >
            {WALL_GROUP_TOOLS.map((tool) => (
              <button
                key={tool.type}
                className={`${styles.selectPanOption} ${activeTool === tool.type ? styles.optionActive : ''}`}
                role="menuitem"
                onClick={() => {
                  setActiveTool(tool.type);
                  closeDropdown(true);
                }}
                data-testid={`tool-${tool.type}`}
              >
                <span className={styles.optionIcon}>{tool.icon}</span>
                <span className={styles.optionLabel}>{tool.label}</span>
                <kbd className={styles.optionKey}>{tool.key}</kbd>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

type Props = {
  onHelpOpen: () => void;
};

export function Toolbar({ onHelpOpen }: Props) {
  const { activeTool, setActiveTool, selectedIds } = useToolStore();
  const { undo, redo, past, future } = useFloorplanStore();

  const selectionBarVisible =
    shouldUseMobileOverlayLayout(window.innerWidth) && selectedIds.size === 1;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 's' || e.key === 'S' || e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'h' || e.key === 'H') setActiveTool('pan');
      if (e.key === 'w' || e.key === 'W') setActiveTool('wall');
      if (e.key === 'b' || e.key === 'B') setActiveTool('box');
      if (e.key === 'm' || e.key === 'M') setActiveTool('measure');
      if (e.key === 'd' || e.key === 'D') setActiveTool('door');
      if (e.key === 'n' || e.key === 'N') setActiveTool('window');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setActiveTool]);

  return (
    <div
      className={styles.toolbar}
      role="toolbar"
      aria-label="Drawing tools"
      data-testid="drawing-toolbar"
      style={selectionBarVisible ? { display: 'none' } : undefined}
    >
      <SelectPanGroup activeTool={activeTool} setActiveTool={setActiveTool} />
      <WallDoorWindowGroup activeTool={activeTool} setActiveTool={setActiveTool} />
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
