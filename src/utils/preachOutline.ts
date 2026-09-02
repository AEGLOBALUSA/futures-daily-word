/**
 * Sermon outline store — Preach workspace, Outline Builder (Phase 3 §4.3).
 *
 * Rides the misc cloud-sync bag under `dw_preach_outline`. The `dw_sermon_`
 * prefix is already misc-synced (see src/utils/sermonPrep.ts and the
 * MISC_PREFIXES list in src/utils/cloudSync.ts), so this key needs no new
 * server-side wiring — syncMisc() alone carries it across devices, newest-wins
 * like every other misc key. Kept well under the server's 20KB misc-per-key
 * cap: point bodies are capped at 4,000 chars and the whole document at
 * 18,000 (see capOutline) — callers never see a throw, only a shorter string.
 *
 * outlineToNotes() produces the same shape netlify/functions/lib/sermon-format.js
 * answersToOutline() builds from the staff intake form, so an outline built here
 * can be pasted straight into "Send to Sunday" and land as a normal sermon.
 */
import { syncMisc } from './cloudSync';
import { PREACH_FRAMEWORKS } from '../data/preach-frameworks';

const KEY = 'dw_preach_outline';
const MAX_POINTS = 5;
const MIN_POINTS = 1;
const DEFAULT_POINTS = 3;
export const MAX_POINT_BODY = 4000;
export const MAX_DOC_SIZE = 18000;

export const OUTLINE_EVENT = 'dw-preach-outline-updated';

export interface PreachOutlinePoint {
  heading: string;
  body: string;
}

export interface PreachOutline {
  title: string;
  passage: string;
  series: string;
  date: string;
  speaker: string;
  bigIdea: string;
  points: PreachOutlinePoint[];
  weeklyAction: string;
  framework?: string;
  updatedAt: number;
}

function todayLocal(): string {
  // Local calendar day, not a UTC toISOString slice (repo invariant — see streak.ts).
  try { return new Date().toLocaleDateString('en-CA'); } catch { return ''; }
}

