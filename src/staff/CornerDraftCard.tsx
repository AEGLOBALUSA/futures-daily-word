import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { t } from '../utils/i18n';
import {
  cornerDraftErrorCode, getCornerDraft, listCornerDrafts, publishCornerDraft,
  refreshCornerDraft, skipCornerDraft, type CornerDraft, type CornerDraftWaiting,
} from './cornerDraftApi';

const panelStyle: CSSProperties = {
  display: 'grid', gap: 16, width: '100%', maxWidth: 680, boxSizing: 'border-box',
  background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
  borderRadius: 16, padding: 20, marginBottom: 24,
  color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.5,
};
const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.3, margin: 0,
};
const quietStyle: CSSProperties = {
  minHeight: 44, padding: '8px 0', border: 'none', background: 'transparent',
  color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', fontSize: 15,
  textAlign: 'left', textDecoration: 'underline', cursor: 'pointer',
};
const fieldStyle: CSSProperties = {
  display: 'block', width: '100%', minWidth: 0, minHeight: 56, boxSizing: 'border-box',
  marginTop: 8, padding: '12px 14px', border: '1px solid var(--dw-border)', borderRadius: 12,
  background: 'var(--dw-surface)', color: 'var(--dw-text-primary)',
  fontFamily: 'var(--font-sans)', fontSize: 17, lineHeight: 1.5, resize: 'vertical',
};
const campusMainStyle: CSSProperties = {
  border: 'none', borderRadius: 999, minHeight: 56, width: '100%', padding: '12px 18px',
  fontSize: 17, fontFamily: 'var(--font-sans)', cursor: 'pointer',
};

type Props = { isAdmin?: boolean; onJob: (job: 'campus') => void };

export function CornerDraftCard({ isAdmin = false, onJob }: Props) {
  const [waiting, setWaiting] = useState<CornerDraftWaiting[]>([]);
  const [campusId, setCampusId] = useState<string>();
  const [readVersion, setReadVersion] = useState(0);
  const [draft, setDraft] = useState<CornerDraft | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    listCornerDrafts().then(rows => { if (active) setWaiting(rows); }).catch(() => {});
    return () => { active = false; };
  }, [isAdmin]);

  useEffect(() => {
    let active = true;
    if (!isAdmin || campusId) {
      getCornerDraft(campusId).then(({ draft: next }) => {
        if (active) setDraft(next?.status === 'draft' ? next : null);
      }).catch(() => { if (active) setDraft(null); });
    }
    return () => { active = false; };
  }, [isAdmin, campusId, readVersion]);

  return <>
    {isAdmin && waiting.map(campus => (
      <div key={campus.campusId}>
        <button type="button" style={quietStyle} disabled={busy}
          aria-pressed={campusId === campus.campusId}
          onClick={() => {
            if (campusId === campus.campusId && draft) return;
            setDraft(null);
            setCampusId(campus.campusId);
            setReadVersion(version => version + 1);
          }}>
          {t('corner_draft_waiting').replace('{campus}', campus.campusName)}
        </button>
      </div>
    ))}
    {draft && <DraftEditor key={draft.id} initial={draft} campusId={isAdmin ? campusId : undefined}
      onJob={onJob} onBusy={setBusy}
      onComplete={() => setWaiting(rows => rows.filter(row => row.campusId !== draft.campusId))} />}
  </>;
}

