/**
 * "{n} people prayed for your request" (B09-11). Device-only.
 *
 * When a reader posts a prayer request from this phone, the request's id is
 * kept here (dw_my_prayers). Home and the Campus tab ask the server, at most
 * once an hour, how many people tapped Pray on those requests
 * (GET prayer-wall?mine=<ids>, counts only). The card shows when a count has
 * grown since she last saw it, stays for the rest of that day, and stops 14
 * days after the request was posted.
 *
 * dw_my_prayers is NEVER synced: it is not in cloudSync's MISC_KEYS and is
 * never passed to syncMisc, so a shared phone never moves one person's
 * requests into another account (the dw_pathway_qa_* precedent,
 * src/utils/cloudSync.ts). Nothing here sends a push or an email, and nothing
 * reaches a model. While the kind dw_prayed_count is off, the server answers
 * [] and nothing shows.
 */
import { API_BASE } from './api-base';

export const MY_PRAYERS_KEY = 'dw_my_prayers';
/** Fired when the store changes, so Home's next step and the Campus card refresh. */
export const MY_PRAYERS_EVENT = 'dw-my-prayers-updated';
/** A request's card stops this long after it was posted. */
export const MY_PRAYERS_DAYS = 14;
/** Ask the server at most this often. */
export const MY_PRAYERS_FETCH_MS = 60 * 60_000;
/** The server answers at most this many ids at once. */
export const MY_PRAYERS_MAX = 10;

const DAY_MS = 24 * 60 * 60_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface MyPrayer {
  id: string;
  /** When she posted it (ms since epoch). */
  postedAt: number;
  /** The latest count the server gave. */
  count: number;
  /** The count she has already been shown. */
  seen: number;
  /** The local date (YYYY-MM-DD) the card last showed for this request. */
  shownOn?: string;
}

export interface MyPrayersRecord {
  v: 1;
  /** When the server was last asked (ms), whether or not it answered. */
  checkedAt: number;
  prayers: MyPrayer[];
}

export interface PrayedCard {
  id: string;
  count: number;
}

const empty = (): MyPrayersRecord => ({ v: 1, checkedAt: 0, prayers: [] });

function clean(p: unknown): MyPrayer | null {
  if (!p || typeof p !== 'object') return null;
  const o = p as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id.toLowerCase() : '';
  const postedAt = Number(o.postedAt);
  if (!UUID_RE.test(id) || !Number.isFinite(postedAt)) return null;
  const count = Math.max(0, Math.floor(Number(o.count) || 0));
  const seen = Math.max(0, Math.floor(Number(o.seen) || 0));
  const shownOn = typeof o.shownOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.shownOn) ? o.shownOn : undefined;
  return { id, postedAt, count, seen, ...(shownOn ? { shownOn } : {}) };
}

/** Drop requests past their 14 days, keep the newest MY_PRAYERS_MAX. */
export function prune(rec: MyPrayersRecord, now: number = Date.now()): MyPrayersRecord {
  const prayers = rec.prayers
    .filter((p) => now - p.postedAt < MY_PRAYERS_DAYS * DAY_MS && p.postedAt <= now + DAY_MS)
    .sort((a, b) => b.postedAt - a.postedAt)
    .slice(0, MY_PRAYERS_MAX);
  return { ...rec, prayers };
}

/** Read the store. Blocked storage or a damaged value reads as nothing posted. */
export function readMyPrayers(now: number = Date.now()): MyPrayersRecord {
  try {
    const raw = localStorage.getItem(MY_PRAYERS_KEY);
    if (!raw) return empty();
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object' || !Array.isArray(v.prayers)) return empty();
    const prayers = (v.prayers as unknown[]).map(clean).filter((p): p is MyPrayer => !!p);
    const checkedAt = Number(v.checkedAt);
    return prune({ v: 1, checkedAt: Number.isFinite(checkedAt) ? checkedAt : 0, prayers }, now);
  } catch {
    return empty();
  }
}

function writeMyPrayers(rec: MyPrayersRecord): void {
  try {
    if (rec.prayers.length === 0) localStorage.removeItem(MY_PRAYERS_KEY);
    else localStorage.setItem(MY_PRAYERS_KEY, JSON.stringify(rec));
  } catch { /* storage blocked: nothing kept, nothing shown */ }
  try { window.dispatchEvent(new Event(MY_PRAYERS_EVENT)); } catch { /* no window in tests */ }
}

