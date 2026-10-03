/**
 * The campus, worked out instead of asked (B09-07).
 *
 * guessCampus() is pure. It reads campus ids, regions, towns and time zones
 * from the one campus list (getCampuses(), B09-02), never a typed list, and
 * returns the best single guess (when there is a good one) plus the short
 * list of the reader's region, best first:
 *
 *   1. the QR code or link she arrived by (?campus=<id>, a known id only);
 *   2. her Planning Center match;
 *   3. her town, for distinctive towns only (Netlify geo city);
 *   4. otherwise her region (state, then time zone, then country): a short
 *      list and no single guess, because Adelaide's metro has four campuses.
 *
 * A guess is never a choice. Nothing here saves the profile campus: only the
 * reader's tap on Yes does, through the same path the dropdown uses.
 *
 * The device-only guess from a link lives in `dw_campus_guess` (never synced).
 * The town and state are held in memory only and never stored anywhere.
 */
import { getCampuses, type CampusRow } from '../data/campuses';

export const CAMPUS_GUESS_KEY = 'dw_campus_guess';

/**
 * Towns that point at one campus, or at nothing single. Keyed by the town's
 * plain lower-case name (accents dropped). The ids are checked against the live
 * campus list on every call, so a hidden or retired campus is never guessed.
 *
 * An empty list means "this town has several campuses near it: give the short
 * list, not a single guess" (Adelaide's metro).
 *
 * A campus the owner adds later in /staff, whose id is not named here, is
 * matched by the first part of its own `city` field, so a new campus in a new
 * town needs no code change.
 */
const TOWNS: Record<string, string[]> = {
  kennesaw: ['us-kennesaw', 'us-futuros-kennesaw'],
  alpharetta: ['us-alpharetta'],
  duluth: ['us-futuros-duluth'],
  lawrenceville: ['us-gwinnett'],
  grayson: ['us-futuros-grayson'],
  franklin: ['us-franklin'],
  'mount barker': ['au-mount-barker'],
  'victor harbor': ['au-victor-harbor'],
  clare: ['au-clare-valley'],
  kadina: ['au-copper-coast'],
  wallaroo: ['au-copper-coast'],
  moonta: ['au-copper-coast'],
  'rio de janeiro': ['br-rio'],
  niteroi: ['br-rio'],
  // Adelaide metro: several campuses, so the short list and no single guess.
  adelaide: [],
  paradise: [],
  salisbury: [],
};

/** Campus ids that are metro campuses: never matched by their own town name. */
const METRO_IDS = new Set(['au-paradise', 'au-adelaide-city', 'au-salisbury', 'au-south']);

const NAMED_IDS = new Set([...Object.values(TOWNS).flat(), ...METRO_IDS]);

export interface CampusGuessInput {
  /** ?campus=<id> from the link or QR code she arrived by. */
  param?: string | null;
  /** Her Planning Center campus, when the email lookup matched her. */
  pcoCampus?: string | null;
  /** Netlify geo town, in memory only. */
  city?: string | null;
  /** Netlify geo state or region code ("GA", "SA"), in memory only. */
  subdivision?: string | null;
  /** ISO country ("US", "AU"). */
  country?: string | null;
  /** The device's IANA time zone. */
  timeZone?: string | null;
  /** The app language: a Spanish reader in a town with a Futuros campus leads with it. */
  lang?: string | null;
}

export interface CampusGuess {
  /** The one best guess, when there is a good one. */
  campusId?: string;
  /** Her region's campuses, the guess first, in the owner's order otherwise. */
  shortList: string[];
  /** What the guess came from. */
  source: 'param' | 'pco' | 'town' | 'region' | 'none';
}

function plain(s: string | null | undefined): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** The country a campus is in, from its id prefix ("us-kennesaw" → "US"). */
function countryOf(c: CampusRow): string {
  return c.id.slice(0, 2).toUpperCase();
}

/** The state code after the comma in its city ("Kennesaw, GA" → "GA"), when it is a code. */
function stateOf(c: CampusRow): string | null {
  const parts = c.city.split(',');
  if (parts.length < 2) return null;
  const tail = parts[parts.length - 1].trim();
  return /^[A-Z]{2,3}$/.test(tail) ? tail : null;
}

