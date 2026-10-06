/**
 * Daily Word: every prayer request reaches its campus pastor, and stays until
 * he has written or prayed (MOS-to-8 build B09-13, scorecard fix SF-09-07).
 *
 * PURE: no database, no clock, no network. Everything arrives as input, so the
 * whole mode/gate/scope matrix is tested without a stub (tests in
 * tests/functions/prayer-lines.test.js, never in this folder).
 *
 *   linesFor(viewer, rows, ctx)    the open lines this staff member sees on
 *                                  /staff "Needs you", oldest first
 *   lineCampusesFor(viewer, ctx)   whose requests raise lines for them (live)
 *   planWaiting(ctx)               who gets the one nameless "waited two days"
 *                                  email this hour, and which requests it covers
 *   waitingEmail(campusName, link, lang)
 *
 * A request is a line when:
 *   - the kind dw_prayer_pastor_line is 'live' AND its campus's nation
 *     (dw_campuses.congregation, never region) is switched on
 *     (dw_region_gate.notices_on_at set and passed); or the kind is 'shadow'
 *     and the viewer is on its shadow list (Ashley's test; no nation gate);
 *   - its campus has a congregation (Indonesia, Brazil, Other and a request
 *     with no campus never raise a line, in any mode);
 *   - it was decided (status 'shown' or 'private'; a 'held' post waits for its
 *     look first, B09-12) and no pastor has closed it (pastor_done_at null).
 *
 * Who sees it (live): the campus pastors Ashley confirmed for that campus; hub
 * and admin only for a campus with no confirmed pastor, so nothing falls
 * through and nothing doubles. In shadow the listed viewer sees what their own
 * view allows (a campus pastor their campus; hub and admin every campus).
 *
 * A line carries the first name and the ask only: never the email address,
 * never anything else about the person. An anonymous request has no name and
 * cannot be written to. Nothing here reaches a model.
 */

const { normalizeRecipient, congregationOpen } = require("./prompts");
const { campusName, campusCongregation, campusTimeZone, isCampusId } = require("./campuses");
const { staffFromRoster, campusConfirmed } = require("./intake-core");
const { localParts } = require("./sermon-window");

