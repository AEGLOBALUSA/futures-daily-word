import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { ScriptureSelectionProvider, useScriptureSelection } from './contexts/ScriptureSelectionContext';
import { TabBar } from './components/TabBar';
import { EmailGate } from './components/EmailGate';
import { BibleAI } from './components/BibleAI';
import { PathwayPicker } from './components/PathwayPicker';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CookieConsent } from './components/CookieConsent';
import type { TabId } from './components/TabBar';
import type { Persona } from './utils/persona-config';
import { isSundayWindow, activateSundayGuest, isSundayGuest } from './utils/sunday';
import { hideSplash, registerNativePush, isNative } from './utils/native';
import { API_BASE } from './utils/api-base';
import { track } from './utils/analytics';

// ── Pre-render deep link setup — must run before any React component initializes ──
const SERMON_DEEP_LINK = (() => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sermon') === '1' || params.get('sunday') === '1') {
      activateSundayGuest(); // sets persona + pathway in localStorage synchronously
      // Also set skip flag so EmailGate never triggers for this session
      localStorage.setItem('dw_email_gate_skipped', 'sermon');
      const url = new URL(window.location.href);
      url.searchParams.delete('sermon');
      url.searchParams.delete('sunday');
      window.history.replaceState({}, '', url.toString());
      return true;
    }
  } catch { /* ignore */ }
  return false;
})();

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

/** Live region for screen reader announcements of audio state changes */
function AudioAnnouncer() {
  const [msg, setMsg] = useState('');
  const announce = useCallback((text: string) => {
    setMsg(''); // clear first so repeated announcements are detected
    requestAnimationFrame(() => setMsg(text));
  }, []);
  useEffect(() => {
    // Dynamic import to avoid pulling audioPlayer into initial bundle
    import('./utils/audioPlayer').then(AP => {
      return AP.onStateChange((st: string, passage?: string) => {
        if (st === 'playing') announce(`Now playing ${passage || 'audio'}`);
        else if (st === 'paused') announce('Audio paused');
        else if (st === 'idle' && passage) announce('Audio stopped');
      });
    });
  }, [announce]);
  return <div role="status" aria-live="polite" className="sr-only">{msg}</div>;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>(SERMON_DEEP_LINK ? 'sermon-notes' : 'home');
  const tabHistoryRef = useRef<TabId[]>([SERMON_DEEP_LINK ? 'sermon-notes' : 'home']);
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

  const sundayGuest = isSundayGuest();

  // Scripture-first onboarding: the persona picker is NO LONGER a full-screen tollgate.
  // On first run we default to "congregation" so the user lands on content immediately,
  // and surface the picker as an opt-in "Personalize" prompt they can take or dismiss.
  const onboardingActive = !sundayGuest && !SERMON_DEEP_LINK && !isSundayWindow();
  const [showPicker, setShowPicker] = useState(false);
  const [showPersonalizeBanner, setShowPersonalizeBanner] = useState(
    () => onboardingActive && !localStorage.getItem('dw_v7_pathway_done')
  );

  // Default an un-chosen persona to "congregation" so content renders without a gate.
  useEffect(() => {
    if (onboardingActive && !setup?.persona) {
      saveSetup({ persona: 'congregation', source: 'default' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePathwaySelect(persona: Persona) {
    saveSetup({ persona, source: 'onboarding' });
    localStorage.setItem('dw_v7_pathway_done', 'true');
    setShowPicker(false);
    setShowPersonalizeBanner(false);
  }

  function dismissPersonalize() {
    localStorage.setItem('dw_v7_pathway_done', 'true');
    setShowPersonalizeBanner(false);
  }

  useEffect(() => {
    hideSplash();
    if (isNative() && userProfile?.email) {
      registerNativePush((token) => {
        fetch(`${API_BASE}/api/subscribe-push`, {
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
    journal: <JournalScreen onBack={goBack} initialTab={SERMON_DEEP_LINK ? 'sermon' : undefined} />,
    messages: <MessagesScreen onBack={goBack} />,
    plans: <PlansScreen onBack={goBack} />,
    more: <MoreScreen onBack={goBack} />,
    'sermon-notes': <SermonNotesScreen onBack={() => navigateTab('home')} />,
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', background: 'var(--dw-canvas)' }}>
      {/* Skip navigation link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="skip-nav"
        style={{
          position: 'absolute', top: -100, left: 8, zIndex: 10000,
          padding: '8px 16px', borderRadius: 8,
          background: 'var(--dw-accent, #E84858)', color: '#fff',
          fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
          textDecoration: 'none', transition: 'top 0.2s',
        }}
        onFocus={(e) => { e.currentTarget.style.top = '8px'; }}
        onBlur={(e) => { e.currentTarget.style.top = '-100px'; }}
      >
        Skip to content
      </a>
      <ErrorBoundary label={activeTab}>
        <Suspense fallback={<ScreenLoader />}>
          <main id="main-content" style={{ display: 'contents' }}>
            {screens[activeTab]}
          </main>
        </Suspense>
      </ErrorBoundary>
      <TabBar activeTab={activeTab} onTabChange={navigateTab} />
      {!sundayGuest && !SERMON_DEEP_LINK && <EmailGate />}
      <BibleAI
        isOpen={showBibleAI}
        onClose={() => setShowBibleAI(false)}
        onOpen={() => setShowBibleAI(true)}
        selectedText={selection?.text}
      />
      <CookieConsent />
      <AudioAnnouncer />

      {/* Opt-in persona picker — surfaced from the Personalize prompt, not a first-run gate */}
      {showPicker && (
        <PathwayPicker onSelect={handlePathwaySelect} currentPersona={setup?.persona || 'congregation'} />
      )}

      {/* Non-blocking "Personalize" prompt — replaces the old full-screen tollgate */}
      {showPersonalizeBanner && !showPicker && (
        <div style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)',
          bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
          width: 'min(440px, calc(100% - 24px))',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px 10px 16px',
          background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
          borderRadius: 14, boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
          zIndex: 900, fontFamily: 'var(--font-sans)',
        }}>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--dw-text-secondary)' }}>
            Personalize your reading
          </span>
          <button
            onClick={() => setShowPicker(true)}
            style={{
              background: 'var(--dw-accent)', color: '#fff', border: 'none',
              borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-sans)', flexShrink: 0,
            }}
          >
            Choose
          </button>
          <button
            onClick={dismissPersonalize}
            aria-label="Dismiss personalize prompt"
            style={{
              background: 'none', border: 'none', color: 'var(--dw-text-muted)',
              cursor: 'pointer', padding: 4, display: 'flex', fontSize: 18, lineHeight: 1, flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      )}
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
