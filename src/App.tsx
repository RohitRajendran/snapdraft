import { useEffect, useState } from 'react';
import { DrawingCanvas } from './components/Canvas/DrawingCanvas';
import { Toolbar } from './components/Toolbar/Toolbar';
import { TopBar } from './components/Canvas/TopBar';
import { PropertiesPanel } from './components/PropertiesPanel/PropertiesPanel';
import { HelpOverlay } from './components/HelpOverlay/HelpOverlay';
import { useFloorplanStore } from './store/useFloorplanStore';
import styles from './App.module.css';

export default function App() {
  const [showHelp, setShowHelp] = useState(false);
  const { plans, createPlan, activeId } = useFloorplanStore();

  // Create a default plan on first load
  useEffect(() => {
    if (plans.length === 0) {
      createPlan('My First Plan');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show help on very first visit
  useEffect(() => {
    const seen = localStorage.getItem('snapdraft_help_seen');
    if (!seen) {
      setShowHelp(true);
      localStorage.setItem('snapdraft_help_seen', '1');
    }
  }, []);

  // Keyboard shortcut for help
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === '?') setShowHelp(v => !v);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={styles.app}>
      <TopBar />
      <main className={styles.main}>
        {activeId ? (
          <DrawingCanvas />
        ) : (
          <div className={styles.empty}>
            <p>No floor plan selected.</p>
          </div>
        )}
      </main>
      <Toolbar onHelpOpen={() => setShowHelp(true)} />
      <PropertiesPanel />
      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
    </div>
  );
}
