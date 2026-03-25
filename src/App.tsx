import { useEffect, useState } from 'react';
import { DrawingCanvas } from './components/Canvas/DrawingCanvas/DrawingCanvas';
import { Toolbar } from './components/Toolbar/Toolbar';
import { TopBar } from './components/Canvas/TopBar/TopBar';
import { PropertiesPanel } from './components/PropertiesPanel/PropertiesPanel';
import { HelpOverlay } from './components/HelpOverlay/HelpOverlay';
import { ScaleBar } from './components/Canvas/ScaleBar/ScaleBar';
import { MultiSelectBar } from './components/Canvas/MultiSelectBar/MultiSelectBar';
import { MobileSelectionBar } from './components/Canvas/MobileSelectionBar/MobileSelectionBar';
import { useFloorplanStore } from './store/useFloorplanStore/useFloorplanStore';
import { decodePlanFromUrl } from './utils/storage/storage';
import styles from './App.module.css';

export default function App() {
  const [showHelp, setShowHelp] = useState(() => {
    if (localStorage.getItem('snapdraft_help_seen')) return false;
    localStorage.setItem('snapdraft_help_seen', '1');
    return true;
  });

  const { plans, createPlan, importPlan, activeId } = useFloorplanStore();

  // Import plan from URL on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get('plan');
    if (planParam) {
      const plan = decodePlanFromUrl(window.location.href);
      if (plan) {
        importPlan(plan);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Create a default plan on first load
  useEffect(() => {
    if (plans.length === 0) {
      createPlan('My First Plan');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut for help
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === '?') setShowHelp((v) => !v);
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
      <ScaleBar />
      <MultiSelectBar />
      <MobileSelectionBar />
      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
    </div>
  );
}
