import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { ScriptureSelectionProvider, useScriptureSelection } from './contexts/ScriptureSelectionContext';
import { TabBar } from './components/TabBar';
import { SeamBar } from './components/Seam';
import { EmailGate } from './components/EmailGate';
import { PathwayPicker } from './components/PathwayPicker';
import { PushOptIn } from './components/PushOptIn';
import { isPushSubscribed } from './utils/push';
import { ScreenSkeleton } from './components/Skeleton';
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

// ── Embedded mode — the app is being framed inside the Futures Church site
// (futures.church/daily-word/app). Hide the app's own "part of Futures Church"
// seam to avoid double chrome / a recursive return link. Detected via the
// ?embed=1 flag the church iframe passes, or by being in a sub-frame at all. ──
const IS_EMBEDDED = (() => {
  try {
    if (new URLSearchParams(window.location.search).get('embed') === '1') return true;
    return window.self !== window.top; // true when running inside any iframe
  } catch {
    return true; // cross-origin access throws only when framed → treat as embedded
  }
})();
if (typeof document !== 'undefined' && IS_EMBEDDED) {
  document.documentElement.classList.add('dw-embedded');
}

// ── Lazy-loaded screens — only downloaded when the user navigates to them ──
const HomeScreen = lazy(() => import('./screens/HomeScreen').then(m => ({ default: m.HomeScreen })));
const JournalScreen = lazy(() => import('./screens/JournalScreen').then(m => ({ default: m.JournalScreen })));
const MessagesScreen = lazy(() => import('./screens/MessagesScreen').then(m => ({ default: m.MessagesScreen })));
const PlansScreen = lazy(() => import('./screens/PlansScreen').then(m => ({ default: m.PlansScreen })));
const MoreScreen = lazy(() => import('./screens/MoreScreen').then(m => ({ default: m.MoreScreen })));
const SermonNotesScreen = lazy(() => import('./screens/SermonNotesScreen').then(m => ({ default: m.SermonNotesScreen })));
const BibleAI = lazy(() => import('./components/BibleAI').then(m => ({ default: m.BibleAI })));