/** She posted a request from this phone: remember its id for 14 days. */
export function rememberMyPrayer(id: unknown, now: number = Date.now()): void {
  if (typeof id !== 'string' || !UUID_RE.test(id.toLowerCase())) return;
  const rec = readMyPrayers(now);
  const lower = id.toLowerCase();
  if (rec.prayers.some((p) => p.id === lower)) return;
  // A new request means the server has something new to tell: ask on the next look.
  writeMyPrayers(prune({ ...rec, checkedAt: 0, prayers: [{ id: lower, postedAt: now, count: 0, seen: 0 }, ...rec.prayers] }, now));
}

/** Fold the server's counts into the store. Ids it did not answer keep their last count. */
export function applyCounts(rec: MyPrayersRecord, counts: Array<{ id: string; prayerCount: number }>, now: number): MyPrayersRecord {
  const byId = new Map<string, number>();
  for (const c of counts) {
    if (c && typeof c.id === 'string' && Number.isFinite(c.prayerCount)) byId.set(c.id.toLowerCase(), Math.max(0, Math.floor(c.prayerCount)));
  }
  return {
    ...rec,
    checkedAt: now,
    // A count never goes down on this phone (a slow replica must not re-show an old number).
    prayers: rec.prayers.map((p) => (byId.has(p.id) ? { ...p, count: Math.max(p.count, byId.get(p.id) as number) } : p)),
  };
}

/**
 * Ask the server for the counts, at most once an hour. Any failure keeps what
 * the phone already knew. Returns the record either way.
 */
export async function refreshMyPrayers(opts: { now?: number; force?: boolean; fetchImpl?: typeof fetch } = {}): Promise<MyPrayersRecord> {
  const now = opts.now ?? Date.now();
  const rec = readMyPrayers(now);
  if (rec.prayers.length === 0) return rec;
  if (!opts.force && now - rec.checkedAt < MY_PRAYERS_FETCH_MS) return rec;
  // Mark the attempt first so a failing network is not asked on every render.
  writeMyPrayers({ ...rec, checkedAt: now });
  try {
    const ids = rec.prayers.map((p) => p.id).join(',');
    const res = await (opts.fetchImpl ?? fetch)(`${API_BASE}/.netlify/functions/prayer-wall?mine=${encodeURIComponent(ids)}`);
    if (!res.ok) return readMyPrayers(now);
    const body = await res.json();
    if (!Array.isArray(body)) return readMyPrayers(now);
    const next = applyCounts(readMyPrayers(now), body, now);
    writeMyPrayers(next);
    return next;
  } catch {
    return readMyPrayers(now);
  }
}

/**
 * The card to show today, or null. A request qualifies while it is inside its
 * 14 days, someone has prayed, and either the count grew since she last saw it
 * or the card already showed today (it stays for the rest of the day). The
 * newest qualifying request wins.
 */
export function prayedCard(rec: MyPrayersRecord, today: string, now: number = Date.now()): PrayedCard | null {
  const live = prune(rec, now).prayers;
  for (const p of live) {
    if (p.count <= 0) continue;
    if (p.count > p.seen || p.shownOn === today) return { id: p.id, count: p.count };
  }
  return null;
}

/** The card showed: what she saw is now seen, and it stays for the rest of today. */
export function noteCardShown(card: PrayedCard, today: string, now: number = Date.now()): void {
  const rec = readMyPrayers(now);
  const p = rec.prayers.find((x) => x.id === card.id);
  if (!p || (p.seen >= card.count && p.shownOn === today)) return;
  writeMyPrayers({
    ...rec,
    prayers: rec.prayers.map((x) => (x.id === card.id ? { ...x, seen: Math.max(x.seen, card.count), shownOn: today } : x)),
  });
}

/** Home's "See your request" asks the Campus tab to open on the Prayer Wall. */
export const OPEN_PRAYER_WALL_KEY = 'dw_open_prayer_wall';
export const OPEN_PRAYER_WALL_EVENT = 'dw-open-prayer-wall';

export function requestPrayerWall(id: string = ''): void {
  try { sessionStorage.setItem(OPEN_PRAYER_WALL_KEY, id); } catch { /* the event still carries it */ }
  try { window.dispatchEvent(new CustomEvent(OPEN_PRAYER_WALL_EVENT, { detail: { id } })); } catch { /* no window */ }
}

/** The Campus tab takes the request (once). */
export function takePrayerWallRequest(): string | null {
  try {
    const v = sessionStorage.getItem(OPEN_PRAYER_WALL_KEY);
    if (v !== null) sessionStorage.removeItem(OPEN_PRAYER_WALL_KEY);
    return v;
  } catch {
    return null;
  }
}
