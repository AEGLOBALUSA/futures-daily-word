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
import { getStreak } from './utils/streak';
import { schedulePush } from './utils/cloudSync';
import { ScreenSkeleton } from './components/Skeleton';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CookieConsent } from './components/CookieConsent';
import type { TabId } from './components/TabBar';
import type { Persona } from './utils/persona-config';
import { isSundayWindow, activateSundayGuest, isSundayGuest } from './utils/sunday';
import { hideSplash, registerNativePush, isNative } from './utils/native';
import { API_BASE } from './utils/api-base';
import { track } from './utils/analytics';
import { t, getLang } from './utils/i18n';
import { syncMisc } from './utils/cloudSync';
import { closeSubViewsTo, openSubViewCount } from './utils/useSubView';

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
// The old persona-driven HomeScreen is no longer routed — Today replaced it
// (Ashley, 1 Sep 2026). The file is kept until its remaining one-off sections
// (comfort scripture, polls, book cards, upgrade prompt) are re-homed under
// Bible/Me; nothing links to it.
const TodayScreen = lazy(() => import('./screens/TodayScreen').then(m => ({ default: m.TodayScreen })));
const MeScreen = lazy(() => import('./screens/MeScreen').then(m => ({ default: m.MeScreen })));
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
  // Which Journal tab the Me hub asked for (Notes vs Saved verses). A ref, so
  // setting it can't re-render Me before navigateTab swaps the screen out.
  const meJournalTabRef = useRef<'today' | 'saved' | 'prayer' | 'sermon' | undefined>(undefined);
  const meJournalTab = meJournalTabRef.current;

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
    } else {
      // Re-tap of the already-active tab → return that screen to its root
      // state (screens with sub-state listen, clear it, and scroll to top).
      try { window.dispatchEvent(new CustomEvent('dw-tab-reset', { detail: { tab } })); } catch { /* ignore */ }
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
  // popstate (browser back, Android hardware back, back-swipe) into closing the
  // newest open sub-view first, and only then into a tab change. The handler is
  // idempotent — it reads the landed entry's own state instead of blind-popping,
  // so Forward navigates forward and repeated/stale pops can't corrupt the stack.
  useEffect(() => {
    try { window.history.replaceState({ dwTab: tabHistoryRef.current[0], dwRoot: true }, ''); } catch { /* ignore */ }
    const onPop = (e: PopStateEvent) => {
      const st = (e.state || {}) as { dwTab?: TabId; dwSub?: boolean; dwSubDepth?: number };
      // 1. Sub-views: the entry we landed on encodes how many sub-views should
      //    remain open — close the newer ones. Views already closed by their own
      //    UI are no longer registered, so this is safely repeatable.
      const targetDepth = st.dwSub ? Math.max(0, st.dwSubDepth ?? 0) : 0;
      closeSubViewsTo(targetDepth);
      if (st.dwSub) {
        // Still inside sub-view entries — the tab doesn't change. A stale entry
        // (its view was unmounted by a tab switch / sync remount) is consumed
        // with one more back() so the gesture never lands on a dead press.
        if (openSubViewCount() < targetDepth) {
          try { window.history.back(); } catch { /* ignore */ }
        }
        return;
      }
      const h = tabHistoryRef.current;
      if (st.dwTab) {
        if (h.length > 1 && h[h.length - 2] === st.dwTab) {
          h.pop(); // back to the previous tab
        } else if (h[h.length - 1] !== st.dwTab) {
          h.push(st.dwTab); // forward (or a jump) — mirror it into the stack
          if (h.length > 20) h.splice(0, h.length - 20);
        }
        setActiveTab(st.dwTab);
      } else if (h.length > 1) {
        // Entry without our state (pre-dates this session) — legacy blind pop.
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
    // Church Member auto-starts the editorial default plan (Ashley, 26 Aug 2026):
    // it was the ONLY pathway that landed with zero scripture — 6-8 decisions to
    // the first verse. Exact startPlanFromHome write shape (full ISO startedAt);
    // never touches an existing plan set. Not a book plan, so the book-plan
    // hero-exclusion invariant is unaffected.
    if (persona === 'congregation') {
      try {
        const existing: Record<string, unknown> = JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
        if (Object.keys(existing).length === 0) {
          existing['ashley-jane-daily-word'] = { startedAt: new Date().toISOString(), completedDays: [], lastDay: 0 };
          localStorage.setItem('dw_activeplans', JSON.stringify(existing));
          try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch { /* ignore */ }
        }
      } catch { /* quota */ }
    }
    // Seed the daily reading volume from the pathway — the dead SetupPromptModal's
    // PERSONA_CHAPTERS intent, now applied at the pick (deep-study/pastor read
    // more; everyone else, comfort included, starts at a gentle 1). Fill-only:
    // never overwrite a cadence the user already chose (synced via the misc bag).
    try {
      if (!localStorage.getItem('dw_chapters_per_day')) {
        const seed = persona === 'deeper_study' || persona === 'pastor_leader' ? '3' : '1';
        syncMisc('dw_chapters_per_day', seed);
      }
    } catch { /* quota */ }
  }

  // After the pathway pick, a one-time "want a daily nudge?" step — the high-intent moment
  // to catch the notification opt-in, instead of burying it in Settings.
  const [pushOnboarded, setPushOnboarded] = useState(() => {
    try { return !!localStorage.getItem('dw_push_onboarded') || isPushSubscribed(); } catch { return false; }
  });
  // Evidence-timed (Ashley, 26 Aug 2026): the ask appears only after the user has
  // actually read something (first mark-as-read / celebration records the streak),
  // not as a cold-start gate. Comfort users are never gated — someone in crisis
  // should not meet a permissions screen (Settings still offers push).
  const [hasReadOnce, setHasReadOnce] = useState(() => {
    try { return !!getStreak().lastDate; } catch { return false; }
  });
  useEffect(() => {
    const h = () => setHasReadOnce(true);
    window.addEventListener('dw-streak-recorded', h);
    return () => window.removeEventListener('dw-streak-recorded', h);
  }, []);
  const needsPushOnboarding = onboardingActive && !needsFirstRunPicker && !pushOnboarded
    && hasReadOnce && setup?.persona !== 'comfort';
  function handlePushOnboardingDone() {
    try { localStorage.setItem('dw_push_onboarded', '1'); } catch { /* quota */ }
    setPushOnboarded(true);
    // The EmailNudgeCard sequences itself AFTER this moment — tell it directly
    // (its mount-time read predates the flag when the prompt resolves mid-session).
    try { window.dispatchEvent(new Event('dw-push-onboarded')); } catch { /* ignore */ }
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
    home: <TodayScreen />,
    me: <MeScreen onNavigate={(tab, journalTab) => { if (journalTab) meJournalTabRef.current = journalTab as typeof meJournalTab; navigateTab(tab); }} />,
    journal: <JournalScreen onBack={goBack} initialTab={SERMON_DEEP_LINK ? 'sermon' : meJournalTab} />,
    messages: <MessagesScreen onBack={goBack} onNavigate={navigateTab} />,
    plans: <PlansScreen onBack={goBack} onNavigate={navigateTab} />,
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
      {/* Home and Notes mount their own BibleAI (they need to pass an initialContext
          from a highlight / Greek-Hebrew tap). Rendering this global one on top of
          those double-mounted the whole panel AND its floating button — two identical
          FABs stacked at the same coordinates. Only mount it for the screens that
          don't bring their own. */}
      {/* Today never mounts the AI button — Ashley's rule: one hero, one action,
          no competing controls on the opening screen. Notes brings its own. */}
      {activeTab !== 'journal' && activeTab !== 'home' && (
        <Suspense fallback={null}>
          <BibleAI
            isOpen={showBibleAI}
            onClose={() => setShowBibleAI(false)}
            onOpen={() => setShowBibleAI(true)}
            selectedText={selection?.text}
          />
        </Suspense>
      )}
      {/* Cookie banner waits until no full-screen gate is active — a brand-new
          visitor was hitting picker + push + banner inside ~30 seconds. */}
      {!needsFirstRunPicker && !needsPushOnboarding && <CookieConsent />}
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
            {syncConflicts === 1 ? t('sync_notice_one', getLang()) : t('sync_notice_many', getLang()).replace('{n}', String(syncConflicts))}
          </span>
          <button
            onClick={() => setSyncConflicts(0)}
            aria-label={t('dismiss_sync_notice', getLang())}
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
