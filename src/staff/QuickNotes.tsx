import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { SermonNotesSurface, type SermonNotesData } from '../components/SermonNotesSurface';
import type { CongregationId } from '../data/congregations';
import { t } from '../utils/i18n';
import {
  answerNeeds, changeDetailsSeed, detailsLine, needsQuestion, needsTheForm, quickErrorText,
  quickNotesPublish, quickNotesRead, quickNotesStatus, rememberCongregation,
  sundayLabel, withOtherAnswer,
  type QuickPublished, type QuickResult, type QuickStatus,
} from './quickNotesApi';

const campusMainStyle: CSSProperties = {
  border: 'none', borderRadius: 999,
  minHeight: 56, width: '100%', padding: '12px 18px', fontSize: 17, fontWeight: 700,
  fontFamily: 'var(--font-sans)', cursor: 'pointer',
};
const quietStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', minHeight: 44,
  padding: '8px 0', border: 'none', background: 'transparent',
  color: 'var(--dw-text-primary)', fontSize: 15, fontFamily: 'var(--font-sans)',
  textAlign: 'left', textDecoration: 'underline', cursor: 'pointer',
};
const fieldStyle: CSSProperties = {
  width: '100%', minWidth: 0, minHeight: 56, boxSizing: 'border-box',
  padding: '12px 14px', border: '1px solid var(--dw-border)', borderRadius: 12,
  background: 'var(--dw-surface)', color: 'var(--dw-text-primary)',
  fontSize: 17, fontFamily: 'var(--font-sans)', lineHeight: 1.5,
};
const headingStyle: CSSProperties = {
  margin: 0, fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, lineHeight: 1.3,
};
const secondaryStyle: CSSProperties = {
  margin: 0, fontSize: 15, color: 'var(--dw-text-secondary)', lineHeight: 1.5,
};
const detailsStyle: CSSProperties = {
  margin: 0, fontSize: 17, color: 'var(--dw-text-primary)', fontWeight: 600, lineHeight: 1.5,
};

function congregationPageUrl(congregation: CongregationId): string {
  const q = `?sermon=1&congregation=${encodeURIComponent(congregation)}`;
  try { return `${window.location.origin}/${q}`; } catch { return `/${q}`; }
}

