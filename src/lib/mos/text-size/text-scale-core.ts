// MultiplyOS text size: the one shared rule every app follows (TEXT-SIZE-PLAN, 5 Oct 2026).
// Ashley, 5 Oct 2026: "i want text size to go down to 50%". Eight steps, 50% to 150%; Default is today's size.
// Ashley: "create on all the apps especailly on the phone an adjustable font size so the writing can be
// manually adjusted for all the apps." + "i want it to be able to go smaller, not just bigger."
//
// One text multiplier, eight steps. Below 100% the person's choice applies literally (no floor: they chose it);
// the phone text floor of 15px governs our Default design only. Only text grows or shrinks: spacing, rem layout
// and hit areas never do (44px targets hold at every step). No imports, no platform code: web, native and the tests all read this.

export type TextSizeKey = 'xs50' | 's65' | 's80' | 's90' | 'default' | 'l115' | 'l130' | 'l150';

export interface TextSizeStep {
  key: TextSizeKey;
  scale: number;
  label: string;
}

export const TEXT_SIZE_STEPS: readonly TextSizeStep[] = Object.freeze([
  { key: 'xs50', scale: 0.5, label: '50%' },
  { key: 's65', scale: 0.65, label: '65%' },
  { key: 's80', scale: 0.8, label: '80%' },
  { key: 's90', scale: 0.9, label: '90%' },
  { key: 'default', scale: 1, label: '100%' },
  { key: 'l115', scale: 1.15, label: '115%' },
  { key: 'l130', scale: 1.3, label: '130%' },
  { key: 'l150', scale: 1.5, label: '150%' },
] as TextSizeStep[]);

export const TEXT_SIZE_KEYS: readonly TextSizeKey[] = TEXT_SIZE_STEPS.map(s => s.key);
export const DEFAULT_TEXT_SIZE: TextSizeKey = 'default';

/** Text at or above this size (px) is a heading: on the way UP it moves half as far as body text. */
export const HEADING_MIN_PX = 24;
/**
 * Typing fields (input, textarea, select, contenteditable) never render under 16px at a chosen step: iPhone Safari zooms
 * the page when a field under 16px takes focus. Web: only once a step is chosen (Default stays exactly today's size);
 * native TextInput floors at 16.
 */
export const FIELD_FLOOR_PX = 16;
/** A stored choice dated more than this far in the future is refused (a broken clock must not win forever). */
export const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;
/**
 * Every time the web kit writes (the cookie, and the value it hands the server copy) is a whole minute. Privacy: the
 * cookie lives a year on Domain=.futures.church, so the browser sends it to every futures.church host; a time to the
 * millisecond made it unique to the device (a marker any of those hosts could read). A whole minute is shared by
 * everyone who chose that size in that minute.
 */
export const TIME_STEP_MS = 60000;
/** Native: body text never grows past this many times its design size (user step x OS setting). */
export const NATIVE_BODY_CAP = 2;
/** Native: headings never grow past this many times their design size. */
export const NATIVE_HEADING_CAP = 1.5;

/** Device copy (web cookie name and native storage key). Not data-mos-text-size: Daily Word's tokens.css uses that. */
export const TEXT_SIZE_COOKIE = 'mos_text';
export const TEXT_SIZE_STORAGE_KEY = 'mos_text';
/** The <html> attribute the pre-paint script sets (absent at Default). */
export const TEXT_SIZE_ATTR = 'data-mos-text';
/** Supabase auth user_metadata keys (server copy for Connect, Heartbeat, futures-os, Tally, Develop, Finance). */
export const META_SIZE_KEY = 'mos_text_size';
export const META_AT_KEY = 'mos_text_size_at';
/** One year, in seconds. */
export const COOKIE_MAX_AGE = 31536000;

export interface TextSizeValue {
  size: TextSizeKey;
  /**
   * When the person chose it, in epoch milliseconds. Newest wins across device and server copies. Every time the web
   * kit writes is a whole minute (TIME_STEP_MS); an older copy to the millisecond is still read.
   */
  at: number;
}

export function isTextSizeKey(v: unknown): v is TextSizeKey {
  return typeof v === 'string' && (TEXT_SIZE_KEYS as readonly string[]).includes(v);
}

