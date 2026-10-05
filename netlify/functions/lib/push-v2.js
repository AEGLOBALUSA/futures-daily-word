/**
 * The v2 daily reminder: it knows your reading and your hour (MOS-to-8 build
 * B09-17). Pure helpers shared by push-send.js (what to send to whom) and
 * push-subscribe.js (what a device may store on its own push row).
 *
 * The switch is the prompt kind dw_daily_push_v2 (lib/prompts.js, B09-01):
 *   off     push-send.js runs exactly as before this build: same rows, same
 *           hour, same templates. Nothing here is consulted for any row.
 *   shadow  only the push rows whose id is on the kind's shadow list get the v2
 *           reminder; every other subscriber gets the old one, unchanged. The
 *           list is dw_prompt_kind.shadow_recipients, and a push row id written
 *           anywhere in dw_prompt_kind.note counts too (push rows carry no
 *           email, so the id is the address). Set by hand, never committed.
 *   live    every active row gets the v2 reminder. Only Ashley moves it there,
 *           after he has seen the test device's push.
 *
 * The v2 reminder, per row, at the row's own local hour (the same hour rule as
 * today's sender):
 *   - never to a Comfort reader (design decision 8);
 *   - not on a day she already read (last_read_date is today, her time);
 *   - not on a Sunday for a pastor while NO_SUNDAY_FOR_PASTORS is true
 *     (decision 14; chapter 09 section 5 conflict 4: the later likely answer);
 *   - never twice: one dw_prompt_log claim per row per local day, and nothing
 *     within 12 hours of the last v2 send (a time-zone change cannot make two);
 *   - at her hour, or up to two hours late when an hourly run was missed
 *     (today's catch-up window), once: last_sent_date and the day's claim;
 *   - after three sent and unopened, the next comes three local days after
 *     the last one; the first app open
 *     (push-subscribe.js, opened: true) brings daily back;
 *   - title = her own plan and day (next_label), body = "{passage} is ready
 *     when you are." in her language, but only when the device said they are
 *     due today (next_for_date); any other day it is today's template.
 * No streak, count or guilt word reaches a push. Nothing here reaches a model.
 *
 * The tests live in tests/functions/push-v2.test.js, never in this folder
 * (Netlify treats every file under netlify/functions as a function).
 */
const { normLang, pushReadyBody, getTemplate } = require("./push-templates.js");

const KIND = "dw_daily_push_v2";

/** Decision 14 is Ashley's. Built on, per chapter 09 section 5; it changes nothing while the kind is off. */
const NO_SUNDAY_FOR_PASTORS = true;

/** After this many v2 reminders in a row went unopened, send only every BACKOFF_EVERY_DAYS local days. */
const BACKOFF_AFTER = 3;
const BACKOFF_EVERY_DAYS = 3;

/** Hours after her hour a missed hourly run may still send (today's sender uses 2). */
const CATCH_UP_HOURS = 2;

/** No second v2 reminder within this long of the last one, whatever the clock says. */
const MIN_GAP_MS = 12 * 60 * 60 * 1000;

const MAX_LABEL = 80;
const MAX_PASSAGE = 40;
const MAX_JOURNEY_DAY = 1000;
const DEFAULT_TZ = "America/New_York";

const COMFORT_PERSONAS = new Set(["comfort", "difficult"]);
const PASTOR_PERSONAS = new Set(["pastor_leader", "pastor"]);
/** The path slugs a device may report (src/utils/persona-config.ts and their older names). */
const PERSONAS = new Set([
  "new_to_faith", "new_returning", "new_believer", "congregation",
  "deeper_study", "deeper", "pastor_leader", "pastor", "comfort", "difficult",
]);

/** The only fields a device may send in an update's `state`. No identity of any kind. */
const STATE_FIELDS = new Set([
  "persona", "journey_day", "next_passage", "next_label", "next_for_date", "last_read_date", "opened",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029]");

/* ── Time: the row's own clock ─────────────────────────────────────────────── */

function partsIn(timezone, now) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23", weekday: "short",
  });
  const out = {};
  for (const p of fmt.formatToParts(now)) out[p.type] = p.value;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(out.weekday);
  return {
    hour: parseInt(out.hour, 10) % 24,
    date: `${out.year}-${out.month}-${out.day}`,
    weekday,
  };
}