const LINE_KIND = "dw_prayer_pastor_line";
const WAITING_KIND = "dw_prayer_waiting";
const DAY_MS = 24 * 60 * 60 * 1000;
const WAITING_MS = 48 * 60 * 60 * 1000;
const WAITING_FROM_HOUR = 7; // campus-local, inclusive
const WAITING_UNTIL_HOUR = 21; // campus-local, exclusive: 21:00 and later is quiet
const EMAIL_RE = /^[^\s@?&#/\\]+@[^\s@?&#/\\]+\.[^\s@?&#/\\]{2,}$/;
const DECIDED = new Set(["shown", "private"]);

/** "Anonymous" (any case), empty or missing: the poster asked not to be named. */
function isAnonymousName(name) {
  const n = typeof name === "string" ? name.trim() : "";
  return !n || n.toLowerCase() === "anonymous";
}

/** The first word of a name, for "Write to {first name}". */
function firstNameOf(name) {
  const n = typeof name === "string" ? name.trim() : "";
  return n.split(/\s+/)[0] || "";
}

/** A usable address for an empty email, or ''. */
function usableEmail(email) {
  const e = typeof email === "string" ? email.trim() : "";
  return EMAIL_RE.test(e) ? e : "";
}

/** May a pastor write to this person? A name and a usable address. */
function canWriteTo(row) {
  return !!row && !isAnonymousName(row.name) && !!usableEmail(row.email);
}

/** The address-only `mailto:` (no subject, no body, no `?`), or '' when there is none. */
function mailtoFor(row) {
  if (!canWriteTo(row)) return "";
  return `mailto:${encodeURIComponent(usableEmail(row.email))}`;
}

/** Decided (shown or private) and not yet closed by a pastor. */
function isOpenRequest(row) {
  return !!row && DECIDED.has(row.status || "shown") && !row.pastor_done_at;
}

/** Roster rows as /staff sees them (lib/intake-core.js staffFromRoster). */
function viewersFrom(roster) {
  const out = [];
  for (const row of Array.isArray(roster) ? roster : []) {
    const staff = row && staffFromRoster(row.email, row);
    if (staff) out.push({ ...staff, muted: row.prayer_waiting_muted === true });
  }
  return out;
}

/** The campuses that have at least one campus pastor Ashley has confirmed. */
function pastoredCampuses(viewers, campuses) {
  const set = new Set();
  for (const v of viewers) {
    if (v.role === "campus" && campusConfirmed(v) && isCampusId(v.campusId, campuses)) set.add(v.campusId);
  }
  return set;
}

/** Every real campus with a congregation (the ones that can raise a line at all). */
function nationCampusIds(campuses) {
  return (Array.isArray(campuses) ? campuses : [])
    .filter((c) => c && c.id !== "other" && c.congregation)
    .map((c) => c.id);
}

/**
 * Whose requests raise lines for this viewer when the kind is live:
 *   a confirmed campus pastor → their own campus;
 *   hub and admin → every campus with no confirmed campus pastor;
 *   anyone else (media, an unconfirmed campus pastor) → none.
 * `viewers` is the whole roster as /staff sees it (viewersFrom).
 */
function lineCampusesFor(viewer, { viewers = [], campuses } = {}) {
  if (!viewer) return new Set();
  if (viewer.role === "campus") {
    return campusConfirmed(viewer) && isCampusId(viewer.campusId, campuses) ? new Set([viewer.campusId]) : new Set();
  }
  if (viewer.role === "hub" || viewer.role === "admin") {
    const pastored = pastoredCampuses(viewers, campuses);
    return new Set(nationCampusIds(campuses).filter((id) => !pastored.has(id)));
  }
  return new Set();
}

/** In shadow, the listed viewer sees what their own view allows. */
function viewCampusesFor(viewer, campuses) {
  if (!viewer) return new Set();
  if (viewer.role === "campus") {
    return campusConfirmed(viewer) && isCampusId(viewer.campusId, campuses) ? new Set([viewer.campusId]) : new Set();
  }
  if (viewer.role === "hub" || viewer.role === "admin") return new Set(nationCampusIds(campuses));
  return new Set();
}

function waitingDays(createdAt, now) {
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / DAY_MS));
}

/** One line for /staff: the first name (null when anonymous) and the ask. Never an address. */
function lineFromRow(row, campuses, now) {
  const anonymous = isAnonymousName(row.name);
  return {
    id: String(row.id),
    firstName: anonymous ? null : firstNameOf(row.name),
    campusId: row.campus || "",
    campusName: row.campus ? campusName(row.campus, campuses) : "",
    text: String(row.prayer || ""),
    createdAt: row.created_at,
    waitingDays: waitingDays(row.created_at, now),
    canWrite: canWriteTo(row),
  };
}

/**
 * The open lines this staff member sees on /staff "Needs you", oldest first.
 * ctx: { mode, shadowRecipients, gate, viewers, campuses, now }.
 * Returns [] for mode off, for anyone off the shadow list in shadow, for every
 * request whose nation is closed in live, and for any input it does not trust.
 */
function linesFor(viewer, rows, { mode, shadowRecipients = [], gate = {}, viewers = [], campuses, now = new Date() } = {}) {
  if (!viewer || (mode !== "live" && mode !== "shadow")) return [];
  let scope;
  if (mode === "shadow") {
    const who = normalizeRecipient(viewer.email);
    const listed = Array.isArray(shadowRecipients) && shadowRecipients.some((r) => normalizeRecipient(r) === who);
    if (!who || !listed) return [];
    scope = viewCampusesFor(viewer, campuses);
  } else {
    scope = lineCampusesFor(viewer, { viewers, campuses });
  }
  if (!scope.size) return [];
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!isOpenRequest(row) || !row.id) continue;
    const campus = typeof row.campus === "string" ? row.campus : "";
    if (!campus || !scope.has(campus)) continue;
    const congregation = campusCongregation(campus, campuses);
    if (!congregation) continue;
    if (mode === "live" && !congregationOpen(gate, congregation, now)) continue;
    out.push(lineFromRow(row, campuses, now));
  }
  out.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return out;
}

