/**
 * Daily Word prayer care (MOS-to-8 build B09-12): the staff side of the wall.
 *
 *   notifyHeld(db, prayer, opts)        one email per staff member that a post
 *                                       is waiting for a look (kind
 *                                       dw_prayer_held; campus and link only)
 *   prayerScope(staff, campuses)        whose requests this staff member sees
 *   listPrayerCare(db, staff, campuses) /staff: the posts waiting for a look
 *                                       and "Prayer requests this week"
 *   decidePrayer(db, staff, campuses, id, decision)
 *                                       Show it on the wall | Keep it private
 *
 * B09-13 (lib/prayer-lines.js holds the rules, pure):
 *   listPrayerLines(db, staff, campuses)  /staff "Needs you": the open lines
 *                                       (kind dw_prayer_pastor_line; live only
 *                                       in a switched-on nation)
 *   prayerWriteLink(db, staff, campuses, id)
 *                                       the address-only mailto: for one request
 *   closePrayerLine(db, staff, campuses, id, kind)
 *                                       I wrote to {first name} | I prayed for this
 *   setWaitingMuted(db, staff, muted)     Stop the waiting email
 * The weekly list and "Needs you" share prayerWriteLink and closePrayerLine,
 * so the two can never disagree. Neither list ever carries an address.
 *
 * Rulings that bind this file (chapter 09 B09-12):
 *   - An anonymous request stays anonymous to staff too: no name, no email.
 *   - The pastor's reply is personal: the app gives an address for an EMPTY
 *     email and never writes the words.
 *   - No prayer text or name in any email, in dw_prompt_log, or in a log line.
 *   - Nothing is deleted. Nothing reaches a model.
 *
 * Who sees what: a campus pastor (role campus, campus confirmed by Ashley) sees
 * and decides their own campus only; hub and admin see and decide every
 * campus; media and an unconfirmed campus pastor get 403.
 *
 * The tests live in tests/functions/prayer-care.test.js, never in this folder.
 */

const { raiseStaffEmail, switchOf, normalizeRecipient, regionGate } = require("./prompts");
const lines = require("./prayer-lines");
const { campusName, isCampusId } = require("./campuses");
const { campusConfirmed } = require("./intake-core");

const HELD_KIND = "dw_prayer_held";
const DEFAULT_SITE = "https://futuresdailyword.com";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_LIMIT = 200;
const HELD_LIMIT = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// One definition of "anonymous" and "first name" for both lists (lib/prayer-lines.js).
const { isAnonymousName, firstNameOf: firstName } = lines;