/** The town before the comma in its city ("Mount Barker, SA" → "mount barker"). */
function townOf(c: CampusRow): string {
  return plain(c.city.split(',')[0]);
}

function choosable(list: CampusRow[]): CampusRow[] {
  return list.filter((c) => c.id !== 'other');
}

/** A campus row is consistent with what geo says about country and state. */
function fitsPlace(c: CampusRow, country: string, subdivision: string): boolean {
  if (country && countryOf(c) !== country) return false;
  const st = stateOf(c);
  if (subdivision && st && st !== subdivision) return false;
  return true;
}

/** Of several campuses in one town, the one for this reader: Futuros for a Spanish reader, else the owner's first. */
function pickInTown(rows: CampusRow[], lang: string): CampusRow | undefined {
  if (rows.length <= 1) return rows[0];
  if (lang === 'es') {
    const futuros = rows.find((c) => (c.congregation || '').startsWith('futuros'));
    if (futuros) return futuros;
  }
  const notFuturos = rows.find((c) => !(c.congregation || '').startsWith('futuros'));
  return notFuturos || rows[0];
}

/** The region around a campus or a place: same state, else same time zone, else same country. */
function regionList(
  list: CampusRow[],
  opts: { anchor?: CampusRow; country: string; subdivision: string; timeZone: string },
): CampusRow[] {
  const { anchor, country, subdivision, timeZone } = opts;
  if (anchor) {
    const st = stateOf(anchor);
    const same = list.filter((c) => countryOf(c) === countryOf(anchor) && (st ? stateOf(c) === st : c.region === anchor.region));
    return same.length ? same : [anchor];
  }
  if (country && subdivision) {
    // Campuses in her state, plus that country's campuses whose city names no
    // state ("South Australia"), when at least one names hers.
    const exact = list.filter((c) => countryOf(c) === country && stateOf(c) === subdivision);
    if (exact.length) {
      const zones = new Set(exact.map((c) => c.timeZone));
      return list.filter((c) => countryOf(c) === country
        && (stateOf(c) === subdivision || (stateOf(c) === null && zones.has(c.timeZone))));
    }
  }
  if (timeZone) {
    const same = list.filter((c) => c.timeZone === timeZone && (!country || countryOf(c) === country));
    if (same.length) return same;
  }
  if (country) {
    const same = list.filter((c) => countryOf(c) === country);
    if (same.length) return same;
  }
  return [];
}

function withFirst(ids: string[], first?: string): string[] {
  if (!first) return ids;
  return [first, ...ids.filter((id) => id !== first)];
}

/**
 * The best campus guess and the reader's region short list. Pure: the same
 * input and list always give the same answer. Never saves anything.
 */
export function guessCampus(input: CampusGuessInput, campuses: CampusRow[] = getCampuses()): CampusGuess {
  const list = choosable(campuses);
  const byId = new Map(list.map((c) => [c.id, c]));
  const country = String(input.country || '').trim().toUpperCase();
  const subdivision = String(input.subdivision || '').trim().toUpperCase();
  const timeZone = String(input.timeZone || '').trim();
  const lang = String(input.lang || '').trim().toLowerCase();

  const answer = (anchor: CampusRow, source: CampusGuess['source']): CampusGuess => ({
    campusId: anchor.id,
    shortList: withFirst(regionList(list, { anchor, country, subdivision, timeZone }).map((c) => c.id), anchor.id),
    source,
  });

  // 1. The link or QR code she arrived by.
  const param = input.param ? byId.get(String(input.param).trim()) : undefined;
  if (param) return answer(param, 'param');

  // 2. Her Planning Center match.
  const pco = input.pcoCampus ? byId.get(String(input.pcoCampus).trim()) : undefined;
  if (pco) return answer(pco, 'pco');

  // 3. Her town, for distinctive towns only.
  const town = plain(input.city);
  if (town) {
    let rows: CampusRow[] | null = null;
    if (Object.prototype.hasOwnProperty.call(TOWNS, town)) {
      rows = TOWNS[town].map((id) => byId.get(id)).filter((c): c is CampusRow => !!c);
    } else {
      // A campus added later in /staff, matched by its own town.
      const fresh = list.filter((c) => !NAMED_IDS.has(c.id) && townOf(c) === town);
      if (fresh.length) rows = fresh;
    }
    const fitting = (rows || []).filter((c) => fitsPlace(c, country, subdivision));
    const pick = pickInTown(fitting, lang);
    if (pick) return answer(pick, 'town');
  }

  // 4. Her region: a short list, no single guess. In a metro town (Adelaide)
  //    the metro campuses lead it.
  const region = regionList(list, { country, subdivision, timeZone });
  if (region.length) {
    const metroFirst = town && Object.prototype.hasOwnProperty.call(TOWNS, town) && TOWNS[town].length === 0;
    const ids = region.map((c) => c.id);
    const ordered = metroFirst
      ? [...ids.filter((id) => METRO_IDS.has(id)), ...ids.filter((id) => !METRO_IDS.has(id))]
      : ids;
    return { shortList: ordered, source: 'region' };
  }
  return { shortList: [], source: 'none' };
}

