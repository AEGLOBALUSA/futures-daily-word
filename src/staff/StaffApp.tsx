/**
 * Staff portal at /staff — one login, one job at a time.
 * Hub / media put sermon notes on the congregation page; campus pastors
 * put updates on the campus corner. Save publishes. Ashley owns people,
 * not a review step. Owners change a question's wording on the form itself;
 * adding or reordering questions is done in SQL.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { campusName as campusNameOf, useCampuses } from '../data/campuses';
import { getStaffToken, intake, setStaffToken, STAFF_SIGNED_OUT_EVENT } from './api';
import '../multiplyos/staff-ui.css';
import { isMosUi } from '../multiplyos/uiFlag';
import multiplyosMark from '../multiplyos/assets/multiplyos-mark.png';
import multiplyosWordmark from '../multiplyos/assets/multiplyos-wordmark-white.png';
import dailyWordTile from '../multiplyos/assets/app-daily-word.png';
import { localApiBase } from '../utils/api-base';
import { getLang, t } from '../utils/i18n';
import { messageFor } from '../components/PastorSignIn';
import { youtubeLinkProblem } from './youtubeLink';
import { CONGREGATIONS, DEFAULT_CONGREGATION, isCongregationId, congregationName, type CongregationId } from '../data/congregations';
import { SermonNotesSurface, type SermonNotesData } from '../components/SermonNotesSurface';
import { QuickNotes } from './QuickNotes';
import { CornerDraftCard } from './CornerDraftCard';
import { PrayerCare } from './PrayerCare';
import { MoGuideMount } from './guide/MoGuideMount';
import { NextPill } from '../components/NextPill';
import { otherMessageLabel, sameVideo } from './quickNotesApi';

type Role = 'admin' | 'hub' | 'campus' | 'media';
type Tab = 'home' | 'notes' | 'form' | 'review' | 'people' | 'campuses';

const staffAppName = 'Futures Daily Word';
const staffTabLabels = { home: '← Staff home', notes: 'Sunday’s notes', people: 'People', review: 'History', campuses: 'Campuses' };

function MosBrandLockup() {
  return (
    <div className="mos-brand-lockup">
      <div className="mos-brand-lockup__identity">
        <img className="mos-brand-mark" src={multiplyosMark} alt="" />
        <img className="mos-brand-wordmark" src={multiplyosWordmark} alt="MultiplyOS" />
      </div>
      <p className="mos-brand-context">
        <img src={dailyWordTile} alt="" />
        <span>{staffAppName}</span>
      </p>
    </div>
  );
}

/**
 * The staff app opens on its first screen, Staff home (Ashley, 5 Oct 2026:
 * "it should be opening to the first screen"). Only a link that names a screen
 * (/staff?tab=notes, ?tab=people, #review) opens another one. Dead
 * /staff?tab=questions (or #questions) must land on home, not an empty page.
 */
const STAFF_TABS: readonly Tab[] = ['home', 'notes', 'form', 'review', 'people', 'campuses'];

export function staffTabFromRaw(raw: string | null | undefined): Tab {
  const v = (raw || '').trim().toLowerCase();
  return (STAFF_TABS as readonly string[]).includes(v) ? (v as Tab) : 'home';
}

/** Who may use the Sunday's notes screen (the server's notes_quick roles). */
function canPasteNotes(staff: Pick<Staff, 'isAdmin' | 'role'>): boolean {
  return staff.isAdmin || staff.role === 'hub' || staff.role === 'media';
}

/**
 * The screen this person may see for a requested tab: a screen their role
 * does not have falls back to Staff home, never a blank page.
 */
export function staffViewFor(tab: Tab, staff: Pick<Staff, 'isAdmin' | 'role'>): Tab {
  if (tab === 'review' || tab === 'people' || tab === 'campuses') return staff.isAdmin ? tab : 'home';
  if (tab === 'notes') return canPasteNotes(staff) ? tab : 'home';
  return tab;
}

function readStaffTabParam(): string {
  try {
    const q = new URLSearchParams(window.location.search).get('tab');
    if (q) return q;
    return window.location.hash.replace(/^#/, '');
  } catch {
    return '';
  }
}

/**
 * A deep link is read once, when the page opens, then leaves the address bar,
 * so a reload or a later visit opens on Staff home again.
 */
function stripTabDeepLink() {
  try {
    const url = new URL(window.location.href);
    const hadTab = url.searchParams.has('tab');
    const hash = url.hash.replace(/^#/, '').trim().toLowerCase();
    const hashIsTab = hash === 'questions' || (STAFF_TABS as readonly string[]).includes(hash);
    if (!hadTab && !hashIsTab) return;
    url.searchParams.delete('tab');
    if (hashIsTab) url.hash = '';
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  } catch { /* */ }
}

type Job = 'hub' | 'media' | 'campus';
type Staff = { email: string; role: Role; campusId: string | null; name: string; isAdmin: boolean };
type Question = {
  id: string;
  sort_order: number;
  label: string;
  help: string;
  type: string;
  audience: string;
  required: boolean;
  enabled: boolean;
  config: { publish?: string; itemType?: string; sermonKey?: string; default?: boolean; flow?: string };
};
type CornerItem = { id: string; type: string; title: string; created_at?: string };
type SermonChoice = { id: string; title: string; date?: string; speaker?: string; current?: boolean; source?: string; congregation?: string; congregationName?: string };
type FormattedSermon = {
  id: string;
  title: string;
  series?: string;
  date: string;
  speaker: string;
  keyVerse?: string;
  keyVerseText?: string;
  sections?: { num: string; title: string; content: { type: string; value?: string; before?: string }[] }[];
  responsePrompts?: string[];
  commitments?: string[];
  youtubeUrl?: string;
  youtubeOnly?: boolean;
};
type IntakeSeed = { answers: Record<string, unknown>; preview: FormattedSermon | null; congregation: CongregationId; job?: 'hub' | 'media' };
type Submission = {
  id: string;
  email: string;
  role: string;
  campus_id: string | null;
  answers: Record<string, unknown>;
  status: string;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  formatted_sermon?: FormattedSermon | null;
  publish_result?: { cornerAdded?: number; cornerRemoved?: number; sermon?: { id: string; title: string } | null } | null;
};

const inputStyle: CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12, boxSizing: 'border-box',
  border: '1.5px solid var(--dw-border)', background: 'var(--dw-surface)',
  color: 'var(--dw-text-primary)', fontSize: 15, fontFamily: 'var(--font-sans)', outline: 'none',
};
const labelStyle: CSSProperties = {
  display: 'block', fontSize: 18, fontWeight: 700, margin: '0 0 6px',
  color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', lineHeight: 1.3,
};
const helpStyle: CSSProperties = {
  fontSize: 15, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 10px', lineHeight: 1.45,
};
const btnPrimary: CSSProperties = {
  background: 'var(--dw-accent)', color: '#fff', border: 'none', borderRadius: 12,
  padding: '12px 18px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-sans)',
  cursor: 'pointer', minHeight: 44,
};
const btnGhost: CSSProperties = {
  background: 'transparent', color: 'var(--dw-text-muted)', border: '1px solid var(--dw-border)',
  borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-sans)', cursor: 'pointer', minHeight: 44,
};

function campusName(id: string | null | undefined) {
  if (!id) return '';
  return campusNameOf(id);
}

function emptyAnswer(q: Question): unknown {
  if (q.type === 'corner_remove') return '';
  if (q.type === 'yes_no') return q.config?.default === true ? true : '';
  return '';
}

/** Where that congregation reads this week's notes (the link also sets the reader's church). */
function congregationPageUrl(congregation: CongregationId): string {
  const q = `?sermon=1&congregation=${encodeURIComponent(congregation)}`;
  try { return `${window.location.origin}/${q}`; } catch { return `/${q}`; }
}