/** Content-shaped skeleton shown while a screen chunk downloads */
function ScreenLoader() {
  return <ScreenSkeleton />;
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
  // Bumped when a cloud sync lands so the active screen remounts and re-reads the
  // freshly merged localStorage (previously dw-cloud-sync had no listeners and
  // screens showed stale, pre-sync state until the user force-navigated).
  const [syncNonce, setSyncNonce] = useState(0);
  // Count of journal entries that had cross-device edits, surfaced as a toast.
  const [syncConflicts, setSyncConflicts] = useState(0);

  // Track tab navigation history
  const navigateTab = (tab: TabId) => {
    const h = tabHistoryRef.current;
    // Don't push duplicate if already on this tab
    if (h[h.length - 1] !== tab) {
      h.push(tab);
      if (h.length > 20) h.splice(0, h.length - 20);
      // Mirror into the History API so the browser/Android hardware back button
      // pops a tab instead of exiting the app. The popstate effect below does the
      // actual state update when an entry is popped.
      try { window.history.pushState({ dwTab: tab }, ''); } catch { /* ignore */ }
    }
    setActiveTab(tab);
  };

  // Go back to previous tab — delegate to history so in-app back and the
  // browser/hardware back button share one code path (the popstate handler).
  const goBack = () => {
    if (tabHistoryRef.current.length > 1) {
      try { window.history.back(); } catch { /* ignore */ }
    }
  };

  // Bind tab history to the History API: seed a root entry, then translate each
  // popstate (browser back, Android hardware back, back-swipe) into a tab pop.
  useEffect(() => {
    try { window.history.replaceState({ dwTab: tabHistoryRef.current[0], dwRoot: true }, ''); } catch { /* ignore */ }
    const onPop = () => {
      const h = tabHistoryRef.current;
      if (h.length > 1) {
        h.pop();
        setActiveTab(h[h.length - 1]);
      }
      // At root → let the default happen (Capacitor exits / browser leaves).
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
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
  // First launch (a real onboarding session that hasn't chosen a pathway yet) → show the
  // PathwayPicker as a welcome moment, instead of silently defaulting + a dismissible banner.
  const needsFirstRunPicker = onboardingActive && !localStorage.getItem('dw_v7_pathway_done');

  // Silently default to "congregation" only for sessions that DON'T get the picker
  // (sunday-guest / sermon deep-link / Sunday window), so their content still renders.
  useEffect(() => {
    if (!needsFirstRunPicker && !setup?.persona) {
      saveSetup({ persona: 'congregation', source: 'default' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePathwaySelect(persona: Persona) {
    saveSetup({ persona, source: 'onboarding' });
    localStorage.setItem('dw_v7_pathway_done', 'true');
  }

  // After the pathway pick, a one-time "want a daily nudge?" step — the high-intent moment
  // to catch the notification opt-in, instead of burying it in Settings.
  const [pushOnboarded, setPushOnboarded] = useState(() => {
    try { return !!localStorage.getItem('dw_push_onboarded') || isPushSubscribed(); } catch { return false; }
  });
  const needsPushOnboarding = onboardingActive && !needsFirstRunPicker && !pushOnboarded;
  function handlePushOnboardingDone() {
    try { localStorage.setItem('dw_push_onboarded', '1'); } catch { /* quota */ }
    setPushOnboarded(true);
  }

  useEffect(() => {
    hideSplash();
    if (isNative() && userProfile?.email) {
      registerNativePush((token) => {
        fetch(`${API_BASE}/api/push-subscribe`, {
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

  // Cloud sync landed — remount the active screen so its localStorage-seeded
  // state re-reads the merged data, and toast if entries conflicted across devices.
  useEffect(() => {
    const onSync = () => {
      // Don't remount while the user is typing — a remount would discard the
      // in-progress note/sermon/search text. The sync data is already in
      // localStorage; screens pick it up on next navigation (and the journal
      // refreshes in place via dw-journal-updated regardless).
      const ae = document.activeElement as HTMLElement | null;
      const typing = !!ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
      if (!typing) setSyncNonce(n => n + 1);
    };
    const onConflicts = (e: Event) => {
      const n = (e as CustomEvent).detail?.conflicts?.length || 0;
      if (n > 0) setSyncConflicts(n);
    };
    window.addEventListener('dw-cloud-sync', onSync);
    window.addEventListener('dw-sync-conflicts', onConflicts as EventListener);
    return () => {
      window.removeEventListener('dw-cloud-sync', onSync);
      window.removeEventListener('dw-sync-conflicts', onConflicts as EventListener);
    };
  }, []);

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
      {!IS_EMBEDDED && <SeamBar />}
      <ErrorBoundary label={activeTab}>
        <Suspense fallback={<ScreenLoader />}>
          <main id="main-content" key={syncNonce} style={{ display: 'contents' }}>
            {screens[activeTab]}
          </main>
        </Suspense>
      </ErrorBoundary>
      <TabBar activeTab={activeTab} onTabChange={navigateTab} />
      {!sundayGuest && !SERMON_DEEP_LINK && <EmailGate />}
      <Suspense fallback={null}>
        <BibleAI
          isOpen={showBibleAI}
          onClose={() => setShowBibleAI(false)}
          onOpen={() => setShowBibleAI(true)}
          selectedText={selection?.text}
        />
      </Suspense>
      <CookieConsent />
      <AudioAnnouncer />

      {/* Cross-device merge notice — fired by cloudSync when the same entry was
          edited on two devices and we kept the newer/longer version. */}
      {syncConflicts > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', left: '50%', transform: 'translateX(-50%)',
            top: 'calc(12px + env(safe-area-inset-top, 0px))',
            width: 'min(440px, calc(100% - 24px))',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px 10px 16px',
            background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
            borderLeft: '3px solid var(--dw-gold)',
            borderRadius: 14, boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
            zIndex: 950, fontFamily: 'var(--font-sans)',
          }}
        >
          <span style={{ flex: 1, fontSize: 13, color: 'var(--dw-text-secondary)' }}>
            Synced across your devices — kept the newest version of {syncConflicts} note{syncConflicts > 1 ? 's' : ''}.
          </span>
          <button
            onClick={() => setSyncConflicts(0)}
            aria-label="Dismiss sync notice"
            style={{
              background: 'none', border: 'none', color: 'var(--dw-text-muted)',
              cursor: 'pointer', padding: 4, display: 'flex', fontSize: 18, lineHeight: 1, flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* First-run welcome gate — choose a reading pathway in one tap. The picker has a
          "Not sure? → Church Member" escape, so it's a moment, not a dead-end tollgate. */}
      {needsFirstRunPicker && (
        <PathwayPicker onSelect={handlePathwaySelect} />
      )}
      {!needsFirstRunPicker && needsPushOnboarding && (
        <PushOptIn onDone={handlePushOnboardingDone} />
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
