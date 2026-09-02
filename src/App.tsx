import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { ScriptureSelectionProvider, useScriptureSelection } from './contexts/ScriptureSelectionContext';
import { TabBar } from './components/TabBar';
import { SeamBar } from './components/Seam';
import { EmailGate } from './components/EmailGate';
import { PushOptIn } from './components/PushOptIn';
import { isPushSubscribed } from './utils/push';
import { ScreenSkeleton } from './components/Skeleton';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CookieConsent } from './components/CookieConsent';
import type { TabId } from './components/TabBar';
import { activateSundayGuest, isSundayGuest } from './utils/sunday';
import { hideSplash, registerNativePush, isNative } from './utils/native';
import { API_BASE } from './utils/api-base';
import { track } from './utils/analytics';
import { t, getLang } from './utils/i18n';
import { closeSubViewsTo, openSubViewCount } from './utils/useSubView';
import { StopAllAudio } from './components/StopAllAudio';
import { consumeLandingParam, needsDay1Landing, needsDay1Reading, needsPathAsk, startGraceSeriesIfCold } from './utils/coldStart';
import { Day1Landing } from './components/Day1Landing';
import { Day1Reading } from './components/Day1Reading';
import { ChoosePathSheet } from './components/ChoosePathSheet';
import { PathAskedOnce } from './components/PathAskedOnce';
import { CHOOSE_PATH_EVENT, hasPathBeenAsked, markPathAsked, type PathDoor } from './utils/choosePath';
import { restoreStaffSession } from './utils/staffIdentity';
import { useStaffIdentity } from './utils/useStaffIdentity';

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

