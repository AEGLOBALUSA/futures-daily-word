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
  fontFamily: 'var(--font-serif)', fontSize: 28, lineHeight: 1.3, margin: 0,
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

type Props = { isAdmin?: boolean; onJob: (job: 'campus', campusId?: string) => void };
type Action = 'refresh' | 'publish' | 'skip';
type ReadState = 'loading' | 'ready' | 'failed' | 'finished';

export function CornerDraftCard({ isAdmin = false, onJob }: Props) {
  const [waiting, setWaiting] = useState<CornerDraftWaiting[]>([]);
  const [campusId, setCampusId] = useState<string>();
  const [readVersion, setReadVersion] = useState(0);
  const [listVersion, setListVersion] = useState(0);
  const [draft, setDraft] = useState<CornerDraft | null>(null);
  const [listState, setListState] = useState<ReadState>('loading');
  const [readState, setReadState] = useState<ReadState>('loading');
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    setListState('loading');
    listCornerDrafts().then(rows => {
      if (active) { setWaiting(rows); setListState('ready'); }
    }).catch(() => { if (active) setListState('failed'); });
    return () => { active = false; };
  }, [isAdmin, listVersion]);

  useEffect(() => {
    if (isAdmin && !campusId) return;
    let active = true;
    setReadState('loading');
    getCornerDraft(campusId).then(({ draft: next }) => {
      if (active) {
        setDraft(next?.status === 'draft' ? next : null);
        setReadState('ready');
        if (!next || next.status !== 'draft') setWaiting(rows => rows.filter(row => row.campusId !== campusId));
      }
    }).catch(err => {
      if (!active) return;
      const code = cornerDraftErrorCode(err);
      const finished = code === 'no_draft' || code === 'not_draft';
      setReadState(finished ? 'finished' : 'failed');
      if (finished) setWaiting(rows => rows.filter(row => row.campusId !== campusId));
    });
    return () => { active = false; };
  }, [isAdmin, campusId, readVersion]);

  const readFeedback = (state: ReadState, retry: () => void) => state === 'ready' ? null :
    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--dw-text-primary)' }}>
      <p role="status" style={{ margin: 0 }}>{t(`corner_draft_${state === 'loading' ? 'loading' : state === 'finished' ? 'error_not_draft' : 'error_load'}`)}</p>
      {state === 'failed' && <button type="button" style={quietStyle} onClick={retry}>{t('corner_draft_retry')}</button>}
    </div>;

  return <>
    {isAdmin && readFeedback(listState, () => setListVersion(version => version + 1))}
    {isAdmin && waiting.map(campus => (
      <div key={campus.campusId}>
        <button type="button" style={quietStyle} aria-busy={busy}
          aria-pressed={campusId === campus.campusId}
          onClick={() => {
            if (busyRef.current || (campusId === campus.campusId && draft)) return;
            setDraft(null);
            setReadState('loading');
            setCampusId(campus.campusId);
            setReadVersion(version => version + 1);
          }}>
          {t('corner_draft_waiting').replace('{campus}', campus.campusName)}
        </button>
      </div>
    ))}
    {(!isAdmin || campusId) && readFeedback(readState, () => setReadVersion(version => version + 1))}
    {draft && <DraftEditor key={draft.id} initial={draft} campusId={isAdmin ? campusId : undefined}
      onJob={onJob} onBusy={value => { busyRef.current = value; setBusy(value); }}
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
  // These refs include keystrokes made while a request is in flight.
  const edits = useRef({ body: initial.body, prayerPoint: initial.prayerPoint, answer: '' });
  const [fresh, setFresh] = useState<CornerDraft | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<'extra' | 'prayerPoint' | null>(null);
  const [dismissed, setDismissed] = useState({ extra: false, prayerPoint: false });
  const [busy, setBusy] = useState<Action | null>(null);
  const busyRef = useRef(false);
  const [outcome, setOutcome] = useState<'published' | 'skipped' | 'finished' | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Action, string>>>({});
  const [reloadAction, setReloadAction] = useState<Action | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const words = (key: string) => t(`corner_draft_${key}`, draft.lang)
    .replace('{campus}', () => draft.campusName);
  const question = pendingQuestion ?? (draft.refreshesLeft === 0 ? null
    : !draft.answered.extra && !dismissed.extra ? 'extra'
      : !draft.answered.prayerPoint && !dismissed.prayerPoint ? 'prayerPoint' : null);

  useEffect(() => {
    if (campusId) {
      headingRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [campusId]);
  useEffect(() => { if (outcome === 'published') doneRef.current?.focus(); }, [outcome]);

  function finish() { setOutcome('finished'); onComplete(); }

  function receive(next: CornerDraft) {
    if (next.status !== 'draft') { finish(); return; }
    if (edits.current.body !== draft.body) setFresh(next);
    else { edits.current.body = next.body; setBody(next.body); setFresh(null); }
    if (edits.current.prayerPoint === draft.prayerPoint) {
      edits.current.prayerPoint = next.prayerPoint;
      setPrayerPoint(next.prayerPoint);
    }
    setDraft(next);
  }

  async function reload(action: Action) {
    try {
      const { draft: next } = await getCornerDraft(campusId);
      if (!next || next.status !== 'draft') { finish(); return; }
      receive(next);
      if (edits.current.answer.trim()) setPendingQuestion(question);
      setReloadAction(null);
      setErrors(current => ({ ...current, [action]: 'error_stale' }));
    } catch (err) {
      const code = cornerDraftErrorCode(err);
      if (code === 'no_draft' || code === 'not_draft') { finish(); return; }
      setReloadAction(action);
      setErrors(current => ({ ...current, [action]: 'error_load' }));
    }
  }

  async function act(action: Action) {
    if (busyRef.current) return;
    setErrors(current => ({ ...current, [action]: undefined }));
    if (!reloadAction) {
      if (action === 'refresh' && !answer.trim()) {
        setErrors(current => ({ ...current, refresh: 'error_answer_empty' }));
        answerRef.current?.focus();
        return;
      }
      if (action === 'publish' && answer.trim()) {
        setErrors(current => ({ ...current, publish: 'error_answer_pending' }));
        answerRef.current?.focus();
        return;
      }
      if (action === 'publish' && !body.trim()) {
        setErrors(current => ({ ...current, publish: 'error_empty' }));
        noteRef.current?.focus();
        return;
      }
    }
    busyRef.current = true;
    setBusy(action);
    onBusy(true);
    try {
      if (reloadAction) { await reload(action); return; }
      if (action === 'refresh' && question) {
        const next = await refreshCornerDraft({ [question]: answer }, campusId, draft.version);
        receive(next);
        if (edits.current.answer === answer) {
          edits.current.answer = ''; setAnswer(''); setPendingQuestion(null);
        } else setPendingQuestion(question);
      } else if (action === 'publish') {
        await publishCornerDraft(body, prayerPoint, campusId, draft.version);
        setOutcome('published'); onComplete();
      } else if (action === 'skip') {
        await skipCornerDraft(campusId, draft.version);
        setOutcome('skipped'); onComplete();
      }
    } catch (err) {
      const code = cornerDraftErrorCode(err);
      if (code === 'no_draft' || code === 'not_draft') { finish(); return; }
      if (code === 'stale') { await reload(action); return; }
      const key = ['refresh_cap', 'empty', 'unfinished', 'preview'].includes(code)
        ? code : ['other_campus', 'campus_unconfirmed', 'role', 'campus'].includes(code) ? 'access' : 'save';
      setErrors(current => ({ ...current, [action]: `error_${key}` }));
      if (code === 'refresh_cap') {
        setDraft(current => ({ ...current, refreshesLeft: 0 }));
        if (edits.current.answer.trim()) setPendingQuestion(question);
      }
    } finally {
      busyRef.current = false; setBusy(null); onBusy(false);
    }
  }

  const feedback = (action: Action) => errors[action] && <>
    <p id={`${id}-${action}-error`} role="alert"
      style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--dw-text-primary)' }}>{words(errors[action]!)}</p>
    {reloadAction === action && <button type="button" style={quietStyle} aria-busy={busy === action}
      onClick={() => void act(action)}>{words('retry')}</button>}
  </>;
  const useForm = <button type="button" style={quietStyle} aria-busy={!!busy}
    onClick={() => { if (!busyRef.current) onJob('campus', campusId); }}>{words('use_form')}</button>;

  if (outcome === 'published') return <section style={panelStyle} aria-labelledby={`${id}-done`} lang={draft.lang}>
    <h3 id={`${id}-done`} ref={doneRef} tabIndex={-1} style={headingStyle}>{words('done')}</h3>
    <p style={{ margin: 0 }}>{words('done_next')}</p>
  </section>;
  if (outcome === 'finished') return <p role="status" lang={draft.lang}
    style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--dw-text-primary)' }}>{words('error_not_draft')}</p>;
  if (outcome === 'skipped') return <section style={panelStyle} lang={draft.lang}>
    <p role="status" style={{ margin: 0 }}>{words('skipped')}</p>{useForm}
  </section>;

  return <section style={panelStyle} aria-labelledby={`${id}-title`} lang={draft.lang}>
    <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} style={headingStyle}>{words('title')}</h3>
    <p style={{ margin: 0, padding: '12px 14px', border: '1px solid var(--dw-border)', borderRadius: 12 }}>
      <strong>{words('make_yours')}</strong>
    </p>
    {draft.source && <p style={{ margin: 0, color: 'var(--dw-text-muted)', fontSize: 15 }}>
      {words('source').replace('{title}', () => draft.source!.title)}{draft.source.speaker ? ` · ${draft.source.speaker}` : ''}
    </p>}
    {fresh && <div>
      <p role="status" style={{ margin: 0 }}>{words('fresh_ready')}</p>
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{fresh.body}</p>
      <button type="button" style={quietStyle} aria-busy={!!busy} onClick={() => {
        if (busyRef.current) return;
        edits.current.body = fresh.body; setBody(fresh.body); setFresh(null); noteRef.current?.focus();
      }}>{words('use_fresh')}</button>
    </div>}
    <div>
      <label htmlFor={`${id}-body`}>{words('note')}</label>
      <textarea id={`${id}-body`} ref={noteRef} rows={6} style={fieldStyle} value={body}
        aria-invalid={errors.publish === 'error_empty' || undefined}
        aria-describedby={errors.publish ? `${id}-publish-error` : undefined}
        onChange={e => { edits.current.body = e.target.value; setBody(e.target.value); }} />
    </div>
    {(draft.prayerPoint || prayerPoint) && <div>
      <label htmlFor={`${id}-prayer`}>{words('prayer')}</label>
      <textarea id={`${id}-prayer`} rows={2} style={fieldStyle} value={prayerPoint}
        onChange={e => { edits.current.prayerPoint = e.target.value; setPrayerPoint(e.target.value); }} />
    </div>}
    <div>
      {draft.refreshesLeft === 0 && <p style={{ margin: 0 }}>{words('edit_yourself')}</p>}
      {question && <>
        <p style={{ margin: '0 0 8px' }}>{words('question_progress').replace('{n}', question === 'extra' ? '1' : '2')}</p>
        <label htmlFor={`${id}-answer`}>{words(question === 'extra' ? 'question_extra' : 'question_prayer')}</label>
        <textarea id={`${id}-answer`} ref={answerRef} rows={2} style={fieldStyle} value={answer}
          onChange={e => { edits.current.answer = e.target.value; setAnswer(e.target.value); }} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          <div>
            {draft.refreshesLeft > 0 && <button type="button" aria-busy={busy === 'refresh'} onClick={() => void act('refresh')}
              style={{ ...quietStyle, textDecoration: 'none', border: '1px solid var(--dw-border)', borderRadius: 12, padding: '8px 14px' }}>
              {words(busy === 'refresh' ? 'adding' : 'add')}
            </button>}
            <p style={{ margin: '8px 0 0' }}>{words('refreshes_left').replace('{n}', String(draft.refreshesLeft))}</p>
            {feedback('refresh')}
          </div>
          <button type="button" style={quietStyle} aria-busy={!!busy} onClick={() => {
            if (busyRef.current) return;
            setDismissed(current => ({ ...current, [question]: true }));
            edits.current.answer = ''; setAnswer(''); setPendingQuestion(null);
            setErrors(current => ({ ...current, refresh: undefined }));
          }}>{words('skip_question')}</button>
        </div>
      </>}
      {!question && feedback('refresh')}
    </div>
    <div style={{ position: 'sticky', bottom: 0, background: 'var(--dw-card)', padding: '12px 0',
      paddingBottom: 'max(12px, env(safe-area-inset-bottom))', boxShadow: '0 -8px 24px rgb(0 0 0 / 0.08)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <button type="button" className="dw-next dw-campus-main" style={campusMainStyle}
        aria-busy={busy === 'publish'} onClick={() => void act('publish')}>
        {words(busy === 'publish' ? 'publishing' : 'publish')}
      </button>
      {feedback('publish')}
    </div>
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      <div>
        <button type="button" style={quietStyle} aria-busy={busy === 'skip'} onClick={() => void act('skip')}>{words('skip')}</button>
        {feedback('skip')}
      </div>
      {useForm}
    </div>
  </section>;
}