export function stepOf(key: TextSizeKey): TextSizeStep {
  return TEXT_SIZE_STEPS.find(s => s.key === key) ?? TEXT_SIZE_STEPS.find(s => s.key === DEFAULT_TEXT_SIZE)!;
}

export function scaleOf(key: TextSizeKey | null | undefined): number {
  return key && isTextSizeKey(key) ? stepOf(key).scale : 1;
}

/**
 * Headings: on the way up they move half as far, tsd = 1 + (ts - 1) x 0.5; on the way down they shrink exactly as
 * body text does (tsd = ts), so the hierarchy between headings and body holds at 50%.
 */
export function displayScale(ts: number): number {
  return ts < 1 ? ts : 1 + (ts - 1) * 0.5;
}

/** Strip float noise (0.88 x 17 = 14.959999...) so results compare and print cleanly. */
function clean(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Round to the nearest half pixel (native sizes: 14.96 -> 15, 25.5 stays 25.5). */
export function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/**
 * Web: the px a design size N renders at, at multiplier ts. This is exactly what mos-text.css and the
 * codemod's calc() produce in the browser.
 *   N >= 24: N x tsd (up: half as far; down: same as body)
 *   N < 24:  N x ts (the person's choice, literally: no floor)
 */
export function webFontPx(n: number, ts: number): number {
  return clean(n * (n >= HEADING_MIN_PX ? displayScale(ts) : ts));
}

/** Web line-height in px follows its block's font-size kind (heading or body), with no floor. */
export function webLineHeightPx(lh: number, ts: number, heading: boolean): number {
  return clean(lh * (heading ? displayScale(ts) : ts));
}

/**
 * Native: the font size for design size N, the person's step ts and the OS text setting fontScale.
 *   eff = ts x fontScale
 *   body (N < 24): N x min(eff, 2.0), to the half pixel (no lower floor beyond what the person and the OS chose)
 *   heading:       up: N x min(1 + (eff - 1) x 0.5, 1.5); down: N x eff; to the half pixel
 *   maxFontSizeMultiplier (an existing prop) is an extra cap on growth, never on shrinking.
 * At Default with the OS at 100% the design size comes back untouched (pixel-identical).
 */
export function nativeFontPx(n: number, ts: number, fontScale = 1, maxFontSizeMultiplier?: number | null, minPx = 0): number {
  return Math.max(minPx, nativeFontPxRaw(n, ts, fontScale, maxFontSizeMultiplier));
}

function nativeFontPxRaw(n: number, ts: number, fontScale: number, maxFontSizeMultiplier?: number | null): number {
  const eff = ts * (fontScale > 0 ? fontScale : 1);
  if (eff === 1) return n;
  let out: number;
  if (n >= HEADING_MIN_PX) {
    out = n * (eff < 1 ? eff : Math.min(1 + (eff - 1) * 0.5, NATIVE_HEADING_CAP));
  } else {
    out = n * Math.min(eff, NATIVE_BODY_CAP);
  }
  if (typeof maxFontSizeMultiplier === 'number' && maxFontSizeMultiplier >= 1) {
    out = Math.min(out, n * maxFontSizeMultiplier);
  }
  return roundHalf(out);
}

/** Native lineHeight keeps its ratio to the font size it was designed for. */
export function nativeLineHeight(lineHeight: number, designSize: number, renderedSize: number): number {
  if (!designSize || designSize === renderedSize) return lineHeight;
  return roundHalf(lineHeight * (renderedSize / designSize));
}

/**
 * Nearest step to an old free multiplier (futures-os greenhouse_user_prefs.font_scale 0.7-1.6, Daybook
 * fn_text_scale 0.85-2.5). A tie goes to the LARGER step (0.85 -> 90%).
 */
export function snapToStep(scale: number): TextSizeKey {
  if (!Number.isFinite(scale)) return DEFAULT_TEXT_SIZE;
  let best = TEXT_SIZE_STEPS[0];
  for (const s of TEXT_SIZE_STEPS) {
    // Ascending order: an equal distance (within float noise) lets the larger step replace the smaller.
    if (Math.abs(s.scale - scale) <= Math.abs(best.scale - scale) + 1e-9) best = s;
  }
  return best.key;
}

/** The CSS custom properties for a step (what mos-text.css sets on html[data-mos-text]). */
export function cssVarsFor(key: TextSizeKey): { '--mos-ts': string; '--mos-ts-display': string } {
  const ts = scaleOf(key);
  return { '--mos-ts': String(ts), '--mos-ts-display': String(clean(displayScale(ts))) };
}

// ---------- times: whole minutes ----------

export function ceilMinute(ms: number): number {
  return Math.ceil(ms / TIME_STEP_MS) * TIME_STEP_MS;
}

export function floorMinute(ms: number): number {
  return Math.floor(ms / TIME_STEP_MS) * TIME_STEP_MS;
}

/**
 * A kept time as the web kit writes it: rounded UP to the minute (a choice never looks older than it is), or down
 * when up would pass the MAX_FUTURE_MS cap (so the copy written is never refused when it is read back).
 */
export function minuteAt(at: number, now = Date.now()): number {
  const up = ceilMinute(at);
  return up > now + MAX_FUTURE_MS ? floorMinute(at) : up;
}

/**
 * The time a NEW local choice carries (Save, set, setTextSize): the next whole minute, and always at least one minute
 * past the choice this device already holds (`known`), so a local Save beats it even when `known` is dated ahead by a
 * fast clock elsewhere. If stepping past `known` would pass the MAX_FUTURE_MS cap, the next whole minute instead.
 */
export function localChoiceAt(now: number, known?: TextSizeValue | null): number {
  const k = known && typeof known.at === 'number' && Number.isFinite(known.at) && known.at >= 0 ? known.at : null;
  const at = Math.max(ceilMinute(now), k === null ? 0 : floorMinute(k) + TIME_STEP_MS);
  return at > now + MAX_FUTURE_MS ? ceilMinute(now) : at;
}

// ---------- values: newest wins ----------

export function normalizeValue(v: unknown): TextSizeValue | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as { size?: unknown; at?: unknown };
  const at = typeof o.at === 'string' && o.at.trim() !== '' ? Number(o.at) : o.at;
  if (!isTextSizeKey(o.size) || typeof at !== 'number' || !Number.isFinite(at) || at < 0) return null;
  if (at > Date.now() + MAX_FUTURE_MS) return null;
  return { size: o.size, at: Math.floor(at) };
}