// Cold start (no real persona choice) → Day 1 of the 40-day grace series.
// Must run before UserProvider / HomeScreen read localStorage. `from=church`
// is attribution only and is stripped here; it never invents a new pathway.
const LANDING_FROM = consumeLandingParam();
// Enroll fill-only before UserProvider reads localStorage, so Home (after
// Read → Mark as read) already has new_to_faith. The Superdesign screen is the gate;
// it does not mount Home, so no streak is recorded until they tap through.
startGraceSeriesIfCold('default');

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
const SermonNotesTab = lazy(() => import('./components/SermonWorkspace').then(m => ({ default: m.SermonNotesTab })));
const PreachScreen = lazy(() => import('./screens/PreachScreen').then(m => ({ default: m.PreachScreen })));
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
  const { userProfile, setup } = useUser();
  const { selection } = useScriptureSelection();

  // Pastor sign-in (Settings → Pastor account): a stored staff session re-stamps
  // the pastor identity on every open, so a signed-in pastor never logs in twice.
  // A dead token is cleared by intake() itself; a network failure keeps it for
  // next time. Idempotent — nothing is written when the identity already matches.
  const { applyStaffIdentity } = useStaffIdentity();
  const applyStaffRef = useRef(applyStaffIdentity);
  applyStaffRef.current = applyStaffIdentity;
  useEffect(() => {
    let alive = true;
    restoreStaffSession().then(staff => {
      if (alive && staff) void applyStaffRef.current(staff, { boot: true });
    });
    return () => { alive = false; };
  }, []);

  const [showDay1Landing, setShowDay1Landing] = useState(
    () => !SERMON_DEEP_LINK && needsDay1Landing()
  );
  const [showDay1Reading, setShowDay1Reading] = useState(
    () => !SERMON_DEEP_LINK && !needsDay1Landing() && needsDay1Reading()
  );

  // Track app open — once on mount. Detail is the persona, plus church-homepage
  // attribution when the visitor arrived via ?from=church (real track(), not a pixel).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const detail = LANDING_FROM === 'church' || LANDING_FROM === 'day1'
      ? `church:${showDay1Landing ? 'day1_landing' : (setup?.persona || 'new_to_faith')}`
      : (showDay1Landing ? 'day1_landing' : (setup?.persona || 'none'));
    track('app_open', detail);
  }, []);

  const sundayGuest = isSundayGuest();

  // Push ask stays evidence-timed (after a finished reading). The five-choice
  // picker is gone — it was the gate where people opened and never read.
  const onboardingActive = !sundayGuest && !SERMON_DEEP_LINK;

  // After the pathway pick, a one-time "want a daily nudge?" step — the high-intent moment
  // to catch the notification opt-in, instead of burying it in Settings.
  const [pushOnboarded, setPushOnboarded] = useState(() => {
    try { return !!localStorage.getItem('dw_push_onboarded') || isPushSubscribed(); } catch { return false; }
  });
  // Evidence-timed (Ashley, 26 Aug 2026): the ask appears only after the user has
  // actually read something, not as a cold-start gate. Comfort users are never
  // gated — someone in crisis should not meet a permissions screen (Settings
  // still offers push).
  // Keyed on a finished reading (dw_reading_done + the dw-reading-completed event
  // fired when the "done" moment is dismissed), NOT the streak: the streak records
  // on HomeScreen mount — behind the picker — so this gate was already satisfied
  // before a brand-new user had seen a word, and the push screen fired straight
  // after the persona pick. Firing on dismissal also keeps the ask off the
  // celebration, so the two post-reading prompts never stack.
  const [hasReadOnce, setHasReadOnce] = useState(() => {
    try { return !!localStorage.getItem('dw_reading_done'); } catch { return false; }
  });
  useEffect(() => {
    const h = () => setHasReadOnce(true);
    window.addEventListener('dw-reading-completed', h);
    return () => window.removeEventListener('dw-reading-completed', h);
  }, []);
  // Door 3 of "Choose your path" (Ashley, 2 Sep 2026): asked ONCE, right after
  // the first Mark as read on Day 1 and BEFORE the push ask, obeying its rules —
  // evidence-timed on the same finished reading, never for comfort, never after a
  // real choice (REAL_CHOICE_SOURCES), never stacked with the push ask. The
  // dw_path_asked flag rides the misc bag so it never returns on any device.
  const [pathAsked, setPathAsked] = useState(hasPathBeenAsked);
  const showPathAsk = onboardingActive && !pathAsked && hasReadOnce && needsPathAsk(setup);
  function handlePathAsked() {
    markPathAsked();
    setPathAsked(true);
  }
  // The one chooser sheet, hosted here (stable across Home remounts) and opened
  // by every door through the dw-choose-path event. Mounted with a live `open`,
  // never conditionally, so its history entry is always consumed on close.
  const [pathSheet, setPathSheet] = useState<{ open: boolean; door: PathDoor }>({ open: false, door: 'home' });
  useEffect(() => {
    const h = (e: Event) => setPathSheet({ open: true, door: ((e as CustomEvent).detail?.door as PathDoor) || 'home' });
    window.addEventListener(CHOOSE_PATH_EVENT, h);
    return () => window.removeEventListener(CHOOSE_PATH_EVENT, h);
  }, []);
  const closePathSheet = useCallback(() => setPathSheet(s => (s.open ? { ...s, open: false } : s)), []);
  const needsPushOnboarding = onboardingActive && !pushOnboarded
    && hasReadOnce && setup?.persona !== 'comfort' && !showPathAsk;
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

  // Keep visited tabs mounted so switching is instant (no chunk refetch, no
  // Home remount that killed audio + re-fetched today's chapters). First visit
  // to a tab still lazy-loads; after that the panel is hidden, not destroyed.
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(() => new Set([SERMON_DEEP_LINK ? 'sermon-notes' : 'home']));
  useEffect(() => {
    setMountedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
    document.body.dataset.activeTab = activeTab;
    try { window.dispatchEvent(new CustomEvent('dw-tab-changed', { detail: { tab: activeTab } })); } catch { /* ignore */ }
  }, [activeTab]);

  // Warm the other route chunks after first paint so the first tap on Notes /
  // Campus / Read / Settings doesn't wait on the network.
  useEffect(() => {
    const warm = () => {
      import('./screens/JournalScreen');
      import('./screens/MessagesScreen');
      import('./screens/PlansScreen');
      import('./screens/MoreScreen');
    };
    const id = window.setTimeout(warm, 1600);
    return () => clearTimeout(id);
  }, []);

  // HomeScreen reads the language at mount (greeting, hero, pathway copy). Key it
  // on the language so the front-page LanguageSwitch remounts it in place — the
  // same effect Settings gets from the tab switch back to Home, without a reload.
  const [langKey, setLangKey] = useState(getLang);
  useEffect(() => {
    const h = () => setLangKey(getLang());
    window.addEventListener('dw-lang-changed', h);
    return () => window.removeEventListener('dw-lang-changed', h);
  }, []);

  // …and on the persona: a path picked in the chooser sheet remounts Home so it
  // lands on that path's one thing already open — the PR #82 arrival machinery
  // replays on mount instead of being re-seeded by hand (never via handleRead).
  const homeKey = `${langKey}:${setup?.persona || ''}`;

  const screens: Record<TabId, ReactNode> = {
    home: <HomeScreen key={homeKey} onNavigate={navigateTab} onBack={tabHistoryRef.current.length > 1 ? goBack : undefined} />,
    journal: <JournalScreen onBack={goBack} onNavigate={navigateTab} />,
    messages: <MessagesScreen onBack={goBack} onNavigate={navigateTab} />,
    plans: <PlansScreen onBack={goBack} onNavigate={navigateTab} />,
    more: <MoreScreen onBack={goBack} />,
    'sermon-notes': setup?.persona === 'pastor_leader'
      ? <PreachScreen onBack={() => navigateTab('home')} />
      : <SermonNotesTab onBack={() => navigateTab('home')} />,
  };

  const TAB_ORDER: TabId[] = ['home', 'journal', 'messages', 'plans', 'more', 'sermon-notes'];

  if (showDay1Landing) {
    return (
      <Day1Landing
        onDone={() => {
          setShowDay1Landing(false);
          setShowDay1Reading(false);
        }}
      />
    );
  }

  if (showDay1Reading) {
    return (
      <Day1Reading onDone={() => setShowDay1Reading(false)} />
    );
  }

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
          <main id="main-content" key={syncNonce} className="dw-tab-host">
            {TAB_ORDER.map(id => (
              mountedTabs.has(id) ? (
                <div
                  key={id}
                  className={`dw-tab-panel${id === activeTab ? ' is-active' : ''}`}
                  aria-hidden={id !== activeTab}
                  // @ts-expect-error inert is valid on HTMLElement, not yet in React's types
                  inert={id !== activeTab ? '' : undefined}
                >
                  {screens[id]}
                </div>
              ) : null
            ))}
          </main>
        </Suspense>
      </ErrorBoundary>
      <TabBar activeTab={activeTab} onTabChange={navigateTab} />
      <StopAllAudio onStop={() => { try { window.dispatchEvent(new Event('dw-stop-hero-audio')); } catch { /* ignore */ } }} />
      {!sundayGuest && !SERMON_DEEP_LINK && <EmailGate />}
      {/* Home and Notes mount their own BibleAI (they need to pass an initialContext
          from a highlight / Greek-Hebrew tap). Rendering this global one on top of
          those double-mounted the whole panel AND its floating button — two identical
          FABs stacked at the same coordinates. Only mount it for the screens that
          don't bring their own. */}
      {activeTab !== 'home' && activeTab !== 'journal' && (
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
      {!needsPushOnboarding && !showPathAsk && <CookieConsent />}
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

      {showPathAsk && (
        <PathAskedOnce
          onKeepGoing={handlePathAsked}
          onSomethingElse={() => setPathSheet({ open: true, door: 'asked' })}
        />
      )}
      {needsPushOnboarding && (
        <PushOptIn onDone={handlePushOnboardingDone} />
      )}
      <ChoosePathSheet open={pathSheet.open} door={pathSheet.door} onClose={closePathSheet} />
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