/**
 * May this staff member act on this request (Write to, I wrote, I prayed)?
 * The same view the weekly list gives them (B09-12): a confirmed campus pastor
 * their own campus; hub and admin every campus. Returns null when allowed, or
 * { status, error, code }.
 */
function actionRefusal(staff, row, campuses) {
  if (!staff) return { status: 401, error: "Sign in required" };
  if (staff.role === "hub" || staff.role === "admin") return null;
  if (staff.role === "campus") {
    if (!campusConfirmed(staff) || !isCampusId(staff.campusId, campuses)) {
      return { status: 403, error: "Your campus is not confirmed yet. An admin confirms it in People.", code: "campus" };
    }
    if (!row || row.campus !== staff.campusId) {
      return { status: 403, error: "That request belongs to another campus.", code: "campus" };
    }
    return null;
  }
  return { status: 403, error: "Prayer requests are for campus pastors, hub and admin staff.", code: "role" };
}

function localDate(parts) {
  const p2 = (n) => String(n).padStart(2, "0");
  return `${parts.year}-${p2(parts.month)}-${p2(parts.day)}`;
}

/**
 * The words of the one nameless email. The campus and the link only: never a
 * name, an address or the prayer. Spanish for Futuros.
 */
function waitingEmail(campusLabel, link, lang = "en") {
  const sentence = lang === "es"
    ? `Una petición de oración en ${campusLabel} lleva dos días esperando.`
    : `A prayer request at ${campusLabel} has waited two days.`;
  return {
    subject: sentence.replace(/\.$/, ""),
    text: [sentence, "", link].join("\n"),
  };
}

/**
 * Who gets the "waited two days" email this hour. Pure; the runner claims,
 * sends and marks. ctx: { rows, roster, campuses, lineSwitch: { mode,
 * shadowRecipients }, gate, now }. For each staff member (as /staff sees
 * them; muted ones skipped): their open lines (linesFor) that are older than
 * 48 hours and have never been escalated; the campus with the oldest of them;
 * nothing outside 07:00-21:00 on that campus's clock. One entry per person:
 * { recipient, campusId, campusName, lang, localDate, ids, count }.
 */
function planWaiting({ rows = [], roster = [], campuses, lineSwitch = {}, gate = {}, now = new Date() } = {}) {
  const viewers = viewersFrom(roster);
  const byId = new Map((Array.isArray(rows) ? rows : []).filter((r) => r && r.id).map((r) => [String(r.id), r]));
  const ctx = { mode: lineSwitch.mode, shadowRecipients: lineSwitch.shadowRecipients || [], gate, viewers, campuses, now };
  const plan = [];
  const seen = new Set();
  for (const viewer of viewers) {
    const recipient = normalizeRecipient(viewer.email);
    if (!recipient || seen.has(recipient) || viewer.muted) continue;
    seen.add(recipient);
    const due = linesFor(viewer, rows, ctx).filter((line) => {
      const row = byId.get(line.id);
      const age = now.getTime() - new Date(line.createdAt).getTime();
      return row && !row.escalated_on && Number.isFinite(age) && age >= WAITING_MS;
    });
    if (!due.length) continue;
    const campusId = due[0].campusId; // oldest first
    const tz = campusTimeZone(campusId, campuses);
    if (!tz) continue;
    let parts;
    try {
      parts = localParts(now, tz);
    } catch {
      continue;
    }
    if (parts.hour < WAITING_FROM_HOUR || parts.hour >= WAITING_UNTIL_HOUR) continue;
    const ids = due.filter((l) => l.campusId === campusId).map((l) => l.id);
    plan.push({
      recipient,
      campusId,
      campusName: campusName(campusId, campuses),
      lang: campusCongregation(campusId, campuses) === "futuros-us" ? "es" : "en",
      localDate: localDate(parts),
      ids,
      count: ids.length,
    });
  }
  return plan;
}

module.exports = {
  LINE_KIND,
  WAITING_KIND,
  WAITING_MS,
  WAITING_FROM_HOUR,
  WAITING_UNTIL_HOUR,
  isAnonymousName,
  firstNameOf,
  canWriteTo,
  mailtoFor,
  isOpenRequest,
  viewersFrom,
  lineCampusesFor,
  linesFor,
  lineFromRow,
  actionRefusal,
  waitingEmail,
  planWaiting,
};