export function QuickNotes({ onChangeDetails }: {
  onChangeDetails: (seed: ReturnType<typeof changeDetailsSeed>) => void;
}) {
  const id = useId();
  const [status, setStatus] = useState<QuickStatus | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<QuickResult | null>(null);
  const [done, setDone] = useState<QuickPublished | null>(null);
  const [publishedResult, setPublishedResult] = useState<QuickResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const busyRef = useRef(true);
  const submittedText = useRef('');
  const latestText = useRef('');
  latestText.current = text;

  useEffect(() => {
    let active = true;
    quickNotesStatus().then(next => {
      if (!active) return;
      rememberCongregation(next.congregation);
      setStatus(next);
    }).catch(err => {
      if (active) setError(quickErrorText(err));
    }).finally(() => {
      if (active) { busyRef.current = false; setBusy(false); }
    });
    return () => { active = false; };
  }, []);

  async function act(e: FormEvent) {
    e.preventDefault();
    if (busyRef.current) return;
    setError('');
    if (status && !result && !text.trim()) {
      setError(t('staff_quick_err_empty'));
      return;
    }
    if (result?.needs && !pickMessage && !answer.trim()) {
      setError(needsQuestion(result.needs));
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      if (!status) {
        const next = await quickNotesStatus();
        rememberCongregation(next.congregation);
        setStatus(next);
      } else if (result?.needs) {
        const next = result.needs.key === 'other'
          ? withOtherAnswer(result, answer)
          : await quickNotesRead({
            text: submittedText.current, congregation: result.congregation,
            details: answerNeeds(result, answer), preview: result.preview,
          });
        setResult(next);
        setAnswer('');
      } else if (result?.preview) {
        const published = await quickNotesPublish(result);
        setPublishedResult(result);
        setDone(published);
      } else {
        submittedText.current = text;
        const next = await quickNotesRead({ text, congregation: status.congregation });
        if (latestText.current !== submittedText.current) return;
        if (!next.preview && !next.needs) throw new Error(t('staff_quick_err_generic'));
        rememberCongregation(next.congregation);
        setResult(next);
      }
    } catch (err) {
      setError(quickErrorText(err));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function startOver() {
    if (busyRef.current) return;
    if (done) setText('');
    setDone(null);
    setPublishedResult(null);
    setResult(null);
    setAnswer('');
    setError('');
    setPasteOpen(true);
  }

  function changeDetailsWithAnswer(next: QuickResult) {
    if (!answer.trim() || !next.needs) return next;
    if (next.needs.key === 'other') return withOtherAnswer(next, answer);
    return { ...next, answers: { ...next.answers, [next.needs.questionId]: answer.trim() } };
  }

  const congregation = result?.congregation ?? status?.congregation;
  const congregationName = result?.congregationName ?? status?.congregationName ?? '';
  const up = status?.up && !pasteOpen && !result;
  const publishing = !!result?.preview && !result.needs;
  const needsForm = !!result?.needs && needsTheForm(result.needs);
  const pickMessage = !!result?.needs && !!result.attach && !result.attach.id;
  const openPageMain = congregation && (
    <a href={congregationPageUrl(congregation)} className="dw-next dw-campus-main" style={{ ...campusMainStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
      {t('staff_quick_open_page').replace('{congregation}', congregationName)}
    </a>
  );
  const mainAction = (
    <div style={{ position: 'sticky', bottom: 0, background: 'var(--dw-card)', padding: '12px 0' }}>
      <button type={needsForm ? 'button' : 'submit'} className="dw-next dw-campus-main" style={campusMainStyle} aria-busy={busy}
        onClick={needsForm ? () => {
          if (!busyRef.current && result) onChangeDetails(changeDetailsSeed(changeDetailsWithAnswer(result)));
        } : undefined}>
        {busy ? t(publishing ? result?.attach ? 'staff_quick_attaching' : 'staff_quick_publishing' : 'staff_quick_reading')
          : t(needsForm ? pickMessage ? 'staff_quick_open_media_form' : 'staff_quick_open_form' : result?.needs ? 'staff_quick_answer' : publishing ? result?.attach ? 'staff_quick_attach' : 'staff_quick_publish' : 'staff_quick_read')}
      </button>
      {error && <p role="alert" style={{ margin: '8px 0 0', color: 'var(--dw-error)', fontSize: 15, fontWeight: 600 }}>{error}</p>}
      {error && result?.preview && !result.needs && <button type="button" style={quietStyle} onClick={() => {
        if (!busyRef.current) onChangeDetails(changeDetailsSeed(result));
      }}>{t('staff_quick_change')}</button>}
    </div>
  );

  return (
    <section style={{
      background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
      borderRadius: 16, padding: 20, marginBottom: 24, minWidth: 0,
      color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', overflowWrap: 'anywhere',
    }}>
      {done ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
          <p role="status" style={{ ...detailsStyle, color: 'var(--dw-info)' }}>
            {done.verified && publishedResult?.attach
              ? t('staff_quick_done_attached').replace('{title}', publishedResult.attach.title)
              : !done.verified && done.showing && publishedResult?.attach
                ? t('staff_quick_done_saved_other').replace('{title}', done.title).replace('{showing}', done.showing)
              : t(done.verified ? 'staff_quick_done' : 'staff_quick_done_unverified')}
          </p>
          <p style={secondaryStyle}>{t(publishedResult?.attach ? 'staff_quick_done_next_attached' : publishedResult?.details.youtubeUrl || publishedResult?.preview?.youtubeUrl ? 'staff_quick_done_next_linked' : 'staff_quick_done_next')}</p>
          {openPageMain}
          <button type="button" style={quietStyle} onClick={startOver}>{t('staff_quick_start_over')}</button>
        </div>
      ) : up ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
          <h2 style={headingStyle}>{t('staff_quick_up').replace('{congregation}', congregationName).replace('{title}', status.current?.title ?? '')}</h2>
          {openPageMain}
          <button type="button" onClick={startOver} style={{
            ...quietStyle, textDecoration: 'none', border: '1px solid var(--dw-border)',
            borderRadius: 12, padding: '10px 14px',
          }}>{t('staff_quick_other_version')}</button>
        </div>
      ) : (
        <form noValidate onSubmit={act} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12, minWidth: 0 }}>
          {!status ? (
            <p role="status" style={secondaryStyle}>{t(busy ? 'staff_quick_reading' : 'staff_quick_err_generic')}</p>
          ) : result?.needs ? (
            <>
              <p style={secondaryStyle}>{congregationName}</p>
              <p style={detailsStyle}>{pickMessage
                ? t('staff_quick_later_up').replace('{title}', result.attach?.later?.title ?? '').replace('{date}', sundayLabel(result.attach?.later?.date ?? ''))
                : detailsLine(result)}</p>
              {pickMessage
                ? <p style={{ fontSize: 17, fontWeight: 600 }}>{t('staff_quick_pick_message')}</p>
                : <label htmlFor={`${id}-answer`} style={{ fontSize: 17, fontWeight: 600 }}>{needsQuestion(result.needs)}</label>}
              {!needsForm && <input id={`${id}-answer`} type={result.needs.key === 'date' ? 'date' : 'text'}
                value={answer} onChange={e => setAnswer(e.target.value)} style={fieldStyle} />}
            </>
          ) : result?.preview ? (
            <>
              <div>
                <p style={secondaryStyle}>{congregationName}</p>
                <p style={detailsStyle}>{detailsLine(result)}</p>
                <button type="button" style={quietStyle} onClick={() => {
                  if (!busyRef.current) onChangeDetails(changeDetailsSeed(result));
                }}>{t('staff_quick_change')}</button>
              </div>
              <p style={secondaryStyle}>{result.attach ? t('staff_quick_adds_video').replace('{title}', result.attach.title) : t('staff_quick_not_live_yet')}</p>
              <div className="dw-sermon-notes-phone" style={{ minWidth: 0 }}><SermonNotesSurface sermon={result.preview as SermonNotesData} persist={false} /></div>
            </>
          ) : (
            <>
              <h2 style={headingStyle}>{t('staff_quick_heading').replace('{congregation}', congregationName)}</h2>
              <p style={secondaryStyle}>{sundayLabel(status.sunday)} · {t(status.up ? 'staff_quick_why_replace' : status.current ? 'staff_quick_why_stale' : 'staff_quick_why_none').replace('{title}', status.current?.title ?? '')}</p>
              <label htmlFor={`${id}-paste`} style={{ fontSize: 17, fontWeight: 600 }}>{t('staff_quick_box')}</label>
              <p id={`${id}-hint`} style={secondaryStyle}>{t('staff_quick_box_hint')}</p>
              <textarea id={`${id}-paste`} aria-describedby={`${id}-hint`} rows={6}
                value={text} onChange={e => {
                  setText(e.target.value);
                }} style={{ ...fieldStyle, minHeight: 160, resize: 'vertical' }} />
            </>
          )}
          {mainAction}
          {result?.needs && !needsForm && (
            <button type="button" style={quietStyle} onClick={() => {
              if (!busyRef.current) onChangeDetails(changeDetailsSeed(changeDetailsWithAnswer(result)));
            }}>{t('staff_quick_change')}</button>
          )}
          {result?.needs && <button type="button" style={quietStyle} onClick={startOver}>{t('staff_quick_start_over')}</button>}
          {result?.preview && !result.needs && (
            <button type="button" style={quietStyle} onClick={startOver}>{t('staff_quick_start_over')}</button>
          )}
        </form>
      )}
      <p style={{ ...secondaryStyle, marginTop: 16 }}>{t('staff_quick_connects')}</p>
    </section>
  );
}
