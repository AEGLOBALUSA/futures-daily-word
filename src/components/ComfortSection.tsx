/**
 * ComfortSection — the after-reading frame for the comfort persona. The
 * chapter itself now renders only in the hero reading panel (one chapter
 * surface, every path); this component is left with the day's devotion
 * thought and, once the reading is marked done, a quiet closing line. It
 * never asks, counts or celebrates (comfort.md ruling).
 */
import { Card } from './Card';
import { COMFORT_CHAPTERS, COMFORT_DEVOTIONS } from '../data/comfort';
import { tField, t as trans } from '../utils/i18n';

/** Stable day index derived from the LOCAL calendar date (en-CA), per the repo's
 *  local-day invariant. Math.floor(Date.now()/86400000) is a UTC day index, which
 *  flips the daily comfort content mid-evening for US users. */
export function localDayIndex(): number {
  const [y, m, d] = new Date().toLocaleDateString('en-CA').split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

interface ComfortSectionProps {
  lang: string;
  readCompletedToday: boolean;
  /** Chapter-level ref the hero is currently showing (e.g. "Psalm 34"). When
   *  provided, the devotion shown here must describe THAT chapter — never a
   *  different one derived from the day index. When undefined, falls back to
   *  today's day-index devotion (pre-hero-aware behaviour). */
  heroChapter?: string;
}

export function ComfortSection({ lang, readCompletedToday, heroChapter }: ComfortSectionProps) {
  const comfortPassage = heroChapter ?? COMFORT_CHAPTERS[localDayIndex() % COMFORT_CHAPTERS.length];
  const devotion = COMFORT_DEVOTIONS[comfortPassage];

  let comfortDailyAmount = 0;
  try { comfortDailyAmount = parseInt(localStorage.getItem('dw_comfort_daily') || '0', 10) || 0; } catch { /* noop */ }

  if (!devotion && !readCompletedToday) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      {devotion && (
        <Card style={{
          padding: '20px 18px',
          background: 'linear-gradient(135deg, rgba(92,107,192,0.06) 0%, rgba(92,107,192,0.02) 100%)',
          border: '1px solid rgba(92,107,192,0.12)',
        }}>
          <p style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--dw-slate)',
            fontFamily: 'var(--font-sans)', marginBottom: 10,
          }}>
            {trans('comfort_thought_header', lang)}
          </p>
          <p style={{
            fontSize: 17, fontWeight: 700, color: 'var(--dw-text-primary)',
            fontFamily: 'var(--font-serif)', marginBottom: 10, lineHeight: 1.4,
          }}>
            {tField(devotion, 'title', lang)}
          </p>
          <p style={{
            fontSize: 15, lineHeight: 1.75, color: 'var(--dw-text-secondary)',
            fontFamily: 'var(--font-serif-text, Georgia, serif)',
            margin: 0,
          }}>
            {tField(devotion, 'body', lang)}
          </p>
        </Card>
      )}

      {readCompletedToday && (
        <Card style={{ marginTop: devotion ? 12 : 0, textAlign: 'center', padding: '16px' }}>
          <p style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0, fontStyle: 'normal' }}>
            {comfortDailyAmount > 0
              ? (comfortDailyAmount === 1
                  ? trans('comfort_set_daily_one', lang)
                  : trans('comfort_set_daily_many', lang).replace('{n}', String(comfortDailyAmount)))
              : trans('comfort_god_with_you', lang)}
          </p>
        </Card>
      )}
    </div>
  );
}
