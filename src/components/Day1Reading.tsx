/**
 * Superdesign Day 1 reading surface — after Begin Day 1, before app chrome.
 * Preview: https://p.superdesign.dev/draft/7bcbaa30-1fc8-4a7a-bc2f-bb9733b5de58
 * Copy is the existing series Day 1, not Welcome Home / Luke 15 placeholders.
 */
import { day1Copy } from '../data/day1-landing';
import { t, getLang } from '../utils/i18n';
import { markDay1Read } from '../utils/coldStart';
import { track } from '../utils/analytics';
import { hapticTap } from '../utils/haptics';
import { useModalA11y } from '../utils/useModalA11y';

const WORDMARK = 'https://futuresdailyword.com/images/futures-wordmark.png';

interface Props {
  onDone: () => void;
}

export function Day1Reading({ onDone }: Props) {
  const lang = getLang();
  const copy = day1Copy(lang);
  const dialogRef = useModalA11y(true);
  const paragraphs = copy.readingPastoral.split('\n\n').filter(Boolean);

  function handleMarkRead() {
    hapticTap();
    markDay1Read();
    track('daily_reading', 'mark_day1_read');
    onDone();
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dw-day1-read-title"
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
        <h1 id="dw-day1-read-title" className="dw-day1-title">
          {copy.title}
        </h1>
        <div className="dw-day1-card">
          <div className="dw-day1-gold-rule" aria-hidden="true" />
          <p className="dw-day1-verse">
            {'\u201c'}{copy.verseText}{'\u201d'}
          </p>
          <p className="dw-day1-ref">{copy.verseRef}</p>
        </div>
        {paragraphs.map((p, i) => (
          <p key={i} className="dw-day1-pastoral">{p}</p>
        ))}
        <div className="dw-day1-spacer" />
        <div className="dw-day1-cta-wrap">
          <p className="dw-day1-cta-note">{t('day1_of_40', lang)}</p>
          <button type="button" className="dw-day1-cta" onClick={handleMarkRead}>
            {t('mark_as_read', lang)}
          </button>
        </div>
      </main>
    </div>
  );
}
