import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { t } from '../utils/i18n';
import {
  cornerDraftErrorCode, getCornerDraft, listCornerDrafts, publishCornerDraft,
  refreshCornerDraft, skipCornerDraft, type CornerDraft, type CornerDraftWaiting,
} from './cornerDraftApi';
import { STAFF_SIGNED_OUT_EVENT } from './api';

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

type Props = {
  isAdmin?: boolean; staffCampusId?: string; onJob: (job: 'campus', campusId?: string) => void;
  secondary?: boolean;
};
type Action = 'refresh' | 'publish' | 'skip';
type ReadState = 'loading' | 'ready' | 'failed' | 'finished';
type Outcome = 'published' | 'skipped' | 'finished' | null;
type EditorMemory = {
  draft: CornerDraft; body: string; prayerPoint: string; answer: string;
  fresh: CornerDraft | null; pendingQuestion: 'extra' | 'prayerPoint' | null;
  dismissed: { extra: boolean; prayerPoint: boolean };
  savedWords: string | null; outcome: Outcome;
};
const draftKey = (draft: Pick<CornerDraft, 'campusId' | 'weekOf'>) => JSON.stringify([draft.campusId, draft.weekOf]);
const storagePrefix = 'dw_corner_draft_unsaved:';
const storageKey = (draft: CornerDraft) => `${storagePrefix}${draft.campusId}:${draft.weekOf}`;
const pendingWrites = new Map<string, number>();
function clearStoredEditors() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(storagePrefix)) sessionStorage.removeItem(key);
    }
  } catch { /* Storage is optional; never block signing out. */ }
}
function readEditors() {
  const editors = new Map<string, EditorMemory>();
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      try {
        const key = sessionStorage.key(i);
        if (!key?.startsWith(storagePrefix)) continue;
        const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as EditorMemory | null;
        const draft = value?.draft;
        if (!value || !draft || typeof draft.campusId !== 'string' || typeof draft.weekOf !== 'string' ||
          typeof draft.campusName !== 'string' || typeof draft.version !== 'string' ||
          typeof draft.body !== 'string' || typeof draft.prayerPoint !== 'string' ||
          !['en', 'es'].includes(draft.lang) || !draft.answered || typeof draft.refreshesLeft !== 'number' ||
          typeof value.body !== 'string' || typeof value.prayerPoint !== 'string' || typeof value.answer !== 'string' ||
          !value.dismissed || ![null, 'extra', 'prayerPoint'].includes(value.pendingQuestion) ||
          ![null, 'published', 'skipped', 'finished'].includes(value.outcome) ||
          (value.savedWords !== null && typeof value.savedWords !== 'string') || key !== storageKey(draft)) continue;
        editors.set(draftKey(draft), value);
      } catch { /* One unreadable entry must not hide the other campuses. */ }
    }
  } catch { /* Private mode: the in-memory editor still works. */ }
  return editors;
}
function storeEditor(draft: CornerDraft, value: EditorMemory | null) {
  try {
    if (value) sessionStorage.setItem(storageKey(draft), JSON.stringify(value));
    else if (!pendingWrites.has(storageKey(draft))) sessionStorage.removeItem(storageKey(draft));
  } catch { /* Storage is optional; never block editing or publishing. */ }
}
const scrollClearance = () => {
  const height = document.querySelector('header')?.getBoundingClientRect().height;
  return height ? height + 16 : 96;
};

