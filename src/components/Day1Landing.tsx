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
import { t, getLang } from '../utils/i18n';
import { beginDay1, markDay1Read } from '../utils/coldStart';
import { isSundayGuest } from '../utils/sunday';
import { track } from '../utils/analytics';
import { hapticTap } from '../utils/haptics';
import { useModalA11y } from '../utils/useModalA11y';

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
  const lang = getLang();
  const copy = day1Copy(lang);
  const dialogRef = useModalA11y(true);
  const [readingOpen, setReadingOpen] = useState(startOpen);
  const readingRef = useRef<HTMLElement>(null);
  const paragraphs = copy.readingPastoral.split('\n\n').filter(Boolean);

  useEffect(() => {
    if (!readingOpen) return;
    const node = readingRef.current;
    if (!node) return;
    node.focus({ preventScroll: true });
    if (typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    </div>
  );
}
