/**
 * Staff portal at /staff — one login, two jobs:
 * campus pastors fill the intake form for their campus corner;
 * hub pastors (Josh / Ryan) fill sermon notes; Ashley owns questions + review.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { CAMPUSES } from '../data/tokens';
import { getStaffToken, intake, setStaffToken } from './api';
import { youtubeEmbedUrl } from '../utils/youtube';

type Role = 'admin' | 'hub' | 'campus' | 'media';
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
  config: { publish?: string; itemType?: string; sermonKey?: string; default?: boolean };
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
  { id: 'corner_add', label: 'Add to campus corner' },
  { id: 'corner_remove', label: 'Remove from campus corner' },
  { id: 'sermon_notes', label: 'Sermon notes (legacy blob)' },
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
  display: 'block', fontSize: 13, fontWeight: 700, margin: '0 0 6px',
  color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)',
};
const helpStyle: CSSProperties = {
  fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 10px', lineHeight: 1.45,
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
  if (q.type === 'corner_add') return [{ type: 'announcement', title: '', content: '' }];
  if (q.type === 'corner_remove') return [];
  if (q.type === 'sermon_notes') {
    return { title: '', speaker: '', date: '', series: '', keyVerse: '', keyVerseText: '', outline: '' };
  }
  if (q.type === 'yes_no') return q.config?.default === true;
  return '';
}

export function StaffApp() {
  const [token, setToken] = useState(() => getStaffToken());
  const [staff, setStaff] = useState<Staff | null>(null);
  const [boot, setBoot] = useState(!!getStaffToken());
  const [tab, setTab] = useState<'form' | 'questions' | 'review' | 'people'>('form');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Staff — Futures Daily Word';
    document.documentElement.setAttribute('data-theme', localStorage.getItem('dw_dark') === 'true' ? 'dark' : 'light');
  }, []);

  const loadMe = useCallback(async () => {
    if (!getStaffToken()) { setBoot(false); return; }
    try {
      const data = await intake<{ staff: Staff }>('me');
      setStaff(data.staff);
      setTab(data.staff.isAdmin ? 'review' : 'form');
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
        onSignedIn={(t, s) => { setStaffToken(t); setToken(t); setStaff(s); setTab(s.isAdmin ? 'review' : 'form'); }}
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
            {staff.role === 'hub' ? ' · sermon notes' : ''}
            {staff.role === 'media' ? ' · video & notes' : ''}
            {staff.role === 'admin' ? ' · review & form' : ''}
          </p>
          {staff.isAdmin && (
            <nav style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              {([
                ['review', 'Review'],
                ['form', 'Fill form'],
                ['questions', 'Questions'],
                ['people', 'People'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  style={{
                    ...btnGhost,
                    minHeight: 36, padding: '6px 12px',
                    background: tab === id ? 'var(--dw-accent)' : 'transparent',
                    color: tab === id ? '#fff' : 'var(--dw-text-muted)',
                    borderColor: tab === id ? 'var(--dw-accent)' : 'var(--dw-border)',
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 80px' }}>
        {error && (
          <p style={{ color: '#B42318', fontSize: 13, fontFamily: 'var(--font-sans)', marginBottom: 16 }}>{error}</p>
        )}
        {tab === 'form' && <IntakeForm staff={staff} onError={setError} />}
        {tab === 'questions' && staff.isAdmin && <FormBuilder onError={setError} />}
        {tab === 'review' && staff.isAdmin && <ReviewQueue onError={setError} />}
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
          Email and password. Other staff set their own password on first visit. Hub pastors put up notes when they preach; media can add the YouTube after Sunday and clean the notes if needed. Ashley reviews before anything goes live.
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

function formIntro(role: Role) {
  if (role === 'hub') {
    return 'Hub pastors put up notes when they preach. Paste whatever you have — AI formats it into the Sermon Notes page the congregation writes in. You can add the YouTube after Sunday. Ashley reviews before it goes live.';
  }
  if (role === 'media') {
    return 'Media can add the YouTube after Sunday and clean the notes if the hub pastor needs a hand. Leave notes blank to keep the live outline and only attach the video. Ashley still reviews first.';
  }
  if (role === 'campus') {
    return 'Fill what applies for your campus. Ashley reviews it, then it appears on the campus corner.';
  }
  return 'Hub pastors put up notes when they preach; media can add the YouTube after Sunday and clean the notes if needed. Campus pastors update their campus corner. Ashley reviews before anything goes live.';
}

function IntakeForm({ staff, onError }: { staff: Staff; onError: (s: string) => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [cornerItems, setCornerItems] = useState<CornerItem[]>([]);
  const [sermons, setSermons] = useState<SermonChoice[]>([]);
  const [mine, setMine] = useState<{ id: string; status: string; created_at: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [preview, setPreview] = useState<FormattedSermon | null>(null);
  const [previewSource, setPreviewSource] = useState('');
  const [pickCampus, setPickCampus] = useState(staff.campusId || '');

  const load = useCallback(async (campusId?: string) => {
    onError('');
    try {
      const data = await intake<{ questions: Question[]; cornerItems: CornerItem[]; submissions: typeof mine; staff: Staff; sermons?: SermonChoice[] }>(
        'form',
        campusId ? { campusId } : {},
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
  }, [onError, staff.campusId]);

  useEffect(() => { load(staff.campusId || undefined); }, [load, staff.campusId]);

  const campusLocked = staff.role === 'campus' && !!staff.campusId;
  const sermonForm = staff.role === 'hub' || staff.role === 'media' || staff.role === 'admin';

  const runPreview = async () => {
    setBusy(true); onError('');
    try {
      const data = await intake<{ preview: FormattedSermon | null; source?: string }>('format_preview', { answers });
      setPreview(data.preview);
      setPreviewSource(data.source || '');
      if (!data.preview) onError('Nothing to format yet — add notes or a YouTube link.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not preview');
    }
    setBusy(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); onError(''); setDone(false);
    try {
      const data = await intake<{ preview?: FormattedSermon | null }>('submit', { answers, campusId: pickCampus || staff.campusId });
      if (data.preview) setPreview(data.preview);
      setDone(true);
      await load(pickCampus || staff.campusId || undefined);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not submit');
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 8px' }}>This week</h2>
      <p style={{ ...helpStyle, marginBottom: 20 }}>{formIntro(staff.role)}</p>

      {staff.role === 'admin' && (
        <Field label="Campus (if this is a campus-corner update)">
          <select
            value={pickCampus}
            onChange={async e => {
              const v = e.target.value;
              setPickCampus(v);
              if (v) await load(v);
            }}
            style={inputStyle}
          >
            <option value="">—</option>
            {CAMPUSES.filter(c => c.id !== 'other').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      )}

      {questions.map(q => (
        <QuestionField
          key={q.id}
          q={q}
          value={answers[q.id]}
          campusLocked={campusLocked}
          lockedCampus={staff.campusId}
          cornerItems={cornerItems}
          sermons={sermons}
          require={q.required && (q.audience === staff.role || q.audience === 'all')}
          onChange={v => { setAnswers(a => ({ ...a, [q.id]: v })); setPreview(null); }}
        />
      ))}

      {questions.length === 0 && (
        <p style={helpStyle}>No questions on the form yet. Ashley adds them under Questions.</p>
      )}

      {sermonForm && (
        <button type="button" disabled={busy || questions.length === 0} onClick={runPreview} style={{ ...btnGhost, marginTop: 8, marginRight: 8 }}>
          {busy ? 'Working…' : 'Preview formatted notes'}
        </button>
      )}
      <button type="submit" disabled={busy || questions.length === 0} style={{ ...btnPrimary, marginTop: 8 }}>
        {busy ? 'Sending…' : 'Submit for review'}
      </button>
      {preview && (
        <div style={{ marginTop: 20 }}>
          <p style={{ ...helpStyle, marginBottom: 8 }}>
            Preview{previewSource === 'ai' ? ' · formatted with AI' : previewSource === 'merge' ? ' · video on the existing notes' : ' · formatted'} — Ashley still has to accept this.
          </p>
          <SermonPreview sermon={preview} />
        </div>
      )}
      {done && (
        <p style={{ marginTop: 12, color: 'var(--dw-info)', fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
          Sent. It goes live after Ashley accepts it.
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
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{label}</label>
      {help ? <p style={helpStyle}>{help}</p> : null}
      {children}
    </div>
  );
}

function SermonPreview({ sermon }: { sermon: FormattedSermon }) {
  const embed = youtubeEmbedUrl(sermon.youtubeUrl);
  return (
    <div style={{ border: '1px solid var(--dw-border)', borderRadius: 16, padding: 16, background: 'var(--dw-card)' }}>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {sermon.series || 'Sermon Notes'}{sermon.date ? ` · ${sermon.date}` : ''}
      </p>
      <h3 style={{ margin: '6px 0 4px', fontFamily: 'var(--font-serif)', fontSize: 22 }}>{sermon.title}</h3>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>{sermon.speaker}</p>
      {embed && (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, marginBottom: 16, borderRadius: 12, overflow: 'hidden' }}>
          <iframe
            title="Sermon video"
            src={embed}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
      )}
      {sermon.keyVerseText && (
        <p style={{ fontFamily: 'var(--font-serif-text)', fontSize: 15, lineHeight: 1.55, color: 'var(--dw-text-secondary)' }}>
          “{sermon.keyVerseText}”{sermon.keyVerse ? ` — ${sermon.keyVerse}` : ''}
        </p>
      )}
      {(sermon.sections || []).map(sec => (
        <div key={sec.num} style={{ marginTop: 14 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--dw-accent)' }}>
            {sec.num}. {sec.title}
          </p>
          {(sec.content || []).map((c, i) => (
            c.type === 'blank'
              ? <p key={i} style={{ ...helpStyle, fontStyle: 'italic' }}>Write-in space</p>
              : <p key={i} style={{ margin: '0 0 6px', fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--dw-text-secondary)' }}>
                  {c.type === 'bullet' ? `• ${c.value}` : c.value || c.before}
                </p>
          ))}
        </div>
      ))}
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
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontFamily: 'var(--font-sans)', fontSize: 15 }}>
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ width: 20, height: 20 }} />
          Yes
        </label>
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
  if (q.type === 'long_text' || q.type === 'text' || q.type === 'sermon_pick') {
    if (q.type === 'sermon_pick' || q.config?.publish === 'sermon_target') {
      const choices = sermons || [];
      return (
        <Field label={q.label} help={q.help}>
          <select
            required={required}
            value={String(value || '')}
            onChange={e => onChange(e.target.value)}
            style={{ ...inputStyle, marginBottom: 8 }}
          >
            <option value="">Select this week's message</option>
            {choices.map(s => (
              <option key={s.id} value={s.id}>{s.title}{s.date ? ` · ${s.date}` : ''}</option>
            ))}
          </select>
          <input
            placeholder="Or paste a title / sermon id"
            value={choices.some(s => s.id === value) ? '' : String(value || '')}
            onChange={e => onChange(e.target.value)}
            style={inputStyle}
          />
        </Field>
      );
    }
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
  if (q.type === 'corner_add') {
    const items = Array.isArray(value) ? value as { type: string; title: string; content: string }[] : [];
    return (
      <Field label={q.label} help={q.help}>
        {items.map((it, i) => (
          <div key={i} style={{ border: '1px solid var(--dw-border)', borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <select value={it.type} onChange={e => {
              const next = items.slice();
              next[i] = { ...it, type: e.target.value };
              onChange(next);
            }} style={{ ...inputStyle, marginBottom: 8 }}>
              <option value="announcement">Announcement</option>
              <option value="note">Note</option>
              <option value="prayer_point">Prayer point</option>
            </select>
            <input placeholder="Title" value={it.title} onChange={e => {
              const next = items.slice();
              next[i] = { ...it, title: e.target.value };
              onChange(next);
            }} style={{ ...inputStyle, marginBottom: 8 }} />
            <textarea placeholder="What should people at your campus see?" rows={4} value={it.content} onChange={e => {
              const next = items.slice();
              next[i] = { ...it, content: e.target.value };
              onChange(next);
            }} style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} />
            {items.length > 1 && (
              <button type="button" style={{ ...btnGhost, marginTop: 8, minHeight: 36 }} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                Remove this item
              </button>
            )}
          </div>
        ))}
        <button type="button" style={btnGhost} onClick={() => onChange([...items, { type: 'announcement', title: '', content: '' }])}>
          Add another
        </button>
      </Field>
    );
  }
  if (q.type === 'corner_remove') {
    const selected = Array.isArray(value) ? value as string[] : [];
    return (
      <Field label={q.label} help={q.help}>
        {cornerItems.length === 0 ? (
          <p style={helpStyle}>Nothing is on the campus corner yet.</p>
        ) : cornerItems.map(item => (
          <label key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, fontFamily: 'var(--font-sans)', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={e => {
                onChange(e.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id));
              }}
              style={{ width: 18, height: 18, marginTop: 2 }}
            />
            <span>
              <strong>{item.title}</strong>
              <span style={{ color: 'var(--dw-text-muted)' }}> · {item.type}</span>
            </span>
          </label>
        ))}
      </Field>
    );
  }
  if (q.type === 'sermon_notes') {
    const s = (value && typeof value === 'object' ? value : {}) as Record<string, string>;
    const set = (k: string, v: string) => onChange({ ...s, [k]: v });
    return (
      <Field label={q.label} help={q.help}>
        <input placeholder="Title" value={s.title || ''} onChange={e => set('title', e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
        <input placeholder="Speaker" value={s.speaker || ''} onChange={e => set('speaker', e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
        <input type="date" value={s.date || ''} onChange={e => set('date', e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
        <input placeholder="Series (optional)" value={s.series || ''} onChange={e => set('series', e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
        <input placeholder="Key verse (e.g. John 11:25)" value={s.keyVerse || ''} onChange={e => set('keyVerse', e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
        <textarea placeholder="Key verse text" rows={2} value={s.keyVerseText || ''} onChange={e => set('keyVerseText', e.target.value)} style={{ ...inputStyle, marginBottom: 8, resize: 'vertical' }} />
        <textarea
          placeholder={'Outline — use headings like:\n1. First point\nA sentence of notes\n- A bullet'}
          rows={10}
          value={s.outline || ''}
          onChange={e => set('outline', e.target.value)}
          style={{ ...inputStyle, minHeight: 180, resize: 'vertical', fontFamily: 'var(--font-sans)' }}
        />
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
        This is the form pastors fill. Add a field when you need a new kind of update — no code change.
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
                <option value="outline">Outline body</option>
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

function ReviewQueue({ onError }: { onError: (s: string) => void }) {
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
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 8px' }}>Review</h2>
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
      {rows.length === 0 && <p style={helpStyle}>Nothing in {status}.</p>}
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
        Ashley Evans (ae@futures.global) is the only admin — he owns questions, review, and this roster. Hub pastors put up notes when they preach; media can add the YouTube after Sunday and clean the notes if needed. Other staff set their own password on first visit.
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
