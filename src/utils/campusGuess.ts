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
 *   3. her town (Netlify geo city), matched against each campus row: its own
 *      Town and the other towns the owner listed under it in /staff (B09-07F).
 *      A town named by several campuses of the same kind is a metro town;
 *   4. otherwise her region (state, then time zone, then country): a short
 *      list and no single guess. In a metro town (Adelaide's four campuses)
 *      the campuses that name her town lead it.
 *
 * A guess is never a choice. Nothing here saves the profile campus: only the
 * reader's tap on Yes does, through the same path the dropdown uses.
 *
 * The device-only guess from a link lives in `dw_campus_guess` (never synced).
 * The town and state are held in memory only and never stored anywhere.
 */
import { getCampuses, type CampusRow } from '../data/campuses';

export const CAMPUS_GUESS_KEY = 'dw_campus_guess';
/** A campus the reader tapped Yes on (or picked) before sign-up. Device only, never synced. */
export const CAMPUS_CONFIRMED_KEY = 'dw_campus_confirmed';

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

/** Every town a campus row names: its own Town, then the other towns the owner listed. */
function townsOf(c: CampusRow): string[] {
  return [townOf(c), ...(c.towns || []).map(plain)].filter(Boolean);
}

/** A Futuros (Spanish-language) campus: its notes congregation is a futuros one. */
export function isFuturosCampus(c: CampusRow): boolean {
  return (c.congregation || '').startsWith('futuros');
}

/**
 * Of the campuses whose rows name her town, the one to ask about, or none.
 * One campus: that one. Several: her language chooses between a Futures and a
 * Futuros campus (Kennesaw). Several of the same kind still left means the town
 * has no single campus (the Adelaide metro), so there is no single guess.
 */
function pickInTown(rows: CampusRow[], lang: string): CampusRow | undefined {
  if (rows.length <= 1) return rows[0];
  const futuros = rows.filter(isFuturosCampus);
  const futures = rows.filter((c) => !isFuturosCampus(c));
  const side = lang === 'es' && futuros.length ? futuros : futures.length ? futures : futuros;
  return side.length === 1 ? side[0] : undefined;
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

  // 3. Her town, matched against the campus rows (no town list in code).
  const town = plain(input.city);
  const inTown = town
    ? list.filter((c) => townsOf(c).includes(town) && fitsPlace(c, country, subdivision))
    : [];
  const pick = pickInTown(inTown, lang);
  if (pick) return answer(pick, 'town');

  // 4. Her region: a short list, no single guess. Where her town has several
  //    campuses (the Adelaide metro), those lead it, in the owner's order.
  const region = regionList(list, { country, subdivision, timeZone });
  const ids = [...new Set([...inTown, ...region].map((c) => c.id))];
  if (ids.length) return { shortList: ids, source: 'region' };
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
  writeConfirmedCampus(known);
  deps.requireEmail();
  return 'needs-email';
}

/** The campus the reader tapped before sign-up, if still a known campus. */
export function readConfirmedCampus(campuses: CampusRow[] = getCampuses()): string | null {
  try {
    const raw = localStorage.getItem(CAMPUS_CONFIRMED_KEY);
    if (raw === 'other') return 'other';
    return knownCampusId(raw, campuses);
  } catch {
    return null;
  }
}

function writeConfirmedCampus(id: string): void {
  try { localStorage.setItem(CAMPUS_CONFIRMED_KEY, id); } catch { /* storage blocked */ }
}

/** Sign-up has carried the tapped campus into the profile: the device copy is spent. */
export function clearConfirmedCampus(): void {
  try { localStorage.removeItem(CAMPUS_CONFIRMED_KEY); } catch { /* storage blocked */ }
}

/**
 * The campus the email gate registers (B09-07 review MUST). Only a tap may beat
 * her Planning Center or stored campus: a campus she picked in the gate's own
 * dropdown, or a Yes she tapped before sign-up. An unconfirmed link or QR guess
 * only fills the gap when she has no campus anywhere else.
 */
export function resolveGateCampus(input: {
  touched: boolean;
  picked: string;
  confirmed: string | null;
  profileCampus: string | null | undefined;
  guess: string | null;
}): string {
  if (input.touched && input.picked) return input.picked;
  return input.confirmed || input.profileCampus || (input.touched ? '' : input.guess || '') || '';
}

/** Test seam. */
export function __resetCampusGuessForTests(): void {
  pendingParam = null;
}
