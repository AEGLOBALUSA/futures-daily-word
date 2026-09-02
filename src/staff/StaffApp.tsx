/**
 * Staff portal at /staff — one login, one job at a time.
 * Hub / media put sermon notes on the congregation page; campus pastors
 * put updates on the campus corner. Save publishes. Ashley owns people,
 * not a review step. Form prompts live in the database — change them in SQL.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { CAMPUSES } from '../data/tokens';
import { getStaffToken, intake, setStaffToken } from './api';
import { localApiBase } from '../utils/api-base';
import { youtubeLinkProblem } from './youtubeLink';
import { SermonNotesSurface, type SermonNotesData } from '../components/SermonNotesSurface';

type Role = 'admin' | 'hub' | 'campus' | 'media';
type Tab = 'home' | 'form' | 'review' | 'people';

/** Dead /staff?tab=questions (or #questions) must land on home, not an empty page. */
export function staffTabFromRaw(raw: string | null | undefined): Tab {
  const v = (raw || '').trim().toLowerCase();
  if (v === 'form' || v === 'review' || v === 'people' || v === 'home') return v;
  return 'home';
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

function stripQuestionsDeepLink() {
  try {
    const url = new URL(window.location.href);
    const tab = (url.searchParams.get('tab') || '').toLowerCase();
    const hash = url.hash.replace(/^#/, '').toLowerCase();
    if (tab !== 'questions' && hash !== 'questions') return;
    if (tab === 'questions') url.searchParams.delete('tab');
    if (hash === 'questions') url.hash = '';
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
type SermonChoice = { id: string; title: string; date?: string; speaker?: string; current?: boolean; source?: string };
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
  fontSize: 14, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 10px', lineHeight: 1.45,
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
  return CAMPUSES.find(c => c.id === id)?.name || id;
}

function emptyAnswer(q: Question): unknown {
  if (q.type === 'corner_remove') return '';
  if (q.type === 'yes_no') return q.config?.default === true ? true : '';
  return '';
}

/** Where the congregation reads this week's notes. */
function congregationPageUrl(): string {
  try { return `${window.location.origin}/?sermon=1`; } catch { return '/?sermon=1'; }
}

export function StaffApp() {
  const [token, setToken] = useState(() => getStaffToken());
  const [staff, setStaff] = useState<Staff | null>(null);
  const [boot, setBoot] = useState(!!getStaffToken());
  const [tab, setTab] = useState<Tab>(() => staffTabFromRaw(readStaffTabParam()));
  const [job, setJob] = useState<Job>('hub');
  const [error, setError] = useState('');
  const view: Tab = tab === 'form' || tab === 'review' || tab === 'people' ? tab : 'home';

  useEffect(() => {
    document.title = 'Staff — Futures Daily Word';
    document.documentElement.setAttribute('data-theme', localStorage.getItem('dw_dark') === 'true' ? 'dark' : 'light');
    stripQuestionsDeepLink();
  }, []);

  const loadMe = useCallback(async () => {
    if (!getStaffToken()) { setBoot(false); return; }
    try {
      const data = await intake<{ staff: Staff }>('me');
      setStaff(data.staff);
      setTab('home');
    } catch {
      setStaffToken('');
      setToken('');
      setStaff(null);
    }
    setBoot(false);
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  if (boot) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--dw-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>Loading…</p>
      </div>
    );
  }

  if (!token || !staff) {
    return (
      <Login
        onSignedIn={(t, s) => { setStaffToken(t); setToken(t); setStaff(s); setTab('home'); }}
      />
    );
  }

  return (
    <div className="staff-app" style={{ minHeight: '100vh', overflow: 'visible', background: 'var(--dw-canvas)', color: 'var(--dw-text-primary)' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10, background: 'var(--dw-canvas)',
        borderBottom: '1px solid var(--dw-border)', padding: '14px 20px',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
                Futures Daily Word
              </p>
              <h1 style={{ margin: '4px 0 0', fontSize: 22, fontFamily: 'var(--font-serif)', fontWeight: 700 }}>Staff</h1>
            </div>
            <button
              type="button"
              onClick={async () => {
                try { await intake('logout'); } catch { /* */ }
                setStaffToken(''); setToken(''); setStaff(null);
              }}
              style={{ ...btnGhost, minHeight: 36, padding: '6px 12px' }}
            >
              Sign out
            </button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
            {staff.name || staff.email}
            {staff.role === 'campus' && staff.campusId ? ` · ${campusName(staff.campusId)}` : ''}
          </p>
          {view !== 'home' && (
            <button
              type="button"
              onClick={() => { setTab('home'); setError(''); }}
              style={{ ...btnGhost, minHeight: 36, padding: '6px 12px', marginTop: 12 }}
            >
              ← Staff home
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 80px' }}>
        {error && (
          <p style={{ color: '#B42318', fontSize: 13, fontFamily: 'var(--font-sans)', marginBottom: 16 }}>{error}</p>
        )}
        {view === 'home' && (
          <StaffHome
            staff={staff}
            onJob={j => { setJob(j); setTab('form'); setError(''); }}
            onReview={() => { setTab('review'); setError(''); }}
            onPeople={() => { setTab('people'); setError(''); }}
          />
        )}
        {view === 'form' && <IntakeForm staff={staff} job={job} onError={setError} />}
        {view === 'review' && staff.isAdmin && (
          <ReviewQueue onError={setError} />
        )}
        {view === 'people' && staff.isAdmin && <Roster onError={setError} />}
      </main>
    </div>
  );
}

function Login({ onSignedIn }: { onSignedIn: (token: string, staff: Staff) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const status = await intake<{ setup: boolean }>('auth_status', { email });
      if (status.setup) {
        if (!setup) {
          setSetup(true);
          setBusy(false);
          return;
        }
        if (password !== confirm) {
          setError('Passwords do not match.');
          setBusy(false);
          return;
        }
        const data = await intake<{ token: string; staff: Staff }>('set_password', { email, password });
        onSignedIn(data.token, data.staff);
      } else {
        const data = await intake<{ token: string; staff: Staff }>('login', { email, password });
        onSignedIn(data.token, data.staff);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      const needsSetup = (err as { data?: { setup?: boolean } })?.data?.setup;
      if (needsSetup) setSetup(true);
      if (/already set/i.test(msg)) setSetup(false);
      setError(msg);
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dw-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onSubmit={submit} style={{ width: 'min(420px, 100%)' }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
          Futures Daily Word
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, margin: '8px 0 8px', fontWeight: 700 }}>Staff sign-in</h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--dw-text-secondary)', lineHeight: 1.55, margin: '0 0 24px' }}>
          Sign in to put Sunday’s sermon notes on the page people write in.
        </p>
        <label style={labelStyle} htmlFor="staff-email">Work email</label>
        <input
          id="staff-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={e => { setEmail(e.target.value); setSetup(false); }}
          onBlur={async () => {
            if (!email.includes('@')) return;
            try {
              const status = await intake<{ setup: boolean }>('auth_status', { email });
              setSetup(!!status.setup);
            } catch { /* keep password sign-in */ }
          }}
          placeholder="ae@futures.global"
          style={{ ...inputStyle, marginBottom: 14 }}
        />
        <label style={labelStyle} htmlFor="staff-password">{setup ? 'New password' : 'Password'}</label>
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
            <p style={helpStyle}>First visit — set your own password (at least 10 characters). You will use it to sign in next time.</p>
            <label style={labelStyle} htmlFor="staff-confirm">Confirm password</label>
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
        {error && <p style={{ color: '#B42318', fontSize: 13, fontFamily: 'var(--font-sans)' }}>{error}</p>}
        <button type="submit" disabled={busy} style={{ ...btnPrimary, width: '100%', marginTop: 8 }}>
          {busy ? 'Please wait…' : setup ? 'Save password and sign in' : 'Sign in'}
        </button>
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
  staff, onJob, onReview, onPeople,
}: {
  staff: Staff;
  onJob: (job: Job) => void;
  onReview: () => void;
  onPeople: () => void;
}) {
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
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, margin: '0 0 10px', fontWeight: 700 }}>Staff</h2>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--dw-text-secondary)', lineHeight: 1.5, margin: '0 0 28px' }}>
        This is how Sunday’s sermon notes get onto the page people write in.
      </p>
      {visible.map(j => (
        <button
          key={j.id}
          type="button"
          onClick={() => onJob(j.id)}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
            borderRadius: 16, padding: '18px 20px', marginBottom: 12, cursor: 'pointer',
          }}
        >
          <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--dw-text-primary)', lineHeight: 1.3 }}>{j.title}</span>
          <span style={{ display: 'block', marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--dw-text-muted)', lineHeight: 1.45 }}>{j.body}</span>
        </button>
      ))}
      {staff.isAdmin && (
        <>
          <p style={{ margin: '20px 0 8px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dw-text-muted)' }}>
            Settings
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={btnGhost} onClick={onPeople}>People</button>
            <button type="button" style={btnGhost} onClick={onReview}>History</button>
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

function IntakeForm({ staff, job, onError }: { staff: Staff; job: Job; onError: (s: string) => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [cornerItems, setCornerItems] = useState<CornerItem[]>([]);
  const [sermons, setSermons] = useState<SermonChoice[]>([]);
  const [mine, setMine] = useState<{ id: string; status: string; created_at: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [preview, setPreview] = useState<FormattedSermon | null>(null);
  const [pickCampus, setPickCampus] = useState(staff.campusId || '');
  // The shell shows errors at the top of the page; the save button sits at the
  // bottom of a long form, so the same message is repeated next to the button
  // and scrolled into view — a refused save must never look like nothing happened.
  const [formError, setFormError] = useState('');
  const [live, setLive] = useState<{ title: string; verified: boolean } | null>(null);
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const fail = (msg: string) => {
    onError(msg);
    setFormError(msg);
    setTimeout(() => { errorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 0);
  };

  const load = useCallback(async (campusId?: string) => {
    onError('');
    try {
      const data = await intake<{ questions: Question[]; cornerItems: CornerItem[]; submissions: typeof mine; staff: Staff; sermons?: SermonChoice[] }>(
        'form',
        { job, ...(campusId ? { campusId } : {}) },
      );
      setQuestions(data.questions || []);
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
      onError(err instanceof Error ? err.message : 'Could not load the form');
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

  const setAnswer = (id: string, v: unknown) => {
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
  const youtubeProblem = youtubeQ ? youtubeLinkProblem(answers[youtubeQ.id]) : '';

  const runPreview = async (override?: Record<string, unknown>) => {
    if (youtubeProblem) { fail(youtubeProblem); return; }
    setBusy(true); onError(''); setFormError('');
    try {
      const data = await intake<{ preview: FormattedSermon | null; source?: string }>('format_preview', {
        answers: override || answers,
        useAI: true,
        job,
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
    if (haveQ && answers[haveQ.id] !== true && answers[haveQ.id] !== false) {
      fail('Do you have your notes?');
      return;
    }
    if (haveNotes && pasteQ && !paste.trim() && job === 'hub') {
      fail('Paste your notes.');
      return;
    }
    if (youtubeProblem) { fail(youtubeProblem); return; }
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
    setBusy(true); onError(''); setFormError(''); setDone(false); setLive(null);
    try {
      const data = await intake<{
        preview?: FormattedSermon | null;
        published?: boolean;
        publish_result?: { sermon?: { id?: string; title?: string } | null; cornerAdded?: number };
      }>('submit', {
        answers,
        campusId: pickCampus || staff.campusId,
        job,
        formatted_sermon: preview || undefined,
      });
      if (data.preview) setPreview(data.preview);
      setDone(true);
      const published = data.publish_result?.sermon;
      if (sermonForm) {
        if (!published?.id) {
          fail('Saved, but nothing reached the congregation page — there were no notes or title to publish.');
        } else {
          // Read it back the way the congregation does, so "It's on the page" is a fact, not a hope.
          let verified = false;
          try {
            const r = await fetch(`${localApiBase()}/api/published-sermon`, { cache: 'no-store' });
            const j = r.ok ? await r.json() : null;
            verified = !!(j && j.sermon && j.sermon.id === published.id);
          } catch { /* verified stays false */ }
          setLive({ title: published.title || data.preview?.title || '', verified });
        }
      }
      await load(pickCampus || staff.campusId || undefined);
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Could not submit');
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} noValidate>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 8px' }}>
        {job === 'hub' ? 'This week’s sermon notes' : job === 'media' ? 'YouTube and notes' : 'Campus corner'}
      </h2>
      <p style={{ ...helpStyle, marginBottom: 28 }}>{formIntro(job)}</p>

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
            {CAMPUSES.filter(c => c.id !== 'other').map(c => (
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
          problem={q.config?.sermonKey === 'youtubeUrl' ? youtubeProblem : ''}
          value={answers[q.id]}
          campusLocked={campusLocked}
          lockedCampus={staff.campusId}
          cornerItems={cornerItems}
          sermons={sermons}
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
            setAnswers(next);
            setPreview(null);
            setDone(false);
            if (v === true) runPreview(next);
          }}
          onFormat={runPreview}
        />
      )}

      {questions.length === 0 && (
        <p style={helpStyle}>No questions on this form yet.</p>
      )}

      {sermonForm && preview && wantsAI && (
        <p style={{ ...helpStyle, marginBottom: 12 }}>
          The preview above is not live yet. The button below puts it on the congregation page.
        </p>
      )}
      {formError && (
        <p ref={errorRef} role="alert" style={{ color: '#B42318', fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 600, margin: '0 0 12px' }}>
          {formError}
        </p>
      )}
      <button type="submit" disabled={busy || questions.length === 0} style={{ ...btnPrimary, marginTop: 8 }}>
        {busy ? 'Working…' : job === 'campus' ? 'Put this on the campus corner' : 'Put this on the congregation page'}
      </button>
      {done && !formError && (
        <div style={{ marginTop: 12, fontFamily: 'var(--font-sans)' }}>
          <p style={{ margin: 0, color: 'var(--dw-info)', fontSize: 14, fontWeight: 600 }}>
            {job === 'campus'
              ? 'It’s on the campus corner.'
              : live?.verified
                ? `It’s on the congregation page: ${live.title}`
                : live
                  ? `Saved as “${live.title}”. The congregation page has not shown it yet — open it and pull to refresh.`
                  : 'Saved.'}
          </p>
          {job !== 'campus' && (
            <a href={congregationPageUrl()} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 14, color: 'var(--dw-accent)', fontWeight: 600 }}>
              Open the congregation page →
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

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <label style={labelStyle}>{label}</label>
      {help ? <p style={helpStyle}>{help}</p> : null}
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
        <Field label={haveLabel} help={haveQ.help}>
          <YesNo value={haveNotes} onChange={onHave} required={haveQ.required} />
        </Field>
      )}
      {showPaste && pasteQ && (
        <Field label={pasteLabel} help="Whatever you have is fine.">
          <textarea
            value={paste}
            onChange={e => onPaste(e.target.value)}
            rows={10}
            placeholder="Paste your notes"
            style={{ ...inputStyle, minHeight: 180, resize: 'vertical' as const }}
          />
        </Field>
      )}
      {showAI && aiQ && (
        <Field label={aiLabel} help="Optional. You can look first, or save and it formats then.">
          <YesNo value={wantAI} onChange={onAI} />
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

function YesNo({ value, onChange, required }: { value: unknown; onChange: (v: boolean) => void; required?: boolean }) {
  const v = value === true ? 'yes' : value === false ? 'no' : '';
  return (
    <select
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

function QuestionField({
  q, value, onChange, campusLocked, lockedCampus, cornerItems, sermons, require, problem,
}: {
  q: Question;
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
  const required = require ?? q.required;
  if (q.type === 'campus') {
    const v = String(value || lockedCampus || '');
    return (
      <Field label={q.label} help={q.help}>
        <select
          required={required}
          disabled={campusLocked}
          value={v}
          onChange={e => onChange(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select campus</option>
          {CAMPUSES.filter(c => c.id !== 'other').map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
    );
  }
  if (q.type === 'yes_no') {
    return (
      <Field label={q.label} help={q.help}>
        <YesNo value={value} onChange={v => onChange(v)} required={required} />
      </Field>
    );
  }
  if (q.type === 'date') {
    return (
      <Field label={q.label} help={q.help}>
        <input type="date" required={required} value={String(value || '')} onChange={e => onChange(e.target.value)} style={inputStyle} />
      </Field>
    );
  }
  if (q.type === 'sermon_pick' || q.config?.publish === 'sermon_target') {
    const choices = sermons || [];
    return (
      <Field label={q.label} help={q.help}>
        {choices.length > 0 ? (
          <select required={required} value={String(value || '')} onChange={e => onChange(e.target.value)} style={inputStyle}>
            <option value="">Select this week's message</option>
            {choices.map(s => (
              <option key={s.id} value={s.id}>{s.title}{s.date ? ` · ${s.date}` : ''}</option>
            ))}
          </select>
        ) : (
          <input
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
      <Field label={q.label} help={q.help}>
        <Comp
          required={required}
          value={String(value || '')}
          onChange={e => onChange(e.target.value)}
          rows={q.type === 'long_text' ? 5 : undefined}
          aria-invalid={problem ? true : undefined}
          style={{ ...inputStyle, minHeight: q.type === 'long_text' ? 120 : undefined, resize: 'vertical' as const, ...(problem ? { borderColor: '#B42318' } : {}) }}
        />
        {problem && (
          <p style={{ color: '#B42318', fontSize: 13, fontFamily: 'var(--font-sans)', margin: '6px 0 0' }}>{problem}</p>
        )}
      </Field>
    );
  }
  if (q.type === 'corner_remove') {
    return (
      <Field label={q.label} help={q.help}>
        {cornerItems.length === 0 ? (
          <p style={helpStyle}>Nothing is on the campus corner yet.</p>
        ) : (
          <select value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)} style={inputStyle}>
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

  const labelFor = useMemo(() => {
    const map: Record<string, string> = {};
    for (const q of questions) map[q.id] = q.label;
    return map;
  }, [questions]);

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 8px' }}>History</h2>
      <p style={{ ...helpStyle, marginBottom: 16 }}>What already went live. Saves go live on their own — this is a record, not a queue.</p>
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

function Roster({ onError }: { onError: (s: string) => void }) {
  const [rows, setRows] = useState<{ email: string; role: Role; campus_id: string | null; display_name: string; has_password?: boolean }[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('campus');
  const [campusId, setCampusId] = useState('');
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    const data = await intake<{ roster: typeof rows }>('roster_list');
    setRows(data.roster || []);
  }, []);
  useEffect(() => { load().catch(err => onError(err.message)); }, [load, onError]);

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 8px' }}>People</h2>
      <p style={{ ...helpStyle, marginBottom: 16 }}>
        Who can sign in. If someone has not set a password yet, they set one on first visit.
      </p>
      {rows.map(r => (
        <div key={r.email} style={{ border: '1px solid var(--dw-border)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
          <p style={{ margin: 0, fontWeight: 700, fontFamily: 'var(--font-sans)' }}>{r.display_name || r.email}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
            {r.email} · {r.role}{r.campus_id ? ` · ${campusName(r.campus_id)}` : ''}
            {r.has_password ? ' · password set' : ' · has not set a password yet'}
          </p>
          {r.has_password && (
            <button
              type="button"
              style={{ ...btnGhost, minHeight: 36, padding: '6px 12px', marginTop: 10 }}
              onClick={async () => {
                if (!confirm(`Clear ${r.email}'s password so they can set a new one?`)) return;
                onError('');
                try {
                  await intake('roster_clear_password', { email: r.email });
                  await load();
                } catch (err) {
                  onError(err instanceof Error ? err.message : 'Could not clear password');
                }
              }}
            >
              Let them set a new password
            </button>
          )}
        </div>
      ))}
      <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 14, margin: '24px 0 12px' }}>Add or update</h3>
      <Field label="Email">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="pastor@futures.church" style={inputStyle} />
      </Field>
      <Field label="Name">
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Role">
        <select value={role} onChange={e => setRole(e.target.value as Role)} style={inputStyle}>
          <option value="campus">Campus pastor</option>
          <option value="hub">Hub pastor (sermon notes)</option>
          <option value="media">Media (YouTube + notes polish)</option>
          <option value="admin">Admin (Ashley)</option>
        </select>
      </Field>
      <Field label="Campus (campus pastors)">
        <select value={campusId} onChange={e => setCampusId(e.target.value)} style={inputStyle}>
          <option value="">Unassigned — they pick once</option>
          {CAMPUSES.filter(c => c.id !== 'other').map(c => (
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
            await intake('roster_save', { email, role, campusId, name });
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
