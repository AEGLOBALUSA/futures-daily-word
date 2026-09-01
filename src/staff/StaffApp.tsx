/**
 * Staff portal at /staff — one login, two jobs:
 * campus pastors fill the intake form for their campus corner;
 * hub pastors (Josh / Ryan) fill sermon notes; Ashley owns questions + review.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { CAMPUSES } from '../data/tokens';
import { getStaffToken, intake, setStaffToken } from './api';
import { SermonNotesSurface, type SermonNotesData } from '../components/SermonNotesSurface';

type Role = 'admin' | 'hub' | 'campus' | 'media';
type Tab = 'home' | 'form' | 'questions' | 'review' | 'people';
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

const TYPES = [
  { id: 'text', label: 'Short text' },
  { id: 'long_text', label: 'Long text' },
  { id: 'yes_no', label: 'Yes / no' },
  { id: 'campus', label: 'Campus picker' },
  { id: 'date', label: 'Date' },
  { id: 'corner_remove', label: 'Take one item down' },
  { id: 'sermon_pick', label: 'Which sermon' },
];
const AUDIENCES = [
  { id: 'campus', label: 'Campus pastors' },
  { id: 'hub', label: 'Hub pastors (when they preach)' },
  { id: 'media', label: 'Media (YouTube + notes polish)' },
  { id: 'all', label: 'Everyone on the form' },
  { id: 'admin', label: 'Ashley only' },
];

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

export function StaffApp() {
  const [token, setToken] = useState(() => getStaffToken());
  const [staff, setStaff] = useState<Staff | null>(null);
  const [boot, setBoot] = useState(!!getStaffToken());
  const [tab, setTab] = useState<Tab>('home');
  const [job, setJob] = useState<Job>('hub');
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Staff — Futures Daily Word';
    document.documentElement.setAttribute('data-theme', localStorage.getItem('dw_dark') === 'true' ? 'dark' : 'light');
  }, []);

  const loadMe = useCallback(async () => {
    if (!getStaffToken()) { setBoot(false); return; }
    try {
      const data = await intake<{ staff: Staff; pendingCount?: number }>('me');
      setStaff(data.staff);
      setPendingCount(data.pendingCount || 0);
      setTab('home');
    } catch {
      setStaffToken('');
      setToken('');
      setStaff(null);
    }
    setBoot(false);
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  useEffect(() => {
    if (tab !== 'home' || !staff) return;
    intake<{ pendingCount?: number }>('me')
      .then(d => setPendingCount(d.pendingCount || 0))
      .catch(() => { /* */ });
  }, [tab, staff]);

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
    <div style={{ minHeight: '100vh', background: 'var(--dw-canvas)', color: 'var(--dw-text-primary)' }}>
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
          {tab !== 'home' && (
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
        {tab === 'home' && (
          <StaffHome
            staff={staff}
            pendingCount={pendingCount}
            onJob={j => { setJob(j); setTab('form'); setError(''); }}
            onReview={() => { setTab('review'); setError(''); }}
            onQuestions={() => { setTab('questions'); setError(''); }}
            onPeople={() => { setTab('people'); setError(''); }}
          />
        )}
        {tab === 'form' && <IntakeForm staff={staff} job={job} onError={setError} />}
        {tab === 'questions' && staff.isAdmin && <FormBuilder onError={setError} />}
        {tab === 'review' && staff.isAdmin && (
          <ReviewQueue onError={setError} onPutUpNotes={() => { setJob('hub'); setTab('form'); }} />
        )}
        {tab === 'people' && staff.isAdmin && <Roster onError={setError} />}
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
  staff, pendingCount, onJob, onReview, onQuestions, onPeople,
}: {
  staff: Staff;
  pendingCount: number;
  onJob: (job: Job) => void;
  onReview: () => void;
  onQuestions: () => void;
  onPeople: () => void;
}) {
  const jobs: { id: Job; title: string; body: string }[] = [
    { id: 'hub', title: 'Put up this week’s sermon notes', body: 'Date, title, speaker, verse, YouTube, paste your notes, see the congregation page, sign off.' },
    { id: 'media', title: 'Add the YouTube or clean the notes', body: 'Pick the sermon. Paste a link. Or paste notes if they need a cleanup.' },
    { id: 'campus', title: 'Update a campus corner', body: 'Add one note for your campus, or take one thing down.' },
  ];
  const visible = staff.isAdmin ? jobs : jobs.filter(j => j.id === staff.role);
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
          <button
            type="button"
            onClick={onReview}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
              borderRadius: 16, padding: '18px 20px', marginTop: 8, marginBottom: 12, cursor: 'pointer',
            }}
          >
            <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--dw-text-primary)' }}>
              Review what staff sent
              {pendingCount > 0 ? (
                <span style={{
                  marginLeft: 10, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.04em', background: 'var(--dw-accent)', color: '#fff',
                  borderRadius: 999, padding: '3px 8px', verticalAlign: 'middle',
                }}>{pendingCount}</span>
              ) : null}
            </span>
            <span style={{ display: 'block', marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--dw-text-muted)' }}>
              {pendingCount > 0 ? 'Accept a submission to put it live.' : 'Nothing is waiting. Put this week’s message up from the first button.'}
            </span>
          </button>
          <p style={{ margin: '20px 0 8px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dw-text-muted)' }}>
            Settings
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={btnGhost} onClick={onQuestions}>Questions</button>
            <button type="button" style={btnGhost} onClick={onPeople}>People</button>
          </div>
        </>
      )}
    </div>
  );
}