/** /staff on this site (the deploy's URL when it is https, else the live site). */
function staffHome() {
  const url = String(process.env.URL || "");
  return (/^https:\/\//.test(url) ? url.replace(/\/+$/, "") : DEFAULT_SITE) + "/staff";
}

/** The held email: the campus and a link, never the text or a name. */
function heldEmail(campusLabel, link) {
  const where = campusLabel ? ` at ${campusLabel}` : "";
  const subject = `A prayer request${where} is waiting for a look`;
  const text = [
    `A prayer request${where} is waiting for a look before it goes on the prayer wall.`,
    "",
    "Open Daily Word staff to show it on the wall or keep it private:",
    link,
  ].join("\n");
  return { subject, text };
}

/**
 * Who hears that a post at `campus` is waiting: the campus pastors Ashley has
 * confirmed for that campus; when there are none (or the post has no campus),
 * hub and admin staff.
 */
function heldRecipients(campus, roster) {
  const rows = Array.isArray(roster) ? roster.filter(Boolean) : [];
  const pick = (list) => {
    const seen = new Set();
    const out = [];
    for (const row of list) {
      const email = normalizeRecipient(row.email);
      if (!email || seen.has(email)) continue;
      seen.add(email);
      out.push(email);
    }
    return out;
  };
  const pastors = campus
    ? rows.filter((r) => r.role === "campus" && r.campus_id === campus && r.campus_set_by !== "self")
    : [];
  if (pastors.length) return pick(pastors);
  return pick(rows.filter((r) => r.role === "hub" || r.role === "admin"));
}

/**
 * Tell the right staff that a post is waiting for a look. Never throws.
 * While the kind is off nothing is read and nothing is written. The dedupe key
 * is per post and per person (prayer_held:<id>:<email>), so two pastors at one
 * campus both hear, once each.
 */
async function notifyHeld(db, prayer, { campuses } = {}) {
  const summary = { mode: "off", sent: 0, logged: 0, skipped: 0 };
  try {
    if (!prayer || !prayer.id) return summary;
    const { mode, shadowRecipients } = await switchOf(db, HELD_KIND);
    summary.mode = mode;
    if (mode !== "shadow" && mode !== "live") return summary;
    const { data: roster, error } = await db
      .from("staff_roster")
      .select("email, role, campus_id, campus_set_by")
      .in("role", ["campus", "hub", "admin"]);
    if (error || !Array.isArray(roster)) {
      console.error(`[prayer-care] roster read failed: ${(error && error.message) || "no rows"}`);
      return summary;
    }
    const campus = typeof prayer.campus === "string" ? prayer.campus : "";
    const label = campus ? campusName(campus, campuses) : "";
    const link = staffHome();
    const { subject, text } = heldEmail(label, link);
    const recipients = heldRecipients(campus, roster);
    // Shadow week: the owner's shadow list (staff on the roster only) gets
    // every held email the pastors would get, so he sees live before it is
    // live; the pastors are logged, not sent (logInShadow).
    if (mode === "shadow") {
      const staff = new Set(roster.map((r) => normalizeRecipient(r && r.email)).filter(Boolean));
      for (const who of shadowRecipients) {
        if (staff.has(who) && !recipients.includes(who)) recipients.push(who);
      }
    }
    for (const recipient of recipients) {
      const out = await raiseStaffEmail(db, {
        kind: HELD_KIND,
        dedupeKey: `prayer_held:${prayer.id}:${recipient}`,
        recipient,
        writtenBy: "template",
        title: subject,
        body: text,
        link,
        subject,
        text,
        logInShadow: true,
        // Live only in a nation Ashley has switched on (B09-13): a post with
        // no campus, or at a campus with no congregation, is never live.
        campusId: campus,
      });
      if (out.sent) summary.sent += 1;
      else if (out.reason === "shadow_logged") summary.logged += 1;
      else summary.skipped += 1;
    }
    return summary;
  } catch (err) {
    console.error(`[prayer-care] notifyHeld threw: ${err && err.message}`);
    return summary;
  }
}

/**
 * Whose requests this staff member sees and decides:
 *   { all: true } for hub and admin;
 *   { campusId } for a campus pastor whose campus Ashley has confirmed;
 *   { error, status: 403 } for everyone else.
 */
function prayerScope(staff, campuses) {
  if (!staff) return { error: "Sign in required", status: 401 };
  if (staff.role === "admin" || staff.role === "hub") return { all: true };
  if (staff.role === "campus") {
    if (campusConfirmed(staff) && staff.campusId && isCampusId(staff.campusId, campuses)) {
      return { campusId: staff.campusId };
    }
    return { error: "Your campus is not confirmed yet. An admin confirms it in People.", status: 403, code: "campus" };
  }
  return { error: "Prayer requests are for campus pastors, hub and admin staff.", status: 403, code: "role" };
}

function daysAgo(createdAt, now) {
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / DAY_MS));
}

/** One row of "Prayer requests this week". Anonymous rows carry no name and no email. */
function weekRow(row, campuses, now) {
  const out = {
    id: String(row.id),
    campusId: row.campus || "",
    campusName: row.campus ? campusName(row.campus, campuses) : "",
    text: String(row.prayer || ""),
    prayed: Math.max(0, Number(row.prayer_count) || 0),
    createdAt: row.created_at,
    daysAgo: daysAgo(row.created_at, now),
    status: row.status === "private" ? "private" : "shown",
    anonymous: isAnonymousName(row.name),
    // B09-13: the address is never in the list. Write to {first name} asks
    // prayerWriteLink for it, after the same scope check, one request at a time.
    canWrite: lines.canWriteTo(row),
    done: row.pastor_done_kind === "wrote" || row.pastor_done_kind === "prayed" ? row.pastor_done_kind : null,
  };
  if (!out.anonymous) out.firstName = firstName(row.name);
  return out;
}

/** One post waiting for a look: the text and why it waits. No name, no email. */
function heldRow(row, campuses, now) {
  return {
    id: String(row.id),
    campusId: row.campus || "",
    campusName: row.campus ? campusName(row.campus, campuses) : "",
    text: String(row.prayer || ""),
    createdAt: row.created_at,
    daysAgo: daysAgo(row.created_at, now),
    heldReason: ["contact", "link", "language"].includes(row.held_reason) ? row.held_reason : null,
  };
}

