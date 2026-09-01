/**
 * Superdesign-locked cold start (Ashley, 2026-09).
 * Visual source: https://p.superdesign.dev/draft/455f03e1-0e76-4fb9-81ce-2d00e807caef
 *
 * One screen. One tap. No picker, settings, skip, or extra nav.
 * Copy is the existing Day 1 of New & Returning to Faith — not the draft placeholders.
 */
import { day1Copy } from '../data/day1-landing';
import { t, getLang } from '../utils/i18n';
import { beginDay1 } from '../utils/coldStart';
import { isSundayGuest } from '../utils/sunday';
import { track } from '../utils/analytics';
import { hapticTap } from '../utils/haptics';
import { useModalA11y } from '../utils/useModalA11y';

const WORDMARK = 'https://futuresdailyword.com/images/futures-wordmark.png';

interface Props {
  onBegin: () => void;
}

export function Day1Landing({ onBegin }: Props) {
  const lang = getLang();
  const copy = day1Copy(lang);
  const dialogRef = useModalA11y(true);

  function handleBegin() {
    hapticTap();
    beginDay1(isSundayGuest() ? 'sunday-guest' : 'default');
    track('daily_reading', 'begin_day1');
    onBegin();
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
        <div className="dw-day1-card">
          <div className="dw-day1-gold-rule" aria-hidden="true" />
          <p className="dw-day1-verse">
            {'\u201c'}{copy.verseText}{'\u201d'}
          </p>
          <p className="dw-day1-ref">{copy.verseRef}</p>
        </div>
        <p className="dw-day1-pastoral">{copy.pastoral}</p>
        <div className="dw-day1-spacer" />
        <div className="dw-day1-cta-wrap">
          <button type="button" className="dw-day1-cta" onClick={handleBegin}>
            {t('begin_day1', lang)}
          </button>
        </div>
      </main>
    </div>
  );
}