/**
 * The copy to keep: the newest. A missing or broken copy loses to a good one. On a tie the first
 * argument wins (call it as pickNewest(device, server): the device the person is holding keeps its choice).
 */
export function pickNewest(...values: Array<TextSizeValue | null | undefined>): TextSizeValue | null {
  let best: TextSizeValue | null = null;
  for (const raw of values) {
    const v = normalizeValue(raw);
    if (v && (!best || v.at > best.at)) best = v;
  }
  return best;
}

export interface SyncPlan {
  winner: TextSizeValue | null;
  /** The device copy is older or missing: write the winner to this device. */
  writeDevice: boolean;
  /** The server copy is older or missing: write the winner to the server. */
  writeServer: boolean;
}

/**
 * Decide which copies need writing after reading both. Nothing is written when they already agree on the STEP,
 * whatever their times: a time the device rounded to the minute must not cost a server write per person.
 * Two DIFFERENT steps stamped the same minute (two devices saved in that minute): the server copy wins, so every device
 * converges on it. Were the device to keep its own, each device would rewrite the server with its step on every sync
 * (or, where the server only takes a newer time, each would keep its own step forever).
 */
export function planSync(device: TextSizeValue | null | undefined, server: TextSizeValue | null | undefined): SyncPlan {
  const d = normalizeValue(device);
  const s = normalizeValue(server);
  const winner = pickNewest(d, s);
  if (d && s && d.size === s.size) return { winner, writeDevice: false, writeServer: false };
  if (d && s && d.at === s.at) return { winner: s, writeDevice: true, writeServer: false };
  const same = (a: TextSizeValue | null, b: TextSizeValue | null) => !!a && !!b && a.size === b.size && a.at === b.at;
  return {
    winner,
    writeDevice: !!winner && !same(d, winner),
    writeServer: !!winner && !same(s, winner),
  };
}

// ---------- web device copy: the cookie ----------

/**
 * `mos_text=<key>.<epoch ms, a whole minute>`. The time is always written as a whole minute (minuteAt): the browser
 * sends this cookie to every futures.church host, and a time to the millisecond would make it a per-device marker.
 */