/** /staff: the posts waiting for a look, then the week's requests, newest first. */
async function listPrayerCare(db, staff, campuses, now = new Date()) {
  const scope = prayerScope(staff, campuses);
  if (scope.error) return scope;
  const since = new Date(now.getTime() - WEEK_MS).toISOString();

  let heldQ = db
    .from("prayers")
    .select("id, prayer, campus, created_at, held_reason")
    .eq("status", "held");
  if (scope.campusId) heldQ = heldQ.eq("campus", scope.campusId);
  const { data: held, error: heldErr } = await heldQ.order("created_at", { ascending: false }).limit(HELD_LIMIT);
  if (heldErr) throw heldErr;

  let weekQ = db
    .from("prayers")
    .select("id, prayer, name, email, campus, prayer_count, created_at, status, pastor_done_kind")
    .in("status", ["shown", "private"])
    .gte("created_at", since);
  if (scope.campusId) weekQ = weekQ.eq("campus", scope.campusId);
  const { data: week, error: weekErr } = await weekQ.order("created_at", { ascending: false }).limit(WEEK_LIMIT);
  if (weekErr) throw weekErr;

  return {
    scope: scope.campusId
      ? { all: false, campusId: scope.campusId, campusName: campusName(scope.campusId, campuses) }
      : { all: true },
    held: (held || []).map((r) => heldRow(r, campuses, now)),
    week: (week || []).map((r) => weekRow(r, campuses, now)),
  };
}

/**
 * Show it on the wall | Keep it private, for one post that is waiting.
 * 400 bad input; 404 no such post; 403 another campus's post; 409 it was
 * decided already (the update only lands while the row is still held).
 */
async function decidePrayer(db, staff, campuses, id, decision) {
  const scope = prayerScope(staff, campuses);
  if (scope.error) return scope;
  const pid = typeof id === "string" ? id.trim().toLowerCase() : "";
  if (!UUID_RE.test(pid)) return { error: "Which request?", status: 400 };
  if (decision !== "show" && decision !== "private") return { error: "Show it or keep it private.", status: 400 };

  const { data: row, error } = await db.from("prayers").select("id, campus, status").eq("id", pid).maybeSingle();
  if (error) throw error;
  if (!row) return { error: "That request is not there any more.", status: 404 };
  if (scope.campusId && row.campus !== scope.campusId) {
    return { error: "That request belongs to another campus.", status: 403, code: "campus" };
  }
  if (row.status !== "held") return { error: "Someone has already decided this one.", status: 409 };

  const status = decision === "show" ? "shown" : "private";
  const { data: updated, error: upErr } = await db
    .from("prayers")
    .update({ status })
    .eq("id", pid)
    .eq("status", "held")
    .select("id");
  if (upErr) throw upErr;
  if (!Array.isArray(updated) || updated.length === 0) {
    return { error: "Someone has already decided this one.", status: 409 };
  }
  console.log("[intake] prayer_decide", JSON.stringify({ id: pid, status, by: staff.role }));
  return { ok: true, id: pid, status };
}

// ── B09-13: the lines, the write link, the close, the mute ─────────────────

const LINE_LIMIT = 200;
const LINE_COLUMNS = "id, prayer, name, email, campus, created_at, status, pastor_done_at, escalated_on";

/** Has this staff member muted the waiting email? Any doubt reads as not muted. */
async function waitingMutedFor(db, staff) {
  try {
    const { data, error } = await db.from("staff_roster").select("prayer_waiting_muted").eq("email", staff.email).maybeSingle();
    return !error && !!data && data.prayer_waiting_muted === true;
  } catch {
    return false;
  }
}

/**
 * /staff "Needs you": this staff member's open lines, oldest first, and
 * whether they muted the waiting email. While the kind is off (the seeded
 * default) no request is read. 403 for media and an unconfirmed campus
 * pastor, as the weekly list.
 */
async function listPrayerLines(db, staff, campuses, now = new Date()) {
  const scope = prayerScope(staff, campuses);
  if (scope.error) return scope;
  const waitingMuted = await waitingMutedFor(db, staff);
  const { mode, shadowRecipients } = await switchOf(db, lines.LINE_KIND);
  if (mode !== "live" && mode !== "shadow") return { lines: [], waitingMuted };
  const listed = shadowRecipients.includes(normalizeRecipient(staff.email));
  if (mode === "shadow" && !listed) return { lines: [], waitingMuted };

  const gate = mode === "live" ? await regionGate(db) : {};
  let viewers = [];
  if (mode === "live" && (staff.role === "hub" || staff.role === "admin")) {
    // Hub and admin see the campuses with no confirmed pastor: read who is confirmed.
    const { data: roster, error } = await db.from("staff_roster").select("email, role, campus_id, campus_set_by");
    if (error || !Array.isArray(roster)) throw error || new Error("roster read failed");
    viewers = lines.viewersFrom(roster);
  }
  const ctx = { mode, shadowRecipients, gate, viewers, campuses, now };
  const scopeIds = mode === "live"
    ? [...lines.lineCampusesFor(staff, { viewers, campuses })]
    : scope.campusId ? [scope.campusId] : campuses.filter((c) => c.id !== "other" && c.congregation).map((c) => c.id);
  if (!scopeIds.length) return { lines: [], waitingMuted };

  const { data, error } = await db
    .from("prayers")
    .select(LINE_COLUMNS)
    .in("status", ["shown", "private"])
    .is("pastor_done_at", null)
    .in("campus", scopeIds)
    .order("created_at", { ascending: true })
    .limit(LINE_LIMIT);
  if (error) throw error;
  return { lines: lines.linesFor(staff, data || [], ctx), waitingMuted };
}

