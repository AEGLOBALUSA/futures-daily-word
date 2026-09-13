/**
 * Session-memoised map of study_sources rows, keyed by id — feeds
 * provenanceForSource() for commentary / lexicon / cross-reference footers.
 * On a failed load provenanceForSource() still has a static fallback table
 * (name + licence) for the known ids, so callers are never left with a raw
 * database id in the meantime — this hook just tries once more before
 * settling on null for the rest of the session.
 */
import { useEffect, useState } from 'react';
import { fetchStudySources, type StudySource } from './study';

const RETRY_DELAY_MS = 3000;

export function useStudySources(): Map<string, StudySource> | null {
  const [sources, setSources] = useState<Map<string, StudySource> | null>(null);

  useEffect(() => {
    let alive = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const load = (isRetry: boolean) => {
      fetchStudySources().then(r => {
        if (!alive) return;
        if (r?.sources) {
          setSources(new Map(r.sources.map(s => [s.id, s])));
        } else if (!isRetry) {
          // Don't latch null forever on one bad response — try once more.
          retryTimer = setTimeout(() => load(true), RETRY_DELAY_MS);
        }
      });
    };

    load(false);
    return () => { alive = false; if (retryTimer) clearTimeout(retryTimer); };
  }, []);

  return sources;
}