function DraftEditor({ initial, campusId, onJob, onBusy, onComplete }: {
  initial: CornerDraft; campusId?: string; onJob: Props['onJob'];
  onBusy: (busy: boolean) => void; onComplete: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const [body, setBody] = useState(initial.body);
  const [prayerPoint, setPrayerPoint] = useState(initial.prayerPoint);
  const [answer, setAnswer] = useState('');
  const [dismissed, setDismissed] = useState({ extra: false, prayerPoint: false });
  const [busy, setBusy] = useState<'refresh' | 'publish' | 'skip' | null>(null);
  const busyRef = useRef(false);
  const [outcome, setOutcome] = useState<'published' | 'skipped' | null>(null);
  const [error, setError] = useState<{ key: string; note?: boolean } | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const words = (key: string) => t(`corner_draft_${key}`, draft.lang)
    .replace('{campus}', () => draft.campusName);
  const question = draft.refreshesLeft === 0 ? null
    : !draft.answered.extra && !dismissed.extra ? 'extra'
      : !draft.answered.prayerPoint && !dismissed.prayerPoint ? 'prayerPoint' : null;

  useEffect(() => {
    if (error?.note) noteRef.current?.focus();
    else if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => { if (outcome === 'published') doneRef.current?.focus(); }, [outcome]);

  async function act(action: 'refresh' | 'publish' | 'skip') {
    if (busyRef.current) return;
    setError(null);
    if (action === 'publish' && !body.trim()) {
      setError({ key: 'error_empty', note: true });
      return;
    }
    busyRef.current = true;
    setBusy(action);
    onBusy(true);
    try {
      if (action === 'refresh' && question) {
        const next = await refreshCornerDraft({ [question]: answer }, campusId);
        setDraft(next);
        setBody(next.body);
        setPrayerPoint(next.prayerPoint);
        setAnswer('');
      } else if (action === 'publish') {
        await publishCornerDraft(body, prayerPoint, campusId);
        setOutcome('published');
        onComplete();
      } else if (action === 'skip') {
        await skipCornerDraft(campusId);
        setOutcome('skipped');
        onComplete();
      }
    } catch (err) {
      const code = cornerDraftErrorCode(err);
      const key = ['refresh_cap', 'not_draft', 'empty', 'unfinished', 'preview'].includes(code)
        ? code : ['other_campus', 'campus_unconfirmed', 'role', 'campus'].includes(code) ? 'access' : 'save';
      setError({ key: `error_${key}` });
      if (code === 'refresh_cap') setDraft(current => ({ ...current, refreshesLeft: 0 }));
    } finally {
      busyRef.current = false;
      setBusy(null);
      onBusy(false);
    }
  }

  if (outcome === 'published') return <section style={panelStyle} aria-labelledby={`${id}-done`} lang={draft.lang}>
    <h3 id={`${id}-done`} ref={doneRef} tabIndex={-1} style={headingStyle}>{words('done')}</h3>
    <p style={{ margin: 0 }}>{words('done_next')}</p>
  </section>;
  if (outcome === 'skipped') return <p role="status" lang={draft.lang}
    style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--dw-text-primary)' }}>{words('skipped')}</p>;
  if (draft.status !== 'draft') return null;

  return <section style={panelStyle} aria-labelledby={`${id}-title`} lang={draft.lang}>
    <h3 id={`${id}-title`} style={headingStyle}>{words('title')}</h3>
    <p style={{ margin: 0, padding: '12px 14px', background: 'var(--dw-surface)', borderLeft: '3px solid var(--dw-accent)' }}>
      <strong>{words('make_yours')}</strong>
    </p>
    {draft.source && <p style={{ margin: 0, color: 'var(--dw-text-muted)', fontSize: 15 }}>
      {words('source').replace('{title}', () => draft.source!.title)}{draft.source.speaker ? ` · ${draft.source.speaker}` : ''}
    </p>}
    {draft.refreshesLeft === 0 ? <p style={{ margin: 0 }}>{words('edit_yourself')}</p> : question && <div>
      <label htmlFor={`${id}-answer`}>{words(question === 'extra' ? 'question_extra' : 'question_prayer')}</label>
      <textarea id={`${id}-answer`} rows={2} style={fieldStyle} value={answer} onChange={e => setAnswer(e.target.value)} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
        <button type="button" disabled={!!busy} aria-busy={busy === 'refresh'} onClick={() => void act('refresh')}
          style={{ ...quietStyle, textDecoration: 'none', border: '1px solid var(--dw-border)', borderRadius: 12, padding: '8px 14px' }}>
          {words(busy === 'refresh' ? 'adding' : 'add')}
        </button>
        <button type="button" style={quietStyle} disabled={!!busy} onClick={() => {
          setDismissed(current => ({ ...current, [question]: true })); setAnswer('');
        }}>{words('skip_question')}</button>
      </div>
    </div>}
    <div>
      <label htmlFor={`${id}-body`}>{words('note')}</label>
      <textarea id={`${id}-body`} ref={noteRef} rows={6} style={fieldStyle} value={body}
        aria-invalid={error?.key === 'error_empty' || undefined} aria-describedby={error ? `${id}-error` : undefined}
        onChange={e => setBody(e.target.value)} />
    </div>
    {draft.prayerPoint && <div>
      <label htmlFor={`${id}-prayer`}>{words('prayer')}</label>
      <textarea id={`${id}-prayer`} rows={2} style={fieldStyle} value={prayerPoint} onChange={e => setPrayerPoint(e.target.value)} />
    </div>}
    <div style={{ position: 'sticky', bottom: 0, background: 'var(--dw-card)', padding: '12px 0' }}>
      <button type="button" className="dw-next dw-campus-main" style={campusMainStyle} disabled={!!busy}
        aria-busy={busy === 'publish'} onClick={() => void act('publish')}>
        {words(busy === 'publish' ? 'publishing' : 'publish')}
      </button>
      {error && <p id={`${id}-error`} ref={errorRef} tabIndex={-1} role="alert"
        style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--dw-error)' }}>{words(error.key)}</p>}
    </div>
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      <button type="button" style={quietStyle} disabled={!!busy} aria-busy={busy === 'skip'} onClick={() => void act('skip')}>{words('skip')}</button>
      <button type="button" style={quietStyle} disabled={!!busy} onClick={() => onJob('campus')}>{words('use_form')}</button>
    </div>
  </section>;
}
