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
 * `pcoCampus` is her Planning Center campus when the app has one.
 */
export function useCampusGuess(enabled: boolean, pcoCampus?: string | null): CampusGuess & { ready: boolean } {
  const campuses = useCampuses();
  const [place, setPlace] = useState<GeoPlace | null>(null);
  const param = enabled ? readCampusGuess(campuses) : null;

  useEffect(() => {
    if (!enabled || param) return;
    let alive = true;
    void detectPlace().then((p) => { if (alive) setPlace(p); });
    return () => { alive = false; };
  }, [enabled, param]);

  return useMemo(() => {
    const guess = guessCampus({
      param,
      pcoCampus: pcoCampus || null,
      city: place?.city,
      subdivision: place?.subdivision,
      country: place?.country,
      timeZone: deviceTimeZone(),
      lang: getLang(),
    }, campuses);
    // Ready once geo has answered (or was not needed): the card never swaps
    // its question under the reader's thumb.
    return { ...guess, ready: !enabled || !!param || !!pcoCampus || place !== null };
  }, [param, pcoCampus, place, campuses, enabled]);
}
