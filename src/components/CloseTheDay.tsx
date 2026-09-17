/**
 * Close the Day — the sage card shown after Mark Complete on the new_to_faith
 * Day N surface. Three optional questions (skip is always allowed: nothing
 * here blocks, validates, scores or counts), sharing the day's pathway QA
 * record with the two lesson questions (see journeyClose.ts).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { t as trans } from '../utils/i18n';
import { track } from '../utils/analytics';
import { CLOSE_QUESTION_KEYS, identityLineKey, loadCloseAnswers, saveCloseAnswer } from '../utils/journeyClose';

export interface CloseTheDayProps {
  day: number;
  lang: string;
  onReread?: () => void;
  children?: React.ReactNode;
}

export function CloseTheDay({ day, lang, onReread, children }: CloseTheDayProps) {
  // Guards the once-per-mount "first real answer this day" analytics ping.
  const answeredDayRef = useRef<number | null>(null);

  useEffect(() => {
    // A fresh day resets the guard so the next day can fire its own ping.
    answeredDayRef.current = null;
  }, [day]);

  function onAnyAnswerChanged(prevAll: string[], nextAll: string[]) {
    if (answeredDayRef.current === day) return;
    const becameAnswered = nextAll.some((v, i) => v.trim() && !(prevAll[i] || '').trim());
    if (becameAnswered) {
      answeredDayRef.current = day;
      track('journey_close_answered', String(day));
    }
  }

  // CloseQuestion tracks its own value; this wrapper watches the shared
  // record so the once-per-day ping fires regardless of which question
  // the reader touches first.
  const prevRef = useRef<string[]>(loadCloseAnswers(day));
  useEffect(() => { prevRef.current = loadCloseAnswers(day); }, [day]);

  function watchedSaveAnswer(idx: number, text: string) {
    const prevAll = prevRef.current;
    const nextAll = [...prevAll];
    nextAll[idx] = text;
    onAnyAnswerChanged(prevAll, nextAll);
    prevRef.current = nextAll;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Check size={18} color="var(--dw-new)" />
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)' }}>
          {trans('j_close_done', lang).replace('{x}', String(day))}
        </p>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 16, fontFamily: 'var(--font-serif-text)', color: 'var(--dw-text-secondary)' }}>
        {trans(identityLineKey(day), lang)}
      </p>
      <div className="today-questions dw-journey-questions">
        <p className="today-questions-label">{trans('j_close_title', lang)}</p>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
          {trans('j_close_intro', lang)}
        </p>
        {onReread && (
          <button
            onClick={onReread}
            style={{
              display: 'block', background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 0', marginBottom: 10, minHeight: 44,
              color: 'var(--dw-new)', fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-sans)', textDecoration: 'underline',
            }}
          >
            {trans('j_close_reread', lang)}
          </button>
        )}
        {CLOSE_QUESTION_KEYS.map((key, i) => (
          <CloseQuestionTracked
            key={key + day}
            day={day}
            idx={i}
            question={trans(key, lang)}
            lang={lang}
            onSaved={watchedSaveAnswer}
          />
        ))}
      </div>
      {children}
    </div>
  );
}

// Wraps CloseQuestion to also report saves upward for the once-per-day ping,
// without changing CloseQuestion's own load/save contract.
function CloseQuestionTracked({
  day, idx, question, lang, onSaved,
}: { day: number; idx: number; question: string; lang: string; onSaved: (idx: number, text: string) => void }) {
  const [val, setVal] = useState(() => loadCloseAnswers(day)[idx] || '');
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 80) + 'px';
  }, []);
  useLayoutEffect(() => { resize(); }, [val, resize]);
  useEffect(() => { setVal(loadCloseAnswers(day)[idx] || ''); }, [day, idx]);

  return (
    <div className="today-question">
      <p className="today-question-text">{question}</p>
      <textarea
        ref={ref}
        className="today-question-answer"
        value={val}
        placeholder={trans('pathway_answer_placeholder', lang)}
        rows={2}
        aria-label={question}
        onChange={e => {
          const v = e.target.value;
          setVal(v);
          saveCloseAnswer(day, idx, v);
          onSaved(idx, v);
          resize();
        }}
        onInput={() => resize()}
      />
    </div>
  );
}
