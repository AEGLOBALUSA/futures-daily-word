/**
 * The one campus list, on the reader side (B09-02).
 *
 * The list lives in the dw_campuses table, kept by the owner in /staff ->
 * Settings -> Campuses, and is served (active campuses only, public facts only)
 * by GET /.netlify/functions/campuses. Nothing in the app types a campus list
 * by hand any more.
 *
 *   getCampuses()      sync: the last list fetched (kept in localStorage
 *                      `dw_campuses_cache`, public data), else the bundled copy
 *                      of the seed (campuses.fallback.ts). For pickers.
 *   useCampuses()      the same list at once, fetched once per session, and
 *                      re-renders when the fetched list arrives or changes.
 *   findCampus(id)     a campus by id, hidden ones included where the app knows
 *                      them (a reader whose campus was hidden keeps its name).
 *   campusName(id)     its name, or the id itself when nothing knows it.
 *
 * Every storage read and write is wrapped: a private window or blocked storage
 * just means the bundled list until the fetch lands.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { API_BASE } from '../utils/api-base';
import { FALLBACK_CAMPUSES } from './campuses.fallback';

export interface CampusRow {
  id: string;
  name: string;
  city: string;
  region: string;
  /** Which Sermon Notes congregation this campus reads by default, when set. */
  congregation: string | null;
  /** IANA time zone, e.g. Australia/Adelaide. */
  timeZone: string;
  /** Local time ("HH:MM") Sunday's notes stop leading Home. */
  sundayUntil: string;
  videoUrl: string | null;
  sortOrder: number;
}

export const CAMPUSES_CACHE_KEY = 'dw_campuses_cache';
export const CAMPUSES_URL = `${API_BASE}/.netlify/functions/campuses`;

function isRow(v: unknown): v is CampusRow {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === 'string' && /^([a-z]{2}-[a-z0-9-]{2,40}|other)$/.test(r.id)
    && typeof r.name === 'string' && r.name.length > 0;
}

function normalize(v: unknown): CampusRow[] | null {
  if (!Array.isArray(v)) return null;
  const rows = v.filter(isRow).map((r) => ({
    id: r.id,
    name: r.name,
    city: typeof r.city === 'string' ? r.city : '',
    region: typeof r.region === 'string' && r.region ? r.region : 'Other',
    congregation: typeof r.congregation === 'string' ? r.congregation : null,
    timeZone: typeof r.timeZone === 'string' && r.timeZone ? r.timeZone : 'UTC',
    sundayUntil: typeof r.sundayUntil === 'string' && /^\d{2}:\d{2}$/.test(r.sundayUntil) ? r.sundayUntil : '16:00',
    videoUrl: typeof r.videoUrl === 'string' && r.videoUrl ? r.videoUrl : null,
    sortOrder: Number.isFinite(Number(r.sortOrder)) ? Number(r.sortOrder) : 0,
  }));
  return rows.length ? rows.sort((a, b) => a.sortOrder - b.sortOrder) : null;
}

function readCache(): CampusRow[] | null {
  try {
    const raw = localStorage.getItem(CAMPUSES_CACHE_KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(rows: CampusRow[]): void {
  try { localStorage.setItem(CAMPUSES_CACHE_KEY, JSON.stringify(rows)); } catch { /* storage blocked */ }
}

let current: CampusRow[] | null = null;
const listeners = new Set<() => void>();
let fetched: Promise<void> | null = null;

/** The campuses a reader can choose, in the owner's order. Never empty. */
export function getCampuses(): CampusRow[] {
  if (!current) current = readCache() || FALLBACK_CAMPUSES;
  return current;
}

function setCampuses(rows: CampusRow[]): void {
  const before = JSON.stringify(getCampuses());
  if (JSON.stringify(rows) === before) return;
  current = rows;
  writeCache(rows);
  listeners.forEach((fn) => fn());
}

/** Fetch the list once per session. A failure (or the SPA page instead of JSON) keeps what we have. */
export function refreshCampuses(): Promise<void> {
  if (!fetched) {
    fetched = (async () => {
      try {
        const res = await fetch(CAMPUSES_URL, { headers: { Accept: 'application/json' } });
        if (!res.ok) return;
        const body = await res.json();
        const rows = normalize(body && body.campuses);
        if (rows) setCampuses(rows);
      } catch {
        /* offline, blocked, or not JSON: keep the cached or bundled list */
      }
    })();
  }
  return fetched;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** The campus list for a screen: at once, then the fetched list when it lands. */
export function useCampuses(): CampusRow[] {
  const rows = useSyncExternalStore(subscribe, getCampuses, getCampuses);
  useEffect(() => { void refreshCampuses(); }, []);
  return rows;
}

/** A campus by id: the current list first, then the bundled copy (hidden campuses keep their names). */
export function findCampus(id: string | null | undefined, list: CampusRow[] = getCampuses()): CampusRow | undefined {
  if (!id) return undefined;
  return list.find((c) => c.id === id) || FALLBACK_CAMPUSES.find((c) => c.id === id);
}

/** The campus's name, or the id itself when nothing knows it (never a blank). */
export function campusName(id: string | null | undefined, list?: CampusRow[]): string {
  return findCampus(id, list)?.name || String(id || '');
}

/** The regions in list order, each once. */
export function campusRegions(list: CampusRow[] = getCampuses()): string[] {
  return [...new Set(list.map((c) => c.region))];
}

/** Test seam: forget the in-memory list and the session fetch. */
export function __resetCampusesForTests(): void {
  current = null;
  fetched = null;
  listeners.clear();
}
