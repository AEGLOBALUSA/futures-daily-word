/**
 * The campus guess for a screen (B09-07): the device-only guess from a link or
 * QR code first, then (only when asked) the reader's town and region from
 * Netlify geo, worked out by the pure guessCampus() over the one campus list.
 *
 * The town and state stay in this hook's memory for this page load. Nothing
 * here saves a campus: only a tap does, through chooseCampus().
 */
import { useEffect, useMemo, useState } from 'react';
import { useCampuses } from '../data/campuses';
import { detectPlace, type GeoPlace } from './geo';
import { guessCampus, readCampusGuess, type CampusGuess } from './campusGuess';
import { getLang } from './i18n';

function deviceTimeZone(): string | null {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; }
}

/**
 * `enabled` false (the reader already has a campus) skips the geo request.
 * `pcoCampus` is her Planning Center campus when the app has one (usePcoCampus,
 * B09-07F); `pcoPending` true while that lookup has not answered, so the card
 * waits for it instead of asking from her town and then swapping the question.
 */
export function useCampusGuess(enabled: boolean, pcoCampus?: string | null, pcoPending = false): CampusGuess & { ready: boolean } {
  const campuses = useCampuses();
  const [place, setPlace] = useState<GeoPlace | null>(null);
  const param = enabled ? readCampusGuess(campuses) : null;

  useEffect(() => {
    if (!enabled || param) return;
    let alive = true;
    void detectPlace().then((p) => { if (alive) setPlace(p); });
    return () => { alive = false; };
  }, [enabled, param]);

  const live = useMemo(() => {
    const guess = guessCampus({
      param,
      pcoCampus: pcoCampus || null,
      city: place?.city,
      subdivision: place?.subdivision,
      country: place?.country,
      timeZone: deviceTimeZone(),
      lang: getLang(),
    }, campuses);
    // Ready once the link guess is there, or Planning Center has answered and
    // either named a campus on the list or geo has answered too: the card never
    // swaps its question under the reader's thumb.
    const ready = !enabled || !!param || (!pcoPending && (guess.source === 'pco' || place !== null));
    return { ...guess, ready };
  }, [param, pcoCampus, pcoPending, place, campuses, enabled]);

  // Once a question ("Are you part of …?") is on screen it stays: a campus list
  // or answer that lands later never changes which campus her Yes saves.
  const [shown, setShown] = useState<(CampusGuess & { ready: boolean }) | null>(null);
  useEffect(() => {
    if (!shown && enabled && live.ready && live.campusId) setShown(live);
  }, [shown, enabled, live]);
  return shown || live;
}