export function StaffApp() {
  const [token, setToken] = useState(() => getStaffToken());
  const [staff, setStaff] = useState<Staff | null>(null);
  const [boot, setBoot] = useState(!!getStaffToken());
  const [tab, setTab] = useState<Tab>(() => staffTabFromRaw(readStaffTabParam()));
  const [job, setJob] = useState<Job>('hub');
  const [seed, setSeed] = useState<IntakeSeed | undefined>(undefined);
  const [error, setError] = useState('');
  const bannerRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) bannerRef.current?.focus(); }, [error]);
  // Staff home unless a link named another screen this person may open.
  const view: Tab = staff ? staffViewFor(tab, staff) : 'home';

  useEffect(() => {
    document.title = 'Staff — Futures Daily Word';
    document.documentElement.setAttribute('data-theme', localStorage.getItem('dw_dark') === 'true' ? 'dark' : 'light');
    stripTabDeepLink();
  }, []);

  useEffect(() => {
    const handleSignedOut = () => { setToken(''); setStaff(null); };
    window.addEventListener(STAFF_SIGNED_OUT_EVENT, handleSignedOut);
    return () => window.removeEventListener(STAFF_SIGNED_OUT_EVENT, handleSignedOut);
  }, []);

  const loadMe = useCallback(async () => {
    if (!getStaffToken()) { setBoot(false); return; }
    try {
      const data = await intake<{ staff: Staff }>('me');
      // Keep the screen the page opened on: Staff home, or the one a link named.
      setStaff(data.staff);
    } catch {
      setStaffToken('');
      setToken('');
      setStaff(null);
    }
    setBoot(false);
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const signOut = async () => {
    try { await intake('logout'); } catch { /* */ }
    setStaffToken(''); setToken(''); setStaff(null); setTab('home'); setSeed(undefined);
  };

  const goHome = () => { setTab('home'); setSeed(undefined); setError(''); };
  const goNotes = () => { setTab('notes'); setError(''); };
  const goReview = () => { setTab('review'); setError(''); };
  const goPeople = () => { setTab('people'); setError(''); };
  const goCampuses = () => { setTab('campuses'); setError(''); };

  if (boot) {
    return (
      <div className="mos-shell mos-shell--auth" style={{ minHeight: '100vh', background: 'var(--dw-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>Loading…</p>
      </div>
    );
  }

  if (!token || !staff) {
    return (
      <Login
        onSignedIn={(t, s) => { setStaffToken(t); setToken(t); setStaff(s); }}
      />
    );
  }

  return (
    <div className="staff-app" style={{ minHeight: '100vh', overflow: 'visible', background: 'var(--dw-canvas)', color: 'var(--dw-text-primary)' }}>
      <MoGuideMount isAdmin={staff.isAdmin} role={staff.role} />
      {isMosUi() && (
        <aside className="mos-shell__sidebar">
          <MosBrandLockup />
          <nav className="mos-shell__nav">
            <button type="button" aria-current={view === 'home' ? 'page' : undefined} onClick={goHome}>{staffTabLabels.home}</button>
            {canPasteNotes(staff) && (
              <button type="button" aria-current={view === 'notes' ? 'page' : undefined} onClick={goNotes}>{staffTabLabels.notes}</button>
            )}
            {staff.isAdmin && (
              <>
                <button type="button" aria-current={view === 'people' ? 'page' : undefined} onClick={goPeople}>{staffTabLabels.people}</button>
                <button type="button" aria-current={view === 'review' ? 'page' : undefined} onClick={goReview}>{staffTabLabels.review}</button>
                <button type="button" aria-current={view === 'campuses' ? 'page' : undefined} onClick={goCampuses}>{staffTabLabels.campuses}</button>
              </>
            )}
          </nav>
          <div className="mos-shell__account">
            <p>
              {staff.name || staff.email}
              {staff.role === 'campus' && staff.campusId ? ` · ${campusName(staff.campusId)}` : ''}
            </p>
            <button type="button" data-mo-guide-open aria-label="Open the guide">Guide</button>
            <button type="button" onClick={signOut}>Sign out</button>
          </div>
        </aside>
      )}
      <header className="mos-shell__header" style={{
        position: 'sticky', top: 0, zIndex: 10, background: 'var(--dw-canvas)',
        borderBottom: '1px solid var(--dw-border)', padding: '14px 20px',
      }}>
        <div className="mos-shell__header-inner" style={{ maxWidth: 720, margin: '0 auto' }}>
          {isMosUi() && <MosBrandLockup />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
                {staffAppName}
              </p>
              <h1 style={{ margin: '4px 0 0', fontSize: 22, fontFamily: 'var(--font-serif)', fontWeight: 700 }}>Staff</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                data-mo-guide-open
                aria-label="Open the guide"
                style={{ ...btnGhost, minHeight: 44, padding: '8px 12px' }}
              >
                Guide
              </button>
              <button
                type="button"
                onClick={signOut}
                style={{ ...btnGhost, minHeight: 44, padding: '8px 12px' }}
              >
                Sign out
              </button>
            </div>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
            {staff.name || staff.email}
            {staff.role === 'campus' && staff.campusId ? ` · ${campusName(staff.campusId)}` : ''}
          </p>
          {view !== 'home' && (
            <button
              type="button"
              onClick={goHome}
              style={{ ...btnGhost, minHeight: 44, padding: '8px 14px', marginTop: 12 }}
            >
              {staffTabLabels.home}
            </button>
          )}
        </div>
      </header>

      <main className="mos-shell__main" style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 80px' }}>
        {error && (
          <p ref={bannerRef} role="alert" tabIndex={-1} style={{ color: 'var(--dw-error)', fontSize: 15, fontFamily: 'var(--font-sans)', marginBottom: 16 }}>{error}</p>
        )}
        {view === 'home' && (
          <StaffHome
            staff={staff}
            onJob={j => { setSeed(undefined); setJob(j); setTab('form'); setError(''); }}
            onNotes={goNotes}
            onReview={goReview}
            onPeople={goPeople}
            onCampuses={goCampuses}
          />
        )}
        {view === 'notes' && (
          <QuickNotes onChangeDetails={seed => { setSeed(seed); setJob(seed.job ?? 'hub'); setTab('form'); setError(''); }} />
        )}
        {view === 'form' && <IntakeForm staff={staff} job={job} seed={seed && (seed.job ?? 'hub') === job ? seed : undefined} onError={setError} />}
        {view === 'review' && staff.isAdmin && (
          <ReviewQueue onError={setError} />
        )}
        {view === 'people' && staff.isAdmin && <Roster onError={setError} />}
        {view === 'campuses' && staff.isAdmin && <Campuses onError={setError} />}
      </main>
    </div>
  );
}

function Login({ onSignedIn }: { onSignedIn: (token: string, staff: Staff) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  // Choose or reset a password with a setup code.
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendStatus, setSendStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (setup && sentTo) codeRef.current?.focus();
  }, [setup, sentTo]);

  const changeScreen = (nextSetup: boolean) => {
    setSetup(nextSetup);
    setCode(''); setPassword(''); setConfirm('');
    setSentTo(''); setError(''); setSendError(''); setSendStatus('');
  };

  // Leaving a screen (Back, "I have a code") retires any code request still in
  // flight, so a late answer cannot pull the person back.
  const codeRequest = useRef(0);
  useEffect(() => () => { codeRequest.current += 1; setSending(false); }, [setup]);

  const sendCode = async () => {
    if (sending) return;
    setSendError('');
    setSendStatus('');
    const address = email.trim().toLowerCase();
    if (!address.includes('@')) { setSendError(t('pastor_type_email', getLang())); return; }
    setSending(true);
    const request = ++codeRequest.current;
    const resending = setup;
    try {
      await intake('email_setup_code', { email: address, lang: getLang() });
      if (request !== codeRequest.current) return;
      if (resending) setCode('');
      else changeScreen(true);
      if (resending) setSendStatus(t('pastor_code_sent_again', getLang()));
      setSentTo(address);
      codeRef.current?.focus();
    } catch (err) {
      if (request !== codeRequest.current) return;
      setSendError((err as { status?: number } | null)?.status === 429
        ? t('pastor_too_many_codes', getLang())
        : messageFor(err, getLang()));
    }
    setSending(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (setup) {
      if (!code.trim()) { setError(t('pastor_type_code', getLang())); return; }
      if (password.length < 10) { setError(t('pastor_password_too_short', getLang())); return; }
      if (password !== confirm) { setError(t('pastor_passwords_mismatch', getLang())); return; }
    } else if (!password) { setError(t('pastor_type_password', getLang())); return; }
    setBusy(true);
    try {
      if (setup) {
        const data = await intake<{ token: string; staff: Staff }>('set_password', { email, password, setupCode: code });
        onSignedIn(data.token, data.staff);
      } else {
        const data = await intake<{ token: string; staff: Staff }>('login', { email, password });
        onSignedIn(data.token, data.staff);
      }
    } catch (err) {
      setError(messageFor(err, getLang()));
    }
    setBusy(false);
  };

  return (
    <div className="mos-shell mos-shell--auth" style={{ minHeight: '100vh', background: 'var(--dw-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form className="mos-auth__form" noValidate onSubmit={submit} style={{ width: 'min(420px, 100%)' }}>
        {isMosUi() && <MosBrandLockup />}
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
          {staffAppName}
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, margin: '8px 0 8px', fontWeight: 700 }}>{setup ? t('pastor_choose_password', getLang()) : t('pastor_staff_sign_in', getLang())}</h1>
        <p data-testid={setup && sentTo ? 'staff-code-sent' : undefined} style={{ ...helpStyle, fontSize: 15, color: 'var(--dw-text-secondary)', lineHeight: 1.55, margin: '0 0 24px' }}>
          {setup
            ? sentTo
              ? t('pastor_code_sent', getLang()).replace('{email}', sentTo)
              : t('pastor_first_visit', getLang())
            : t('pastor_staff_sign_in_hint', getLang())}
        </p>
        <label style={labelStyle} htmlFor="staff-email">{t('pastor_work_email', getLang())}</label>
        <input
          id="staff-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          onBlur={async () => {
            if (!email.includes('@') || setup) return;
            try {
              // Only a person holding a live setup code is switched to the code box.
              const status = await intake<{ setup: boolean }>('auth_status', { email });
              if (status.setup) { setSetup(true); setError(''); setSendError(''); }
            } catch { /* keep password sign-in */ }
          }}
          placeholder="ae@futures.global"
          style={{ ...inputStyle, marginBottom: 14 }}
        />
        {setup && (
          <>
            <label style={labelStyle} htmlFor="staff-code">{t('pastor_setup_code', getLang())}</label>
            <input
              id="staff-code"
              ref={codeRef}
              type="text"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              required
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="XXXXX-XXXXX"
              style={{ ...inputStyle, marginBottom: 14, letterSpacing: '0.1em' }}
            />
          </>
        )}
        <label style={labelStyle} htmlFor="staff-password">{setup ? t('pastor_new_password', getLang()) : t('pastor_password', getLang())}</label>
        <input
          id="staff-password"
          type="password"
          autoComplete={setup ? 'new-password' : 'current-password'}
          required
          minLength={setup ? 10 : undefined}
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ ...inputStyle, marginBottom: 14 }}
        />
        {setup && (
          <>
            <p style={helpStyle}>{t('pastor_staff_password_hint', getLang())}</p>
            <label style={labelStyle} htmlFor="staff-confirm">{t('pastor_confirm_password', getLang())}</label>
            <input
              id="staff-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={{ ...inputStyle, marginBottom: 8 }}
            />
          </>
        )}
        {error && <p role="alert" style={{ color: '#B42318', fontSize: 13, fontFamily: 'var(--font-sans)' }}>{error}</p>}
        <button type="submit" className="mos-button mos-button--primary" disabled={busy} style={{ ...btnPrimary, width: '100%', marginTop: 8 }}>
          {busy ? t('pastor_please_wait', getLang()) : setup ? t('pastor_save_password', getLang()) : t('pastor_sign_in_btn', getLang())}
        </button>
        {setup ? (
          <>
            <p style={{ ...helpStyle, marginTop: 16 }}>
              <button type="button" data-testid="staff-send-another" onClick={sendCode} disabled={sending} style={btnGhost}>
                {sending ? t('pastor_please_wait', getLang()) : t('pastor_send_another', getLang())}
              </button>
            </p>
            {sendStatus && <p role="status" style={helpStyle}>{sendStatus}</p>}
            {sendError && <p role="alert" style={{ ...helpStyle, color: '#B42318' }}>{sendError}</p>}
            <p style={helpStyle}>
              <button type="button" data-testid="staff-back-to-signin" onClick={() => changeScreen(false)} style={btnGhost}>
                {t('pastor_back_to_sign_in', getLang())}
              </button>
            </p>
          </>
        ) : (
          <>
            <p style={{ ...helpStyle, marginTop: 16 }}>{t('pastor_first_time_ask', getLang())}</p>
            <button type="button" data-testid="staff-email-code" onClick={sendCode} disabled={sending} style={btnGhost}>
              {sending ? t('pastor_please_wait', getLang()) : t('pastor_email_me_code', getLang())}
            </button>
            {sendError && <p role="alert" style={{ ...helpStyle, color: '#B42318' }}>{sendError}</p>}
            <p style={helpStyle}>
              <button type="button" data-testid="staff-have-code" onClick={() => changeScreen(true)} style={{ ...btnGhost, border: 'none', padding: 0, color: 'var(--dw-accent)' }}>
                {t('pastor_have_code', getLang())}
              </button>
            </p>
          </>
        )}
        <p style={{ marginTop: 20, textAlign: 'center' }}>
          <a href="/" style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>← Daily Word</a>
        </p>
      </form>
    </div>
  );
}

function isFlowQuestion(q: Question) {
  return !!q.config?.flow;
}

function withStep(n: number, label: string) {
  return `${n}. ${label.replace(/^\d+\.\s*/, '')}`;
}