function profileSpeaker(): string {
  try {
    const p = JSON.parse(localStorage.getItem('dw_profile') || '{}');
    const name = [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim();
    return name;
  } catch { return ''; }
}

function emptyPoints(n: number): PreachOutlinePoint[] {
  return Array.from({ length: n }, () => ({ heading: '', body: '' }));
}

export function emptyOutline(): PreachOutline {
  return {
    title: '',
    passage: '',
    series: '',
    date: todayLocal(),
    speaker: profileSpeaker(),
    bigIdea: '',
    points: emptyPoints(DEFAULT_POINTS),
    weeklyAction: '',
    framework: undefined,
    updatedAt: 0,
  };
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

/** Tolerates missing/corrupt storage — always returns a usable outline. */
export function loadOutline(): PreachOutline {
  const fallback = emptyOutline();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    const rawPoints = Array.isArray(parsed.points) ? parsed.points : null;
    const points: PreachOutlinePoint[] = rawPoints && rawPoints.length
      ? rawPoints.map((p: unknown) => {
          const rec = (p && typeof p === 'object') ? (p as Record<string, unknown>) : {};
          return { heading: asString(rec.heading), body: asString(rec.body) };
        })
      : fallback.points;
    return {
      title: asString(parsed.title, fallback.title),
      passage: asString(parsed.passage, fallback.passage),
      series: asString(parsed.series, fallback.series),
      date: asString(parsed.date) || fallback.date,
      speaker: asString(parsed.speaker) || fallback.speaker,
      bigIdea: asString(parsed.bigIdea, fallback.bigIdea),
      points,
      weeklyAction: asString(parsed.weeklyAction, fallback.weeklyAction),
      framework: typeof parsed.framework === 'string' ? parsed.framework : undefined,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : fallback.updatedAt,
    };
  } catch {
    return fallback;
  }
}

/**
 * Enforce the size caps: each point body ≤ MAX_POINT_BODY, whole document
 * (as saved JSON) ≤ MAX_DOC_SIZE. Never throws — trims the longest bodies
 * until it fits. `truncated` tells the UI whether anything was shortened.
 */
export function capOutline(o: PreachOutline): { outline: PreachOutline; truncated: boolean } {
  let truncated = false;
  let points = (o.points || []).map(p => {
    if (p.body && p.body.length > MAX_POINT_BODY) {
      truncated = true;
      return { ...p, body: p.body.slice(0, MAX_POINT_BODY) };
    }
    return p;
  });
  let out: PreachOutline = { ...o, points };
  let json = JSON.stringify(out);
  let guard = 0;
  while (json.length > MAX_DOC_SIZE && guard < 200) {
    guard++;
    let longest = -1;
    for (let i = 0; i < points.length; i++) {
      if (points[i].body.length > 0 && (longest === -1 || points[i].body.length > points[longest].body.length)) longest = i;
    }
    if (longest === -1) break; // nothing left to trim
    const shrinkBy = Math.min(points[longest].body.length, 500);
    points = points.map((p, i) => i === longest ? { ...p, body: p.body.slice(0, p.body.length - shrinkBy) } : p);
    out = { ...out, points };
    json = JSON.stringify(out);
    truncated = true;
  }
  return { outline: out, truncated };
}

export function saveOutline(o: PreachOutline): void {
  const { outline } = capOutline(o);
  const toSave: PreachOutline = { ...outline, updatedAt: Date.now() };
  const json = JSON.stringify(toSave);
  try { localStorage.setItem(KEY, json); } catch { /* quota */ }
  syncMisc(KEY, json); // stamp + push (newest-wins across devices)
  try { window.dispatchEvent(new Event(OUTLINE_EVENT)); } catch { /* ignore */ }
}

/**
 * The shape netlify/functions/lib/sermon-format.js answersToOutline() produces
 * from the staff intake form: big idea, then each point as "Heading\nbody",
 * then the weekly action, each block separated by a blank line.
 */
export function outlineToNotes(o: PreachOutline): string {
  const parts: string[] = [];
  const bigIdea = (o.bigIdea || '').trim();
  if (bigIdea) parts.push(bigIdea);
  for (let i = 0; i < (o.points || []).length; i++) {
    const p = o.points[i];
    const heading = (p.heading || '').trim();
    const body = (p.body || '').trim();
    if (!heading && !body) continue;
    // No invented English "Point N" heading — a Spanish or Indonesian outline
    // would carry it into the published notes. A body without a heading is
    // published as the body alone.
    parts.push(heading ? `${heading}\n${body}` : body);
    void i;
  }
  const weeklyAction = (o.weeklyAction || '').trim();
  if (weeklyAction) parts.push(weeklyAction);
  return parts.join('\n\n');
}

/**
 * Fills up to 3 empty point bodies with "ref — text" from the newest prep
 * items (getPrepItems() already returns newest-first). Never overwrites a
 * body that already has content, and never adds new points.
 */
export function seedFromPrep(o: PreachOutline, items: { ref: string; text: string }[]): PreachOutline {
  if (!items || items.length === 0) return o;
  const points = (o.points || []).map(p => ({ ...p }));
  let consumed = 0;
  for (let i = 0; i < points.length && consumed < 3; i++) {
    if (points[i].body && points[i].body.trim()) continue; // never overwrite
    const item = items[consumed];
    if (!item) break;
    const combined = item.ref ? `${item.ref} — ${item.text}` : item.text;
    points[i] = { ...points[i], body: combined.slice(0, MAX_POINT_BODY) };
    consumed++;
  }
  return { ...o, points, updatedAt: Date.now() };
}

/**
 * Sets the framework id, grows `points` to at least the framework's step
 * count (capped at MAX_POINTS), and fills ONLY empty headings with the step
 * names — a heading the pastor already typed is left alone. Passing a falsy
 * or unrecognised id (e.g. the "None" chip) just clears the framework.
 */
export function applyFramework(o: PreachOutline, frameworkId: string): PreachOutline {
  if (!frameworkId) {
    return { ...o, framework: undefined, updatedAt: Date.now() };
  }
  const fw = PREACH_FRAMEWORKS.find(f => f.id === frameworkId);
  if (!fw) {
    return { ...o, framework: undefined, updatedAt: Date.now() };
  }
  const steps = fw.steps.slice(0, MAX_POINTS);
  const points = (o.points || []).map(p => ({ ...p }));
  while (points.length < steps.length && points.length < MAX_POINTS) {
    points.push({ heading: '', body: '' });
  }
  for (let i = 0; i < steps.length; i++) {
    if (!points[i].heading || !points[i].heading.trim()) {
      points[i] = { ...points[i], heading: steps[i] };
    }
  }
  return { ...o, framework: frameworkId, points, updatedAt: Date.now() };
}

export { MIN_POINTS, MAX_POINTS };