/**
 * The row's local hour (0–23), date (YYYY-MM-DD) and weekday (0 = Sunday) at
 * `now`. An unknown time zone reads as the column default, America/New_York.
 */
function localNow(timezone, now = new Date()) {
  try {
    return partsIn(timezone || DEFAULT_TZ, now);
  } catch {
    return partsIn(DEFAULT_TZ, now);
  }
}

/** Whole days since 1970-01-01 for a YYYY-MM-DD date (the back-off's day count). */
function dayNumber(date) {
  const [y, m, d] = String(date).split("-").map((n) => parseInt(n, 10));
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function validDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const n = dayNumber(value);
  if (!Number.isFinite(n)) return false;
  // Round-trips (rejects 2026-02-31).
  return new Date(n * 86400000).toISOString().slice(0, 10) === value;
}

/* ── The switch ────────────────────────────────────────────────────────────── */

/**
 * Which push row ids are on the shadow list: the kind's shadow_recipients plus
 * any push row id written in its note. Lower-cased.
 */
function shadowIds(shadowRecipients, note) {
  const ids = new Set();
  if (Array.isArray(shadowRecipients)) {
    for (const r of shadowRecipients) {
      if (typeof r === "string" && r.trim()) ids.add(r.trim().toLowerCase());
    }
  }
  if (typeof note === "string") {
    for (const m of note.match(UUID_RE) || []) ids.add(m.toLowerCase());
  }
  return ids;
}

/** Does this row get the v2 reminder under this mode? Anything unexpected: no. */
function inScope(mode, rowId, ids) {
  if (mode === "live") return true;
  if (mode !== "shadow" || !rowId || !(ids instanceof Set)) return false;
  return ids.has(String(rowId).toLowerCase());
}

/* ── Text a device stored ──────────────────────────────────────────────────── */

/** A stored label or passage fit to show: trimmed, no control characters, within its cap; else null. */
function cleanText(value, max) {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s || s.length > max || CONTROL_RE.test(s)) return null;
  return s;
}

/* ── The send decision ─────────────────────────────────────────────────────── */

/**
 * Should this row get its v2 reminder now, and with what words? Pure: the
 * caller passes the row (with its reading state) and the clock, and
 * catchUp: false when push_subscriptions has no last_sent_date ledger.
 *   { send: false, reason } where reason is one of not_hour, sent_today,
 *     comfort, unknown_path, read_today, sunday_pastor, sent_recently, backoff
 *   { send: true, localDate, title, body, passage } where title/body are null
 *     when the device has not said what is due today: the caller then uses
 *     today's template, exactly as the old reminder would.
 */
function planV2(row, now = new Date(), { catchUp = true } = {}) {
  const local = localNow(row.timezone, now);
  const preferredHour = row.preferred_hour ?? 7;
  // Her hour, or up to CATCH_UP_HOURS after it (the same catch-up window as
  // today's sender: the hourly run is best-effort). The day's dw_prompt_log
  // claim and last_sent_date keep it to one.
  // Without the last_sent_date ledger (live today) the old sender cannot catch
  // up either, and v2 must not: a kind switched on at 8 would otherwise send
  // again to a reader the old sender reached at 7. Exact hour only, then.
  const late = local.hour - preferredHour;
  if (late < 0 || late > (catchUp ? CATCH_UP_HOURS : 0)) return { send: false, reason: "not_hour" };
  if (row.last_sent_date && String(row.last_sent_date).slice(0, 10) === local.date) {
    return { send: false, reason: "sent_today" };
  }

  if (COMFORT_PERSONAS.has(row.persona)) return { send: false, reason: "comfort" };
  // A device that has not yet said its path could be a Comfort reader's: the
  // v2 reminder waits for the first app open to report it (never Comfort).
  if (!row.persona) return { send: false, reason: "unknown_path" };
  if (row.last_read_date && String(row.last_read_date).slice(0, 10) === local.date) {
    return { send: false, reason: "read_today" };
  }
  if (NO_SUNDAY_FOR_PASTORS && PASTOR_PERSONAS.has(row.persona) && local.weekday === 0) {
    return { send: false, reason: "sunday_pastor" };
  }
  if (row.last_sent_at) {
    const last = new Date(row.last_sent_at).getTime();
    if (Number.isFinite(last) && now.getTime() - last < MIN_GAP_MS) return { send: false, reason: "sent_recently" };
  }
  const streak = Number.isInteger(row.unopened_streak) ? row.unopened_streak : 0;
  if (streak >= BACKOFF_AFTER && row.last_sent_at) {
    // Three unopened in a row: the next comes BACKOFF_EVERY_DAYS local days
    // after the last one. The first open (streak 0) brings daily back.
    const last = new Date(row.last_sent_at);
    if (Number.isFinite(last.getTime())) {
      const lastLocal = localNow(row.timezone, last).date;
      if (dayNumber(local.date) - dayNumber(lastLocal) < BACKOFF_EVERY_DAYS) return { send: false, reason: "backoff" };
    }
  }

  const dueToday = row.next_for_date && String(row.next_for_date).slice(0, 10) === local.date;
  const passage = dueToday ? cleanText(row.next_passage, MAX_PASSAGE) : null;
  if (!passage) return { send: true, localDate: local.date, title: null, body: null, passage: null };
  const lang = normLang(row.lang);
  const label = cleanText(row.next_label, MAX_LABEL);
  return {
    send: true,
    localDate: local.date,
    title: label || getTemplate(lang).title,
    body: pushReadyBody(passage, lang),
    passage,
  };
}