export function CornerDraftCard({ isAdmin = false, staffCampusId, onJob, secondary = false }: Props) {
  const [editorMemory] = useState(readEditors);
  const [waiting, setWaiting] = useState<CornerDraftWaiting[]>([]);
  const [campusId, setCampusId] = useState<string>();
  const [localRecovery, setLocalRecovery] = useState(false);
  const [readVersion, setReadVersion] = useState(0);
  const [listVersion, setListVersion] = useState(0);
  const [draft, setDraft] = useState<CornerDraft | null>(null);
  const [openedDrafts, setOpenedDrafts] = useState<CornerDraft[]>(() =>
    isAdmin ? [...editorMemory.values()].map(editor => editor.draft) : []);
  const [retained, setRetained] = useState<Set<string>>(() => new Set(editorMemory.keys()));
  const onRetentionChange = useCallback((key: string, keep: boolean) => {
    setRetained(current => {
      if (current.has(key) === keep) return current;
      const next = new Set(current);
      if (keep) next.add(key); else next.delete(key);
      return next;
    });
  }, []);
  const [listState, setListState] = useState<ReadState>('loading');
  const [readState, setReadState] = useState<ReadState>('loading');
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const selectedReadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSignedOut = () => { clearStoredEditors(); editorMemory.clear(); };
    window.addEventListener(STAFF_SIGNED_OUT_EVENT, handleSignedOut);
    return () => window.removeEventListener(STAFF_SIGNED_OUT_EVENT, handleSignedOut);
  }, [editorMemory]);

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
    if (isAdmin && (!campusId || localRecovery)) return;
    let active = true;
    setReadState('loading');
    getCornerDraft(campusId).then(({ draft: next, campusId: resolvedCampusId }) => {
      if (active) {
        // A pastor's recovery is scoped to the signed-in staff member's campus.
        const recovery = !isAdmin && staffCampusId === resolvedCampusId && (!next || next.status !== 'draft')
          ? [...editorMemory.values()].filter(editor => editor.draft.campusId === staffCampusId &&
            (!next || editor.draft.weekOf === next.weekOf))
            .sort((a, b) => b.draft.weekOf.localeCompare(a.draft.weekOf))[0]?.draft : undefined;
        const openedDraft = next?.status === 'draft' ? next : recovery;
        setDraft(openedDraft ?? null);
        if (openedDraft) setOpenedDrafts(current => {
          const index = current.findIndex(opened => draftKey(opened) === draftKey(openedDraft));
          if (index === -1) return [...current, openedDraft];
          return current.map((opened, i) => i === index ? openedDraft : opened);
        });
        setReadState((isAdmin || recovery) && (!next || next.status !== 'draft') ? 'finished' : 'ready');
        if (!next || next.status !== 'draft') setWaiting(rows => rows.filter(row => row.campusId !== campusId));
      }
    }).catch(err => {
      if (!active) return;
      const code = cornerDraftErrorCode(err);
      const finished = code === 'no_draft' || code === 'not_draft';
      if (finished && !isAdmin) {
        // With no server draft, use only the signed-in staff member's campus.
        const recovery = staffCampusId ? [...editorMemory.values()]
          .filter(editor => editor.draft.campusId === staffCampusId)
          .sort((a, b) => b.draft.weekOf.localeCompare(a.draft.weekOf))[0]?.draft : undefined;
        if (recovery) {
          setDraft(recovery);
          setOpenedDrafts(current => current.some(opened => draftKey(opened) === draftKey(recovery))
            ? current : [...current, recovery]);
        }
      }
      setReadState(finished ? 'finished' : 'failed');
      if (finished) setWaiting(rows => rows.filter(row => row.campusId !== campusId));
    });
    return () => { active = false; };
  }, [isAdmin, campusId, staffCampusId, readVersion, localRecovery, editorMemory]);

  const recoveryDraft = readState === 'finished'
    ? (isAdmin ? openedDrafts.find(opened => opened.campusId === campusId && retained.has(draftKey(opened))) : draft)
    : undefined;
  const selectedDraft = draft ?? recoveryDraft;
  const campuses = [...waiting, ...openedDrafts.filter(opened => retained.has(draftKey(opened)) &&
    !waiting.some(campus => draftKey(campus) === draftKey(opened)))];
  const readFeedback = (state: ReadState, retry: () => void, selected = false) =>
    state === 'ready' || (state === 'finished' && recoveryDraft) ? null :
    <div ref={selected ? selectedReadRef : undefined} tabIndex={selected ? -1 : undefined}
      style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--dw-text-primary)', scrollMarginTop: 96 }}>
      <p role="status" style={{ margin: 0 }}>{t(`corner_draft_${state === 'loading' ? 'loading' : state === 'finished' ? 'error_not_draft' : 'error_load'}`)}</p>
      {state === 'failed' && <button type="button" style={quietStyle} onClick={retry}>{t('corner_draft_retry')}</button>}
    </div>;

  return <>
    {isAdmin && readFeedback(listState, () => setListVersion(version => version + 1))}
    {isAdmin && campuses.map(campus => (
      <div key={draftKey(campus)}>
        <button type="button" style={quietStyle} aria-busy={busy}
          aria-pressed={campusId === campus.campusId}
          onClick={() => {
            if (busyRef.current || (draft && draftKey(draft) === draftKey(campus))) return;
            if (editorMemory.get(draftKey(campus))?.outcome) {
              setLocalRecovery(true);
              setDraft(openedDrafts.find(opened => draftKey(opened) === draftKey(campus)) ?? null);
              setReadState('finished');
              setCampusId(campus.campusId);
              return;
            }
            setLocalRecovery(false);
            setDraft(null);
            setReadState('loading');
            setCampusId(campus.campusId);
            setReadVersion(version => version + 1);
          }}>
          {t(retained.has(draftKey(campus))
            ? 'corner_draft_unsaved_campus' : 'corner_draft_waiting').replace('{campus}', () => campus.campusName)}
        </button>
        {campusId === campus.campusId && readFeedback(readState, () => setReadVersion(version => version + 1), true)}
      </div>
    ))}
    {(!isAdmin || (campusId && !campuses.some(campus => campus.campusId === campusId))) &&
      readFeedback(readState, () => setReadVersion(version => version + 1), isAdmin)}
    {openedDrafts.map(opened => {
      const active = !!selectedDraft && draftKey(opened) === draftKey(selectedDraft);
      return <section key={draftKey(opened)} hidden={!active}>
        <DraftEditor initial={opened} memory={editorMemory} active={active} secondary={secondary} campusId={isAdmin ? opened.campusId : undefined}
          serverFinished={active && readState === 'finished'} onRetentionChange={onRetentionChange}
          onJob={onJob} onBusy={value => { busyRef.current = value; setBusy(value); }}
          onComplete={() => setWaiting(rows => rows.filter(row => draftKey(row) !== draftKey(opened)))} />
      </section>;
    })}
  </>;
}

