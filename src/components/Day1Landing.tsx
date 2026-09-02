/**
 * Closed cold-start hero. Begin Day 1 (NewFaithCTA) opens the Day N surface.
 * Superdesign locked the LAYOUT; destination is New to Faith — Day 1 of 40.
 */
import { useEffect, useRef, useState } from 'react';
import { day1Copy } from '../data/day1-landing';
import { t, getLang } from '../utils/i18n';
import { markDay1Read } from '../utils/coldStart';
import { isSundayGuest } from '../utils/sunday';
import { enrollAndOpenJourneyDay } from '../utils/journey-session';
import { track } from '../utils/analytics';
import { hapticTap } from '../utils/haptics';
import { useModalA11y } from '../utils/useModalA11y';
import { NewFaithCTA } from './NewFaithCTA';

const WORDMARK = 'https://futuresdailyword.com/images/futures-wordmark.png';

interface Props {
  /** Called when they tap Begin Day 1 — parent should open the Day N surface. */
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
  }, [readingOpen]);

  function handleBegin() {
    hapticTap();
    enrollAndOpenJourneyDay({
      beginDay1: true,
      coldSource: isSundayGuest() ? 'sunday-guest' : 'default',
    });
    track('daily_reading', 'begin_day1');
    if (onBegin) {
      onBegin();
      return;
    }
    setReadingOpen(true);
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
          {t('day_n_of_40', lang).replace('{n}', '1')}
        </p>
        <h1 id="dw-day1-title" className="dw-day1-title">
          {t('persona_new', lang)}
        </h1>
        <p className="dw-day1-cta-note" style={{ textAlign: 'left', marginBottom: 16 }}>
          {copy.title}
        </p>
        {!readingOpen && (
          <div className="dw-day1-cta-wrap dw-day1-cta-wrap--hero">
            <NewFaithCTA
              aria-expanded={false}
              aria-controls="dw-day1-reading"
              onClick={handleBegin}
            >
              {t('begin_day1', lang)}
            </NewFaithCTA>
          </div>
        )}
        {readingOpen ? (
          <section
            id="dw-day1-reading"
            ref={readingRef}
            tabIndex={-1}
            className="dw-day1-reading"
            aria-label={t('persona_new', lang)}
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
              <p className="dw-day1-cta-note">{t('day_n_of_40', lang).replace('{n}', '1')}</p>
              <NewFaithCTA onClick={handleMarkRead}>
                {t('mark_as_read', lang)}
              </NewFaithCTA>
            </div>
          </section>
        ) : (
          <div className="dw-day1-spacer" />
        )}
      </main>
    </div>
  );
}
