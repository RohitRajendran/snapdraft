import { useEffect, useState } from 'react';
import { DrawingCanvas } from './components/Canvas/DrawingCanvas/DrawingCanvas';
import { Toolbar } from './components/Toolbar/Toolbar';
import { TopBar } from './components/Canvas/TopBar/TopBar';
import { PropertiesPanel } from './components/PropertiesPanel/PropertiesPanel';
import { HelpOverlay, type HelpTab } from './components/HelpOverlay/HelpOverlay';
import { WhatsNewCard } from './components/WhatsNewCard/WhatsNewCard';
import { ScaleBar } from './components/Canvas/ScaleBar/ScaleBar';
import { MultiSelectBar } from './components/Canvas/MultiSelectBar/MultiSelectBar';
import { MobileSelectionBar } from './components/Canvas/MobileSelectionBar/MobileSelectionBar';
import { useFloorplanStore } from './store/useFloorplanStore/useFloorplanStore';
import { useToolStore } from './store/useToolStore/useToolStore';
import { decodePlanFromUrl } from './utils/storage/storage';
import { createSampleElements } from './utils/samplePlan';
import { markChangelogSeen, readUnseenHighlights } from './utils/changelog/whatsNew';
import styles from './App.module.css';

export default function App() {
  const [showHelp, setShowHelp] = useState(() => {
    if (localStorage.getItem('snapdraft_help_seen')) return false;
    localStorage.setItem('snapdraft_help_seen', '1');
    // Everything is new to a first-time visitor, so only later changes count as news.
    markChangelogSeen();
    return true;
  });
  const [helpTab, setHelpTab] = useState<HelpTab>('help');
  // Runs after the first-visit check above, which it relies on.
  const [highlights, setHighlights] = useState(readUnseenHighlights);

  function acknowledgeUpdates() {
    markChangelogSeen();
    setHighlights([]);
  }

  // The properties panel needs this space, so the card waits until the selection is cleared.
  const hasSelection = useToolStore((s) => s.selectedIds.size > 0);

  const { createPlan, importPlan, activeId } = useFloorplanStore();

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

  // Create a default plan with a sample bedroom on first load.
  // Read from the store directly (not the closure) so StrictMode's double-invoke
  // doesn't create a second plan after the first effect call updates the store.
  useEffect(() => {
    if (useFloorplanStore.getState().plans.length === 0) {
      createPlan('Bedroom', createSampleElements());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut for help
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === '?') {
        setHelpTab('help');
        setShowHelp((v) => !v);
      }
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
      <Toolbar
        onHelpOpen={() => {
          setHelpTab('help');
          setShowHelp(true);
        }}
      />
      <PropertiesPanel />
      <ScaleBar />
      <MultiSelectBar />
      <MobileSelectionBar />
      {highlights.length > 0 && !hasSelection && (
        <WhatsNewCard
          items={highlights}
          onOpen={() => {
            acknowledgeUpdates();
            setHelpTab('updates');
            setShowHelp(true);
          }}
          onDismiss={acknowledgeUpdates}
        />
      )}
      {showHelp && (
        <HelpOverlay
          initialTab={helpTab}
          onClose={() => setShowHelp(false)}
          onUpdatesViewed={acknowledgeUpdates}
        />
      )}
    </div>
  );
}