function DraftEditor({ initial, memory, active, secondary, campusId, serverFinished, onRetentionChange, onJob, onBusy, onComplete }: {
  initial: CornerDraft; active: boolean; campusId?: string; onJob: Props['onJob'];
  secondary: boolean;
  serverFinished: boolean; onRetentionChange: (key: string, keep: boolean) => void;
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
  const [outcome, setOutcome] = useState<Outcome>(remembered?.outcome ?? null);
  const [savedWords, setSavedWords] = useState<string | null>(remembered?.savedWords ?? null);
  const [copyState, setCopyState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');
  const [errors, setErrors] = useState<Partial<Record<Action, string>>>({});
  const [reloadAction, setReloadAction] = useState<Action | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const freshRef = useRef<HTMLDivElement>(null);
  const recoveryRef = useRef<HTMLHeadingElement>(null);
  const serverDraft = useRef(initial);
  const words = (key: string) => t(`corner_draft_${key}`, draft.lang)
    .replace('{campus}', () => draft.campusName);
  const question = pendingQuestion ?? (draft.refreshesLeft === 0 ? null
    : !draft.answered.extra && !dismissed.extra ? 'extra'
      : !draft.answered.prayerPoint && !dismissed.prayerPoint ? 'prayerPoint' : null);

  const keepWords = savedWords !== null || (!outcome &&
    (body !== draft.body || prayerPoint !== draft.prayerPoint || !!answer));
  useEffect(() => {
    const value = { draft, body, prayerPoint, answer, fresh, pendingQuestion, dismissed, savedWords, outcome };
    memory.set(draftKey(draft), value);
    storeEditor(draft, keepWords || pendingWrites.has(storageKey(draft)) ? value : null);
  }, [memory, draft, body, prayerPoint, answer, fresh, pendingQuestion, dismissed, savedWords, outcome, keepWords]);
  useEffect(() => { serverDraft.current = initial; }, [initial]);
  useEffect(() => {
    // If another view saved these exact words, adopt that baseline and clear recovery storage.
    const latest = serverDraft.current;
    if (!outcome && latest !== draft && body === latest.body && prayerPoint === latest.prayerPoint && !answer) {
      setDraft(latest); setFresh(null);
    }
  }, [initial, draft, body, prayerPoint, answer, outcome]);
  useEffect(() => {
    onRetentionChange(draftKey(initial), keepWords);
  }, [initial, keepWords, onRetentionChange]);
  useEffect(() => {
    if (serverFinished && !outcome) finish();
  }, [serverFinished, outcome]);

  useEffect(() => {
    if (!active) return;
    if (headingRef.current) headingRef.current.style.scrollMarginTop = `${scrollClearance()}px`;
    if (campusId) {
      headingRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [active, campusId]);
  useEffect(() => { if (active && outcome === 'published') doneRef.current?.focus(); }, [active, outcome]);
  useEffect(() => {
    if (!active || savedWords === null || !recoveryRef.current) return;
    recoveryRef.current.style.scrollMarginTop = `${scrollClearance()}px`;
    recoveryRef.current.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    recoveryRef.current.focus({ preventScroll: true });
  }, [active, savedWords]);
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
    serverDraft.current = next;
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
      } else if (action === 'publish' || action === 'skip') {
        const sent = { body, prayerPoint, answer };
        const key = storageKey(draft);
        pendingWrites.set(key, (pendingWrites.get(key) ?? 0) + 1);
        try {
          if (action === 'publish') await publishCornerDraft(sent.body, sent.prayerPoint, campusId, draft.version);
          else await skipCornerDraft(campusId, draft.version);
        } finally {
          const remaining = pendingWrites.get(key)! - 1;
          if (remaining) pendingWrites.set(key, remaining); else pendingWrites.delete(key);
        }
        // Storage may have newer words even after this editor has unmounted.
        const current = readEditors().get(draftKey(draft)) ?? {
          draft, ...edits.current, fresh, pendingQuestion, dismissed, savedWords, outcome,
        };
        const changed = current.body !== sent.body || current.prayerPoint !== sent.prayerPoint || current.answer !== sent.answer;
        const recovered = changed
          ? [current.body, current.prayerPoint, current.answer].filter(value => value.trim()).join('\n\n') : null;
        const nextOutcome = action === 'publish' ? 'published' : 'skipped';
        storeEditor(draft, changed ? { ...current, savedWords: recovered, outcome: nextOutcome } : null);
        edits.current = { body: current.body, prayerPoint: current.prayerPoint, answer: current.answer };
        setBody(current.body); setPrayerPoint(current.prayerPoint); setAnswer(current.answer);
        setSavedWords(recovered);
        setOutcome(nextOutcome); onComplete();
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
    <h3 ref={recoveryRef} tabIndex={-1} style={{ ...headingStyle, scrollMarginTop: 96 }}>{words('my_words')}</h3>
    <p style={{ margin: 0 }}>{words('recovered_words')}</p>
    <div role="region" aria-label={words('my_words')} tabIndex={0}
      style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', userSelect: 'text' }}>{savedWords}</div>
    <div>
      <button type="button" className={secondary ? undefined : 'dw-next dw-campus-main'}
        style={secondary ? { ...campusMainStyle, border: '1px solid var(--dw-border)', background: 'var(--dw-card)', color: 'var(--dw-text-primary)' } : campusMainStyle} aria-busy={copyState === 'busy'}
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
    <p role="status" style={{ margin: 0 }}>{words('skipped')}</p>{savedWords !== null ? preservedWords : useForm}
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
      <button type="button" className={secondary ? undefined : 'dw-next dw-campus-main'}
        style={secondary ? { ...campusMainStyle, border: '1px solid var(--dw-border)', background: 'var(--dw-card)', color: 'var(--dw-text-primary)' } : campusMainStyle}
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