function formIntro(job: Job, isAdmin: boolean) {
  if (job === 'hub') {
    return 'You’re putting this week’s message on the congregation Sermon Notes page. Answer these, paste your notes, then you’ll see that page and sign off.';
  }
  if (job === 'media') {
    return 'Add the YouTube for this week’s message, or paste notes if they need a cleanup. YouTube alone does not change the notes that are already live.';
  }
  return isAdmin
    ? 'This updates one campus corner. You can put it live yourself.'
    : 'Answer each question for your campus. Ashley reviews, then people at your campus see it.';
}

function IntakeForm({ staff, job, onError }: { staff: Staff; job: Job; onError: (s: string) => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [cornerItems, setCornerItems] = useState<CornerItem[]>([]);
  const [sermons, setSermons] = useState<SermonChoice[]>([]);
  const [mine, setMine] = useState<{ id: string; status: string; created_at: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [published, setPublished] = useState(false);
  const [preview, setPreview] = useState<FormattedSermon | null>(null);
  const [signedOff, setSignedOff] = useState(false);
  const [pickCampus, setPickCampus] = useState(staff.campusId || '');

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
  const formQs = questions.filter(q => !isFlowQuestion(q));
  const haveQ = job === 'hub' ? flowQs.find(q => q.config?.flow === 'notes_have') : undefined;
  const pasteQ = flowQs.find(q => q.config?.flow === 'notes_paste' && q.audience === job);
  const aiQ = flowQs.find(q => q.config?.flow === 'notes_ai' && q.audience === job);
  const haveNotes = haveQ ? answers[haveQ.id] === true : job !== 'hub';
  const paste = pasteQ ? String(answers[pasteQ.id] || '') : '';
  const wantAI = aiQ ? answers[aiQ.id] === true : false;
  const showPaste = !haveQ || haveNotes === true;
  const showAI = showPaste && paste.trim().length > 0;
  const needsSignOff = sermonForm && wantAI && paste.trim().length > 0;
  const stepStart = formQs.length;

  const setAnswer = (id: string, v: unknown) => {
    setAnswers(a => ({ ...a, [id]: v }));
    setPreview(null);
    setSignedOff(false);
    setDone(false);
    setPublished(false);
  };

  const runPreview = async (override?: Record<string, unknown>) => {
    setBusy(true); onError(''); setSignedOff(false);
    try {
      const data = await intake<{ preview: FormattedSermon | null; source?: string }>('format_preview', {
        answers: override || answers,
        useAI: true,
        job,
      });
      setPreview(data.preview);
      if (!data.preview) onError('Nothing to format yet — paste your notes first.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not preview');
    }
    setBusy(false);
  };

  const submit = async (e?: FormEvent, signed = false) => {
    e?.preventDefault();
    if (needsSignOff && !signed && !signedOff) {
      onError('Sign off on the formatted notes before sending to Ashley.');
      return;
    }
    if (haveQ && answers[haveQ.id] !== true && answers[haveQ.id] !== false) {
      onError('Do you have your notes?');
      return;
    }
    if (haveNotes && pasteQ && !paste.trim() && job === 'hub') {
      onError('Paste your notes.');
      return;
    }
    setBusy(true); onError(''); setDone(false);
    try {
      const data = await intake<{ preview?: FormattedSermon | null; published?: boolean }>('submit', {
        answers,
        campusId: pickCampus || staff.campusId,
        job,
        signedOff: signed || signedOff,
        formatted_sermon: (signed || signedOff) ? preview : undefined,
        publishNow: staff.isAdmin,
      });
      if (data.preview) setPreview(data.preview);
      setSignedOff(true);
      setDone(true);
      setPublished(!!data.published);
      await load(pickCampus || staff.campusId || undefined);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not submit');
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 8px' }}>
        {job === 'hub' ? 'This week’s sermon notes' : job === 'media' ? 'YouTube and notes' : 'Campus corner'}
      </h2>
      <p style={{ ...helpStyle, marginBottom: 28 }}>{formIntro(job, staff.isAdmin)}</p>

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
          q={job === 'hub' ? {
            ...q,
            label: withStep(i + 1, q.label),
            help: q.config?.sermonKey === 'youtubeUrl' ? 'You can add this after Sunday.' : q.help,
          } : q}
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
          signedOff={signedOff}
          onHave={v => haveQ && setAnswer(haveQ.id, v)}
          onPaste={v => pasteQ && setAnswer(pasteQ.id, v)}
          onAI={v => {
            if (!aiQ) return;
            const next = { ...answers, [aiQ.id]: v };
            setAnswers(next);
            setPreview(null);
            setSignedOff(false);
            setDone(false);
            setPublished(false);
            if (v === true) runPreview(next);
          }}
          onFormat={runPreview}
          onSignOff={() => setSignedOff(true)}
        />
      )}

      {questions.length === 0 && (
        <p style={helpStyle}>No questions on this form yet.</p>
      )}

      {(!needsSignOff || signedOff) && (
        <button type="submit" disabled={busy || questions.length === 0} style={{ ...btnPrimary, marginTop: 8 }}>
          {busy ? 'Working…' : staff.isAdmin
            ? (job === 'campus' ? 'Put this on the campus corner' : 'Put this on the congregation page')
            : 'Send to Ashley to go live'}
        </button>
      )}
      {done && (
        <p style={{ marginTop: 12, color: 'var(--dw-info)', fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
          {published
            ? (job === 'campus' ? 'It’s on the campus corner.' : 'It’s on the congregation page.')
            : 'Sent to Ashley. It goes live when he accepts it.'}
        </p>
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
  busy, preview, signedOff, onHave, onPaste, onAI, onFormat, onSignOff,
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
  signedOff: boolean;
  onHave: (v: boolean) => void;
  onPaste: (v: string) => void;
  onAI: (v: boolean) => void;
  onFormat: () => void;
  onSignOff: () => void;
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
        <Field label={aiLabel} help={aiQ.help}>
          <YesNo value={wantAI} onChange={onAI} />
        </Field>
      )}
      {showAI && wantAI === true && (
        <div style={{ marginBottom: 32 }}>
          {busy && !preview && <p style={helpStyle}>Formatting…</p>}
          {preview && (
            <>
              <p style={{ ...helpStyle, marginBottom: 12 }}>
                This is what people will write in on Sunday. Sign off this version, or make another.
              </p>
              <div className="dw-sermon-notes-phone">
                <SermonNotesSurface sermon={preview as SermonNotesData} persist={false} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <button type="button" style={btnPrimary} disabled={busy || signedOff} onClick={onSignOff}>
                  {signedOff ? 'Signed off' : 'Sign off this version'}
                </button>
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
  q, value, onChange, campusLocked, lockedCampus, cornerItems, sermons, require,
}: {
  q: Question;
  value: unknown;
  onChange: (v: unknown) => void;
  campusLocked: boolean;
  lockedCampus: string | null;
  cornerItems: CornerItem[];
  sermons?: SermonChoice[];
  require?: boolean;
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
          style={{ ...inputStyle, minHeight: q.type === 'long_text' ? 120 : undefined, resize: 'vertical' as const }}
        />
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

function FormBuilder({ onError }: { onError: (s: string) => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editing, setEditing] = useState<Partial<Question> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await intake<{ questions: Question[] }>('questions_list');
    setQuestions(data.questions || []);
  }, []);
  useEffect(() => { load().catch(err => onError(err.message)); }, [load, onError]);

  const save = async () => {
    if (!editing || !editing.label) return;
    setBusy(true); onError('');
    try {
      await intake('question_save', { question: editing });
      setEditing(null);
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save');
    }
    setBusy(false);
  };

  const move = async (id: string, dir: -1 | 1) => {
    const ids = questions.map(q => q.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = ids.slice();
    [next[i], next[j]] = [next[j], next[i]];
    await intake('question_reorder', { ids: next });
    await load();
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 8px' }}>Questions</h2>
      <p style={{ ...helpStyle, marginBottom: 20 }}>
        These are the prompts on each job. Change them when the form needs a new question.
      </p>
      {questions.map((q, i) => (
        <div key={q.id} style={{
          border: '1px solid var(--dw-border)', borderRadius: 14, padding: 14, marginBottom: 10,
          opacity: q.enabled ? 1 : 0.55,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontFamily: 'var(--font-sans)' }}>{q.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                {TYPES.find(t => t.id === q.type)?.label || q.type} · {AUDIENCES.find(a => a.id === q.audience)?.label || q.audience}
                {q.required ? ' · required' : ''}
                {!q.enabled ? ' · hidden' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" style={{ ...btnGhost, minHeight: 36, padding: '4px 10px' }} disabled={i === 0} onClick={() => move(q.id, -1)}>↑</button>
              <button type="button" style={{ ...btnGhost, minHeight: 36, padding: '4px 10px' }} disabled={i === questions.length - 1} onClick={() => move(q.id, 1)}>↓</button>
              <button type="button" style={{ ...btnGhost, minHeight: 36, padding: '4px 10px' }} onClick={() => setEditing(q)}>Edit</button>
            </div>
          </div>
        </div>
      ))}
      <button type="button" style={{ ...btnPrimary, marginTop: 8 }} onClick={() => setEditing({
        label: '', help: '', type: 'text', audience: 'campus', required: false, enabled: true, sort_order: (questions.length + 1) * 10, config: {},
      })}>
        Add question
      </button>

      {editing && (
        <div style={{ marginTop: 20, padding: 16, border: '1px solid var(--dw-border)', borderRadius: 16, background: 'var(--dw-card)' }}>
          <Field label="Question">
            <input value={editing.label || ''} onChange={e => setEditing({ ...editing, label: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Help text">
            <input value={editing.help || ''} onChange={e => setEditing({ ...editing, help: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Type">
            <select value={editing.type || 'text'} onChange={e => setEditing({ ...editing, type: e.target.value })} style={inputStyle}>
              {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Who sees this">
            <select value={editing.audience || 'campus'} onChange={e => setEditing({ ...editing, audience: e.target.value })} style={inputStyle}>
              {AUDIENCES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          {(editing.type === 'text' || editing.type === 'long_text' || editing.type === 'date') && (
            <Field label="When I approve, put this on">
              <select
                value={editing.config?.publish || ''}
                onChange={e => setEditing({ ...editing, config: { ...editing.config, publish: e.target.value } })}
                style={inputStyle}
              >
                <option value="">Review only (do not publish automatically)</option>
                <option value="campus_title">Campus corner title</option>
                <option value="campus_body">Campus corner body</option>
                <option value="campus_corner">Campus corner as a note</option>
                <option value="sermon_field">A sermon-notes field</option>
              </select>
            </Field>
          )}
          {editing.config?.publish === 'sermon_field' && (
            <Field label="Sermon field">
              <select
                value={editing.config?.sermonKey || 'outline'}
                onChange={e => setEditing({ ...editing, config: { ...editing.config, sermonKey: e.target.value } })}
                style={inputStyle}
              >
                <option value="title">Title</option>
                <option value="speaker">Speaker</option>
                <option value="date">Date</option>
                <option value="series">Series</option>
                <option value="keyVerse">Key verse</option>
                <option value="keyVerseText">Key verse text</option>
                <option value="outline">Pasted notes</option>
                <option value="youtubeUrl">YouTube URL</option>
              </select>
            </Field>
          )}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'var(--font-sans)', fontSize: 14, marginBottom: 10 }}>
            <input type="checkbox" checked={!!editing.required} onChange={e => setEditing({ ...editing, required: e.target.checked })} />
            Required
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'var(--font-sans)', fontSize: 14, marginBottom: 16 }}>
            <input type="checkbox" checked={editing.enabled !== false} onChange={e => setEditing({ ...editing, enabled: e.target.checked })} />
            Show on the form
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={btnPrimary} disabled={busy} onClick={save}>Save question</button>
            <button type="button" style={btnGhost} onClick={() => setEditing(null)}>Cancel</button>
            {editing.id && (
              <button
                type="button"
                style={{ ...btnGhost, color: '#B42318' }}
                onClick={async () => {
                  if (!confirm('Remove this question from the form?')) return;
                  await intake('question_delete', { id: editing.id });
                  setEditing(null);
                  await load();
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewQueue({ onError, onPutUpNotes }: { onError: (s: string) => void; onPutUpNotes: () => void }) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'declined'>('pending');
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
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 8px' }}>Review what staff sent</h2>
      <p style={{ ...helpStyle, marginBottom: 16 }}>Accept a submission to put it on the live campus corner or Sermon Notes.</p>
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
        <div style={{ margin: '12px 0 24px' }}>
          <p style={helpStyle}>No notes waiting. Put this week’s message up.</p>
          <button type="button" style={btnPrimary} onClick={onPutUpNotes}>Put this week’s message up</button>
        </div>
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
              <button type="button" style={btnPrimary} onClick={() => decide(open.id, 'approved')}>Accept & publish</button>
              <button type="button" style={btnGhost} onClick={() => decide(open.id, 'declined')}>Decline</button>
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
