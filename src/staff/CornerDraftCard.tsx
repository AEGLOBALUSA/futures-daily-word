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
type EditorMemory = {
  draft: CornerDraft; body: string; prayerPoint: string; answer: string;
  fresh: CornerDraft | null; pendingQuestion: 'extra' | 'prayerPoint' | null;
  dismissed: { extra: boolean; prayerPoint: boolean };
};
const draftKey = (draft: CornerDraft) => JSON.stringify([draft.campusId, draft.weekOf]);
const scrollClearance = () => {
  const height = document.querySelector('header')?.getBoundingClientRect().height;
  return height ? height + 16 : 96;
};

export function CornerDraftCard({ isAdmin = false, onJob }: Props) {
  const [waiting, setWaiting] = useState<CornerDraftWaiting[]>([]);
  const [campusId, setCampusId] = useState<string>();
  const [readVersion, setReadVersion] = useState(0);
  const [listVersion, setListVersion] = useState(0);
  const [draft, setDraft] = useState<CornerDraft | null>(null);
  const [openedDrafts, setOpenedDrafts] = useState<CornerDraft[]>([]);
  const [listState, setListState] = useState<ReadState>('loading');
  const [readState, setReadState] = useState<ReadState>('loading');
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  // Private words stay in this card's session, separately for each campus and week.
  const editorMemory = useRef(new Map<string, EditorMemory>());
  const selectedReadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdmin && campusId && readState !== 'ready') {
      selectedReadRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
      selectedReadRef.current?.focus({ preventScroll: true });
    }
  }, [isAdmin, campusId, readState, readVersion]);

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
        if (next?.status === 'draft') setOpenedDrafts(current => {
          const index = current.findIndex(opened => opened.campusId === next.campusId);
          if (index === -1) return [...current, next];
          return current.map((opened, i) => i === index ? next : opened);
        });
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

  const readFeedback = (state: ReadState, retry: () => void, selected = false) => state === 'ready' ? null :
    <div ref={selected ? selectedReadRef : undefined} tabIndex={selected ? -1 : undefined}
      style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--dw-text-primary)', scrollMarginTop: 96 }}>
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
        {campusId === campus.campusId && readFeedback(readState, () => setReadVersion(version => version + 1), true)}
      </div>
    ))}
    {(!isAdmin || (campusId && !waiting.some(campus => campus.campusId === campusId))) &&
      readFeedback(readState, () => setReadVersion(version => version + 1), isAdmin)}
    {openedDrafts.map(opened => {
      const active = !!draft && draftKey(opened) === draftKey(draft);
      return <section key={draftKey(opened)} hidden={!active}>
        <DraftEditor initial={opened} memory={editorMemory.current} active={active} campusId={isAdmin ? opened.campusId : undefined}
          onJob={onJob} onBusy={value => { busyRef.current = value; setBusy(value); }}
          onComplete={() => setWaiting(rows => rows.filter(row => row.campusId !== opened.campusId))} />
      </section>;
    })}
  </>;
}