/** One request for an action, after the scope check. { row } or { error, status }. */
async function requestForAction(db, staff, campuses, id) {
  const pid = typeof id === "string" ? id.trim().toLowerCase() : "";
  if (!UUID_RE.test(pid)) return { error: "Which request?", status: 400 };
  const { data: row, error } = await db
    .from("prayers")
    .select("id, name, email, campus, status, pastor_done_at, pastor_done_kind")
    .eq("id", pid)
    .maybeSingle();
  if (error) throw error;
  if (!row) return { error: "That request is not there any more.", status: 404 };
  const refusal = lines.actionRefusal(staff, row, campuses);
  if (refusal) return refusal;
  if (row.status === "held") return { error: "Show it on the wall or keep it private first.", status: 409, code: "held" };
  return { row, id: pid };
}

/**
 * Write to {first name}: the address-only mailto: for one request (no
 * subject, no body). 400 when it was posted without a name or an address.
 */
async function prayerWriteLink(db, staff, campuses, id) {
  const got = await requestForAction(db, staff, campuses, id);
  if (got.error) return got;
  const href = lines.mailtoFor(got.row);
  if (!href) return { error: "This request has no name or address to write to.", status: 400, code: "no_address" };
  console.log("[intake] prayer_write_link", JSON.stringify({ id: got.id, by: staff.role }));
  return { href };
}

/**
 * I wrote to {first name} | I prayed for this: closes the request for every
 * list at once. `wrote` is refused (400) for a request with no name or no
 * address. A request a colleague closed first answers ok with `already`.
 */
async function closePrayerLine(db, staff, campuses, id, kind, now = new Date()) {
  if (kind !== "wrote" && kind !== "prayed") return { error: "Wrote or prayed?", status: 400 };
  const got = await requestForAction(db, staff, campuses, id);
  if (got.error) return got;
  if (kind === "wrote" && !lines.canWriteTo(got.row)) {
    return { error: "This request was posted without a name or an address.", status: 400, code: "no_address" };
  }
  if (got.row.pastor_done_at) return { ok: true, id: got.id, kind: got.row.pastor_done_kind, already: true };
  const { data: updated, error } = await db
    .from("prayers")
    .update({ pastor_done_at: now.toISOString(), pastor_done_kind: kind, pastor_done_by: normalizeRecipient(staff.email) })
    .eq("id", got.id)
    .is("pastor_done_at", null)
    .select("id");
  if (error) throw error;
  if (!Array.isArray(updated) || updated.length === 0) {
    const { data: again } = await db.from("prayers").select("pastor_done_kind").eq("id", got.id).maybeSingle();
    return { ok: true, id: got.id, kind: (again && again.pastor_done_kind) || kind, already: true };
  }
  console.log("[intake] prayer_line_done", JSON.stringify({ id: got.id, kind, by: staff.role }));
  return { ok: true, id: got.id, kind };
}

/** Stop the waiting email (or start it again) for this staff member only. */
async function setWaitingMuted(db, staff, muted) {
  if (!staff || !staff.email) return { error: "Sign in required", status: 401 };
  if (typeof muted !== "boolean") return { error: "On or off?", status: 400 };
  const { data, error } = await db
    .from("staff_roster")
    .update({ prayer_waiting_muted: muted })
    .eq("email", normalizeRecipient(staff.email))
    .select("email");
  if (error) throw error;
  if (!Array.isArray(data) || data.length === 0) return { error: "Your staff row is not there.", status: 404 };
  return { ok: true, waitingMuted: muted };
}

module.exports = {
  HELD_KIND,
  listPrayerLines,
  prayerWriteLink,
  closePrayerLine,
  setWaitingMuted,
  isAnonymousName,
  firstName,
  heldEmail,
  heldRecipients,
  notifyHeld,
  prayerScope,
  listPrayerCare,
  decidePrayer,
  staffHome,
};