/** A known, choosable campus id, or null. */
export function knownCampusId(id: string | null | undefined, campuses: CampusRow[] = getCampuses()): string | null {
  const v = String(id || '').trim();
  if (!v || v === 'other') return null;
  return campuses.some((c) => c.id === v) ? v : null;
}

/**
 * A ?campus= id the bundled or cached list did not know yet (a campus the owner
 * added in /staff since this phone last fetched the list). Held in memory only,
 * and accepted the moment the fetched list knows it.
 */
let pendingParam: string | null = null;

const ID_SHAPE = /^[a-z]{2}-[a-z0-9-]{2,40}$/;

/** The device-only guess from a link or QR code (or a Yes tapped before sign-up), if still a known campus. */
export function readCampusGuess(campuses: CampusRow[] = getCampuses()): string | null {
  if (pendingParam) {
    const id = knownCampusId(pendingParam, campuses);
    if (id) {
      pendingParam = null;
      writeCampusGuess(id);
      return id;
    }
  }
  try {
    return knownCampusId(localStorage.getItem(CAMPUS_GUESS_KEY), campuses);
  } catch {
    return null;
  }
}

/** Keep a device-only guess. Never synced, never the profile campus. */
export function writeCampusGuess(id: string): void {
  try { localStorage.setItem(CAMPUS_GUESS_KEY, id); } catch { /* storage blocked: the guess just lasts this visit */ }
}

/**
 * ?campus=<id> on arrival: a known id is kept as a device-only guess; any
 * value is stripped from the address bar. An id this phone's list does not know
 * yet is held in memory until the fetched list knows it (a new campus), and is
 * otherwise ignored. Returns the accepted id or null.
 * Call before the first render.
 */
export function consumeCampusParam(
  loc: { href: string; search: string } = window.location,
  history: Pick<History, 'replaceState'> = window.history,
  campuses: CampusRow[] = getCampuses(),
): string | null {
  try {
    const params = new URLSearchParams(loc.search);
    if (!params.has('campus')) return null;
    const raw = String(params.get('campus') || '').trim().toLowerCase();
    const id = knownCampusId(raw, campuses);
    if (id) writeCampusGuess(id);
    else if (ID_SHAPE.test(raw)) pendingParam = raw;
    const url = new URL(loc.href);
    url.searchParams.delete('campus');
    history.replaceState(history === window.history ? window.history.state : {}, '', url.toString());
    return id;
  } catch {
    return null;
  }
}

/**
 * The reader tapped Yes (or picked a campus): save it through the SAME path the
 * campus dropdown uses (profile campus, which cloud-syncs), or, before sign-up,
 * keep it as the device guess and open the email gate, which preselects it.
 * Only a tap calls this. Returns what happened.
 */
export function chooseCampus<P extends object>(
  id: string,
  deps: { userProfile: P | null | undefined; saveProfile: (p: P) => void; requireEmail: () => void },
  campuses: CampusRow[] = getCampuses(),
): 'saved' | 'needs-email' | 'ignored' {
  const known = knownCampusId(id, campuses) || (id === 'other' ? 'other' : null);
  if (!known) return 'ignored';
  if (deps.userProfile) {
    deps.saveProfile({ ...deps.userProfile, campus: known } as P);
    return 'saved';
  }
  writeCampusGuess(known);
  deps.requireEmail();
  return 'needs-email';
}

/** Test seam. */
export function __resetCampusGuessForTests(): void {
  pendingParam = null;
}