/** The dw_prompt_log key: one v2 reminder per row per local day. */
function dedupeKey(rowId, localDate) {
  return `${KIND}:${String(rowId).toLowerCase()}:${localDate}`;
}

/* ── What a device may store (push-subscribe.js `update`) ─────────────────── */

function textField(value, max) {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: "bad_value" };
  const s = value.trim();
  if (!s) return { ok: true, value: null };
  if (s.length > max) return { ok: false, error: "too_long" };
  if (CONTROL_RE.test(s)) return { ok: false, error: "bad_value" };
  return { ok: true, value: s };
}

/**
 * Check a device's reading state and turn it into column updates.
 * Unknown fields, wrong types, long labels and bad dates are refused whole:
 * { ok: false, error }. Absent fields are left as they are. opened: true sets
 * last_opened_at = now and unopened_streak = 0 (the first open brings daily back).
 */
function stateUpdates(state, now = new Date()) {
  if (!state || typeof state !== "object" || Array.isArray(state)) return { ok: false, error: "bad_state" };
  for (const key of Object.keys(state)) {
    if (!STATE_FIELDS.has(key)) return { ok: false, error: "unknown_field" };
  }
  const updates = {};

  if ("persona" in state) {
    const p = state.persona;
    if (p !== null && !(typeof p === "string" && PERSONAS.has(p))) return { ok: false, error: "bad_value" };
    updates.persona = p;
  }
  if ("journey_day" in state) {
    const d = state.journey_day;
    if (d !== null && !(Number.isInteger(d) && d >= 1 && d <= MAX_JOURNEY_DAY)) return { ok: false, error: "bad_value" };
    updates.journey_day = d;
  }
  for (const [field, max] of [["next_passage", MAX_PASSAGE], ["next_label", MAX_LABEL]]) {
    if (field in state) {
      const r = textField(state[field], max);
      if (!r.ok) return { ok: false, error: r.error };
      updates[field] = r.value;
    }
  }
  for (const field of ["next_for_date", "last_read_date"]) {
    if (field in state) {
      const v = state[field];
      if (v !== null && !validDate(v)) return { ok: false, error: "bad_value" };
      updates[field] = v;
    }
  }
  if ("opened" in state) {
    if (typeof state.opened !== "boolean") return { ok: false, error: "bad_value" };
    if (state.opened) {
      updates.last_opened_at = now.toISOString();
      updates.unopened_streak = 0;
    }
  }
  return { ok: true, updates };
}

module.exports = {
  KIND,
  NO_SUNDAY_FOR_PASTORS,
  BACKOFF_AFTER,
  BACKOFF_EVERY_DAYS,
  MIN_GAP_MS,
  CATCH_UP_HOURS,
  MAX_LABEL,
  MAX_PASSAGE,
  STATE_FIELDS,
  localNow,
  dayNumber,
  shadowIds,
  inScope,
  cleanText,
  planV2,
  dedupeKey,
  stateUpdates,
};