export function encodeCookieValue(v: TextSizeValue): string {
  const n = normalizeValue(v);
  if (!n) throw new Error('encodeCookieValue: not a text size value');
  return `${n.size}.${minuteAt(n.at)}`;
}

export function decodeCookieValue(raw: string | null | undefined): TextSizeValue | null {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  try { s = decodeURIComponent(s); } catch { return null; }
  const m = /^([a-z0-9]+)\.(\d{1,16})$/.exec(s);
  if (!m) return null;
  return normalizeValue({ size: m[1], at: Number(m[2]) });
}

/** Read mos_text out of a whole cookie string (document.cookie or a Cookie header). */
export function readTextSizeCookie(cookieString: string | null | undefined): TextSizeValue | null {
  if (!cookieString) return null;
  let found: TextSizeValue | null = null;
  for (const part of cookieString.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() !== TEXT_SIZE_COOKIE) continue;
    // Two cookies can share the name (host-only and .futures.church); the newest wins.
    found = pickNewest(found, decodeCookieValue(part.slice(i + 1)));
  }
  return found;
}

/**
 * futures.church hosts share one choice per device across every app; anything else keeps it host-only. The browser
 * sends a Domain=.futures.church cookie to EVERY futures.church host (and scripts there can read it), which is why its
 * value holds only the step and a whole minute.
 */
export function cookieDomainFor(hostname: string | null | undefined): string | null {
  const h = (hostname || '').toLowerCase().replace(/\.$/, '');
  return h === 'futures.church' || h.endsWith('.futures.church') ? '.futures.church' : null;
}

export function buildTextSizeCookie(v: TextSizeValue, hostname: string, secure = true): string {
  const domain = cookieDomainFor(hostname);
  return `${TEXT_SIZE_COOKIE}=${encodeCookieValue(v)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
    + (domain ? `; Domain=${domain}` : '') + (secure ? '; Secure' : '');
}

// ---------- server copy: Supabase auth user_metadata ----------

export function fromMetadata(meta: Record<string, unknown> | null | undefined): TextSizeValue | null {
  if (!meta) return null;
  const at = meta[META_AT_KEY];
  return normalizeValue({ size: meta[META_SIZE_KEY], at: typeof at === 'string' && !/^\d+$/.test(at) ? Date.parse(at) : at });
}

export function toMetadataPatch(v: TextSizeValue): Record<string, string | number> {
  const n = normalizeValue(v);
  if (!n) throw new Error('toMetadataPatch: not a text size value');
  return { [META_SIZE_KEY]: n.size, [META_AT_KEY]: n.at };
}

/** Every key the person already has, plus the two text size keys. Never drops display_name or anything else. */
export function mergeMetadata(current: Record<string, unknown> | null | undefined, v: TextSizeValue): Record<string, unknown> {
  return { ...(current || {}), ...toMetadataPatch(v) };
}

// ---------- web inline sizes (what the codemod writes for JSX fontSize) ----------

const num = (n: number) => String(clean(n));

/** The CSS value for design size N px: matches webFontPx at every step, and is exactly N px at Default. */
export function fs(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  return `calc(${num(n)}px * var(${n >= HEADING_MIN_PX ? '--mos-ts-display' : '--mos-ts'}, 1))`;
}

/**
 * The CSS value for a typing field's design size N px. At Default it is exactly N px (today's size, a 0-pixel diff);
 * at any chosen step it never goes under 16px (no iPhone focus zoom): mos-text.css sets --mos-field-floor: 16px
 * only on html[data-mos-text], which the pre-paint script writes for a chosen step and removes at Default.
 */
export function fieldFs(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  return `max(var(--mos-field-floor, 0px), ${fs(n)})`;
}

/** Web: the px a typing field of design size N renders at (ts === 1 is Default: no floor, exactly N). */
export function webFieldPx(n: number, ts: number): number {
  return ts === 1 ? n : Math.max(FIELD_FLOOR_PX, webFontPx(n, ts));
}

/** The CSS value for a px line-height, following the kind (body or heading) of the text it belongs to. */
export function lh(n: number, heading = false): string {
  if (!Number.isFinite(n)) return String(n);
  return `calc(${num(n)}px * var(${heading ? '--mos-ts-display' : '--mos-ts'}, 1))`;
}
