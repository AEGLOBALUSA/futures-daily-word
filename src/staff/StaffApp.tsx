/**
 * Staff portal at /staff — one login, two jobs:
 * campus pastors fill the intake form for their campus corner;
 * hub pastors (Josh / Ryan) fill sermon notes; Ashley owns questions + review.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { CAMPUSES } from '../data/tokens';
import { getStaffToken, intake, setStaffToken } from './api';

type Role = 'admin' | 'hub' | 'campus';
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
  config: { publish?: string; itemType?: string; sermonKey?: string };
};
type CornerItem = { id: string; type: string; title: string; created_at?: string };
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
  { id: 'sermon_notes', label: 'Sermon notes (this week)' },
];
const AUDIENCES = [
  { id: 'campus', label: 'Campus pastors' },
  { id: 'hub', label: 'Hub pastors (when they preach)' },
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
  if (q.type === 'yes_no') return false;
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
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const request = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await intake('request_otp', { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a code');
    }
    setBusy(false);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const data = await intake<{ token: string; staff: Staff }>('verify_otp', { email, code });
      onSignedIn(data.token, data.staff);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dw-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onSubmit={sent ? verify : request} style={{ width: 'min(420px, 100%)' }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
          Futures Daily Word
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, margin: '8px 0 8px', fontWeight: 700 }}>Staff sign-in</h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--dw-text-secondary)', lineHeight: 1.55, margin: '0 0 24px' }}>
          One form. Campus pastors update their campus corner. Hub pastors put up sermon notes when they preach. Nothing goes live until Ashley reviews it.
        </p>
        <label style={labelStyle} htmlFor="staff-email">Work email</label>
        <input
          id="staff-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@futures.church"
          style={{ ...inputStyle, marginBottom: 14 }}
        />
        {sent && (
          <>
            <label style={labelStyle} htmlFor="staff-code">Code</label>
            <input
              id="staff-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="6-digit code"
              style={{ ...inputStyle, marginBottom: 8, letterSpacing: '0.12em' }}
            />
            <p style={helpStyle}>
              Check your email. If mail is not set up yet, Ashley can enter the Daily Word admin PIN as her code.
            </p>
          </>
        )}
        {error && <p style={{ color: '#B42318', fontSize: 13, fontFamily: 'var(--font-sans)' }}>{error}</p>}
        <button type="submit" disabled={busy} style={{ ...btnPrimary, width: '100%', marginTop: 8 }}>
          {busy ? 'Please wait…' : sent ? 'Sign in' : 'Send code'}
        </button>
        <p style={{ marginTop: 20, textAlign: 'center' }}>
          <a href="/" style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>← Daily Word</a>
        </p>
      </form>
    </div>
  );
}

function IntakeForm({ staff, onError }: { staff: Staff; onError: (s: string) => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [cornerItems, setCornerItems] = useState<CornerItem[]>([]);
  const [mine, setMine] = useState<{ id: string; status: string; created_at: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [pickCampus, setPickCampus] = useState(staff.campusId || '');

  const load = useCallback(async (campusId?: string) => {
    onError('');
    try {
      const data = await intake<{ questions: Question[]; cornerItems: CornerItem[]; submissions: typeof mine; staff: Staff }>(
        'form',
        campusId ? { campusId } : {},
      );
      setQuestions(data.questions || []);
      setCornerItems(data.cornerItems || []);
      setMine(data.submissions || []);
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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); onError(''); setDone(false);
    try {
      await intake('submit', { answers, campusId: pickCampus || staff.campusId });
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
      <p style={{ ...helpStyle, marginBottom: 20 }}>
        Fill what applies. Ashley reviews it, then it appears on the campus corner or in Sermon Notes — not in personal Notes.
      </p>

      {staff.role !== 'campus' && (
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
          onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))}
        />
      ))}

      {questions.length === 0 && (
        <p style={helpStyle}>No questions on the form yet. Ashley adds them under Questions.</p>
      )}

      <button type="submit" disabled={busy || questions.length === 0} style={{ ...btnPrimary, marginTop: 8 }}>
        {busy ? 'Sending…' : 'Submit for review'}
      </button>
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

function QuestionField({
  q, value, onChange, campusLocked, lockedCampus, cornerItems,
}: {
  q: Question;
  value: unknown;
  onChange: (v: unknown) => void;
  campusLocked: boolean;
  lockedCampus: string | null;
  cornerItems: CornerItem[];
}) {
  if (q.type === 'campus') {
    const v = String(value || lockedCampus || '');
    return (
      <Field label={q.label} help={q.help}>
        <select
          required={q.required}
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
        <input type="date" required={q.required} value={String(value || '')} onChange={e => onChange(e.target.value)} style={inputStyle} />
      </Field>
    );
  }
  if (q.type === 'long_text' || q.type === 'text') {
    const Comp = q.type === 'long_text' ? 'textarea' : 'input';
    return (
      <Field label={q.label} help={q.help}>
        <Comp
          required={q.required}
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
          {(editing.type === 'text' || editing.type === 'long_text') && (
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
  const [rows, setRows] = useState<{ email: string; role: Role; campus_id: string | null; display_name: string }[]>([]);
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
        Named staff are Ashley, Josh Greenwood, and Ryan Rolls. Other futures.church emails sign in as campus pastors. Pin a campus here so they only see theirs.
      </p>
      {rows.map(r => (
        <div key={r.email} style={{ border: '1px solid var(--dw-border)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
          <p style={{ margin: 0, fontWeight: 700, fontFamily: 'var(--font-sans)' }}>{r.display_name || r.email}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
            {r.email} · {r.role}{r.campus_id ? ` · ${campusName(r.campus_id)}` : ''}
          </p>
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
