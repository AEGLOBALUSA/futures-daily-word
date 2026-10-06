import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { getLang, t } from '../utils/i18n';
import { getReadingWeek, readingWeekLine } from './readingWeekApi';
import type { ReadingWeek } from './readingWeekApi';

type Props = { campusId?: string; style?: CSSProperties; onShown?: (shown: boolean) => void };
type Result = { campusId?: string; attempt: number; week: ReadingWeek | null; failed: boolean };

export function ReadingWeekLine({ campusId, style, onShown }: Props) {
  const lang = getLang();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let current = true;
    getReadingWeek(campusId).then(
      week => { if (current) setResult({ campusId, attempt, week, failed: false }); },
      () => { if (current) setResult({ campusId, attempt, week: null, failed: true }); },
    );
    return () => { current = false; };
  }, [campusId, attempt]);

  // Hide the previous campus immediately, but keep a failed retry's control mounted.
  const currentResult = result?.campusId === campusId ? result : null;
  const loading = !currentResult || currentResult.attempt !== attempt;
  const failed = currentResult?.failed === true;
  const parts = !loading && currentResult?.week ? readingWeekLine(currentResult.week) : null;
  const shown = failed || parts !== null;

  useEffect(() => { onShown?.(shown); }, [onShown, shown]);

  const wrapperStyle: CSSProperties = {
    fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.4,
    color: 'var(--dw-text-primary)', marginBottom: 8, ...style,
  };

  const firstTime = !parts || parts.firstTime === null ? ''
    : t('reading_week_first_time', lang).replace('{n}', String(parts.firstTime));
  const startedJourney = !parts || parts.startedJourney === null ? ''
    : t(parts.startedJourney === 1 ? 'reading_week_started_one' : 'reading_week_started_many', lang)
      .replace('{n}', String(parts.startedJourney));
  const sentence = !parts ? '' : t(parts.readers === 0 ? 'reading_week_empty'
    : parts.readers === 1 ? 'reading_week_readers_one' : 'reading_week_readers_many', lang)
    .replace(/\{(campus|n|firstTime|startedJourney)\}/g, (_, key: string) => ({
      campus: parts.campusName, n: String(parts.readers), firstTime, startedJourney,
    })[key]!);

  return (
    <div aria-live="polite" style={shown ? wrapperStyle : undefined}>
      {failed && (
        <p style={{ margin: 0, color: 'var(--dw-text-secondary)' }}>
          {!loading && t('reading_week_error', lang)}{' '}
          <button type="button" aria-disabled={loading} onClick={() => {
            if (!loading) setAttempt(value => value + 1);
          }} style={{
            minHeight: 44, minWidth: 44, padding: '0 8px', border: 'none',
            background: 'none', color: 'var(--dw-text-primary)',
            fontFamily: 'var(--font-sans)', fontSize: 16, textDecoration: 'underline', cursor: 'pointer',
          }}>
            {t('reading_week_retry', lang)}
          </button>
          {loading && <> {t('reading_week_counting', lang)}</>}
        </p>
      )}
      {parts && <p style={{ margin: 0 }}>{sentence}</p>}
      {parts?.comparison && (
        <p style={{ margin: '2px 0 0', color: 'var(--dw-text-secondary)' }}>
          {t(parts.comparison.direction === 'up' ? 'reading_week_up' : 'reading_week_down', lang)
            .replace('{prev}', String(parts.comparison.prevReaders))}
        </p>
      )}
    </div>
  );
}