function DraftEditor({ initial, memory, active, campusId, onJob, onBusy, onComplete }: {
  initial: CornerDraft; active: boolean; campusId?: string; onJob: Props['onJob'];
  memory: Map<string, EditorMemory>;
  onBusy: (busy: boolean) => void; onComplete: () => void;
}) {
  const id = useId();
  const remembered = memory.get(draftKey(initial));
  // Keep the baseline version with the edits so the server still checks for stale writes.
  const [draft, setDraft] = useState(remembered?.draft ?? initial);
  const [body, setBody] = useState(remembered?.body ?? initial.body);
  const [prayerPoint, setPrayerPoint] = useState(remembered?.prayerPoint ?? initial.prayerPoint);
  const [answer, setAnswer] = useState(remembered?.answer ?? '');
  // These refs include keystrokes made while a request is in flight.
  const edits = useRef({ body, prayerPoint, answer });
  const [fresh, setFresh] = useState<CornerDraft | null>(remembered?.fresh ?? null);
  const [pendingQuestion, setPendingQuestion] = useState<'extra' | 'prayerPoint' | null>(remembered?.pendingQuestion ?? null);
  const [dismissed, setDismissed] = useState(remembered?.dismissed ?? { extra: false, prayerPoint: false });
  const [busy, setBusy] = useState<Action | null>(null);
  const busyRef = useRef(false);
  const [outcome, setOutcome] = useState<'published' | 'skipped' | 'finished' | null>(null);
  const [savedWords, setSavedWords] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');
  const [errors, setErrors] = useState<Partial<Record<Action, string>>>({});
  const [reloadAction, setReloadAction] = useState<Action | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const freshRef = useRef<HTMLDivElement>(null);
  const words = (key: string) => t(`corner_draft_${key}`, draft.lang)
    .replace('{campus}', () => draft.campusName);
  const question = pendingQuestion ?? (draft.refreshesLeft === 0 ? null
    : !draft.answered.extra && !dismissed.extra ? 'extra'
      : !draft.answered.prayerPoint && !dismissed.prayerPoint ? 'prayerPoint' : null);

  useEffect(() => {
    memory.set(draftKey(draft), { draft, body, prayerPoint, answer, fresh, pendingQuestion, dismissed });
  }, [memory, draft, body, prayerPoint, answer, fresh, pendingQuestion, dismissed]);

  useEffect(() => {
    if (!active) return;
    if (headingRef.current) headingRef.current.style.scrollMarginTop = `${scrollClearance()}px`;
    if (campusId) {
      headingRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [active, campusId]);
  useEffect(() => { if (outcome === 'published') doneRef.current?.focus(); }, [outcome]);
  useEffect(() => {
    if (active && fresh && freshRef.current) {
      freshRef.current.style.scrollMarginTop = `${scrollClearance()}px`;
      freshRef.current.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    }
  }, [active, fresh]);
  useEffect(() => {
    if (!answer.trim()) setErrors(current => current.publish === 'error_answer_pending'
      ? { ...current, publish: undefined } : current);
  }, [answer]);

  function finish() {
    const current = edits.current;
    if (current.body !== draft.body || current.prayerPoint !== draft.prayerPoint || current.answer.trim()) {
      setSavedWords([current.body, current.prayerPoint, current.answer].filter(value => value.trim()).join('\n\n'));
    }
    setOutcome('finished'); onComplete();
  }

  async function copyWords() {
    if (busyRef.current || savedWords === null) return;
    busyRef.current = true; setCopyState('busy'); onBusy(true);
    try {
      if (!navigator.clipboard?.writeText) { setCopyState('failed'); return; }
      await navigator.clipboard.writeText(savedWords);
      setCopyState('done');
    } catch { setCopyState('failed'); }
    finally { busyRef.current = false; onBusy(false); }
  }

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
      setReloadAction(null);
      setErrors(current => Object.fromEntries(Object.entries(current).filter(([, error]) => error !== 'error_load')));
      if (!next || next.status !== 'draft') { finish(); return; }
      receive(next);
      if (edits.current.answer.trim()) setPendingQuestion(question);
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
        if (next.status !== 'draft') { finish(); return; }
        receive(next);
        if (edits.current.answer === answer) {
          edits.current.answer = ''; setAnswer(''); setPendingQuestion(null);
        } else setPendingQuestion(question);
      } else if (action === 'publish') {
        const sent = { body, prayerPoint };
        await publishCornerDraft(sent.body, sent.prayerPoint, campusId, draft.version);
        const current = edits.current;
        if (current.body !== sent.body || current.prayerPoint !== sent.prayerPoint || current.answer.trim()) {
          setSavedWords([current.body, current.prayerPoint, current.answer].filter(value => value.trim()).join('\n\n'));
        }
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
  const useForm = <button type="button" style={quietStyle} aria-busy={!!busy || copyState === 'busy'}
    onClick={() => { if (!busyRef.current) onJob('campus', campusId); }}>{words('use_form')}</button>;
  const preservedWords = savedWords !== null && <>
    <p style={{ margin: 0 }}>{words('recovered_words')}</p>
    <div role="region" aria-label={words('my_words')} tabIndex={0}
      style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', userSelect: 'text' }}>{savedWords}</div>
    <div>
      <button type="button" style={quietStyle} aria-busy={copyState === 'busy'}
        onClick={() => void copyWords()}>{words('copy_words')}</button>
      {copyState === 'done' && <p role="status" style={{ margin: 0 }}>{words('copied')}</p>}
      {copyState === 'failed' && <p role="alert" style={{ margin: 0 }}>{words('error_copy')}</p>}
    </div>
    {useForm}
  </>;

  if (outcome === 'published') return <section style={panelStyle} aria-labelledby={`${id}-done`} lang={draft.lang}>
    <h3 id={`${id}-done`} ref={doneRef} tabIndex={-1} style={headingStyle}>{words('done')}</h3>
    <p style={{ margin: 0 }}>{words('done_next')}</p>
    {savedWords !== null && <p role="status" style={{ margin: 0 }}>{words('unsaved_after_publish')}</p>}
    {preservedWords}
  </section>;
  if (outcome === 'finished') return savedWords === null ? <p role="status" lang={draft.lang}
    style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--dw-text-primary)' }}>{words('error_not_draft')}</p>
    : <section style={panelStyle} lang={draft.lang}>
      <p role="status" style={{ margin: 0 }}>{words('error_not_draft')}</p>
      {preservedWords}
    </section>;
  if (outcome === 'skipped') return <section style={panelStyle} lang={draft.lang}>
    <p role="status" style={{ margin: 0 }}>{words('skipped')}</p>{useForm}
  </section>;

  return <section style={panelStyle} aria-labelledby={`${id}-title`} lang={draft.lang}>
    <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} style={{ ...headingStyle, scrollMarginTop: 96 }}>{words('title')}</h3>
    <p style={{ margin: 0, padding: '12px 14px', border: '1px solid var(--dw-border)', borderRadius: 12 }}>
      <strong>{words('make_yours')}</strong>
    </p>
    {draft.source && <p style={{ margin: 0, color: 'var(--dw-text-muted)', fontSize: 15 }}>
      {words('source').replace('{title}', () => draft.source!.title)}{draft.source.speaker ? ` · ${draft.source.speaker}` : ''}
    </p>}
    {fresh && <div ref={freshRef} style={{ scrollMarginTop: 96 }}>
      <p role="status" style={{ margin: 0 }}>{words('fresh_ready')}</p>
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{fresh.body}</p>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <button type="button" style={quietStyle} aria-busy={!!busy} onClick={() => {
          if (busyRef.current) return;
          setFresh(null); noteRef.current?.focus();
        }}>{words('keep_edits')}</button>
        <button type="button" style={quietStyle} aria-busy={!!busy} onClick={() => {
          if (busyRef.current) return;
          edits.current.body = fresh.body; setBody(fresh.body); setFresh(null); noteRef.current?.focus();
        }}>{words('use_fresh')}</button>
      </div>
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
            {draft.refreshesLeft === 0 && answer.trim() && <button type="button" style={quietStyle}
              aria-busy={!!busy} onClick={() => {
                if (busyRef.current) return;
                const nextBody = [edits.current.body, edits.current.answer].filter(value => value.trim()).join('\n\n');
                edits.current.body = nextBody; setBody(nextBody);
                edits.current.answer = ''; setAnswer(''); setPendingQuestion(null);
                setErrors(current => ({ ...current, refresh: undefined }));
                noteRef.current?.focus();
              }}>{words('add_words')}</button>}
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
        <button type="button" style={quietStyle} aria-busy={busy === 'skip'} onClick={() => void act('skip')}>
          {words(busy === 'skip' ? 'skipping' : 'skip')}
        </button>
        {feedback('skip')}
      </div>
      {useForm}
    </div>
  </section>;
}
