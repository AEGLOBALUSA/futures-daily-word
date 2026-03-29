import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { ScriptureSelectionProvider, useScriptureSelection } from './contexts/ScriptureSelectionContext';
import { TabBar } from './components/TabBar';
import { EmailGate } from './components/EmailGate';
import { BibleAI } from './components/BibleAI';
import { PathwayPicker } from './components/PathwayPicker';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { TabId } from './components/TabBar';
import type { Persona } from './utils/persona-config';
import { isSundayWindow, isSundayDeepLink, activateSundayGuest, isSundayGuest } from './utils/sunday';
import { hideSplash, registerNativePush, isNative } from './utils/native';
import { track } from './utils/analytics';

// ── Lazy-loaded screens — only downloaded when the user navigates to them ──
const HomeScreen = lazy(() => import('./screens/HomeScreen').then(m => ({ default: m.HomeScreen })));
const JournalScreen = lazy(() => import('./screens/JournalScreen').then(m => ({ default: m.JournalScreen })));
const MessagesScreen = lazy(() => import('./screens/MessagesScreen').then(m => ({ default: m.MessagesScreen })));
const PlansScreen = lazy(() => import('./screens/PlansScreen').then(m => ({ default: m.PlansScreen })));
const MoreScreen = lazy(() => import('./screens/MoreScreen').then(m => ({ default: m.MoreScreen })));
const SermonNotesScreen = lazy(() => import('./screens/SermonNotesScreen').then(m => ({ default: m.SermonNotesScreen })));

/** Minimal loading spinner shown while a screen chunk downloads */
function ScreenLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', fontFamily: 'var(--font-sans)', color: 'var(--dw-text-muted)',
      fontSize: 14,
    }}>
      Loading…
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const tabHistoryRef = useRef<TabId[]>(['home']);
  const [showBibleAI, setShowBibleAI] = useState(false);

  // Track tab navigation history
  const navigateTab = (tab: TabId) => {
    const h = tabHistoryRef.current;
    // Don't push duplicate if already on this tab
    if (h[h.length - 1] !== tab) {
      h.push(tab);
      if (h.length > 20) h.splice(0, h.length - 20);
    }
    setActiveTab(tab);
  };

  // Go back to previous tab
  const goBack = () => {
    const h = tabHistoryRef.current;
    if (h.length > 1) {
      h.pop(); // remove current
      setActiveTab(h[h.length - 1]);
    }
  };
  const { userProfile, setup, saveSetup } = useUser();
  const { selection } = useScriptureSelection();

  // Track app open — intentionally fires once on mount with initial persona
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    track('app_open', setup?.persona || 'none');
  }, []);

  // Deep link: ?sermon=1 or ?sunday=1 → go straight to sermon notes tab
  const [sermonDeepLink, setSermonDeepLink] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isSermonLink = params.get('sermon') === '1';
    if (isSundayDeepLink()) {
      activateSundayGuest();
      setSermonDeepLink(true);
      setTimeout(() => setActiveTab('journal'), 100);
    } else if (isSermonLink) {
      setSermonDeepLink(true);
      // Clean up URL param
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('sermon');
        window.history.replaceState({}, '', url.toString());
      } catch { /* ignore */ }
      setTimeout(() => setActiveTab('journal'), 100);
    }
  }, []);

  const sundayGuest = isSundayGuest();

  // Show PathwayPicker only on first run (no persona selected yet)
  // Once a persona is chosen, never show again automatically
  // Users can still change persona from the More/Settings screen
  const [showPathway, setShowPathway] = useState(() => {
    if (sundayGuest || isSundayWindow()) return false; // no gate during service
    const v7Done = localStorage.getItem('dw_v7_pathway_done');
    if (!setup?.persona || !v7Done) return true;
    return false;
  });

  function handlePathwaySelect(persona: Persona) {
    saveSetup({ persona, source: setup?.source || '' });
    localStorage.setItem('dw_v7_pathway_done', 'true');
    setShowPathway(false);
  }

  useEffect(() => {
    hideSplash();
    if (isNative() && userProfile?.email) {
      registerNativePush((token) => {
        fetch('/api/subscribe-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userProfile.email,
            nativeToken: token,
            platform: (window as unknown as Record<string, unknown>).Capacitor,
          }),
        }).catch(() => {});
      });
    }
  }, [userProfile?.email]);

  // Auto-open AI when Go Deeper is triggered from a selection
  useEffect(() => {
    if (selection?.text && selection.source === 'range') {
      setShowBibleAI(true);
    }
  }, [selection?.text, selection?.source]);

  const screens: Record<TabId, ReactNode> = {
    home: <HomeScreen onNavigate={navigateTab} onOpenAI={() => setShowBibleAI(true)} onBack={tabHistoryRef.current.length > 1 ? goBack : undefined} />,
    journal: <JournalScreen onBack={goBack} initialTab={sermonDeepLink ? 'sermon' : undefined} />,
    messages: <MessagesScreen onBack={goBack} />,
    plans: <PlansScreen onBack={goBack} />,
    more: <MoreScreen onBack={goBack} />,
    'sermon-notes': <SermonNotesScreen onBack={goBack} />,
  };

  // Full-screen pathway picker — renders INSTEAD of app when needed
  if (showPathway) {
    return <PathwayPicker onSelect={handlePathwaySelect} currentPersona={setup?.persona} />;
  }

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', background: 'var(--dw-canvas)' }}>
      <ErrorBoundary label={activeTab}>
        <Suspense fallback={<ScreenLoader />}>
          {screens[activeTab]}
        </Suspense>
      </ErrorBoundary>
      <TabBar activeTab={activeTab} onTabChange={navigateTab} />
      {!sundayGuest && <EmailGate />}
      <BibleAI
        isOpen={showBibleAI}
        onClose={() => setShowBibleAI(false)}
        onOpen={() => setShowBibleAI(true)}
        selectedText={selection?.text}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary label="App">
      <ThemeProvider>
        <UserProvider>
          <ScriptureSelectionProvider>
            <AppContent />
          </ScriptureSelectionProvider>
        </UserProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
