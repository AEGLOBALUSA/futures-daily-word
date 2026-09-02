/**
 * Reflect & Respond — the journey day's questions with answer boxes.
 *
 * Ashley (2 Sep 2026): the questions are PART OF THE LESSON. They render
 * directly under the teaching text, on the cold-visitor Day 1 landing AND the
 * full-screen Day N surface, in the reader's language. Both surfaces write the
 * same dw_pathway_qa_<day> store, so an answer begun on the landing is still
 * there when Day 1 reopens from the journey hero.
 */
import { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { t as trans } from '../utils/i18n';
import { syncMisc } from '../utils/cloudSync';

export function PathwayAnswer({ day, idx, question, lang }: { day: number; idx: number; question: string; lang: string }) {
  const storageKey = `dw_pathway_qa_${day}`;
  function load(): Record<number, string> {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
  }
  const [val, setVal] = useState(() => load()[idx] || '');
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 80) + 'px';
  }, []);
  useLayoutEffect(() => { resize(); }, [val, resize]);
  function save(v: string) {
    setVal(v);
    const all = { ...load(), [idx]: v };
    const json = JSON.stringify(all);
    localStorage.setItem(storageKey, json);
    syncMisc(storageKey, json);
  }
  return (
    <div className="today-question">
      <p className="today-question-text">{question}</p>
      <textarea
        ref={ref}
        className="today-question-answer"
        value={val}
        placeholder={trans('pathway_answer_placeholder', lang)}
        rows={3}
        onChange={e => { save(e.target.value); resize(); }}
        onInput={() => resize()}
      />
    </div>
  );
}

export function PathwayQuestions({ day, questions, lang, className }: { day: number; questions: string[]; lang: string; className?: string }) {
  if (!questions || questions.length === 0) return null;
  return (
    <div className={className ? `today-questions ${className}` : 'today-questions'}>
      <p className="today-questions-label">{trans('j_reflect_respond', lang)}</p>
      {questions.map((q, i) => (
        <PathwayAnswer key={i} day={day} idx={i} question={q} lang={lang} />
      ))}
    </div>
  );
}
