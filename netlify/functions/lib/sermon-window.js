/**
 * Weekly turnover for Sermon Notes (Ashley, 2 Sep 2026, night).
 *
 * A published message is NOT deleted on Sunday evening: people use the notes
 * midweek, and the three congregations sit in three clocks. It stops being
 * current on the NEXT Sunday morning in that congregation's local time,
 * decided at read time by published-sermon.js — no cron, no deletion, the
 * archive keeps everything. A later publish still replaces it at once, exactly
 * as before; this only ever ends a message's currency, never extends it past
 * the next publish.
 *
 * "Sunday morning" is 04:00 local on the Sunday AFTER the message's service
 * Sunday. No congregation meets at that hour, and a Saturday-night reader
 * still has the notes. The service Sunday is the first Sunday on or after the
 * message's own date (`sermon.date`, typed by the pastor), floored by the first
 * Sunday on or after the day it was published — so a stale or missing date
 * never hides a message early, and a future date keeps it up until the week
 * after that Sunday. Whichever of the two is later wins.
 *
 * Pure: no database, no network. Every function takes `now` so it can be
 * tested at any instant. Time-zone arithmetic uses Intl only — no library.
 */

const TIME_ZONES = {
  "futures-us": "America/New_York",
  "futures-au": "Australia/Adelaide",
  "futuros-us": "America/New_York"
};
const DEFAULT_TIME_ZONE = "America/New_York";

/** Sunday 04:00 local: after every Saturday-night service, before every Sunday one. */
const CUTOFF_HOUR = 4;

const DAY_MS = 86400000;

function congregationTimeZone(congregation) {
  return TIME_ZONES[congregation] || DEFAULT_TIME_ZONE;
}

const partsCache = new Map();
function formatter(timeZone) {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric"
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

/** The wall-clock parts of an instant in a zone. */
function localParts(instant, timeZone) {
  const parts = {};
  for (const p of formatter(timeZone).formatToParts(instant)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second
  };
}

/** Zone offset (ms, east-positive) at an instant. */
function offsetAt(instant, timeZone) {
  const p = localParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The instant at which a zone's wall clock reads the given local time.
 * Two passes converge across a DST boundary (the first guess uses the offset
 * on the other side of the switch).
 */
function zonedToInstant(year, month, day, hour, timeZone) {
  const guess = Date.UTC(year, month - 1, day, hour, 0, 0);
  let instant = new Date(guess - offsetAt(new Date(guess), timeZone));
  instant = new Date(guess - offsetAt(instant, timeZone));
  return instant;
}

/** Calendar-day arithmetic on a (year, month, day) triple, in UTC-date space. */
function addDays(year, month, day, n) {
  const d = new Date(Date.UTC(year, month - 1, day) + n * DAY_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay() };
}

/** The first Sunday on or after a calendar day. */
function serviceSunday(year, month, day) {
  const today = addDays(year, month, day, 0);
  return addDays(year, month, day, (7 - today.weekday) % 7);
}

/** A pastor-typed date, `YYYY-MM-DD` (anything longer is trimmed to its date). */
function parseDateOnly(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || "").trim());
  if (!m) return null;
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  const back = addDays(year, month, day, 0);
  if (back.year !== year || back.month !== month || back.day !== day) return null; // 2026-02-31
  return { year, month, day };
}

/** The cutoff that ends the week whose service Sunday is on/after this calendar day. */
function cutoffAfterDay(year, month, day, timeZone) {
  const sunday = serviceSunday(year, month, day);
  const next = addDays(sunday.year, sunday.month, sunday.day, 7);
  return zonedToInstant(next.year, next.month, next.day, CUTOFF_HOUR, timeZone);
}

/**
 * When a published row stops being current, as a Date. `row` needs
 * `published_at` (ISO) and `congregation`; `row.sermon.date` is used when
 * present and valid. A missing or unparseable `published_at` counts as `now`.
 */
function currentUntil(row, now = new Date()) {
  const r = row || {};
  const timeZone = congregationTimeZone(r.congregation);
  const publishedAt = new Date(r.published_at || NaN);
  const pub = localParts(Number.isNaN(publishedAt.getTime()) ? now : publishedAt, timeZone);
  let until = cutoffAfterDay(pub.year, pub.month, pub.day, timeZone);
  const typed = parseDateOnly(r.sermon && r.sermon.date);
  if (typed) {
    const fromDate = cutoffAfterDay(typed.year, typed.month, typed.day, timeZone);
    if (fromDate > until) until = fromDate;
  }
  return until;
}

/** Current in the database AND still inside its week. */
function isCurrentAt(row, now = new Date()) {
  if (!row || !row.is_current) return false;
  return now < currentUntil(row, now);
}

module.exports = {
  TIME_ZONES,
  CUTOFF_HOUR,
  congregationTimeZone,
  localParts,
  zonedToInstant,
  serviceSunday,
  parseDateOnly,
  currentUntil,
  isCurrentAt
};