function StaffHome({
  staff, onJob, onNotes, onReview, onPeople, onCampuses,
}: {
  staff: Staff;
  onJob: (job: Job) => void;
  onNotes: () => void;
  onReview: () => void;
  onPeople: () => void;
  onCampuses: () => void;
}) {
  const [hasHeldPrayer, setHasHeldPrayer] = useState(false);
  const [hasNeedsYouMain, setHasNeedsYouMain] = useState(false);
  // Sunday's notes is its own screen (B09-10's one pasted box), listed first
  // for the staff who can use it; Staff home itself stays the first screen.
  const notesJob = { id: 'notes' as const, title: 'Paste Sunday’s notes', body: 'One paste. The app works out the Sunday, title, speaker, series and YouTube, and shows you the page before it goes up.' };
  const jobs: { id: Job; title: string; body: string }[] = [
    { id: 'hub', title: 'Put up this week’s sermon notes', body: 'Date, title, speaker, series, YouTube, paste your notes. Save puts it on the congregation page.' },
    { id: 'media', title: 'Add the YouTube or clean the notes', body: 'Pick the sermon. Paste a link. Or paste notes if they need a cleanup.' },
    { id: 'campus', title: 'Update a campus corner', body: 'What’s on this week, a prayer point if you have one, or take something down.' },
  ];
  const visible = staff.isAdmin
    ? jobs
    : staff.role === 'media'
      ? jobs.filter(j => j.id === 'hub' || j.id === 'media')
      : jobs.filter(j => j.id === staff.role);
  const cards: { id: Job | 'notes'; title: string; body: string }[] = canPasteNotes(staff) ? [notesJob, ...visible] : visible;
  return (
    <div style={{ '--mos-control-height': '44px' } as CSSProperties}>
      <PrayerCare staff={staff} onHeldChange={setHasHeldPrayer} onNeedsYouMainChange={setHasNeedsYouMain}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, margin: '0 0 10px', fontWeight: 700 }}>Staff</h2>
      {(staff.role === 'campus' || staff.isAdmin) && <CornerDraftCard isAdmin={staff.isAdmin} secondary={hasHeldPrayer || hasNeedsYouMain}
        staffCampusId={staff.role === 'campus' ? staff.campusId ?? undefined : undefined}
        onJob={job => onJob(job)} />}
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--dw-text-secondary)', lineHeight: 1.5, margin: '0 0 28px' }}>
        This is how Sunday’s sermon notes get onto the page people write in.
      </p>
      {cards.map(j => (
        <button
          key={j.id}
          type="button"
          className="mos-card"
          onClick={() => (j.id === 'notes' ? onNotes() : onJob(j.id))}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
            borderRadius: 16, padding: '18px 20px', marginBottom: 12, cursor: 'pointer',
          }}
        >
          <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--dw-text-primary)', lineHeight: 1.3 }}>{j.title}</span>
          <span style={{ display: 'block', marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--dw-text-muted)', lineHeight: 1.45 }}>{j.body}</span>
        </button>
      ))}
      </PrayerCare>
      <NextPill />
      {staff.isAdmin && (
        <>
          <p style={{ margin: '20px 0 8px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--dw-text-secondary)' }}>
            Settings
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={btnGhost} onClick={onPeople}>{staffTabLabels.people}</button>
            <button type="button" style={btnGhost} onClick={onReview}>{staffTabLabels.review}</button>
            <button type="button" style={btnGhost} onClick={onCampuses}>{staffTabLabels.campuses}</button>
          </div>
        </>
      )}
    </div>
  );
}

function formIntro(job: Job) {
  if (job === 'hub') {
    return 'You’re putting this week’s message on the congregation Sermon Notes page. Answer these, paste your notes, save — it goes live.';
  }
  if (job === 'media') {
    return 'Add the YouTube for this week’s message, or paste notes if they need a cleanup. YouTube alone does not change the notes that are already live.';
  }
  return 'What’s on this week, a prayer point if you have one, and anything that should come down. Save puts it on the campus corner.';
}

