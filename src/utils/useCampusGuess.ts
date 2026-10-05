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
import { guessCampus, knownCampusId, readCampusGuess, type CampusGuess } from './campusGuess';
import { getLang } from './i18n';

/**
 * How long the card waits for /api/geo before it asks from what it has (her
 * region from the device's time zone). The Planning Center lookup has its own
 * 4 s cap, and the two run side by side, so the card never shows "Loading" for
 * much more than four seconds.
 */
export const GEO_WAIT_MS = 4000;

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
  const [geoGaveUp, setGeoGaveUp] = useState(false);
  const param = enabled ? readCampusGuess(campuses) : null;

  useEffect(() => {
    if (!enabled || param) return;
    let alive = true;
    void detectPlace().then((p) => { if (alive) setPlace(p); });
    // A geo request that never answers must not leave her on "Loading".
    const timer = setTimeout(() => { if (alive) setGeoGaveUp(true); }, GEO_WAIT_MS);
    return () => { alive = false; clearTimeout(timer); };
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
    // either named a campus on the list or geo has answered (or run out of
    // time) too: the card never swaps its question under the reader's thumb.
    const ready = !enabled || !!param || (!pcoPending && (guess.source === 'pco' || place !== null || geoGaveUp));
    return { ...guess, ready };
  }, [param, pcoCampus, pcoPending, place, geoGaveUp, campuses, enabled]);

  // Once a question is on screen it stays: the one question ("Are you part of
  // …?"), the short list of campuses near her, or the plain chooser. A campus
  // list or answer that lands later never changes which campus her Yes saves,
  // nor moves the choices under her thumb. The one exception: the owner hid or
  // removed a campus it names, so a tap on it could not save. Then the card asks
  // again from the current list rather than leave a Yes that does nothing.
  const [shown, setShown] = useState<(CampusGuess & { ready: boolean }) | null>(null);
  const saves = (g: CampusGuess) =>
    (!g.campusId || g.campusId === 'other' || !!knownCampusId(g.campusId, campuses))
    && g.shortList.every((id) => id === 'other' || !!knownCampusId(id, campuses));
  const shownStillSaves = !!shown && saves(shown);
  const liveSaves = saves(live);
  useEffect(() => {
    if (shown && !shownStillSaves) { setShown(null); return; }
    if (!shown && enabled && live.ready && liveSaves) setShown(live);
  }, [shown, shownStillSaves, enabled, live, liveSaves]);
  return shown && shownStillSaves ? shown : live;
}
