/**
 * Superdesign-locked cold start (Ashley, 2026-09).
 * Visual source: https://p.superdesign.dev/draft/455f03e1-0e76-4fb9-81ce-2d00e807caef
 *
 * Closed hero is the normal new-Christian front page: wordmark, Day 1 of 40,
 * title, one button. Scripture + pastoral sit below that button and stay
 * collapsed until Read. Copy is the existing series Day 1 — not draft placeholders.
 */
import { useEffect, useRef, useState } from 'react';
import { day1Copy } from '../data/day1-landing';
import { PathwayQuestions } from './PathwayAnswer';
import { t, getLang } from '../utils/i18n';
import { beginDay1, markDay1Read } from '../utils/coldStart';
import { isSundayGuest } from '../utils/sunday';
import { track } from '../utils/analytics';
import { hapticTap } from '../utils/haptics';
import { useModalA11y } from '../utils/useModalA11y';
import { LanguageSwitch } from './LanguageSwitch';
import { ChoosePathSheet } from './ChoosePathSheet';

const WORDMARK = 'https://futuresdailyword.com/images/futures-wordmark.png';

interface Props {
  /** Called when they tap Read and the reading opens. Parent should stay on this screen. */
  onBegin?: () => void;
  /** Called after Mark as read — leave the Day 1 gate. */
  onDone?: () => void;
  /** Refresh after Read (before Mark as read) starts already open. */
  startOpen?: boolean;
}

export function Day1Landing({ onBegin, onDone, startOpen = false }: Props) {
  // Live language: the header LanguageSwitch re-renders this screen in place.
  const [lang, setLang] = useState(getLang);
  useEffect(() => {
    const h = () => setLang(getLang());
    window.addEventListener('dw-lang-changed', h);
    return () => window.removeEventListener('dw-lang-changed', h);
  }, []);
  const copy = day1Copy(lang);
  const dialogRef = useModalA11y(true);
  const [readingOpen, setReadingOpen] = useState(startOpen);
  // Door 1 of "Choose your path": the sheet, hosted inside this dialog (its focus
  // trap is document-level) and kept mounted with a live `open`.
  const [pathOpen, setPathOpen] = useState(false);
  const readingRef = useRef<HTMLElement>(null);
  const paragraphs = copy.readingPastoral.split('\n\n').filter(Boolean);

  useEffect(() => {
    if (!readingOpen) return;
    const node = readingRef.current;
    if (!node) return;
    node.focus({ preventScroll: true });
  }, [readingOpen]);

  function handleRead() {
    if (readingOpen) return;
    hapticTap();
    beginDay1(isSundayGuest() ? 'sunday-guest' : 'default');
    track('daily_reading', 'begin_day1');
    setReadingOpen(true);
    onBegin?.();
  }

  function handleMarkRead() {
    hapticTap();
    markDay1Read();
    track('daily_reading', 'mark_day1_read');
    onDone?.();
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dw-day1-title"
      className="dw-day1-landing"
    >
      <header className="dw-day1-header">
        <img
          src={WORDMARK}
          alt="Futures Daily Word"
          className="dw-day1-wordmark"
          width={160}
          height={16}
        />
        {/* Obvious on arrival, like futures.church: pick your language here. */}
        <LanguageSwitch className="dw-day1-lang" />
      </header>
      <main className="dw-day1-main">
        <p className="dw-day1-eyebrow">
          {t('day1_eyebrow', lang).replace('{series}', copy.series)}
        </p>
        <h1 id="dw-day1-title" className="dw-day1-title">
          {copy.title}
        </h1>
        {!readingOpen && (
          <div className="dw-day1-cta-wrap dw-day1-cta-wrap--hero">
            <button
              type="button"
              className="dw-day1-cta"
              aria-expanded={false}
              aria-controls="dw-day1-reading"
              onClick={handleRead}
            >
              {t('read_btn', lang)}
            </button>
            {/* Door 1 — one quiet line. Read stays the only button; this is a text link. */}
            <p className="dw-day1-path-line">
              {t('path_landing_prompt', lang)}{' '}
              <button
                type="button"
                className="dw-day1-path-link"
                aria-haspopup="dialog"
                onClick={() => { hapticTap(); setPathOpen(true); }}
              >
                {t('path_landing_link', lang)}
              </button>
            </p>
          </div>
        )}
        {readingOpen ? (
          <section
            id="dw-day1-reading"
            ref={readingRef}
            tabIndex={-1}
            className="dw-day1-reading"
            aria-label={copy.title}
          >
            <div className="dw-day1-card">
              <div className="dw-day1-gold-rule" aria-hidden="true" />
              <p className="dw-day1-verse">
                {'\u201c'}{copy.verseText}{'\u201d'}
              </p>
              <p className="dw-day1-ref">{copy.verseRef}</p>
            </div>
            {paragraphs.map((p, i) => (
              <p key={i} className="dw-day1-pastoral dw-day1-pastoral-stack">{p}</p>
            ))}
            {/* Part of the lesson (Ashley, 2 Sep 2026): Day 1's questions live here too,
                same dw_pathway_qa_1 store as the Day N surface. */}
            <PathwayQuestions day={1} questions={[...copy.questions]} lang={lang} className="dw-day1-questions" />
            <div className="dw-day1-spacer" />
            <div className="dw-day1-cta-wrap">
              <p className="dw-day1-cta-note">{t('day1_of_40', lang)}</p>
              <button type="button" className="dw-day1-cta" onClick={handleMarkRead}>
                {t('mark_as_read', lang)}
              </button>
            </div>
          </section>
        ) : (
          <div className="dw-day1-spacer" />
        )}
      </main>
      {/* A real change leaves the Day 1 gate on the next tick, after the sheet's
          close effect has consumed its history entry (an unmount would leak it). */}
      <ChoosePathSheet
        open={pathOpen}
        door="landing"
        onClose={() => setPathOpen(false)}
        onPicked={(persona) => {
          track('daily_reading', `leave_day1_for_${persona}`);
          if (persona !== 'new_to_faith') window.setTimeout(() => onDone?.(), 0);
        }}
      />
    </div>
  );
}