function IntakeForm({ staff, job, seed, onError }: { staff: Staff; job: Job; seed?: IntakeSeed; onError: (s: string) => void }) {
  const campuses = useCampuses();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rewordable, setRewordable] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wordingSaved, setWordingSaved] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => seed?.answers ?? {});
  const [cornerItems, setCornerItems] = useState<CornerItem[]>([]);
  const [sermons, setSermons] = useState<SermonChoice[]>([]);
  const [mine, setMine] = useState<{ id: string; status: string; created_at: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [held, setHeld] = useState(false);
  const [preview, setPreview] = useState<FormattedSermon | null>(() => seed?.preview ?? null);
  const [pickCampus, setPickCampus] = useState(staff.campusId || '');
  // The shell shows errors at the top of the page; the save button sits at the
  // bottom of a long form, so the same message is repeated next to the button
  // and scrolled into view — a refused save must never look like nothing happened.
  const [formError, setFormError] = useState('');
  const [live, setLive] = useState<{ title: string; verified: boolean; checked?: boolean; empty?: boolean; showing?: string } | null>(null);
  // The church the last save went to: done names it and links to it, even
  // if the picker was switched while the save was still working.
  const [savedCongregation, setSavedCongregation] = useState<CongregationId | null>(null);
  // Which congregation's Sermon Notes this message is for (Futures USA /
  // Futures Australia / Futuros USA). Sent with preview and save; remembered per browser.
  const [congregation, setCongregationChoice] = useState<CongregationId>(() => {
    if (seed) return seed.congregation;
    try { const v = localStorage.getItem('dw_staff_congregation'); if (isCongregationId(v)) return v; } catch { /* */ }
    return DEFAULT_CONGREGATION;
  });
  const pickCongregation = (v: string) => {
    if (!isCongregationId(v)) return;
    setCongregationChoice(v);
    try { localStorage.setItem('dw_staff_congregation', v); } catch { /* */ }
    setPreview(null); setDone(false); setHeld(false); setLive(null); setFormError('');
    // A message picked for one church never carries over to another: the
    // picker only lists the new church's messages, so a kept id would save
    // onto a message the person can no longer see.
    setAnswers(a => {
      const next = { ...a };
      for (const q of questions) {
        if (!(q.type === 'sermon_pick' || q.config?.publish === 'sermon_target')) continue;
        const picked = sermons.find(s => s.id === next[q.id]);
        if (picked?.congregation && picked.congregation !== v) next[q.id] = '';
        // "This week's published message" only stands when the new church has one.
        const hasCurrent = sermons.some(s => s.current && (s.congregation === v || !s.congregation));
        if (next[q.id] === '__current__' && !hasCurrent) next[q.id] = '';
      }
      return next;
    });
  };
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const fail = (msg: string) => {
    onError(msg);
    setFormError(msg);
    setTimeout(() => { errorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 0);
  };

  const load = useCallback(async (campusId?: string) => {
    onError('');
    setLoadError(''); setLoaded(false); setLoading(true);
    setEditingId(null); setWordingSaved(null);
    try {
      const data = await intake<{ rewordable?: string[]; questions: Question[]; cornerItems: CornerItem[]; submissions: typeof mine; staff: Staff; sermons?: SermonChoice[] }>(
        'form',
        { job, ...(campusId ? { campusId } : {}) },
      );
      setQuestions(data.questions || []);
      setRewordable(data.rewordable || []);
      setLoadError(''); setLoaded(true);
      setCornerItems(data.cornerItems || []);
      setMine(data.submissions || []);
      setSermons(data.sermons || []);
      setAnswers(prev => {
        const next = { ...prev };
        for (const q of data.questions || []) {
          if (next[q.id] === undefined) {
            if (q.type === 'campus' && (staff.campusId || campusId)) next[q.id] = staff.campusId || campusId;
            else next[q.id] = emptyAnswer(q);
          }
        }
        return next;
      });
    } catch (err) {
      setQuestions([]); setRewordable([]);
      const status = err instanceof Error && 'status' in err ? err.status : undefined;
      if (status === 401) return;
      setLoadError(typeof status === 'number' && status >= 500
        ? t('staff_form_load_server', getLang())
        : t('staff_form_load_failed', getLang()));
    } finally {
      setLoading(false);
    }
  }, [onError, staff.campusId, job]);

  useEffect(() => { load(staff.campusId || undefined); }, [load, staff.campusId, job]);

  const campusLocked = staff.role === 'campus' && !!staff.campusId;
  const sermonForm = job === 'hub' || job === 'media';
  const flowQs = questions.filter(q => isFlowQuestion(q) && (q.audience === job || q.audience === 'all'));
  const formQs = questions.filter(q => !isFlowQuestion(q) && q.config?.sermonKey !== 'keyVerse' && q.config?.sermonKey !== 'keyVerseText');
  const haveQ = job === 'hub' ? flowQs.find(q => q.config?.flow === 'notes_have') : undefined;
  const pasteQ = flowQs.find(q => q.config?.flow === 'notes_paste' && q.audience === job);
  const aiQ = flowQs.find(q => q.config?.flow === 'notes_ai' && q.audience === job);
  const haveNotes = haveQ ? answers[haveQ.id] === true : job !== 'hub';
  const paste = pasteQ ? String(answers[pasteQ.id] || '') : '';
  const showPaste = !haveQ || haveNotes === true;
  const showAI = showPaste && paste.trim().length > 0;
  const stepStart = formQs.length;
  const currentSermon = useMemo(
    () => sermons.find(s => s.current && s.congregation === congregation)
      || sermons.find(s => s.current && !s.congregation),
    [sermons, congregation],
  );
  const pickedSermon = useMemo(() => {
    const targetQuestion = questions.find(q =>
      (q.type === 'sermon_pick' || q.config?.publish === 'sermon_target')
      && (q.audience === job || q.audience === 'all'),
    );
    const answer = targetQuestion ? answers[targetQuestion.id] : undefined;
    if (answer == null || answer === '') return null;
    if (answer === '__current__') return currentSermon || null;
    return sermons.find(s => s.id === answer) || { id: '', title: String(answer) };
  }, [answers, currentSermon, job, questions, sermons]);
  // Pasted notes re-put the message up; only a link-only save keeps the current one.
  const mediaLinkOnly = job === 'media' && !paste.trim();
  const mediaButtonLabel = !mediaLinkOnly ? 'Put this on the congregation page'
    : pickedSermon?.title ? `Add the video to “${pickedSermon.title}”` : 'Add the video';
  const doneCongregation = savedCongregation || congregation;
  // What the message picker offers: for the media form, this church's messages
  // (and "This week's published message" only when it has one).
  const pickChoices = job === 'media'
    ? sermons.filter(s => (s.source === 'current' ? !!currentSermon : !s.congregation || s.congregation === congregation))
    : sermons;
  const mediaKeepsCurrentMessage = mediaLinkOnly
    && !!currentSermon
    && !!pickedSermon?.id
    && pickedSermon.id !== currentSermon.id;

  const setAnswer = (id: string, v: unknown) => {
    setWordingSaved(null);
    setAnswers(a => ({ ...a, [id]: v }));
    // Only the notes themselves (or the AI choice) invalidate the formatted
    // preview. Fixing the title, date, speaker or link keeps it — the server
    // applies those answers over the preview on save — so the preview never
    // silently vanishes after a small correction.
    const q = questions.find(x => x.id === id);
    if (!q || isFlowQuestion(q)) setPreview(null);
    setDone(false);
    setLive(null);
    setFormError('');
  };

  const wantsAI = !!aiQ && answers[aiQ.id] === true;
  const youtubeQ = questions.find(q => q.config?.sermonKey === 'youtubeUrl' && (q.audience === job || q.audience === 'all'));
  // The media form exists to add the link, so it never suggests leaving it blank.
  const youtubeProblem = !youtubeQ ? '' : job === 'media' && youtubeLinkProblem(answers[youtubeQ.id])
    ? 'That is not a YouTube video link. Paste the watch, youtu.be, shorts, or embed link.'
    : youtubeLinkProblem(answers[youtubeQ.id]);

  const runPreview = async (override?: Record<string, unknown>) => {
    if (youtubeProblem) { fail(youtubeProblem); return; }
    setBusy(true); onError(''); setFormError('');
    try {
      const data = await intake<{ preview: FormattedSermon | null; source?: string }>('format_preview', {
        answers: override || answers,
        useAI: true,
        job,
        congregation,
      });
      setPreview(data.preview);
      if (!data.preview) fail('Nothing to format yet — paste your notes first.');
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Could not preview');
    }
    setBusy(false);
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || !loaded || loadError || questions.length === 0) return;
    if (haveQ && answers[haveQ.id] !== true && answers[haveQ.id] !== false) {
      fail('Do you have your notes?');
      return;
    }
    if (haveNotes && pasteQ && !paste.trim() && job === 'hub') {
      fail('Paste your notes.');
      return;
    }
    if (youtubeProblem) { fail(youtubeProblem); return; }
    // The media form adds a video (or polished notes) to a message. With
    // neither, saving would re-put that message up over the current one.
    if (job === 'media' && youtubeQ && !String(answers[youtubeQ.id] || '').trim() && !paste.trim()) {
      fail('Paste the YouTube link first.');
      return;
    }
    // Our own required check (the form is noValidate): the browser's bubble is
    // silent on iOS and easy to miss on a long page, and it never reaches submit().
    const missing = formQs.find(q => {
      if (!(q.required && (q.audience === job || q.audience === 'all'))) return false;
      if (q.type === 'corner_remove') return false;
      const v = answers[q.id];
      return v == null || v === '' || (Array.isArray(v) && v.length === 0);
    });
    if (missing) {
      fail(`Fill in “${missing.label}” first — it is empty.`);
      return;
    }
    // "This week's published message" is bound to the message the button
    // names when it is pressed, so a message put up by someone else in the
    // meantime never receives this link.
    const pickQ = job === 'media' ? questions.find(q =>
      (q.type === 'sermon_pick' || q.config?.publish === 'sermon_target')
      && (q.audience === job || q.audience === 'all')) : undefined;
    // A link on its own goes on the message picked or nowhere.
    if (pickQ && mediaLinkOnly && (answers[pickQ.id] == null || answers[pickQ.id] === '')) {
      fail('Pick the message the video is for.');
      return;
    }
    if (pickQ && answers[pickQ.id] === '__current__' && !currentSermon?.id) {
      setAnswers(a => ({ ...a, [pickQ.id]: '' }));
      fail(`Nothing is on the ${congregationName(congregation)} page this week. Pick the message the video is for.`);
      return;
    }
    const pickedOther = pickQ ? sermons.find(s => s.id === answers[pickQ.id]) : undefined;
    if (pickedOther?.congregation && pickedOther.congregation !== congregation) {
      fail(`“${pickedOther.title}” is on the ${congregationName(pickedOther.congregation as CongregationId)} page. Pick a ${congregationName(congregation)} message.`);
      return;
    }
    const sentAnswers = pickQ && answers[pickQ.id] === '__current__' && currentSermon?.id
      ? { ...answers, [pickQ.id]: currentSermon.id }
      : answers;
    setBusy(true); onError(''); setFormError(''); setDone(false); setHeld(false); setLive(null);
    try {
      const data = await intake<{
        preview?: FormattedSermon | null;
        published?: boolean;
        pending?: boolean;
        publish_result?: { sermon?: { id?: string; title?: string; youtubeUrl?: string } | null; cornerAdded?: number };
      }>('submit', {
        answers: sentAnswers,
        campusId: pickCampus || staff.campusId,
        job,
        congregation: sermonForm ? congregation : undefined,
        formatted_sermon: preview || undefined,
      });
      if (data.preview) setPreview(data.preview);
      setSavedCongregation(congregation);
      setDone(true);
      // Saved but waiting: the campus has not been confirmed yet, so nothing is live.
      if (data.pending) setHeld(true);
      const published = data.publish_result?.sermon;
      if (sermonForm && !data.pending) {
        if (!published?.id) {
          fail('Saved, but nothing reached the congregation page — there were no notes or title to publish.');
        } else {
          // Read it back the way the congregation does, so "It's on the page" is a fact, not a hope.
          let verified = false;
          let checked = false;
          let empty = false;
          let showing = '';
          const savedTitle = published.title || data.preview?.title || '';
          // The media form saves a link: it is on the page only when the page
          // shows the message it was saved on AND carries the link just saved.
          const savedLink = job === 'media'
            ? String((youtubeQ && answers[youtubeQ.id]) || published.youtubeUrl || '').trim()
            : '';
          try {
            const r = await fetch(`${localApiBase()}/api/published-sermon?congregation=${encodeURIComponent(congregation)}`, { cache: 'no-store' });
            const j = r.ok ? await r.json() : null;
            checked = !!(j && typeof j === 'object');
            empty = checked && !(j.sermon && j.sermon.id);
            const same = !!(j && j.sermon && j.sermon.id === published.id);
            verified = same && (job !== 'media' || sameVideo(j.sermon.youtubeUrl, savedLink));
            // Another message on the page is named by id, never hidden because
            // it shares a title; its Sunday tells two of the same name apart.
            showing = j && j.sermon && j.sermon.id && !same ? otherMessageLabel(j.sermon, savedTitle) : '';
          } catch { /* verified and checked stay false */ }
          setLive({ title: savedTitle, verified, checked, empty, showing });
        }
      }
      await load(pickCampus || staff.campusId || undefined);
    } catch (err) {
      const code = (err as { data?: { code?: string } })?.data?.code;
      // A title was typed only when the picker was the text box (no choices)
      // and the value is not the id the card handed over; anything else is a
      // stale id to clear.
      const seededPick = pickQ ? seed?.answers?.[pickQ.id] : undefined;
      const typedTitle = pickQ && pickChoices.length === 0 && typeof answers[pickQ.id] === 'string'
        && answers[pickQ.id] !== '__current__' && answers[pickQ.id] !== seededPick ? String(answers[pickQ.id]) : '';
      if (pickQ && code === 'target_gone' && typedTitle) {
        // A typed title that matches no message: keep it to correct, and say
        // where a new message goes instead of "pick again" from an empty list.
        fail(`No message called “${typedTitle}” is on the ${congregationName(congregation)} page. Check the title, or put the message up first with “Put up this week’s sermon notes”; the link is still filled in.`);
      } else if (pickQ && (code === 'target_gone' || code === 'other_congregation')) {
        // The message is gone (or belongs to another church): clear the pick,
        // keep the link, and reload the list so only real messages are offered.
        setAnswers(a => ({ ...a, [pickQ.id]: '' }));
        fail('That message is no longer on the list. Pick another, or put it up first with “Put up this week’s sermon notes”; the link is still filled in.');
        void load(pickCampus || staff.campusId || undefined);
      } else {
        fail(err instanceof Error ? err.message : 'Could not submit');
      }
    }
    setBusy(false);
  };

  // The hub form shows its own help under the YouTube question, so its stored
  // words are not offered for rewording there (the editor would not match the page).
  const wordingFor = (q: Question) => rewordable.includes(q.id) && !(job === 'hub' && q.config?.sermonKey === 'youtubeUrl') ? (
    <QuestionWording
      question={q}
      isAdmin={staff.isAdmin}
      editing={editingId === q.id}
      saved={wordingSaved === q.id}
      onEditingChange={editing => { setEditingId(editing ? q.id : null); setWordingSaved(null); }}
      onReworded={question => {
        setQuestions(qs => qs.map(row => row.id === question.id ? question : row));
        setEditingId(id => id === question.id ? null : id); setWordingSaved(question.id);
      }}
      onReload={() => load(pickCampus || staff.campusId || undefined)}
      onStopAsking={id => {
        setQuestions(qs => qs.filter(row => row.id !== id));
        setEditingId(current => current === id ? null : current); setWordingSaved(null);
      }}
    />
  ) : null;

  return (
    <form noValidate onSubmit={submit} onChangeCapture={() => setWordingSaved(null)}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 8px' }}>
        {job === 'hub' ? 'This week’s sermon notes' : job === 'media' ? 'YouTube and notes' : 'Campus corner'}
      </h2>
      <p style={{ ...helpStyle, marginBottom: 28 }}>{formIntro(job)}</p>
      {rewordable.length > 0 && <p style={{ ...helpStyle, fontSize: 15 }}>{t('staff_wording_guide', getLang())}</p>}

      {sermonForm && (
        <Field label="Which church is this for?" help="Each church has its own Sermon Notes page. People pick theirs from the banner in the app.">
          <select
            value={congregation}
            onChange={e => pickCongregation(e.target.value)}
            style={inputStyle}
            data-testid="staff-congregation"
          >
            {CONGREGATIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}

      {staff.isAdmin && job === 'campus' && (
        <Field label="Which campus?">
          <select
            value={pickCampus}
            onChange={async e => {
              const v = e.target.value;
              setPickCampus(v);
              if (v) await load(v);
            }}
            style={inputStyle}
          >
            <option value="">Select campus</option>
            {campuses.filter(c => c.id !== 'other').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      )}

      {formQs.map((q, i) => (
        <QuestionField
          key={q.id}
          q={(job === 'hub' || job === 'campus') ? {
            ...q,
            label: withStep(i + 1, q.label),
            help: job === 'hub' && q.config?.sermonKey === 'youtubeUrl' ? 'You can add this after Sunday.' : q.help,
          } : q}
          wording={wordingFor(q)}
          problem={q.config?.sermonKey === 'youtubeUrl' ? youtubeProblem : ''}
          value={answers[q.id]}
          campusLocked={campusLocked}
          lockedCampus={staff.campusId}
          cornerItems={cornerItems}
          sermons={pickChoices}
          require={q.required && (q.audience === job || q.audience === 'all')}
          onChange={v => setAnswer(q.id, v)}
        />
      ))}

      {sermonForm && (haveQ || pasteQ || aiQ) && (
        <NotesFlow
          stepStart={job === 'hub' ? stepStart : 0}
          haveQ={haveQ}
          pasteQ={pasteQ}
          aiQ={aiQ}
          haveNotes={haveQ ? answers[haveQ.id] : true}
          paste={paste}
          wantAI={aiQ ? answers[aiQ.id] : ''}
          showPaste={showPaste}
          showAI={showAI}
          busy={busy}
          preview={preview}
          onHave={v => haveQ && setAnswer(haveQ.id, v)}
          onPaste={v => pasteQ && setAnswer(pasteQ.id, v)}
          onAI={v => {
            if (!aiQ) return;
            const next = { ...answers, [aiQ.id]: v };
            setWordingSaved(null);
            setAnswers(next);
            setPreview(null);
            setDone(false);
            if (v === true) runPreview(next);
          }}
          onFormat={runPreview}
        />
      )}

      {sermonForm && preview && wantsAI && (
        <p style={{ ...helpStyle, marginBottom: 12 }}>
          The preview above is not live yet. The button below puts it on the congregation page.
        </p>
      )}
      <div style={{ position: editingId ? 'static' : 'sticky', bottom: 0, background: 'var(--dw-canvas)', paddingTop: 12, paddingBottom: 12, zIndex: 1 }}>
        {loadError ? (
          <>
            <p role="alert" style={{ fontSize: 15, color: 'var(--dw-error)', fontWeight: 600 }}>{loadError}</p>
            <button type="button" className="dw-next mos-button mos-button--primary" style={{ ...btnPrimary, minHeight: 56, width: '100%', fontSize: 15 }} onClick={() => load(pickCampus || staff.campusId || undefined)}>
              {t('staff_form_load_again', getLang())}
            </button>
          </>
        ) : (
          <>
            {formError && (
              <p ref={errorRef} role="alert" style={{ color: 'var(--dw-error)', fontSize: 15, fontFamily: 'var(--font-sans)', fontWeight: 600, margin: '0 0 12px' }}>
                {formError}
              </p>
            )}
            <button type="submit" className={editingId ? 'mos-button mos-button--primary' : 'dw-next mos-button mos-button--primary'} aria-disabled={busy || !loaded || questions.length === 0} style={{ ...(editingId ? btnGhost : btnPrimary), minHeight: 56, width: '100%', fontSize: 15, marginTop: 8 }}>
              {busy || loading ? 'Working…' : job === 'campus' ? 'Put this on the campus corner' : job === 'media' ? mediaButtonLabel : 'Put this on the congregation page'}
            </button>
            {mediaKeepsCurrentMessage && (
              <p style={{ ...helpStyle, fontSize: 15, marginTop: 8 }}>
                “{currentSermon.title}” stays the message on the {congregationName(congregation)} page.
              </p>
            )}
            {loaded && questions.length === 0 && <p className="fx-why" style={{ ...helpStyle, fontSize: 15 }}>{t('staff_form_nothing_yet', getLang())}</p>}
          </>
        )}
      </div>
      {done && !formError && (
        <div style={{ marginTop: 12, fontFamily: 'var(--font-sans)' }}>
          <p style={{ margin: 0, color: 'var(--dw-info)', fontSize: 15, fontWeight: 600 }}>
            {held
              ? 'Saved. It goes on the campus corner once your campus is confirmed.'
              : job === 'campus'
              ? 'It’s on the campus corner.'
              : live?.verified
                ? `It’s on the ${congregationName(doneCongregation)} page: ${live.title}`
                : live && !live.verified && live.showing
                  ? job === 'media'
                    ? `The video is saved on “${live.title}”. The ${congregationName(doneCongregation)} page shows “${live.showing}”, the message that is on now.`
                    : `Saved as “${live.title}”. The ${congregationName(doneCongregation)} page shows “${live.showing}”, the message that is on now.`
                : live && !live.verified && live.checked === false
                  ? job === 'media'
                    ? `The video is saved on “${live.title}”. We couldn’t check the ${congregationName(doneCongregation)} page just now: open it to see.`
                    : `Saved as “${live.title}”. We couldn’t check the ${congregationName(doneCongregation)} page just now: open it to see.`
                : live && !live.verified && live.empty
                  ? job === 'media'
                    ? `The video is saved on “${live.title}”. The ${congregationName(doneCongregation)} page shows no message right now.`
                    : `Saved as “${live.title}”. The ${congregationName(doneCongregation)} page shows no message right now.`
                : live
                  ? `Saved as “${live.title}”. The ${congregationName(doneCongregation)} page has not shown it yet — open it and pull to refresh.`
                  : 'Saved.'}
          </p>
          {job !== 'campus' && !held && (
            <a href={congregationPageUrl(doneCongregation)} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 15, color: 'var(--dw-accent)', fontWeight: 600 }}>
              Open the {congregationName(doneCongregation)} page →
            </a>
          )}
        </div>
      )}

      {mine.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--dw-text-muted)' }}>
            Your recent submissions
          </h3>
          {mine.map(s => (
            <p key={s.id} style={{ fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--dw-text-secondary)', margin: '8px 0' }}>
              {new Date(s.created_at).toLocaleString()} · {s.status}
            </p>
          ))}
        </div>
      )}
    </form>
  );
}

function Field({ label, help, htmlFor, afterHelp, children }: { label: string; help?: string; htmlFor?: string; afterHelp?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <label htmlFor={htmlFor} style={labelStyle}>{label}</label>
      {help ? <p style={helpStyle}>{help}</p> : null}
      {afterHelp}
      {children}
    </div>
  );
}

function NotesFlow({
  stepStart = 0, haveQ, pasteQ, aiQ, haveNotes, paste, wantAI, showPaste, showAI,
  busy, preview, onHave, onPaste, onAI, onFormat,
}: {
  stepStart?: number;
  haveQ?: Question;
  pasteQ?: Question;
  aiQ?: Question;
  haveNotes: unknown;
  paste: string;
  wantAI: unknown;
  showPaste: boolean;
  showAI: boolean;
  busy: boolean;
  preview: FormattedSermon | null;
  onHave: (v: boolean) => void;
  onPaste: (v: string) => void;
  onAI: (v: boolean) => void;
  onFormat: () => void;
}) {
  let step = stepStart;
  const haveLabel = haveQ ? withStep(++step, 'Do you have your notes?') : '';
  const pasteLabel = pasteQ ? withStep(++step, 'Paste your notes.') : '';
  const aiLabel = aiQ ? withStep(++step, 'Would you like AI to format these for the congregation?') : '';
  return (
    <div>
      {haveQ && (
        <Field label={haveLabel} help={haveQ.help} htmlFor={`q-${haveQ.id}`}>
          <YesNo id={`q-${haveQ.id}`} value={haveNotes} onChange={onHave} required={haveQ.required} />
        </Field>
      )}
      {showPaste && pasteQ && (
        <Field label={pasteLabel} help="Whatever you have is fine." htmlFor={`q-${pasteQ.id}`}>
          <textarea
            id={`q-${pasteQ.id}`}
            value={paste}
            onChange={e => onPaste(e.target.value)}
            rows={10}
            placeholder="Paste your notes"
            style={{ ...inputStyle, minHeight: 180, resize: 'vertical' as const }}
          />
        </Field>
      )}
      {showAI && aiQ && (
        <Field label={aiLabel} help="Optional. You can look first, or save and it formats then." htmlFor={`q-${aiQ.id}`}>
          <YesNo id={`q-${aiQ.id}`} value={wantAI} onChange={onAI} />
        </Field>
      )}
      {showAI && wantAI === true && (
        <div style={{ marginBottom: 32 }}>
          {busy && !preview && <p style={helpStyle}>Formatting…</p>}
          {preview && (
            <>
              <p style={{ ...helpStyle, marginBottom: 12 }}>
                This is what people will write in on Sunday. Save puts it on the page. Make another if you want a different pass.
              </p>
              <div className="dw-sermon-notes-phone">
                <SermonNotesSurface sermon={preview as SermonNotesData} persist={false} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <button type="button" style={btnGhost} disabled={busy} onClick={onFormat}>
                  {busy ? 'Working…' : 'Make another'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function YesNo({ id, value, onChange, required }: { id: string; value: unknown; onChange: (v: boolean) => void; required?: boolean }) {
  const v = value === true ? 'yes' : value === false ? 'no' : '';
  return (
    <select
      id={id}
      required={required}
      value={v}
      onChange={e => onChange(e.target.value === 'yes')}
      style={inputStyle}
    >
      <option value="">Choose…</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );
}

function SermonPreview({ sermon }: { sermon: FormattedSermon }) {
  return (
    <div className="dw-sermon-notes-phone">
      <SermonNotesSurface sermon={sermon as SermonNotesData} persist={false} />
    </div>
  );
}

function wordingError(err: unknown): string {
  const status = err instanceof Error && 'status' in err ? err.status : undefined;
  const key = status === 400 ? 'staff_wording_too_short'
    : status === 403 ? 'staff_wording_not_allowed'
    : status === 404 ? 'staff_wording_gone'
    : status === 409 ? 'staff_wording_changed'
    : 'staff_wording_failed';
  return t(key, getLang());
}

function QuestionWording({ question, isAdmin, editing, saved, onEditingChange, onReworded, onReload, onStopAsking }: {
  question: Question;
  isAdmin: boolean;
  editing: boolean;
  saved: boolean;
  onEditingChange: (editing: boolean) => void;
  onReworded: (question: Question) => void;
  onReload: () => void;
  onStopAsking: (id: string) => void;
}) {
  const [label, setLabel] = useState(question.label);
  const [help, setHelp] = useState(question.help || '');
  const [saveError, setSaveError] = useState('');
  const [stopError, setStopError] = useState('');
  const [saveErrorStatus, setSaveErrorStatus] = useState<number | null>(null);
  const [stopErrorStatus, setStopErrorStatus] = useState<number | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [busy, setBusy] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing) editorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [editing]);
  const quiet: CSSProperties = { ...btnGhost, border: 'none', color: 'var(--dw-accent)', minHeight: 44, fontSize: 15 };
  const errorStyle: CSSProperties = { fontSize: 15, color: 'var(--dw-error)', margin: '8px 0', fontFamily: 'var(--font-sans)' };
  const labelId = `wording-label-${question.id}`;
  const helpId = `wording-help-${question.id}`;

  const save = async () => {
    if (busy) return;
    setSaveError('');
    setSaveErrorStatus(null);
    if (label.trim().length < 2) {
      setSaveError(t('staff_wording_too_short', getLang()));
      return;
    }
    setBusy(true);
    try {
      const res = await intake<{ question: Question }>('question_wording_save', { id: question.id, label: label.trim(), help });
      onReworded(res.question);
    } catch (err) {
      const status = err instanceof Error && 'status' in err && typeof err.status === 'number' ? err.status : null;
      if (status === 401) return;
      setSaveError(wordingError(err));
      setSaveErrorStatus(status);
    } finally {
      setBusy(false);
    }
  };

  const stopAsking = async () => {
    if (busy) return;
    setStopError(''); setStopErrorStatus(null); setBusy(true);
    try {
      await intake<{ question: Question }>('question_enabled_set', { id: question.id, enabled: false });
      onStopAsking(question.id);
    } catch (err) {
      const status = err instanceof Error && 'status' in err && typeof err.status === 'number' ? err.status : null;
      if (status === 401) return;
      setStopError(wordingError(err));
      setStopErrorStatus(status);
    } finally {
      setBusy(false);
    }
  };

  if (!editing) return (
    <div style={{ marginBottom: 10 }}>
      <button type="button" style={quiet} onClick={() => {
        setLabel(question.label); setHelp(question.help || '');
        setSaveError(''); setStopError(''); setConfirmStop(false);
        onEditingChange(true);
      }}>{t('staff_change_wording', getLang())}</button>
      {saved && <p role="status" style={{ fontSize: 15, fontWeight: 600, color: 'var(--dw-text-primary)', margin: '8px 0' }}>{t('staff_wording_saved', getLang())}</p>}
    </div>
  );

  return (
    <div ref={editorRef} style={{ marginBottom: 16 }} onKeyDown={e => {
      if (e.key === 'Enter' && e.target instanceof HTMLInputElement) { e.preventDefault(); void save(); }
    }}>
      <Field label={t('staff_wording_question', getLang())} htmlFor={labelId}>
        <input id={labelId} type="text" value={label} maxLength={200} onChange={e => { setLabel(e.target.value); setSaveError(''); }} style={{ ...inputStyle, minHeight: 56, fontSize: 17 }} />
      </Field>
      <Field label={t('staff_wording_help', getLang())} htmlFor={helpId}>
        <textarea id={helpId} value={help} maxLength={500} onChange={e => { setHelp(e.target.value); setSaveError(''); }} rows={3} style={{ ...inputStyle, minHeight: 56, fontSize: 17, resize: 'vertical' }} />
      </Field>
      <div style={{ position: 'sticky', bottom: 0, background: 'var(--dw-canvas)', paddingTop: 12, paddingBottom: 12, zIndex: 2 }}>
        <button type="button" className="dw-next" aria-disabled={busy} aria-busy={busy} style={{ ...btnPrimary, minHeight: 56, width: '100%', fontSize: 15 }} onClick={save}>{t('staff_save_wording', getLang())}{busy ? '…' : ''}</button>
        {saveError && <p role="alert" style={errorStyle}>{saveError}</p>}
        {saveErrorStatus === 404 || saveErrorStatus === 409 ? <button type="button" style={quiet} onClick={onReload}>{t('staff_form_load_again', getLang())}</button> : null}
      </div>
      <button type="button" aria-disabled={busy} style={quiet} onClick={() => { if (busy) return; onEditingChange(false); }}>{t('staff_wording_cancel', getLang())}</button>
      {isAdmin && (confirmStop ? (
        <div>
          <p style={{ ...helpStyle, fontSize: 15 }}>{t('staff_stop_asking_confirm', getLang())}</p>
          <button type="button" aria-disabled={busy} style={{ ...btnGhost, minHeight: 44, fontSize: 15 }} onClick={stopAsking}>{t('staff_stop_asking', getLang())}</button>
          {stopError && <p role="alert" style={errorStyle}>{stopError}</p>}
          {stopErrorStatus === 404 || stopErrorStatus === 409 ? <button type="button" style={quiet} onClick={onReload}>{t('staff_form_load_again', getLang())}</button> : null}
          <button type="button" aria-disabled={busy} style={quiet} onClick={() => { if (busy) return; setConfirmStop(false); setStopError(''); }}>{t('staff_wording_cancel', getLang())}</button>
        </div>
      ) : (
        <button type="button" aria-disabled={busy} style={quiet} onClick={() => { if (busy) return; setConfirmStop(true); setSaveError(''); }}>{t('staff_stop_asking', getLang())}</button>
      ))}
    </div>
  );
}

function QuestionField({
  q, value, onChange, campusLocked, lockedCampus, cornerItems, sermons, require, problem, wording,
}: {
  q: Question;
  wording?: ReactNode;
  value: unknown;
  onChange: (v: unknown) => void;
  campusLocked: boolean;
  lockedCampus: string | null;
  cornerItems: CornerItem[];
  sermons?: SermonChoice[];
  require?: boolean;
  /** Inline validation message shown under the field (e.g. a bad YouTube link). */
  problem?: string;
}) {
  const campuses = useCampuses();
  const id = `q-${q.id}`;
  const required = require ?? q.required;
  if (q.type === 'campus') {
    const v = String(value || lockedCampus || '');
    return (
      <Field label={q.label} help={q.help} htmlFor={id} afterHelp={wording}>
        <select
          id={id}
          required={required}
          disabled={campusLocked}
          value={v}
          onChange={e => onChange(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select campus</option>
          {campuses.filter(c => c.id !== 'other').map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
    );
  }
  if (q.type === 'yes_no') {
    return (
      <Field label={q.label} help={q.help} htmlFor={id} afterHelp={wording}>
        <YesNo id={id} value={value} onChange={v => onChange(v)} required={required} />
      </Field>
    );
  }
  if (q.type === 'date') {
    return (
      <Field label={q.label} help={q.help} htmlFor={id} afterHelp={wording}>
        <input id={id} type="date" required={required} value={String(value || '')} onChange={e => onChange(e.target.value)} style={inputStyle} />
      </Field>
    );
  }
  if (q.type === 'sermon_pick' || q.config?.publish === 'sermon_target') {
    const choices = sermons || [];
    return (
      <Field label={q.label} help={q.help} htmlFor={id} afterHelp={wording}>
        {choices.length > 0 ? (
          <select id={id} required={required} value={String(value || '')} onChange={e => onChange(e.target.value)} style={inputStyle}>
            <option value="">Select this week's message</option>
            {choices.map(s => (
              <option key={s.id} value={s.id}>{s.title}{s.date ? ` · ${s.date}` : ''}</option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            type="text"
            required={required}
            value={String(value || '')}
            onChange={e => onChange(e.target.value)}
            placeholder="Sermon title"
            style={inputStyle}
          />
        )}
      </Field>
    );
  }
  if (q.type === 'long_text' || q.type === 'text') {
    const Comp = q.type === 'long_text' ? 'textarea' : 'input';
    return (
      <Field label={q.label} help={q.help} htmlFor={id} afterHelp={wording}>
        <Comp
          id={id}
          required={required}
          value={String(value || '')}
          onChange={e => onChange(e.target.value)}
          rows={q.type === 'long_text' ? 5 : undefined}
          aria-invalid={problem ? true : undefined}
          style={{ ...inputStyle, minHeight: q.type === 'long_text' ? 120 : undefined, resize: 'vertical' as const, ...(problem ? { borderColor: 'var(--dw-error)' } : {}) }}
        />
        {problem && (
          <p style={{ color: 'var(--dw-error)', fontSize: 15, fontFamily: 'var(--font-sans)', margin: '6px 0 0' }}>{problem}</p>
        )}
      </Field>
    );
  }
  if (q.type === 'corner_remove') {
    return (
      <Field label={q.label} help={q.help} htmlFor={id} afterHelp={wording}>
        {cornerItems.length === 0 ? (
          <p style={helpStyle}>Nothing is on the campus corner yet.</p>
        ) : (
          <select id={id} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)} style={inputStyle}>
            <option value="">Leave everything up</option>
            {cornerItems.map(item => (
              <option key={item.id} value={item.id}>{item.title}{item.type ? ` · ${item.type}` : ''}</option>
            ))}
          </select>
        )}
      </Field>
    );
  }
  return null;
}

function ReviewQueue({ onError }: { onError: (s: string) => void }) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'declined'>('approved');
  const [rows, setRows] = useState<Submission[]>([]);
  const [open, setOpen] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [restoring, setRestoring] = useState<string[]>([]);
  const [reloading, setReloading] = useState<Record<string, boolean>>({});
  const [askAgainErrors, setAskAgainErrors] = useState<Record<string, { message: string; status: number | null }>>({});
  const [askAgainDone, setAskAgainDone] = useState('');

  const load = useCallback(async () => {
    const [subs, qs] = await Promise.all([
      intake<{ submissions: Submission[] }>('submissions', { status }),
      intake<{ questions: Question[] }>('questions_list'),
    ]);
    setRows(subs.submissions || []);
    setQuestions(qs.questions || []);
  }, [status]);

  useEffect(() => { load().catch(err => onError(err.message)); }, [load, onError]);

  const decide = async (id: string, decision: 'approved' | 'declined') => {
    onError('');
    try {
      await intake('review', { id, decision });
      setOpen(null);
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not review');
    }
  };

  const askAgain = async (id: string) => {
    if (restoring.includes(id)) return;
    const label = questions.find(q => q.id === id)?.label || '';
    onError('');
    setAskAgainDone('');
    setAskAgainErrors(errors => { const next = { ...errors }; delete next[id]; return next; });
    setRestoring(ids => [...ids, id]);
    try {
      await intake<{ question: Question }>('question_enabled_set', { id, enabled: true });
      setQuestions(qs => qs.map(q => q.id === id ? { ...q, enabled: true } : q));
      setAskAgainDone(label);
      try {
        await load();
      } catch {
        // The enable succeeded; keep the local state and let the next refresh catch up.
      }
    } catch (err) {
      const status = err instanceof Error && 'status' in err && typeof err.status === 'number' ? err.status : null;
      if (status === 401) return;
      setAskAgainErrors(errors => ({ ...errors, [id]: { message: wordingError(err), status } }));
    } finally {
      setRestoring(ids => ids.filter(value => value !== id));
    }
  };

  const reloadQuestion = async (id: string) => {
    if (reloading[id]) return;
    setReloading(current => ({ ...current, [id]: true }));
    try {
      await load();
      setAskAgainErrors(errors => { const next = { ...errors }; delete next[id]; return next; });
    } catch (err) {
      const status = err instanceof Error && 'status' in err && typeof err.status === 'number' ? err.status : null;
      if (status === 401) return;
      setAskAgainErrors(errors => ({
        ...errors,
        [id]: { message: t('staff_ask_again_reload_failed', getLang()), status: errors[id]?.status ?? status },
      }));
    } finally {
      setReloading(current => ({ ...current, [id]: false }));
    }
  };

  const labelFor = useMemo(() => {
    const map: Record<string, string> = {};
    for (const q of questions) map[q.id] = q.label;
    return map;
  }, [questions]);

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 8px' }}>History</h2>
      <p style={{ ...helpStyle, marginBottom: 16 }}>What already went live. Saves go live on their own — this is a record, not a queue.</p>
      {(questions.some(q => q.enabled === false) || askAgainDone) && (
        <section style={{ marginBottom: 16 }}>
          {askAgainDone && <p role="status" style={{ fontSize: 15, color: 'var(--dw-text-primary)', fontWeight: 600, fontFamily: 'var(--font-sans)', margin: '0 0 8px' }}>{t('staff_ask_again_done', getLang()).replace('{label}', askAgainDone)}</p>}
          <h3 style={{ fontSize: 17, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{t('staff_switched_off_questions', getLang())}</h3>
          {questions.filter(q => q.enabled === false).map(q => (
            <div key={q.id} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 15, margin: '0 0 8px', fontFamily: 'var(--font-sans)' }}>{q.label}</p>
              <button type="button" aria-disabled={restoring.includes(q.id)} aria-busy={restoring.includes(q.id)} style={{ ...btnGhost, minHeight: 44, fontSize: 15 }} onClick={() => askAgain(q.id)}>{restoring.includes(q.id) ? t('staff_ask_again_busy', getLang()) : t('staff_ask_again', getLang())}</button>
              {askAgainErrors[q.id] && <p role="alert" style={{ fontSize: 15, color: 'var(--dw-error)', fontFamily: 'var(--font-sans)', margin: '8px 0' }}>{askAgainErrors[q.id].message}</p>}
              {askAgainErrors[q.id]?.status === 404 || askAgainErrors[q.id]?.status === 409 ? <button type="button" aria-busy={reloading[q.id] || undefined} aria-disabled={reloading[q.id] || undefined} style={{ ...btnGhost, border: 'none', color: 'var(--dw-accent)', minHeight: 44, fontSize: 15 }} onClick={() => reloadQuestion(q.id)}>{reloading[q.id] ? t('staff_ask_again_busy_list', getLang()) : t('staff_ask_again_reload', getLang())}</button> : null}
            </div>
          ))}
        </section>
      )}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['pending', 'approved', 'declined'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            style={{
              ...btnGhost, minHeight: 36, padding: '6px 12px', textTransform: 'capitalize',
              background: status === s ? 'var(--dw-accent)' : 'transparent',
              color: status === s ? '#fff' : 'var(--dw-text-muted)',
              borderColor: status === s ? 'var(--dw-accent)' : 'var(--dw-border)',
            }}
          >
            {s}
          </button>
        ))}
      </div>
      {rows.length === 0 && status === 'pending' && (
        <p style={helpStyle}>Nothing waiting. New saves go live when staff put them up.</p>
      )}
      {rows.length === 0 && status !== 'pending' && <p style={helpStyle}>Nothing in {status}.</p>}
      {rows.map(row => (
        <button
          key={row.id}
          type="button"
          onClick={() => setOpen(row)}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            border: '1px solid var(--dw-border)', borderRadius: 14, padding: 14,
            background: 'var(--dw-card)', marginBottom: 10, cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <span style={{ display: 'block', fontWeight: 700, color: 'var(--dw-text-primary)' }}>{row.email}</span>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--dw-text-muted)', marginTop: 4 }}>
            {new Date(row.created_at).toLocaleString()}
            {row.campus_id ? ` · ${campusName(row.campus_id)}` : ''}
            {row.role === 'hub' ? ' · sermon notes' : ''}
          </span>
        </button>
      ))}

      {open && (
        <div style={{ marginTop: 8, padding: 16, border: '1px solid var(--dw-border)', borderRadius: 16, background: 'var(--dw-card)' }}>
          <p style={{ fontWeight: 700, fontFamily: 'var(--font-sans)', margin: '0 0 12px' }}>
            {open.email} · {campusName(open.campus_id) || 'no campus'}
          </p>
          {open.formatted_sermon && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ ...labelStyle, marginBottom: 8 }}>Formatted notes + video</p>
              <SermonPreview sermon={open.formatted_sermon} />
            </div>
          )}
          {Object.entries(open.answers || {}).map(([id, val]) => (
            <div key={id} style={{ marginBottom: 12 }}>
              <p style={{ ...labelStyle, marginBottom: 4 }}>{labelFor[id] || id}</p>
              <pre style={{
                whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', fontSize: 13,
                color: 'var(--dw-text-secondary)', margin: 0, background: 'var(--dw-surface)',
                padding: 12, borderRadius: 10, overflow: 'auto',
              }}>
                {typeof val === 'string' ? val : JSON.stringify(val, null, 2)}
              </pre>
            </div>
          ))}
          {open.status === 'pending' ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" style={btnPrimary} onClick={() => decide(open.id, 'approved')}>Put this live</button>
              <button type="button" style={btnGhost} onClick={() => decide(open.id, 'declined')}>Decline leftover</button>
              <button type="button" style={btnGhost} onClick={() => setOpen(null)}>Close</button>
            </div>
          ) : (
            <div>
              {open.publish_result && (
                <p style={helpStyle}>
                  Published
                  {open.publish_result.cornerAdded ? ` · +${open.publish_result.cornerAdded} campus items` : ''}
                  {open.publish_result.cornerRemoved ? ` · −${open.publish_result.cornerRemoved} campus items` : ''}
                  {open.publish_result.sermon ? ` · sermon “${open.publish_result.sermon.title}”` : ''}
                </p>
              )}
              <button type="button" style={btnGhost} onClick={() => setOpen(null)}>Close</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type RosterRow = {
  email: string; role: Role; campus_id: string | null; display_name: string;
  has_password?: boolean; code_live?: boolean; code_expires_at?: string | null;
};
type IssuedCode = { email: string; code: string; expiresAt: string };

type AdminCampus = {
  id: string; name: string; city: string; towns: string[]; region: string; congregation: string | null;
  timeZone: string; sundayUntil: string; videoUrl: string | null; sortOrder: number;
  pcoNames: string[]; active: boolean;
};

type CampusDraft = {
  id: string; name: string; city: string; towns: string; region: string; timeZone: string;
  sundayUntil: string; congregation: string | null; pcoNames: string; videoUrl: string; active: boolean;
};

const campusInputStyle: CSSProperties = { ...inputStyle, fontSize: 17, minHeight: 56 };
const campusMainStyle: CSSProperties = {
  border: 'none', borderRadius: 999,
  minHeight: 56, width: '100%', padding: '12px 18px', fontSize: 17, fontWeight: 700,
  fontFamily: 'var(--font-sans)', cursor: 'pointer',
};
const campusGhost: CSSProperties = { ...btnGhost, fontSize: 15 };

function campusSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
}

function campusZones(campuses: AdminCampus[]) {
  const fallback = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Australia/Sydney', 'Europe/London'];
  try {
    const values = (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    if (values) return values('timeZone');
  } catch { /* use the short fallback */ }
  return Array.from(new Set([...campuses.map(c => c.timeZone), ...fallback]));
}

function campusDraftFromRow(c: AdminCampus): CampusDraft {
  return { id: c.id, name: c.name, city: c.city, towns: (c.towns || []).join('\n'), region: c.region, timeZone: c.timeZone, sundayUntil: c.sundayUntil || '16:00', congregation: c.congregation, pcoNames: c.pcoNames.join('\n'), videoUrl: c.videoUrl || '', active: c.active };
}

function Campuses({ onError }: { onError: (s: string) => void }) {
  const [campuses, setCampuses] = useState<AdminCampus[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);
  const [loadError, setLoadError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<CampusDraft | null>(null);
  const [idTouched, setIdTouched] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(!hasLoaded.current); setLoadError('');
    try {
      const data = await intake<{ campuses: AdminCampus[] }>('campuses_list');
      setCampuses(data.campuses || []);
      hasLoaded.current = true;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load campuses');
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const regions = Array.from(new Set(campuses.map(c => c.region).filter(Boolean)));
  const zones = campusZones(campuses);
  const openRow = (campus: AdminCampus) => {
    setAdding(false); setOpenId(campus.id); setDraft(campusDraftFromRow(campus)); setSaveStatus(''); onError('');
  };
  const openAdd = () => {
    setAdding(true); setOpenId(null); setDraft({ id: '', name: '', city: '', towns: '', region: '', timeZone: '', sundayUntil: '16:00', congregation: null, pcoNames: '', videoUrl: '', active: true }); setIdTouched(false); setSaveStatus(''); onError('');
  };
  const closeEditor = () => { setOpenId(null); setAdding(false); setDraft(null); onError(''); };

  if (loading) return <p style={{ fontSize: 15, fontFamily: 'var(--font-sans)' }}>Loading campuses…</p>;
  if (loadError) return <div><p role="alert" style={{ fontSize: 15, fontFamily: 'var(--font-sans)', color: 'var(--dw-error)' }}>{loadError}</p><button type="button" style={campusGhost} onClick={load}>Load campuses again</button></div>;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 8px' }}>Campuses</h2>
      <p style={{ ...helpStyle, fontSize: 15, marginBottom: 16 }}>{campuses.length} campuses. Readers see them in this order.</p>
      <p style={{ fontSize: 15, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', lineHeight: 1.5, margin: '0 0 24px' }}><strong>How this connects:</strong> This one list feeds the reader app’s campus picker, the prayer wall’s campus names, campus pastor codes, Planning Center matching, and which Sermon Notes page a campus reads first. It also guesses a new reader's campus (from a link or QR code ending in ?campus= and the campus id, from their Planning Center record, or from their town, matched against each campus's Town and its other towns) and asks them one question; nothing is saved until they tap Yes. Readers see a change within five minutes.</p>
      {saveStatus && <p role="status" style={{ fontSize: 15, fontFamily: 'var(--font-sans)', color: 'var(--dw-text-secondary)', margin: '0 0 16px' }}>{saveStatus}</p>}
      {campuses.map(campus => (
        <div key={campus.id} style={{ marginBottom: 10 }}>
          <button type="button" aria-expanded={openId === campus.id} aria-label={`${campus.name}, ${campus.city}, ${campus.timeZone}${campus.active ? '' : ', hidden from readers'}`} onClick={() => openId === campus.id ? closeEditor() : openRow(campus)} style={{ display: 'block', width: '100%', minHeight: 56, textAlign: 'left', background: 'var(--dw-card)', border: '1px solid var(--dw-border)', borderRadius: 14, padding: '12px 16px', cursor: 'pointer' }}>
            <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 700 }}>{campus.name}</span>
            <span style={{ display: 'block', marginTop: 3, fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--dw-text-secondary)' }}>{campus.city} · {campus.region} · {campus.timeZone}</span>
            {!campus.active && <span style={{ display: 'block', marginTop: 3, fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--dw-text-secondary)' }}>Hidden from readers</span>}
          </button>
          {openId === campus.id && draft && <CampusEditor draft={draft} setDraft={setDraft} isNew={false} regions={regions} zones={zones} campuses={campuses} idTouched={idTouched} setIdTouched={setIdTouched} onClose={closeEditor} onSaved={async name => { closeEditor(); await load(); setSaveStatus(`Saved. Readers will see ${name} within five minutes.`); }} onMoved={async () => { await load(); }} onError={onError} />}
        </div>
      ))}
      {adding && draft ? <CampusEditor draft={draft} setDraft={setDraft} isNew regions={regions} zones={zones} campuses={campuses} idTouched={idTouched} setIdTouched={setIdTouched} onClose={closeEditor} onSaved={async name => { closeEditor(); await load(); setSaveStatus(`Saved. Readers will see ${name} within five minutes.`); }} onMoved={async () => {}} onError={onError} /> : !openId ? <button type="button" className="dw-next dw-campus-main" style={{ ...campusMainStyle, marginTop: 14 }} onClick={openAdd}>Add a campus</button> : null}
    </div>
  );
}

function CampusEditor({ draft, setDraft, isNew, regions, zones, campuses, idTouched, setIdTouched, onClose, onSaved, onMoved, onError }: { draft: CampusDraft; setDraft: (d: CampusDraft) => void; isNew: boolean; regions: string[]; zones: string[]; campuses: AdminCampus[]; idTouched: boolean; setIdTouched: (v: boolean) => void; onClose: () => void; onSaved: (name: string) => Promise<void>; onMoved: (id: string) => Promise<void>; onError: (s: string) => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newRegion, setNewRegion] = useState(false);
  const patch = (part: Partial<CampusDraft>) => setDraft({ ...draft, ...part });
  const regionPrefix = (region: string) => (campuses.find(c => c.region === region)?.id.split('-')[0] || region.slice(0, 2)).toLowerCase();
  const setName = (name: string) => patch({ name, ...(!isNew || idTouched ? {} : { id: draft.region ? `${regionPrefix(draft.region)}-${campusSlug(name)}` : campusSlug(name) }) });
  const setRegion = (region: string, chooseZone = true) => { const regionZones = campuses.filter(c => c.region === region).map(c => c.timeZone); const preferredZone = regionZones.length ? regionZones.sort((a, b) => regionZones.filter(x => x === b).length - regionZones.filter(x => x === a).length)[0] : ''; const prefix = regionPrefix(region); patch({ region, ...(chooseZone ? { timeZone: preferredZone || draft.timeZone } : {}), ...(!isNew || idTouched ? {} : { id: `${prefix}-${campusSlug(draft.name)}` }) }); };
  const save = async () => {
    const message = !draft.name.trim() ? 'Add the campus name first.' : !draft.region.trim() ? 'Choose the campus’s region first.' : !draft.timeZone ? 'Choose the campus’s time zone first.' : '';
    if (message) { setError(message); return; }
    setBusy(true); setError(''); onError('');
    try {
      await intake<{ campus: AdminCampus; isNew: boolean }>('campus_save', { campus: { ...draft, name: draft.name.trim(), pcoNames: draft.pcoNames, towns: draft.towns, videoUrl: draft.videoUrl.trim() || null, isNew } });
      await onSaved(draft.name.trim());
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save the campus'); }
    setBusy(false);
  };
  const move = async (direction: 'up' | 'down') => {
    setError('');
    try { await intake('campus_move', { id: draft.id, direction }); onError(''); await onMoved(draft.id); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not move the campus'); }
  };
  return (
    <form noValidate onSubmit={e => { e.preventDefault(); save(); }} style={{ padding: '18px 4px 0' }}>
      {isNew ? <Field label="Campus id" htmlFor="campus-id"><input id="campus-id" value={draft.id} onChange={e => { setIdTouched(true); patch({ id: e.target.value }); }} style={campusInputStyle} /></Field> : <p style={{ fontSize: 15, fontFamily: 'var(--font-sans)', margin: '0 0 24px' }}><strong>{draft.id}</strong> <span style={{ color: 'var(--dw-text-secondary)' }}>The id never changes once saved</span></p>}
      <Field label="Name" htmlFor="campus-name"><input id="campus-name" value={draft.name} onChange={e => setName(e.target.value)} style={campusInputStyle} /></Field>
      <Field label="Town" htmlFor="campus-town"><input id="campus-town" value={draft.city} onChange={e => patch({ city: e.target.value })} style={campusInputStyle} /></Field>
      <Field label="Other towns near this campus" htmlFor="campus-towns"><p id="campus-towns-help" style={{ fontSize: 15, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', margin: '0 0 10px', lineHeight: 1.45 }}>Optional. Towns this campus’s readers live in besides its own town, one per line. New readers in these towns are asked about this campus. Write a town under more than one campus and readers there choose from a short list instead. When one of those is a Futures campus and the other a Futuros campus, the reader’s language picks between them.</p><textarea id="campus-towns" aria-describedby="campus-towns-help" value={draft.towns} onChange={e => patch({ towns: e.target.value })} rows={3} style={{ ...campusInputStyle, resize: 'vertical' }} /></Field>
      <Field label="Region" htmlFor="campus-region"><select id="campus-region" value={newRegion ? '__new__' : draft.region} onChange={e => { if (e.target.value === '__new__') { setNewRegion(true); patch({ region: '' }); } else { setNewRegion(false); setRegion(e.target.value); } }} style={campusInputStyle}><option value="">Choose a region</option>{regions.map(region => <option key={region} value={region}>{region}</option>)}<option value="__new__">New region…</option></select>{newRegion && <input id="campus-region-new" aria-label="New region name" value={draft.region} onChange={e => setRegion(e.target.value, false)} placeholder="Region name" style={{ ...campusInputStyle, marginTop: 10 }} />}</Field>
      <Field label="Time zone" htmlFor="campus-zone"><select id="campus-zone" value={draft.timeZone} onChange={e => patch({ timeZone: e.target.value })} style={campusInputStyle}><option value="">Choose a time zone</option>{zones.map(zone => <option key={zone} value={zone}>{zone}</option>)}{draft.timeZone && !zones.includes(draft.timeZone) && <option value={draft.timeZone}>{draft.timeZone}</option>}</select></Field>
      <Field label="Sunday notes show on Home until" htmlFor="campus-sunday"><input id="campus-sunday" type="time" value={draft.sundayUntil} onChange={e => patch({ sundayUntil: e.target.value })} style={campusInputStyle} /></Field>
      <Field label="Which Sermon Notes page it reads first" htmlFor="campus-congregation"><select id="campus-congregation" value={draft.congregation || ''} onChange={e => patch({ congregation: e.target.value || null })} style={campusInputStyle}><option value="">None (worked out from the campus)</option>{CONGREGATIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Planning Center spellings" htmlFor="campus-pco"><p id="campus-pco-help" style={{ fontSize: 15, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', margin: '0 0 10px', lineHeight: 1.45 }}>Optional. How this campus is spelled in Planning Center, one per line.</p><textarea id="campus-pco" aria-describedby="campus-pco-help" value={draft.pcoNames} onChange={e => patch({ pcoNames: e.target.value })} rows={4} style={{ ...campusInputStyle, resize: 'vertical' }} /></Field>
      <Field label="Livestream link" htmlFor="campus-video"><p id="campus-video-help" style={{ fontSize: 15, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', margin: '0 0 10px', lineHeight: 1.45 }}>Optional. https://…</p><input id="campus-video" aria-describedby="campus-video-help" type="url" value={draft.videoUrl} onChange={e => patch({ videoUrl: e.target.value })} style={campusInputStyle} /></Field>
      {!isNew && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}><button type="button" style={campusGhost} onClick={() => move('up')}>Move up</button><button type="button" style={campusGhost} onClick={() => move('down')}>Move down</button><button type="button" style={campusGhost} onClick={() => patch({ active: !draft.active })}>{draft.active ? 'Hide from readers' : 'Show to readers'}</button>{!draft.active && <span style={{ alignSelf: 'center', fontSize: 15, color: 'var(--dw-text-secondary)' }}>Readers stop seeing it when you save.</span>}<button type="button" style={campusGhost} onClick={onClose}>Close</button></div>}
      <div style={{ position: 'sticky', bottom: 0, background: 'var(--dw-canvas)', paddingTop: 12, paddingBottom: 12 }}><button type="submit" className="dw-next dw-campus-main" disabled={busy} style={campusMainStyle}>{busy ? 'Saving…' : 'Save campus'}</button>{error && <p role="alert" style={{ fontSize: 15, color: 'var(--dw-error)', fontFamily: 'var(--font-sans)', margin: '8px 0 0' }}>{error}</p>}</div>
      {isNew && <button type="button" style={{ ...campusGhost, marginTop: 4 }} onClick={onClose}>Cancel</button>}
    </form>
  );
}

function formatExpiry(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function Roster({ onError }: { onError: (s: string) => void }) {
  const campuses = useCampuses();
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('campus');
  const [campusId, setCampusId] = useState('');
  const [name, setName] = useState('');
  // The plain code exists only in this response; the server keeps a hash. Shown until dismissed.
  const [issued, setIssued] = useState<IssuedCode | null>(null);

  const load = useCallback(async () => {
    const data = await intake<{ roster: RosterRow[] }>('roster_list');
    setRows(data.roster || []);
  }, []);
  useEffect(() => { load().catch(err => onError(err.message)); }, [load, onError]);

  const showCode = (forEmail: string, data: { setupCode?: string; setupCodeExpiresAt?: string }) => {
    if (data.setupCode) setIssued({ email: forEmail, code: data.setupCode, expiresAt: data.setupCodeExpiresAt || '' });
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 8px' }}>People</h2>
      <p style={{ ...helpStyle, marginBottom: 16 }}>
        Who can sign in. Adding someone gives you a one-time setup code to hand them; they use it to choose their own password.
      </p>
      {issued && (
        <div role="status" data-testid="staff-setup-code" style={{ border: '2px solid var(--dw-accent)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--dw-text-secondary)' }}>
            Setup code for {issued.email}
          </p>
          <p style={{ margin: '6px 0', fontFamily: 'var(--font-mono, monospace)', fontSize: 28, fontWeight: 700, letterSpacing: '0.12em' }}>{issued.code}</p>
          <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--dw-text-secondary)', lineHeight: 1.5 }}>
            Give it to them yourself. It works once{issued.expiresAt ? ` and stops working on ${formatExpiry(issued.expiresAt)}` : ''}. This is the only time you will see it; if it is lost, get a new one.
          </p>
          <button type="button" style={{ ...btnGhost, minHeight: 36, padding: '6px 12px', marginTop: 10 }} onClick={() => setIssued(null)}>Done</button>
        </div>
      )}
      {rows.map(r => (
        <div key={r.email} style={{ border: '1px solid var(--dw-border)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
          <p style={{ margin: 0, fontWeight: 700, fontFamily: 'var(--font-sans)' }}>{r.display_name || r.email}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
            {r.email} · {r.role}{r.campus_id ? ` · ${campusName(r.campus_id)}` : ''}
            {r.has_password
              ? ' · password set'
              : r.code_live
                ? ` · waiting for them to use their setup code${r.code_expires_at ? ` (until ${formatExpiry(r.code_expires_at)})` : ''}`
                : ' · no setup code waiting'}
          </p>
          {r.has_password ? (
            <button
              type="button"
              style={{ ...btnGhost, minHeight: 36, padding: '6px 12px', marginTop: 10 }}
              onClick={async () => {
                if (!confirm(`Reset ${r.email}'s password? They are signed out everywhere and need a new setup code.`)) return;
                onError('');
                try {
                  const data = await intake<{ setupCode?: string; setupCodeExpiresAt?: string }>('roster_clear_password', { email: r.email });
                  showCode(r.email, data);
                  await load();
                } catch (err) {
                  onError(err instanceof Error ? err.message : 'Could not reset the password');
                }
              }}
            >
              Let them set a new password
            </button>
          ) : (
            <button
              type="button"
              style={{ ...btnGhost, minHeight: 36, padding: '6px 12px', marginTop: 10 }}
              onClick={async () => {
                onError('');
                try {
                  const data = await intake<{ setupCode?: string; setupCodeExpiresAt?: string }>('roster_issue_code', { email: r.email });
                  showCode(r.email, data);
                  await load();
                } catch (err) {
                  onError(err instanceof Error ? err.message : 'Could not make a setup code');
                }
              }}
            >
              Get a new setup code
            </button>
          )}
        </div>
      ))}
      <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 14, margin: '24px 0 12px' }}>Add or update</h3>
      <Field label="Email">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@futures.church or any email" style={inputStyle} />
      </Field>
      <Field label="Name">
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Role">
        <select value={role} onChange={e => setRole(e.target.value as Role)} style={inputStyle}>
          <option value="campus">Campus pastor</option>
          <option value="hub">Hub pastor (sermon notes)</option>
          <option value="media">Media (YouTube + notes polish)</option>
          <option value="admin">Admin (only Ashley makes admins)</option>
        </select>
      </Field>
      <Field label="Campus (campus pastors)">
        <select value={campusId} onChange={e => setCampusId(e.target.value)} style={inputStyle}>
          <option value="">Unassigned — they pick once</option>
          {campuses.filter(c => c.id !== 'other').map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <button
        type="button"
        style={btnPrimary}
        onClick={async () => {
          onError('');
          try {
            const data = await intake<{ setupCode?: string; setupCodeExpiresAt?: string }>('roster_save', { email, role, campusId, name });
            showCode(email.trim().toLowerCase(), data);
            setEmail(''); setName(''); setCampusId('');
            await load();
          } catch (err) {
            onError(err instanceof Error ? err.message : 'Could not save');
          }
        }}
      >
        Save person
      </button>
    </div>
  );
}

export default StaffApp;
