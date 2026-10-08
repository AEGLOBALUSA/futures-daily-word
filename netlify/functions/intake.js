/**
 * Staff intake API — one form. Save publishes to campus corner / sermon notes.
 *
 * POST /.netlify/functions/intake  { action, ... }
 */
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const { getAllowedOrigin, parseRequestOrigin, isDailyWordPreviewOrigin } = require("./lib/cors");
const { isSharedRateLimited } = require("./lib/rate-limit");
// The sign-in rate limits key on an address the client cannot choose (see
// lib/client-ip.js); the setup-code limits key on its /64 for IPv6.
const { clientIp, rateLimitIp } = require("./lib/client-ip");
const {
  normalizeEmail,
  isAllowlistedEmail,
  fallbackStaff,
  staffFromRoster,
  isOwner,
  rosterChangeRefusal,
  campusConfirmed,
  questionVisibleForJob,
  canRewordQuestion,
  wordingPatch,
  isCampusId,
  lockCampus,
  sanitize,
  QUESTION_TYPES,
  AUDIENCES,
  ROLES,
  collectCampusFromAnswers,
  applyAnswers,
  publicStaff,
  passwordIssue,
  hashPassword,
  verifyPassword,
  SETUP_CODE_TTL_MS,
  EMAIL_SETUP_CODE_TTL_MS,
  SETUP_CODE_MAX_ATTEMPTS,
  generateSetupCode,
  hashSetupCode,
  normalizeSetupCode,
  verifySetupCode,
  DUMMY_HASH,
  youtubeWatchUrl,
  hasNotesContent,
  jobsForRole,
  usualJobFrom,
} = require("./lib/intake-core");
const { formatSermon, mergeYoutube, answersToOutline, sanitizeAiSermon, extractKeyVerseFromNotes } = require("./lib/sermon-format");
const { normalizeCongregation, congregationName, congregationSermonId, DEFAULT_CONGREGATION } = require("./lib/congregations");
const { isCurrentAt, congregationTimeZone } = require("./lib/sermon-window");
const { quickNotes, hubQuestions, mediaQuestions, mediaPickQuestion, nextSundayFor, isForSunday } = require("./lib/quick-notes");
const { isCongregationId } = require("./lib/congregations");
const { campusCongregation } = require("./lib/campuses");
const { issueToken, claimProvenToken, revokeToken } = require("./lib/auth");
const { sendWithResend, buildStaffCodeMessage } = require("./lib/email-proof");
const { listPrayerCare, decidePrayer, listPrayerLines, prayerWriteLink, closePrayerLine, setWaitingMuted } = require("./lib/prayer-care");
const { loadCampuses, loadCampusesWithin, clearCampusCache, validateCampusSave, planCampusMove, publicCampus, fromRow, COLUMNS: CAMPUS_COLUMNS } = require("./lib/campuses");
const corner = require("./lib/corner-draft");

let supabase;
function db() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

function headersFor(event) {
  const origin = event.headers.origin || event.headers.Origin || event.headers.referer || "";
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    // One preflight a day per route from Sermon Prep, not one per open.
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json"
  };
}

function json(event, status, payload) {
  return { statusCode: status, headers: headersFor(event), body: JSON.stringify(payload) };
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}


async function resolveStaff(email) {
  const e = normalizeEmail(email);
  if (!isAllowlistedEmail(e)) return null;
  const { data } = await db().from("staff_roster").select("email, role, campus_id, display_name, campus_set_by").eq("email", e).maybeSingle();
  // Staff means "on the roster". The address's domain decides nothing: a row an
  // admin added is staff, and an address with no row never is.
  return staffFromRoster(e, data);
}

/** People writes by a non-owner admin carry the "not an admin row" check in the write. */
function guardNonAdmin(query, staff) {
  return isOwner(staff.email) ? query : query.neq("role", "admin");
}

const CHANGED_UNDER_YOU = "This person just changed. Load People again.";

/**
 * Issue a one-time setup code for a roster row. The plain code is returned ONCE
 * (to Ashley, to hand over, or to email_setup_code, to mail to the row's own
 * address); only a hash is stored. Ashley's codes and emailed codes live in
 * separate slots, so asking for an emailed code never voids the code Ashley
 * handed over; a new code replaces only the earlier one in its own slot.
 * Ashley's codes live 72 hours and reset the wrong-guess count. An emailed code
 * (`slot` "email", `ttlMs` EMAIL_SETUP_CODE_TTL_MS, `clearMisses` false) leaves
 * the miss rows alone: anyone can ask for one, so asking must not wipe a
 * guesser's lock. `code` is supplied when the caller has already mailed it.
 */
async function issueSetupCode(email, { slot = "ashley", ttlMs = SETUP_CODE_TTL_MS, clearMisses = true, code = generateSetupCode(), notAdmin = false } = {}) {
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const fields = slot === "email"
    ? { email_code_hash: hashSetupCode(code), email_code_expires_at: expiresAt }
    : { setup_code_hash: hashSetupCode(code), setup_code_expires_at: expiresAt, setup_code_attempts: 0 };
  let write = db().from("staff_roster").update({
    ...fields,
    updated_at: new Date().toISOString()
  }).eq("email", email);
  // A non-owner admin's code only lands on a row that is still not an admin
  // (the role sits in the write itself, so a promotion in between wins).
  if (notAdmin) write = write.neq("role", "admin");
  const { data: hit, error } = await write.select("email");
  if (error) throw error;
  if (notAdmin && (!hit || !hit.length)) return null;
  // A fresh code from Ashley starts with a clean slate of guesses.
  if (clearMisses) await clearSetupMisses(email);
  return { code, expiresAt };
}

// Setup-code guesses, per 15 minutes: at most SETUP_CODE_MAX_ATTEMPTS from one
// caller IP (an IPv6 caller's whole /64, see lib/client-ip.js) for an address,
// and SETUP_MISS_ADDRESS_CAP for the address from all IPs together. The per-IP
// lock is the real one: a stranger on one connection cannot keep a new pastor's
// code locked for its whole 72-hour life, because the pastor on their own
// connection has their own five. The address-wide ceiling only stops a
// spread-out flood, and it only applies to a caller that has itself already
// missed in the window: a caller with no misses of its own always gets its
// attempt checked, so a flood from other connections never refuses the pastor's
// right code. The code is bcrypt-hashed with about 49 bits, so five guesses per
// /64 per 15 minutes keeps brute force far out of reach.
const SETUP_MISS_WINDOW_MS = 15 * 60 * 1000;
const SETUP_MISS_ADDRESS_CAP = 50;
const setupMissKey = (email) => `intake-setup-miss:${email}`;
const setupMissIpKey = (email, ip) => `${setupMissKey(email)}:${ip || "unknown"}`;
// LIKE treats % and _ as wildcards (and \ as the escape); an address may hold _.
const likeEscape = (s) => String(s).replace(/[\\%_]/g, (c) => "\\" + c);

/** Remove every setup-miss row for `email` (the address-wide row and each per-IP row). Housekeeping only. */
async function clearSetupMisses(email) {
  try { await db().from("rate_limit_hits").delete().like("key", `${likeEscape(setupMissKey(email))}%`); } catch { /* housekeeping only */ }
}

async function countSetupMisses(key) {
  const since = new Date(Date.now() - SETUP_MISS_WINDOW_MS).toISOString();
  const { count, error } = await db().from("rate_limit_hits")
    .select("*", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", since);
  if (error || count == null) throw error || new Error("no count");
  return count;
}

/**
 * Record one setup-code attempt for `email` from `ip` (already reduced to its
 * rate-limit key, rateLimitIp) and say whether it may be checked. The
 * address-wide ceiling is enforced only when this caller's own per-IP key
 * already holds a miss in the window (read in pass 1); the address-wide row is
 * written either way, so the ceiling still counts every attempt. Two passes, as
 * in sendProofCode (lib/email-proof.js):
 *   1. read only: a caller already at a cap is refused and NOTHING is written,
 *      so a locked caller cannot keep the window open by retrying;
 *   2. insert this attempt's row, then count (its own row included), narrowest
 *      key first, so N parallel guesses make N rows and only the first `cap`
 *      can see a count within the cap; a burst refused per IP writes nothing to
 *      the address-wide key.
 * Each row is counted as a miss unless the code turns out right, when every row
 * for the address is cleared. Reads and writes rate_limit_hits directly and
 * FAILS CLOSED; lib/rate-limit.js fails open, which is the wrong way round here.
 * @returns {Promise<"ok"|"locked"|"error">}
 */
async function setupMissLock(email, ip) {
  try {
    const ipKey = setupMissIpKey(email, ip);
    const ownMisses = await countSetupMisses(ipKey);
    if (ownMisses >= SETUP_CODE_MAX_ATTEMPTS) return "locked";
    const stages = [
      { key: ipKey, cap: SETUP_CODE_MAX_ATTEMPTS, enforce: true },
      // A caller with no misses of its own is never refused by the address-wide ceiling.
      { key: setupMissKey(email), cap: SETUP_MISS_ADDRESS_CAP, enforce: ownMisses > 0 },
    ];
    if (stages[1].enforce && (await countSetupMisses(stages[1].key)) >= stages[1].cap) return "locked";
    for (const st of stages) {
      const { error: insErr } = await db().from("rate_limit_hits").insert({ key: st.key });
      if (insErr) throw insErr;
      if (st.enforce && (await countSetupMisses(st.key)) > st.cap) return "locked";
    }
    return "ok";
  } catch (err) {
    console.error("[intake] setup-code limiter unavailable:", err && err.message);
    return "error";
  }
}

// ── Emailed setup codes ─────────────────────────────────────────────────────
// email_setup_code limits, all checked BEFORE the roster is read so they apply
// to every address alike (the answer never says who is on the roster). Per-IP
// keys use the caller's rate-limit key (an IPv6 caller's whole /64).
//   intake-email-code:<email>:<ip>   2 / 15 min and 5 / day
//   intake-email-code-ip:<ip>        5 / 15 min and 20 / day
//   intake-email-code:<email>        12 / day from all IPs, written and enforced
//                                    only for a caller whose own IP already asked
//                                    for this address today. A caller's first
//                                    request per IP never uses it, so a stranger
//                                    IP adds at most 4 rows a day (5 per address
//                                    and IP, the first one free): two strangers
//                                    at their full allowance write 8, and the
//                                    pastor still gets all 5 of their own
//   intake-email-code-all            100 / hour, everyone together
const EMAIL_CODE_PER_EMAIL_IP_15M = 2;
const EMAIL_CODE_PER_EMAIL_IP_DAY = 5;
const EMAIL_CODE_PER_IP_15M = 5;
const EMAIL_CODE_PER_IP_DAY = 20;
const EMAIL_CODE_PER_EMAIL_DAY = 12;
const EMAIL_CODE_GLOBAL_HOUR = 100;
const MIN_MS = 60 * 1000;
const HOUR_MS = 60 * MIN_MS;
const DAY_MS = 24 * HOUR_MS;

async function countRowsSince(key, windowMs) {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await db().from("rate_limit_hits")
    .select("*", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", since);
  if (error || count == null) throw error || new Error("no count");
  return count;
}

/**
 * Record one email_setup_code request and say whether it may go ahead. The same
 * two passes as setupMissLock and sendProofCode (lib/email-proof.js): pass 1
 * only reads, so a caller already at a cap writes nothing; pass 2 inserts this
 * attempt's row and then counts (its own row included), narrowest key first,
 * so N parallel requests make N rows and at most `cap` of them pass. Reads and
 * writes rate_limit_hits directly and FAILS CLOSED.
 * @returns {Promise<"ok"|"limited"|"error">}
 */
async function emailCodeLimit(email, ip) {
  try {
    const ipKey = ip || "unknown";
    const ownKey = `intake-email-code:${email}:${ipKey}`;
    // The address-wide backstop applies only to a caller that already asked today
    // (read before this attempt writes): only a repeat caller writes its row or
    // is held by it, so a caller's first request per IP never uses the budget.
    const ownToday = await countRowsSince(ownKey, DAY_MS);
    const stages = [
      { key: ownKey, limits: [[15 * MIN_MS, EMAIL_CODE_PER_EMAIL_IP_15M], [DAY_MS, EMAIL_CODE_PER_EMAIL_IP_DAY]] },
      { key: `intake-email-code-ip:${ipKey}`, limits: [[15 * MIN_MS, EMAIL_CODE_PER_IP_15M], [DAY_MS, EMAIL_CODE_PER_IP_DAY]] },
      ...(ownToday > 0 ? [{ key: `intake-email-code:${email}`, limits: [[DAY_MS, EMAIL_CODE_PER_EMAIL_DAY]] }] : []),
      { key: "intake-email-code-all", limits: [[HOUR_MS, EMAIL_CODE_GLOBAL_HOUR]] },
    ];
    for (const st of stages) {
      for (const [windowMs, cap] of st.limits) {
        if ((await countRowsSince(st.key, windowMs)) >= cap) return "limited";
      }
    }
    for (const st of stages) {
      const { error: insErr } = await db().from("rate_limit_hits").insert({ key: st.key });
      if (insErr) throw insErr;
      for (const [windowMs, cap] of st.limits) {
        if ((await countRowsSince(st.key, windowMs)) > cap) return "limited";
      }
    }
  } catch (err) {
    console.error("[intake] email-code limiter unavailable:", err && err.message);
    return "error";
  }
  // Tidy up: rows older than two days are of no use to any of these limits.
  if (Math.random() < 0.05) {
    try {
      await db().from("rate_limit_hits").delete().like("key", "intake-email-code%").lt("created_at", new Date(Date.now() - 2 * DAY_MS).toISOString());
    } catch { /* housekeeping only */ }
  }
  return "ok";
}

const SETUP_REFUSED = "That code did not work. Check it, or email yourself a new one.";

const SESSION_DAYS = 400;

async function sessionStaff(event) {
  const auth = event.headers.authorization || event.headers.Authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  const raw = auth.slice(7).trim();
  if (!raw || raw.length < 32) return null;
  const { data } = await db()
    .from("staff_sessions")
    .select("email, expires_at")
    .eq("token_hash", hashToken(raw))
    .maybeSingle();
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return null;
  const staff = await resolveStaff(data.email);
  // Keep signed in: slide the expiry out, at most once a day. Best effort.
  if (staff && new Date(data.expires_at).getTime() < Date.now() + (SESSION_DAYS - 1) * DAY_MS) {
    try {
      await db().from("staff_sessions").update({ expires_at: new Date(Date.now() + SESSION_DAYS * DAY_MS).toISOString() }).eq("token_hash", hashToken(raw));
    } catch { /* sliding is best effort */ }
  }
  return staff;
}

/** The raw bearer token this request carries ("" when none). */
function bearerToken(event) {
  const auth = event.headers.authorization || event.headers.Authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

/**
 * Is this request's own staff session still there? Read AFTER a write that the
 * session authorised: a forgot-password reset ends every session for the
 * address, so a session that has gone mid-request means a reset (or a sign-out)
 * landed in between and the write must be undone. true / false, or null when
 * the read itself failed (callers treat that as gone: fail closed).
 */
async function ownSessionAlive(event) {
  const raw = bearerToken(event);
  if (!raw) return false;
  const { data, error } = await db().from("staff_sessions").select("token_hash").eq("token_hash", hashToken(raw)).maybeSingle();
  if (error) return null;
  return !!data;
}

async function issueSession(email) {
  const raw = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * DAY_MS).toISOString();
  await db().from("staff_sessions").insert({
    token_hash: hashToken(raw),
    email,
    expires_at: expires
  });
  // Opportunistic cleanup
  if (Math.random() < 0.1) {
    await db().from("staff_sessions").delete().lt("expires_at", new Date().toISOString());
  }
  return raw;
}

/**
 * The current message for ONE congregation (one per congregation, by index) —
 * current TODAY: the flag AND inside its week (lib/sermon-window.js). Past its
 * Sunday-morning turnover the row stays in the table and the archive but is no
 * longer "this week's message" here either, so the media form cannot attach a
 * video to an expired message and quietly bring it back.
 */
async function getCurrentPublished(congregation) {
  const { data } = await db()
    .from("published_sermons")
    .select("id, sermon, is_current, congregation, published_at")
    .eq("is_current", true)
    .eq("congregation", normalizeCongregation(congregation))
    .maybeSingle();
  if (!data) return null;
  return isCurrentAt(data, new Date()) ? data : null;
}

const MEDIA_FORM_OFF = "A link on its own needs the media form\u2019s message and YouTube questions. Ask an admin to switch them back on in History, Ask this again.";

/** A refusal the staff screens map to their own words (B09-10 rounds 6 to 9). */
function targetRefusal(code, message) {
  const err = new Error(message);
  err.status = 400;
  err.code = code;
  return err;
}

async function findPublished(target, congregation) {
  const t = String(target || "").trim();
  if (!t || t === "__current__") return getCurrentPublished(congregation);
  const byId = await db().from("published_sermons").select("id, sermon, is_current, congregation").eq("id", t).maybeSingle();
  if (byId.data) {
    // A message picked for one church is never saved onto another church's
    // page (B09-10 flow review round 6): the form sends the congregation it
    // shows, and a row from a different one is refused, not merged.
    const rowCong = normalizeCongregation(byId.data.congregation);
    if (rowCong !== normalizeCongregation(congregation)) {
      throw targetRefusal("other_congregation", `That message is on the ${congregationName(rowCong)} page. Pick a ${congregationName(normalizeCongregation(congregation))} message.`);
    }
    return byId.data;
  }
  const { data: rows } = await db()
    .from("published_sermons")
    .select("id, sermon, is_current, congregation")
    .eq("congregation", normalizeCongregation(congregation))
    .order("published_at", { ascending: false })
    .limit(40);
  const needle = t.toLowerCase();
  return (rows || []).find((r) => {
    const s = r.sermon || {};
    return String(s.title || "").toLowerCase() === needle || String(s.id || "").toLowerCase() === needle;
  }) || null;
}

async function listSermonChoices() {
  const { data: published } = await db()
    .from("published_sermons")
    .select("id, sermon, is_current, published_at, congregation")
    .order("published_at", { ascending: false })
    .limit(60);
  const out = [];
  // "current" = the flag AND inside its week (weekly turnover, lib/sermon-window.js),
  // so the staff form agrees with what the congregation sees.
  const now = new Date();
  if ((published || []).some((r) => isCurrentAt(r, now))) {
    out.push({ id: "__current__", title: "This week's published message", source: "current" });
  }
  for (const r of published || []) {
    const s = r.sermon || {};
    out.push({
      id: r.id,
      title: s.title || r.id,
      date: s.date || "",
      speaker: s.speaker || "",
      current: isCurrentAt(r, now),
      congregation: r.congregation || DEFAULT_CONGREGATION,
      congregationName: congregationName(r.congregation || DEFAULT_CONGREGATION),
      source: "published"
    });
  }
  return out;
}

function stripPublishFlags(sermon) {
  if (!sermon || typeof sermon !== "object") return sermon;
  const next = { ...sermon };
  delete next.youtubeOnly;
  return next;
}

async function buildFormattedFromPlan(plan, { useAI, congregation }) {
  const patch = plan.sermonPatch || {};
  if (patch.youtubeInvalid) {
    const err = new Error("Paste a YouTube watch, youtu.be, shorts, or embed link.");
    err.status = 400;
    throw err;
  }
  const row = await findPublished(patch.target, congregation);
  // A link saved onto a message the person picked goes on that message or
  // nowhere: if it was removed meanwhile, the save is refused and they pick
  // again, never moved onto whatever message is current (B09-10 round 8).
  const explicitTarget = String(patch.target || "").trim();
  if (plan.youtubeOnly && explicitTarget && !row) {
    throw targetRefusal("target_gone", "That message is no longer on the list. Pick the message again.");
  }
  const current = row && row.sermon ? { ...row.sermon, id: row.sermon.id || row.id } : null;
  // A new title is a new message (B09-10, 3 Oct 2026): it never inherits the
  // current message's notes, details or id. Without this a hub save of next
  // Sunday's title with no notes yet published LAST week's notes under it.
  const newTitle = String(patch.title || "").trim().toLowerCase();
  const sameMessage = !!current && (!newTitle || newTitle === String(current.title || "").trim().toLowerCase());
  const base = sameMessage ? current : null;
  const youtubeUrl = youtubeWatchUrl(patch.youtubeUrl) || (base && base.youtubeUrl) || "";

  if (plan.youtubeOnly && base) {
    return { sermon: mergeYoutube(base, youtubeUrl), source: "merge" };
  }
  if (plan.youtubeOnly && !base && youtubeUrl) {
    return { sermon: mergeYoutube({ id: "current", title: "This week's message" }, youtubeUrl), source: "merge" };
  }

  const outline = answersToOutline(patch) || patch.outline || patch.body || "";
  const notesContent = hasNotesContent(patch);
  const fromNotes = extractKeyVerseFromNotes(outline);
  const fields = {
    title: patch.title || (base && base.title) || "",
    speaker: patch.speaker || (base && base.speaker) || "",
    date: patch.date || (base && base.date) || "",
    series: patch.series || (base && base.series) || "",
    keyVerse: patch.keyVerse || (notesContent ? fromNotes.keyVerse : (base && base.keyVerse)) || "",
    keyVerseText: patch.keyVerseText || (notesContent ? fromNotes.keyVerseText : (base && base.keyVerseText)) || "",
    outline,
    bigIdea: patch.bigIdea || "",
    point1Heading: patch.point1Heading || "",
    point1Body: patch.point1Body || "",
    point2Heading: patch.point2Heading || "",
    point2Body: patch.point2Body || "",
    point3Heading: patch.point3Heading || "",
    point3Body: patch.point3Body || "",
    weeklyAction: patch.weeklyAction || "",
    youtubeUrl,
    responsePrompts: base && base.responsePrompts,
    commitments: base && base.commitments,
    sections: !hasNotesContent(patch) && base ? base.sections : undefined
  };

  const shouldAI = useAI === true && hasNotesContent(patch);
  if (!hasNotesContent(patch) && !fields.title && youtubeUrl && base) {
    return { sermon: mergeYoutube(base, youtubeUrl), source: "merge" };
  }
  if (!hasNotesContent(patch) && !fields.title && !youtubeUrl) return { sermon: null, source: "none" };

  const formatted = await formatSermon(fields, { useAI: shouldAI, base });
  if (youtubeUrl) formatted.sermon.youtubeUrl = youtubeUrl;
  // The same message with only its link or details changed keeps its row.
  if (base && base.id && !hasNotesContent(patch)) formatted.sermon.id = base.id;
  if (plan.youtubeOnly) formatted.sermon.youtubeOnly = true;
  if (plan.notesPolish && base) formatted.sermon.id = base.id;
  return formatted;
}

async function publishApproved(submission, staff) {
  const { data: questions } = await db().from("intake_questions").select("*").eq("enabled", true);
  const plan = applyAnswers(questions || [], submission.answers || {}, { name: staff.name || submission.email });
  const campusId = submission.campus_id;
  const congregation = normalizeCongregation(submission.congregation);
  const result = { cornerAdded: 0, cornerRemoved: 0, sermon: null, congregation };

  if (plan.cornerAdds.length) {
    if (!campusId) throw new Error("Campus required to publish campus corner items");
    const rows = plan.cornerAdds.map((it) => ({
      campus: campusId,
      type: it.type,
      title: it.title,
      content: it.content,
      author: it.author || staff.name || ""
    }));
    const { error } = await db().from("campus_content").insert(rows);
    if (error) throw error;
    result.cornerAdded = rows.length;
  }

  if (plan.cornerRemoves.length) {
    if (!campusId) throw new Error("Campus required to remove campus corner items");
    for (const id of plan.cornerRemoves) {
      const { error } = await db().from("campus_content").delete().eq("id", id).eq("campus", campusId);
      if (error) throw error;
      result.cornerRemoved += 1;
    }
  }

  let sermon = submission.formatted_sermon;
  if (!sermon || typeof sermon !== "object") {
    const built = await buildFormattedFromPlan(plan, { useAI: false, congregation });
    sermon = built.sermon;
  }
  if (sermon && sermon.id) {
    const youtubeOnly = !!sermon.youtubeOnly;
    sermon = stripPublishFlags(sermon);
    if (youtubeOnly) {
      // Only the "This week's message" placeholder falls back to the current
      // message; a named message removed while the save was working is
      // refused, never swapped for another (B09-10 round 9).
      const row = sermon.id === "current"
        ? await getCurrentPublished(congregation)
        : await findPublished(sermon.id, congregation);
      if (!row && sermon.id !== "current") throw targetRefusal("target_gone", "That message is no longer on the list. Pick the message again.");
      if (!row) throw new Error("No published sermon to attach this video to");
      const merged = stripPublishFlags({ ...(row.sermon || {}), youtubeUrl: sermon.youtubeUrl || (row.sermon && row.sermon.youtubeUrl) || "" });
      // Attaching the video is not a re-publish: published_at stays, so the
      // weekly turnover (lib/sermon-window.js) is not pushed out a week by the
      // Monday media form (review, 3 Sep 2026).
      const { error } = await db().from("published_sermons").update({
        sermon: merged,
        submission_id: submission.id,
        published_by: staff.email
      }).eq("id", row.id);
      if (error) throw error;
      result.sermon = { id: row.id, title: merged.title, youtubeUrl: merged.youtubeUrl || "" };
    } else {
      // One row per congregation: the same slug-date for Australia or Futuros
      // gets its suffix so it never collides with (or overwrites) the USA row.
      sermon = { ...sermon, id: congregationSermonId(sermon.id, congregation) };
      const current = await getCurrentPublished(congregation);
      if (!current || current.id !== sermon.id) {
        await db().from("published_sermons").update({ is_current: false }).eq("is_current", true).eq("congregation", congregation);
      }
      const { error } = await db().from("published_sermons").upsert({
        id: sermon.id,
        sermon,
        congregation,
        is_current: true,
        submission_id: submission.id,
        published_at: new Date().toISOString(),
        published_by: staff.email
      }, { onConflict: "id" });
      if (error) throw error;
      result.sermon = { id: sermon.id, title: sermon.title, youtubeUrl: sermon.youtubeUrl || "" };
    }
  }

  return result;
}

function normalizeQuestion(input) {
  const type = QUESTION_TYPES.includes(input.type) ? input.type : "text";
  const audience = AUDIENCES.includes(input.audience) ? input.audience : "all";
  const config = input.config && typeof input.config === "object" ? input.config : {};
  return {
    label: sanitize(input.label || "", 200),
    help: sanitize(input.help || "", 500),
    type,
    audience,
    required: !!input.required,
    enabled: input.enabled !== false,
    sort_order: Number.isFinite(input.sort_order) ? input.sort_order : 100,
    config
  };
}

// The fixed time every email_setup_code answer takes. Tests set it to 0.
const EMAIL_CODE_ANSWER_FLOOR_MS = Number(process.env.EMAIL_CODE_ANSWER_FLOOR_MS ?? 1500);

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: headersFor(event), body: "" };
  if (event.httpMethod !== "POST") return json(event, 405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch {
    return json(event, 400, { error: "Invalid JSON" });
  }
  const action = body.action;
  const ip = clientIp(event);
  // Per-IP key for the setup-code limits: an IPv6 caller's whole /64.
  const rlIp = rateLimitIp(event);

  try {
    // ── auth_status ── First visit: set your own password. After that: sign in.
    if (action === "auth_status") {
      if (await isSharedRateLimited("intake-auth", ip, 20, 15 * 60 * 1000)) {
        return json(event, 429, { error: "Too many attempts. Try again later." });
      }
      const email = normalizeEmail(body.email);
      if (!isAllowlistedEmail(email)) {
        return json(event, 200, { setup: false });
      }
      const { data } = await db().from("staff_roster").select("email, role, campus_id, display_name, campus_set_by, password_hash, setup_code_hash, setup_code_expires_at").eq("email", email).maybeSingle();
      if (!staffFromRoster(email, data)) return json(event, 200, { setup: false });
      // setup:true only means "show the setup-code box": the person Ashley added
      // has no password yet AND holds a live code that ASHLEY issued. Anyone else
      // sees the plain sign-in, so this answer is not a list of unclaimed
      // accounts. An emailed code never counts: anyone can mail one to any
      // address, so if it did, "email a code, then ask auth_status" would say
      // which addresses are unclaimed roster rows. Emailed codes live in their
      // own columns (email_code_*), which this never reads; setup_code_* holds
      // only Ashley's (the "I have a code" path still takes either kind).
      const left = data.setup_code_expires_at ? new Date(data.setup_code_expires_at).getTime() - Date.now() : 0;
      const ashleysLiveCode = !!data.setup_code_hash && left > 0;
      return json(event, 200, { setup: !data.password_hash && ashleysLiveCode });
    }

    // ── email_setup_code ── "Email me a code": a person on the roster, with or
    // without a password (first time and forgot password are the same flow),
    // gets a fresh one-time code mailed to the roster row's own address. Typing
    // it proves they read that inbox. NO links in the email. Past the limits the
    // answer is always 200 { sent: true }: eligible, not on the roster, or the
    // provider failing alike, so it never says who is staff.
    if (action === "email_setup_code") {
      const email = normalizeEmail(body.email);
      if (!email || email.length > 254 || !/^[^\s@:]+@[^\s@:]+\.[^\s@:]+$/.test(email)) {
        return json(event, 400, { error: "Enter a valid email." });
      }
      const limit = await emailCodeLimit(email, rlIp);
      if (limit === "error") return json(event, 503, { error: "Sign-in is unavailable right now. Try again shortly." });
      if (limit === "limited") return json(event, 429, { error: "Too many attempts. Try again later." });
      // Every { sent: true } waits to the same floor, so a roster address (which
      // also waits for the email and the code write) answers no slower than a stranger.
      const started = Date.now();
      const sent = async () => {
        const wait = EMAIL_CODE_ANSWER_FLOOR_MS - (Date.now() - started);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        return json(event, 200, { sent: true });
      };
      const { data: row, error: rowErr } = await db().from("staff_roster")
        .select("email, role, campus_id, display_name, campus_set_by, password_hash")
        .eq("email", email).maybeSingle();
      if (rowErr) return json(event, 503, { error: "Sign-in is unavailable right now. Try again shortly." });
      const staff = row && staffFromRoster(email, row);
      const code = generateSetupCode();
      if (!staff) {
        hashSetupCode(code); // the same bcrypt cost as issuing a real code
        return sent();
      }
      // Mail first, then store: a provider failure leaves any earlier emailed code
      // as it was. The code goes in the emailed slot, so Ashley's code is never
      // touched. Only the roster row's own address is used.
      const msg = buildStaffCodeMessage(code, body.lang);
      const mailed = await sendWithResend({ to: row.email, ...msg, kind: "staff-setup-code" });
      if (!mailed.ok) {
        hashSetupCode(code);
        console.error("[intake] email_setup_code: the code email was not sent:", mailed.error);
        return sent();
      }
      try {
        await issueSetupCode(row.email, { slot: "email", ttlMs: EMAIL_SETUP_CODE_TTL_MS, clearMisses: false, code });
      } catch (err) {
        console.error("[intake] email_setup_code: could not store the code:", err && err.message);
      }
      return sent();
    }

    // ── set_password ── Only with a live one-time setup code: the one Ashley
    // issued when he added the person, or one they emailed themselves. A row
    // with no password sets its first one. A row WITH a password is a forgotten
    // password: the code resets it, and every old session ends. No code, a
    // wrong, used or expired code, or an unknown address: the same refusal, and
    // nothing is changed. The code is spent in the same statement that stores
    // the password, so two racing claims cannot both win.
    if (action === "set_password") {
      if (await isSharedRateLimited("intake-set-password", rlIp, 10, 15 * 60 * 1000)) {
        return json(event, 429, { error: "Too many attempts. Try again later." });
      }
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const issue = passwordIssue(password, email);
      if (issue) return json(event, 400, { error: issue });
      const refuse = () => json(event, 403, { error: SETUP_REFUSED });
      if (!normalizeSetupCode(body.setupCode) || !email || email.length > 254) return refuse();
      const { data: row } = await db().from("staff_roster")
        .select("email, role, campus_id, display_name, campus_set_by, password_hash, setup_code_hash, setup_code_expires_at, setup_code_attempts, email_code_hash, email_code_expires_at")
        .eq("email", email).maybeSingle();
      const staff = row && staffFromRoster(email, row);
      // Two slots: Ashley's code and an emailed code. Either one works.
      const liveHash = (hash, expires) => (staff && hash && expires && new Date(expires).getTime() > Date.now() ? hash : null);
      const slots = [
        { column: "setup_code_hash", hash: liveHash(row && row.setup_code_hash, row && row.setup_code_expires_at) },
        { column: "email_code_hash", hash: liveHash(row && row.email_code_hash, row && row.email_code_expires_at) },
      ];
      // Wrong guesses lock this caller IP out of this address for a while (and
      // the address as a whole only under a spread-out flood); they never burn
      // the code (a stranger could otherwise destroy a pastor's code with five
      // guesses), and a stranger's lock never refuses the pastor on their own
      // connection. Each attempt writes its OWN row before the code is checked,
      // then counts the rows, so parallel guesses are all counted (a
      // read-then-write counter let them share one count). Fails closed: if the
      // row cannot be written or counted, the attempt is refused. The lock is
      // taken for EVERY address, live code or not: anyone can now email a code
      // to a roster address, so a lock that only ever appeared for addresses
      // holding a code would say which addresses are on the roster.
      const lock = await setupMissLock(email, rlIp);
      if (lock === "error") return json(event, 503, { error: "Sign-in is unavailable right now. Try again shortly." });
      if (lock === "locked") return json(event, 429, { error: "Too many attempts. Try again later." });
      // Always two checks (a dead slot against a dummy hash), so the time taken
      // does not say how many live codes an address holds.
      let matched = null;
      for (const slot of slots) {
        const ok = verifySetupCode(String(body.setupCode), slot.hash || DUMMY_HASH);
        if (ok && slot.hash && !matched) matched = slot;
      }
      if (!matched) return refuse();
      const resetting = !!row.password_hash;
      const endSessions = async () => {
        const { error: endErr } = await db().from("staff_sessions").delete().eq("email", email);
        return !endErr;
      };
      // A forgotten password: end every session BEFORE the change, failing
      // closed (nothing has changed yet if this cannot be done).
      if (resetting && !(await endSessions())) {
        return json(event, 503, { error: "Sign-in is unavailable right now. Try again shortly." });
      }
      let claim = db().from("staff_roster").update({
        password_hash: hashPassword(password),
        setup_code_hash: null,
        setup_code_expires_at: null,
        setup_code_attempts: 0,
        email_code_hash: null,
        email_code_expires_at: null,
        updated_at: new Date().toISOString()
      }).eq("email", email);
      // Using either code spends both. First password: CAS on "no password yet"
      // and the code used. Reset: CAS on the code used.
      claim = resetting ? claim.eq(matched.column, matched.hash) : claim.is("password_hash", null).eq(matched.column, matched.hash);
      const { data: claimed, error } = await claim.select("email");
      if (error) throw error;
      if (!claimed || claimed.length !== 1) return refuse(); // someone else spent it first
      // And again after it, for a sign-in with the old password that landed in between.
      if (resetting && !(await endSessions())) {
        console.error("[intake] set_password: could not end sessions after a reset");
      }
      // The code is spent; its attempt rows are of no further use.
      await clearSetupMisses(email);
      const token = await issueSession(staff.email);
      return json(event, 200, { token, staff: publicStaff(staff, await loadCampusesWithin(db())) });
    }

    // ── login ── Returning staff: email + the password they set.
    if (action === "login") {
      if (await isSharedRateLimited("intake-login", ip, 20, 15 * 60 * 1000)) {
        return json(event, 429, { error: "Too many attempts. Try again later." });
      }
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const staff = await resolveStaff(email);
      const refuse = () => json(event, 403, { error: "Invalid email or password" });
      if (!password) return refuse();
      // Not on the roster: the same reads and bcrypt as a real check, so the time
      // taken never says which addresses are on the roster (any domain may be,
      // since the roster decides who is staff).
      const { data: row } = await db().from("staff_roster").select("password_hash").eq("email", email).maybeSingle();
      if (!staff) {
        verifyPassword(password, DUMMY_HASH);
        return refuse();
      }
      // Same answer, with no "set up" hint, for a person who has no password yet:
      // sign-in must not say which addresses are waiting to be set up.
      if (!row || !row.password_hash) {
        verifyPassword(password, DUMMY_HASH);
        return refuse();
      }
      if (!verifyPassword(password, row.password_hash)) return refuse();
      const token = await issueSession(staff.email);
      // A forgot-password reset may have landed while this sign-in was checking
      // the old password. Read the hash again AFTER the session exists: if it
      // changed (or cannot be read), take the session back. Under read-committed
      // this closes the race: a re-read after the reset's UPDATE sees the new
      // hash; a re-read before it means this session was inserted before the
      // UPDATE, so the reset's second endSessions removes it.
      const { data: again, error: againErr } = await db().from("staff_roster").select("password_hash").eq("email", email).maybeSingle();
      if (againErr || !again || again.password_hash !== row.password_hash) {
        const { error: dropErr } = await db().from("staff_sessions").delete().eq("token_hash", hashToken(token));
        if (dropErr) console.error("[intake] login: could not withdraw a session that raced a password reset");
        return refuse();
      }
      return json(event, 200, { token, staff: publicStaff(staff, await loadCampusesWithin(db())) });
    }

    // Authenticated actions
    const staff = await sessionStaff(event);
    if (!staff) return json(event, 401, { error: "Sign in required" });
    // The one campus list (lib/campuses.js, B09-02): read once per request, and
    // only by the actions that check a campus id.
    let campusListP = null;
    const campusList = () => (campusListP || (campusListP = loadCampuses(db())));

    // ── logout ── Ends this staff session. The device may also send the Daily
    // Word cloud token it holds (`currentToken`): that token's entry is removed
    // from the staff address's own profile (plain, "u:" or "r:"), so signing in
    // again on this device does not mint one more proven token that pushes out
    // the person's phone. Fails soft: sign-out still succeeds if that fails.
    if (action === "logout") {
      const current = typeof body.currentToken === "string" ? body.currentToken.trim() : "";
      if (/^[0-9a-f]{64}$/.test(current)) {
        try { await revokeToken(db(), staff.email, current); } catch (err) {
          console.error("[intake] logout could not revoke the cloud token:", err && err.message);
        }
      }
      const auth = event.headers.authorization || event.headers.Authorization || "";
      const raw = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
      if (raw) await db().from("staff_sessions").delete().eq("token_hash", hashToken(raw));
      return json(event, 200, { ok: true });
    }

    if (action === "me") {
      let pendingCount = 0;
      if (staff.role === "admin") {
        const { count } = await db().from("intake_submissions").select("id", { count: "exact", head: true }).eq("status", "pending");
        pendingCount = count || 0;
      }
      return json(event, 200, { staff: publicStaff(staff, await campusList()), pendingCount });
    }

    // ── sync_token ── A staff password sign-in is already proof of the person, so a
    // pastor who signs in with it gets a PROVEN Daily Word cloud-sync token for
    // their own staff address, with no emailed code. (Daily Word hands a token
    // that only knows an existing address an unproven one and asks for a code;
    // this is what keeps the one-step staff sign-in.) The address comes from the
    // staff session, never from the request. No profile yet means nothing to
    // open: the client's register call creates it and gets a first-device token.
    // The device sends the cloud token it already holds (`currentToken`); if that
    // token belongs to this staff address, a proven token takes its slot (every
    // "r:" still removed) and is handed back, so signing in again on the same
    // device never mints a sixth proven token that pushes out another device. An
    // unproven ("u:") or first-device ("r:") token is ROTATED, not promoted: a
    // copy someone planted on the device must not become a proven token.
    if (action === "sync_token") {
      if (await isSharedRateLimited("intake-sync-token", ip, 10, 15 * 60 * 1000)) {
        return json(event, 429, { error: "Too many attempts. Try again later." });
      }
      const { data: profile } = await db().from("profiles").select("email").eq("email", staff.email).maybeSingle();
      if (!profile) return json(event, 200, { token: null });
      try {
        const current = typeof body.currentToken === "string" ? body.currentToken.trim() : "";
        const claimed = /^[0-9a-f]{64}$/.test(current) ? await claimProvenToken(db(), staff.email, current) : null;
        const token = claimed || await issueToken(db(), staff.email, { proven: true });
        // The staff session was checked at the top of the request. A forgot-
        // password reset may have ended it since (the owner taking the account
        // back from a stolen session): read it again AFTER minting, and if it is
        // gone, take back the proven token just minted. A token the device
        // already held unchanged (claimed === current) was not minted here.
        if ((await ownSessionAlive(event)) !== true) {
          if (token !== current) {
            try { await revokeToken(db(), staff.email, token); } catch (err) {
              console.error("[intake] sync_token: could not withdraw a token minted from an ended session:", err && err.message);
            }
          }
          return json(event, 200, { token: null });
        }
        return json(event, 200, { token });
      } catch {
        return json(event, 200, { token: null });
      }
    }

    // ── change_password ── Self-service: prove the current password, choose a new
    // one. Every OTHER session for this email is revoked (a token taken from a
    // lost device dies with the old password); the session making the change is
    // kept, so the app / portal doing it stays signed in.
    if (action === "change_password") {
      if (await isSharedRateLimited("change_password", ip, 5)) {
        return json(event, 429, { error: "Too many attempts. Try again later." });
      }
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "");
      const { data: row } = await db().from("staff_roster").select("password_hash").eq("email", staff.email).maybeSingle();
      if (!row || !row.password_hash) return json(event, 400, { error: "No password set yet." });
      if (!verifyPassword(currentPassword, row.password_hash)) {
        return json(event, 403, { error: "Current password is incorrect." });
      }
      const issue = passwordIssue(newPassword, staff.email);
      if (issue) return json(event, 400, { error: issue });
      if (newPassword === currentPassword) {
        return json(event, 400, { error: "Choose a different password from the current one." });
      }
      const refuse = () => json(event, 403, { error: "Current password is incorrect." });
      // CAS on the hash just checked: a forgot-password reset that landed after
      // the read (the owner taking the account back from a stolen session) has
      // changed it, so this write matches nothing and nothing is revoked.
      const newHash = hashPassword(newPassword);
      const { data: changed, error } = await db().from("staff_roster").update({
        password_hash: newHash,
        updated_at: new Date().toISOString()
      }).eq("email", staff.email).eq("password_hash", row.password_hash).select("email");
      if (error) throw error;
      if (!changed || changed.length !== 1) return refuse();
      // The reset may instead have ended this session just before the write.
      // Read this address's sessions AFTER the write: if this request's own is
      // gone, put the old hash back (CAS on the new one, so a reset's hash that
      // has landed since is never overwritten) and refuse. The same read is the
      // list of sessions to revoke, so a session issued after it (the owner's
      // own reset session) is never swept away by this change.
      const raw = bearerToken(event);
      const own = raw ? hashToken(raw) : "";
      const { data: sessions, error: sessErr } = await db().from("staff_sessions").select("token_hash").eq("email", staff.email);
      if (sessErr || !own || !(sessions || []).some((x) => x.token_hash === own)) {
        const { error: undoErr } = await db().from("staff_roster").update({
          password_hash: row.password_hash,
          updated_at: new Date().toISOString()
        }).eq("email", staff.email).eq("password_hash", newHash);
        if (undoErr) console.error("intake change_password: could not undo a change from an ended session", undoErr);
        if (sessErr) return json(event, 503, { error: "Sign-in is unavailable right now. Try again shortly." });
        return refuse();
      }
      // Keep this request's session, drop every other one that existed at the change.
      const others = sessions.map((x) => x.token_hash).filter((h) => h !== own);
      if (others.length) {
        const { error: revokeErr } = await db().from("staff_sessions").delete().eq("email", staff.email).in("token_hash", others);
        // The password is already changed at this point — report, don't fail the call.
        if (revokeErr) console.error("intake change_password: revoking other sessions failed", revokeErr);
      }
      return json(event, 200, { ok: true });
    }

    if (action === "form") {
      const { data: questions, error } = await db()
        .from("intake_questions")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const job = body.job === "hub" || body.job === "media" || body.job === "campus" ? body.job : null;
      const visible = (questions || []).filter((q) => questionVisibleForJob(q, staff.role, job));
      let cornerItems = [];
      const campusId = staff.role === "campus" ? staff.campusId : null;
      if (campusId) {
        const { data: items } = await db()
          .from("campus_content")
          .select("id, type, title, created_at")
          .eq("campus", campusId)
          .order("created_at", { ascending: false })
          .limit(40);
        cornerItems = items || [];
      } else if (staff.role === "admin" && isCampusId(body.campusId, await campusList())) {
        const { data: items } = await db()
          .from("campus_content")
          .select("id, type, title, created_at")
          .eq("campus", body.campusId)
          .order("created_at", { ascending: false })
          .limit(40);
        cornerItems = items || [];
      }
      const { data: mine } = await db()
        .from("intake_submissions")
        .select("id, status, campus_id, created_at, reviewed_at")
        .eq("email", staff.email)
        .order("created_at", { ascending: false })
        .limit(10);
      const sermons = (staff.role === "media" || staff.role === "hub" || staff.role === "admin")
        ? await listSermonChoices()
        : [];
      return json(event, 200, {
        staff: publicStaff(staff, await campusList()),
        questions: visible,
        // The questions this person may reword in place (B09-03): worked out
        // here so the form never offers an edit the server would refuse.
        rewordable: visible.filter((q) => canRewordQuestion(staff.role, q)).map((q) => q.id),
        cornerItems,
        submissions: mine || [],
        sermons
      });
    }

    if (action === "submit") {
      const { data: questions, error } = await db()
        .from("intake_questions")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const job = body.job === "hub" || body.job === "media" || body.job === "campus" ? body.job : null;
      const visible = (questions || []).filter((q) => questionVisibleForJob(q, staff.role, job));
      const answersIn = body.answers && typeof body.answers === "object" ? body.answers : {};
      const answers = {};
      const viewAs = job || staff.role;
      for (const q of visible) {
        if (answersIn[q.id] !== undefined) answers[q.id] = answersIn[q.id];
        if (q.required && (q.audience === viewAs || q.audience === "all")) {
          const v = answers[q.id];
          const empty = v == null || v === "" || (Array.isArray(v) && !v.length);
          if (empty && q.type !== "corner_remove" && q.type !== "yes_no") {
            console.log("[intake] submit refused", JSON.stringify({ email: staff.email, job, reason: "missing", field: q.label }));
            return json(event, 400, { error: `Missing: ${q.label}` });
          }
        }
      }
      const campuses = await campusList();
      const requested = collectCampusFromAnswers(visible, answers, campuses) || body.campusId;
      let campusId = lockCampus(staff, requested, campuses);
      if (staff.role === "campus") {
        if (!campusId) {
          console.log("[intake] submit refused", JSON.stringify({ email: staff.email, job, reason: "no campus" }));
          return json(event, 400, { error: "Choose your campus" });
        }
        if (staff.campusId && campusId !== staff.campusId) {
          console.log("[intake] submit refused", JSON.stringify({ email: staff.email, job, reason: "other campus", campusId }));
          return json(event, 403, { error: "You can only update your own campus" });
        }
        if (!staff.campusId) {
          // Self-assigned: the pastor picked it, Ashley has not confirmed it. A
          // 'self' campus mints NO campus code (pastor-admin my-campus-code)
          // until roster_save writes it as 'admin'. Needs migration
          // 20260902_staff_campus_set_by applied first (column).
          await db().from("staff_roster").update({
            campus_id: campusId,
            campus_set_by: "self",
            updated_at: new Date().toISOString()
          }).eq("email", staff.email);
          staff.campusId = campusId;
          staff.campusSetBy = "self";
        }
      }
      const plan = applyAnswers(visible, answers, { name: staff.name || staff.email });
      if (job === "media") {
        // The media form adds a video (or notes) to the message it names. If
        // its message or link question was switched off since the screen was
        // drawn, nothing is written: the video would land on whatever message
        // is current, or the message would be re-put up with nothing added
        // (B09-10 round 11).
        const patch = plan.sermonPatch || {};
        const addsNothing = !patch.youtubeUrl && !hasNotesContent(patch) && !patch.title;
        if ((plan.youtubeOnly && !mediaPickQuestion(visible)) || addsNothing) {
          console.log("[intake] submit refused", JSON.stringify({ email: staff.email, job, reason: "media_form_off" }));
          return json(event, 400, { error: MEDIA_FORM_OFF, code: "media_form_off" });
        }
      }
      const congregation = normalizeCongregation(body.congregation);
      let formatted_sermon = null;
      let format_source = null;
      try {
        const wantAI = plan.sermonPatch && plan.sermonPatch.reformat === true && hasNotesContent(plan.sermonPatch);
        if (wantAI && body.formatted_sermon && typeof body.formatted_sermon === "object") {
          const row = await findPublished(plan.sermonPatch.target, congregation);
          const base = row && row.sermon ? { ...row.sermon, id: row.sermon.id || row.id } : null;
          // The preview was made from the notes; the pastor may have fixed the
          // title, date, speaker, series or YouTube link since. The form's
          // answers win over what the preview carried, so an edit after
          // "Make another" never publishes stale metadata.
          const patch = plan.sermonPatch;
          const fromForm = {
            ...body.formatted_sermon,
            ...(patch.title ? { title: patch.title } : {}),
            ...(patch.speaker ? { speaker: patch.speaker } : {}),
            ...(patch.date ? { date: patch.date } : {}),
            ...(patch.series ? { series: patch.series } : {}),
            ...(patch.youtubeUrl ? { youtubeUrl: patch.youtubeUrl } : {})
          };
          formatted_sermon = sanitizeAiSermon(fromForm, {
            title: plan.sermonPatch.title || "",
            speaker: plan.sermonPatch.speaker || "",
            date: plan.sermonPatch.date || "",
            series: plan.sermonPatch.series || "",
            youtubeUrl: plan.sermonPatch.youtubeUrl || "",
            outline: plan.sermonPatch.outline || ""
          }, base);
          if (formatted_sermon) format_source = "preview";
        }
        if (!formatted_sermon) {
          const built = await buildFormattedFromPlan(plan, { useAI: wantAI, congregation });
          formatted_sermon = built.sermon;
          format_source = built.source;
        }
      } catch (fmtErr) {
        if (fmtErr && fmtErr.status === 400) {
          console.log("[intake] submit refused", JSON.stringify({ email: staff.email, job, reason: fmtErr.message }));
          return json(event, 400, { error: fmtErr.message, ...(fmtErr.code ? { code: fmtErr.code } : {}) });
        }
        throw fmtErr;
      }
      console.log("[intake] submit accepted", JSON.stringify({
        email: staff.email, job, campusId, congregation, format_source,
        sermon: formatted_sermon ? { id: formatted_sermon.id, title: formatted_sermon.title, sections: (formatted_sermon.sections || []).length } : null,
        cornerAdds: plan.cornerAdds.length, cornerRemoves: plan.cornerRemoves.length
      }));
      const { data: row, error: insErr } = await db().from("intake_submissions").insert({
        email: staff.email,
        role: staff.role,
        campus_id: campusId,
        congregation,
        answers,
        formatted_sermon,
        status: "pending"
      }).select("id, status, created_at, formatted_sermon").single();
      if (insErr) throw insErr;
      if (!campusConfirmed(staff)) {
        // A campus pastor whose campus Ashley has not confirmed: keep it pending
        // in Review until he confirms the campus (People) or puts it live.
        console.log("[intake] submit held", JSON.stringify({ email: staff.email, campusId, reason: "campus_not_confirmed" }));
        return json(event, 200, {
          ok: true, submission: row, preview: formatted_sermon, format_source,
          published: false, pending: true, reason: "campus_not_confirmed"
        });
      }
      let publish_result;
      try {
        publish_result = await publishApproved({ ...row, answers, formatted_sermon, campus_id: campusId, congregation, email: staff.email, role: staff.role }, staff);
      } catch (pubErr) {
        await db().from("intake_submissions").delete().eq("id", row.id);
        throw pubErr;
      }
      const { data: updated, error: upErr } = await db().from("intake_submissions").update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: staff.email,
        publish_result
      }).eq("id", row.id).select("id, status, created_at, formatted_sermon").single();
      if (upErr) throw upErr;
      console.log("[intake] submit published", JSON.stringify({ email: staff.email, job, submission: row.id, publish_result }));
      return json(event, 200, { ok: true, submission: updated, preview: formatted_sermon, format_source, published: true, publish_result });
    }

    if (action === "format_preview") {
      const { data: questions, error } = await db()
        .from("intake_questions")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const job = body.job === "hub" || body.job === "media" || body.job === "campus" ? body.job : null;
      const visible = (questions || []).filter((q) => questionVisibleForJob(q, staff.role, job));
      const answersIn = body.answers && typeof body.answers === "object" ? body.answers : {};
      const answers = {};
      for (const q of visible) {
        if (answersIn[q.id] !== undefined) answers[q.id] = answersIn[q.id];
      }
      const plan = applyAnswers(visible, answers, { name: staff.name || staff.email });
      try {
        const useAI = body.useAI === true;
        const congregation = normalizeCongregation(body.congregation);
        const built = await buildFormattedFromPlan(plan, { useAI, congregation });
        console.log("[intake] format_preview", JSON.stringify({ email: staff.email, job, congregation, useAI, source: built.source, id: built.sermon && built.sermon.id }));
        return json(event, 200, { preview: built.sermon, source: built.source });
      } catch (fmtErr) {
        if (fmtErr && fmtErr.status === 400) {
          console.log("[intake] format_preview refused", JSON.stringify({ email: staff.email, job, reason: fmtErr.message }));
          return json(event, 400, { error: fmtErr.message, ...(fmtErr.code ? { code: fmtErr.code } : {}) });
        }
        throw fmtErr;
      }
    }

    // ── The campus corner draft (B09-18) ── This week's draft for a campus,
    // written by corner-draft.js on Monday morning (lib/corner-draft.js).
    //   corner_draft_get      campus pastor: own confirmed campus; admin: the
    //                         campus named, or the list of waiting drafts
    //   corner_draft_refresh  a fresh draft from the pastor's answers (5 a week)
    //   corner_draft_publish  the pastor's tap: ONE campus_content row
    //   corner_draft_skip     "Not this week"
    // Another campus is a 403 for a campus pastor (before anything is read).
    // While dw_corner_draft is off no one sees a draft; in shadow only the
    // shadow list does. The three writes refuse a deploy preview's origin:
    // previews carry production keys, so a tap there would publish for real.
    if (action === "corner_draft_get" || action === "corner_draft_refresh" || action === "corner_draft_publish" || action === "corner_draft_skip") {
      const campuses = await campusList();
      const scope = corner.cornerScope(staff, body.campusId, campuses);
      if (scope.status) {
        console.log("[intake] corner_draft refused", JSON.stringify({ email: staff.email, action, reason: scope.code }));
        return json(event, scope.status, { error: scope.error, code: scope.code });
      }
      const fromPreview = isDailyWordPreviewOrigin(parseRequestOrigin(event.headers.origin || event.headers.Origin || event.headers.referer || event.headers.Referer || ""));
      if (action !== "corner_draft_get" && (fromPreview || corner.isNonProductionDeploy())) {
        console.log("[intake] corner_draft refused", JSON.stringify({ email: staff.email, action, reason: "preview" }));
        return json(event, 403, { error: "Put the corner up from futuresdailyword.com, not from a preview.", code: "preview" });
      }
      const now = new Date();
      const { visible, openCampus } = await corner.draftsVisibleTo(db(), staff.email, { campus: scope.campus, now });
      if (!scope.campus) {
        // An admin with no campus named: this week's waiting drafts (live: in
        // the nations Ashley has switched on). A write must name the campus.
        if (action !== "corner_draft_get") return json(event, 400, { error: "Choose a campus.", code: "campus" });
        const drafts = visible ? await corner.listWaitingDrafts(db(), campuses, now) : [];
        const byId = new Map(campuses.map((c) => [c.id, c]));
        return json(event, 200, { drafts: drafts.filter((d) => openCampus(byId.get(d.campusId))) });
      }
      const row = visible ? await corner.loadDraftFor(db(), scope.campus, now) : null;
      if (action === "corner_draft_get") {
        return json(event, 200, {
          campusId: scope.campus.id,
          campusName: scope.campus.name,
          draft: row ? corner.publicDraft(row, scope.campus) : null
        });
      }
      if (!row) return json(event, 404, { error: "There is no draft for this week.", code: "no_draft" });
      // Every write names the copy it was made from, so an older copy on
      // another device can never overwrite a newer one.
      if (typeof body.version !== "string" || !body.version) {
        return json(event, 409, { error: "This draft changed on another device. Check the note, then try again.", code: "stale" });
      }
      if (row.status !== "draft") return json(event, 409, { error: "This week\u2019s draft is already done.", code: "not_draft" });
      let out;
      if (action === "corner_draft_refresh") {
        out = await corner.refreshDraft(db(), row, scope.campus, {
          extra: typeof body.extra === "string" ? body.extra : undefined,
          prayerPoint: typeof body.prayerPoint === "string" ? body.prayerPoint : undefined
        }, { now, version: body.version });
        if (out.row) return json(event, 200, { draft: corner.publicDraft(out.row, scope.campus) });
      } else if (action === "corner_draft_publish") {
        out = await corner.publishDraft(db(), row, scope.campus, {
          body: typeof body.body === "string" ? body.body : undefined,
          prayerPoint: typeof body.prayerPoint === "string" ? body.prayerPoint : undefined,
          author: staff.name || "",
          now,
          version: body.version
        });
        if (out.item) {
          console.log("[intake] corner_draft published", JSON.stringify({ email: staff.email, campus: scope.campus.id, week: row.week_of }));
          return json(event, 200, { published: true, campusId: scope.campus.id, campusName: scope.campus.name, item: out.item });
        }
      } else {
        out = await corner.skipDraft(db(), row, { now, version: body.version });
        if (out.ok) return json(event, 200, { skipped: true, campusId: scope.campus.id });
      }
      const refusals = {
        refresh_cap: [429, "You have asked for a fresh draft five times this week. Change the words yourself, then put it on the corner."],
        not_draft: [409, "This week\u2019s draft is already done."],
        stale: [409, "This draft changed on another device. Check the note, then try again."],
        empty: [400, "Write something first, then put it on the corner."],
        unfinished: [400, "Part of the draft was left unfinished. Fill in or remove the part in braces."],
        save_failed: [500, "That did not save. Try again."]
      };
      const [status, error] = refusals[out.error] || refusals.save_failed;
      console.log("[intake] corner_draft refused", JSON.stringify({ email: staff.email, action, reason: out.error }));
      return json(event, status, { error, code: out.error || "save_failed" });
    }

    // ── home ── What Staff home opens on (readiness 7 Oct 2026): whether this
    // Sunday's notes are up for the person's church (hub, media and admin only,
    // the same people notes_quick_status serves) and the job they usually do,
    // learned from their OWN submissions. Reads only; nothing is written.
    if (action === "home") {
      let notes = null;
      // The church whose clock and Sunday count: the one asked for (hub, media,
      // admin only), else the person's campus's, else Futures USA.
      const ownCongregation = (staff.campusId && campusCongregation(staff.campusId, await campusList())) || DEFAULT_CONGREGATION;
      if (["admin", "hub", "media"].includes(staff.role)) {
        const congregation = isCongregationId(body.congregation) ? body.congregation : ownCongregation;
        const { data: currentRow, error: curErr } = await db()
          .from("published_sermons")
          .select("id, sermon, is_current, congregation, published_at")
          .eq("is_current", true)
          .eq("congregation", congregation)
          .maybeSingle();
        if (curErr) throw curErr;
        const sunday = nextSundayFor(congregation, new Date());
        notes = {
          congregation,
          congregationName: congregationName(congregation),
          sunday,
          up: isForSunday(currentRow, sunday, congregation)
        };
      }
      const since = new Date(Date.now() - 56 * 86400000).toISOString();
      const [subs, qs] = await Promise.all([
        db().from("intake_submissions").select("role, answers, created_at")
          .eq("email", staff.email).gte("created_at", since)
          .order("created_at", { ascending: false }).limit(40),
        db().from("intake_questions").select("id, audience")
      ]);
      if (subs.error) throw subs.error;
      if (qs.error) throw qs.error;
      // "This weekday" on the person's own church clock, not UTC.
      const zone = congregationTimeZone(notes ? notes.congregation : ownCongregation);
      const usualJob = usualJobFrom(subs.data, qs.data, new Date(), jobsForRole(staff.role), zone);
      return json(event, 200, { notes, usualJob });
    }

    // ── Sunday's notes, pasted once (B09-10) ──
    // Hub, media and admin staff only: the same people who may publish Sermon
    // Notes through `submit`. Neither action publishes anything.
    if (action === "notes_quick_status" || action === "notes_quick") {
      if (!["admin", "hub", "media"].includes(staff.role)) {
        console.log("[intake] notes_quick refused", JSON.stringify({ email: staff.email, role: staff.role, action }));
        return json(event, 403, { error: "Only hub, media or admin staff can put up Sunday's notes.", code: "role" });
      }
      // The church: the one asked for, else the staff member's own campus's, else Futures USA.
      const congregation = isCongregationId(body.congregation)
        ? body.congregation
        : (staff.campusId && campusCongregation(staff.campusId, await campusList())) || DEFAULT_CONGREGATION;
      const { data: currentRow, error: curErr } = await db()
        .from("published_sermons")
        .select("id, sermon, is_current, congregation, published_at")
        .eq("is_current", true)
        .eq("congregation", congregation)
        .maybeSingle();
      if (curErr) throw curErr;
      const now = new Date();
      const sunday = nextSundayFor(congregation, now);
      if (action === "notes_quick_status") {
        const s = currentRow && currentRow.sermon ? currentRow.sermon : null;
        return json(event, 200, {
          congregation,
          congregationName: congregationName(congregation),
          sunday,
          up: isForSunday(currentRow, sunday, congregation),
          current: s ? { title: String(s.title || ""), date: String(s.date || "") } : null
        });
      }
      const text = typeof body.text === "string" ? body.text : "";
      if (text.length > 20000) {
        return json(event, 400, { error: "That is longer than Sunday's notes can be. Paste the outline only.", code: "too_long" });
      }
      const { data: questions, error: qErr } = await db()
        .from("intake_questions")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (qErr) throw qErr;
      const out = await quickNotes({
        questions: hubQuestions(questions, staff.role),
        text,
        congregation,
        now,
        overrides: body.details,
        preview: body.preview,
        current: currentRow,
        mediaQuestions: mediaQuestions(questions, staff.role),
        format: formatSermon
      });
      if (out.error) {
        console.log("[intake] notes_quick refused", JSON.stringify({ email: staff.email, reason: out.code }));
        return json(event, 400, { error: out.error, code: out.code });
      }
      console.log("[intake] notes_quick", JSON.stringify({
        email: staff.email, congregation, sunday, source: out.source, youtubeOnly: out.youtubeOnly,
        needs: out.needs ? out.needs.key : null, id: out.preview && out.preview.id, attach: out.attach ? out.attach.id : null
      }));
      return json(event, 200, { ...out, congregation, congregationName: congregationName(congregation), published: false });
    }

    // ── Prayer care (B09-12) ── The posts waiting for a look, and "Prayer
    // requests this week". A campus pastor (campus confirmed) sees and decides
    // their own campus; hub and admin every campus; media and an unconfirmed
    // campus pastor 403. Anonymous requests carry no name and no email.
    if (action === "prayers_week") {
      const out = await listPrayerCare(db(), staff, await campusList());
      if (out.error) return json(event, out.status, { error: out.error, ...(out.code ? { code: out.code } : {}) });
      return json(event, 200, out);
    }

    if (action === "prayer_decide") {
      const out = await decidePrayer(db(), staff, await campusList(), body.id, body.decision);
      if (out.error) return json(event, out.status, { error: out.error, ...(out.code ? { code: out.code } : {}) });
      return json(event, 200, out);
    }

    // ── Needs you (B09-13) ── Every prayer request reaches its campus pastor
    // and stays until he has written or prayed. prayer_lines is the caller's
    // open lines (kind dw_prayer_pastor_line; live only in a nation Ashley has
    // switched on); never an address in the list. prayer_write_link gives the
    // address-only mailto: for one request; prayer_line_done closes it for
    // both lists. A campus pastor acts on his own campus (another is 403);
    // hub and admin on any campus, as the weekly list; media 403.
    if (action === "prayer_lines") {
      const out = await listPrayerLines(db(), staff, await campusList());
      if (out.error) return json(event, out.status, { error: out.error, ...(out.code ? { code: out.code } : {}) });
      return json(event, 200, out);
    }

    if (action === "prayer_write_link") {
      const out = await prayerWriteLink(db(), staff, await campusList(), body.id);
      if (out.error) return json(event, out.status, { error: out.error, ...(out.code ? { code: out.code } : {}) });
      return json(event, 200, out);
    }

    if (action === "prayer_line_done") {
      const out = await closePrayerLine(db(), staff, await campusList(), body.id, body.kind);
      if (out.error) return json(event, out.status, { error: out.error, ...(out.code ? { code: out.code } : {}) });
      return json(event, 200, out);
    }

    if (action === "prayer_waiting_mute") {
      const out = await setWaitingMuted(db(), staff, body.muted);
      if (out.error) return json(event, out.status, { error: out.error });
      return json(event, 200, out);
    }

    if (action === "sermons_list") {
      return json(event, 200, { sermons: await listSermonChoices() });
    }

    // Take a published message off Sermon Notes (Ashley, 2 Sep 2026, from Sermon
    // Prep: "how do we solve the problem of deleting the sermon notes you have
    // pushed"). The row is deleted, so it leaves the tab AND the past-messages
    // list. If it was the current message for its congregation, nothing is
    // current there until the next publish. Hub, media and admin only.
    if (action === "sermon_remove") {
      if (!["admin", "hub", "media"].includes(staff.role)) {
        return json(event, 403, { error: "Only hub, media or admin staff can remove a published message." });
      }
      const id = String(body.id || "").trim().slice(0, 200);
      if (!id) return json(event, 400, { error: "Missing id" });
      const { data: row, error: findErr } = await db()
        .from("published_sermons")
        .select("id, sermon, is_current, congregation")
        .eq("id", id)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!row) return json(event, 404, { error: "No published message with that id" });
      const { error } = await db().from("published_sermons").delete().eq("id", id);
      if (error) throw error;
      console.log(`[intake] sermon_remove ${id} by ${staff.email} (current=${!!row.is_current}, congregation=${row.congregation || DEFAULT_CONGREGATION})`);
      return json(event, 200, {
        ok: true,
        removed: {
          id: row.id,
          title: (row.sermon && row.sermon.title) || "",
          congregation: row.congregation || DEFAULT_CONGREGATION,
          wasCurrent: !!row.is_current
        }
      });
    }

    // ── question_wording_save ── Change a question's words in place on the form
    // (B09-03; Ashley, 2 Oct 2026: "Yes, wording only."). Admin on every
    // question, hub on hub/all questions; everyone else is refused. Writes only
    // label, help and updated_at: never type, audience, required, enabled,
    // config or sort_order (question_save rebuilds the whole row, so it is not
    // reused). Adding, removing or reordering questions stays in SQL.
    if (action === "question_wording_save") {
      const refuse = () => json(event, 403, { error: "Only the owner can change this question's wording." });
      if (staff.role !== "admin" && staff.role !== "hub") return refuse();
      const id = typeof body.id === "string" ? body.id.trim().slice(0, 100) : "";
      if (!id) return json(event, 400, { error: "Missing id" });
      const { data: row, error: findErr } = await db()
        .from("intake_questions")
        .select("id, audience, enabled")
        .eq("id", id)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!row || row.enabled === false) return json(event, 404, { error: "That question is no longer on the form. Load the form again." });
      if (!canRewordQuestion(staff.role, row)) return refuse();
      const { patch, error: invalid } = wordingPatch(body);
      if (invalid) return json(event, 400, { error: invalid });
      const { data, error } = await db()
        .from("intake_questions")
        .update(patch)
        .eq("id", id)
        .eq("audience", row.audience)
        .eq("enabled", true)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return json(event, 409, { error: "That question changed while you were editing. Load the form again." });
      console.log(`[intake] question_wording_save ${id} by ${staff.role}`);
      return json(event, 200, { question: data });
    }

    // ── Admin-only ──
    // Admin is a roster role (readiness 7 Oct 2026). Ashley is the owner; inside
    // People, rosterChangeRefusal keeps every admin row his alone.
    if (staff.role !== "admin") return json(event, 403, { error: "Only an admin can change this." });

    // ── question_enabled_set ── Stop asking a question, or ask it again (B09-03).
    // Writes only enabled and updated_at; the question and its answers stay.
    if (action === "question_enabled_set") {
      const id = typeof body.id === "string" ? body.id.trim().slice(0, 100) : "";
      if (!id) return json(event, 400, { error: "Missing id" });
      if (typeof body.enabled !== "boolean") return json(event, 400, { error: "Say whether to ask this question." });
      const { data, error } = await db()
        .from("intake_questions")
        .update({ enabled: body.enabled, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return json(event, 404, { error: "That question is not in the list." });
      return json(event, 200, { question: data });
    }

    if (action === "questions_list") {
      const { data, error } = await db().from("intake_questions").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return json(event, 200, { questions: data || [] });
    }

    if (action === "question_save") {
      const q = normalizeQuestion(body.question || {});
      if (!q.label) return json(event, 400, { error: "Label required" });
      const id = body.question && body.question.id ? body.question.id : undefined;
      if (id) {
        const { data, error } = await db().from("intake_questions").update({
          ...q,
          updated_at: new Date().toISOString()
        }).eq("id", id).select().single();
        if (error) throw error;
        return json(event, 200, { question: data });
      }
      const { data, error } = await db().from("intake_questions").insert(q).select().single();
      if (error) throw error;
      return json(event, 200, { question: data });
    }

    if (action === "question_delete") {
      const id = body.id;
      if (!id) return json(event, 400, { error: "Missing id" });
      const { error } = await db().from("intake_questions").delete().eq("id", id);
      if (error) throw error;
      return json(event, 200, { ok: true });
    }

    if (action === "question_reorder") {
      const ids = Array.isArray(body.ids) ? body.ids : [];
      for (let i = 0; i < ids.length; i++) {
        await db().from("intake_questions").update({
          sort_order: (i + 1) * 10,
          updated_at: new Date().toISOString()
        }).eq("id", ids[i]);
      }
      return json(event, 200, { ok: true });
    }

    if (action === "submissions") {
      const status = ["pending", "approved", "declined"].includes(body.status) ? body.status : "pending";
      const { data, error } = await db()
        .from("intake_submissions")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return json(event, 200, { submissions: data || [] });
    }

    if (action === "review") {
      const id = body.id;
      const decision = body.decision;
      if (!id || (decision !== "approved" && decision !== "declined")) {
        return json(event, 400, { error: "Need id and decision" });
      }
      const { data: sub, error } = await db().from("intake_submissions").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!sub || sub.status !== "pending") return json(event, 400, { error: "Already reviewed" });

      let publish_result = null;
      if (decision === "approved") {
        // Credit the person who wrote it, not the reviewer.
        const author = await resolveStaff(sub.email);
        publish_result = await publishApproved(sub, { ...staff, name: (author && author.name) || sub.email });
      }
      const { data: updated, error: upErr } = await db().from("intake_submissions").update({
        status: decision,
        reviewed_at: new Date().toISOString(),
        reviewed_by: staff.email,
        publish_result
      }).eq("id", id).select().single();
      if (upErr) throw upErr;
      return json(event, 200, { submission: updated });
    }

    if (action === "roster_list") {
      const { data, error } = await db()
        .from("staff_roster")
        .select("email, role, campus_id, display_name, password_hash, setup_code_hash, setup_code_expires_at")
        .order("email");
      if (error) throw error;
      const roster = (data || []).map((row) => ({
        email: row.email,
        role: row.role,
        campus_id: row.campus_id,
        display_name: row.display_name,
        has_password: !!row.password_hash,
        // Never the code itself (only a hash is stored): just whether one is waiting.
        code_live: !row.password_hash && !!row.setup_code_hash
          && !!row.setup_code_expires_at && new Date(row.setup_code_expires_at).getTime() > Date.now(),
        code_expires_at: row.password_hash ? null : row.setup_code_expires_at || null
      }));
      return json(event, 200, { roster });
    }

    if (action === "roster_save") {
      const email = normalizeEmail(body.email);
      if (!isAllowlistedEmail(email)) {
        return json(event, 400, { error: "Enter a real email address (not a shared inbox)." });
      }
      const role = ROLES.includes(body.role) ? body.role : "campus";
      const { data: existing, error: existingErr } = await db().from("staff_roster")
        .select("email, role").eq("email", email).maybeSingle();
      if (existingErr) throw existingErr;
      const refusal = rosterChangeRefusal(staff, existing || { email, role: null }, role, "save");
      if (refusal) return json(event, isOwner(email) && role !== "admin" ? 400 : 403, { error: refusal });
      const campus_id = isCampusId(body.campusId, await campusList()) ? body.campusId : null;
      const named = fallbackStaff(email);
      const fields = {
        email,
        role,
        campus_id,
        // Admin-confirmed (Ashley, 2 Sep 2026): the only kind of campus that mints
        // a campus code. Goes with the campus when it is cleared.
        campus_set_by: campus_id ? "admin" : null,
        display_name: sanitize(body.name || (named && named.name) || "", 80),
        updated_at: new Date().toISOString()
      };
      const cols = "email, role, campus_id, display_name, password_hash";
      const owner = isOwner(staff.email);
      let saved;
      if (owner) {
        saved = await db().from("staff_roster").upsert(fields, { onConflict: "email" }).select(cols).single();
        if (saved.error) throw saved.error;
      } else if (existing) {
        // Never an upsert for a non-owner: the row must still be a non-admin when written.
        // An array, not maybeSingle: a PATCH that matched nothing must read as 409, not as a 406 error.
        const upd = await guardNonAdmin(db().from("staff_roster").update(fields).eq("email", email), staff).select(cols);
        if (upd.error) throw upd.error;
        if (!upd.data || !upd.data.length) return json(event, 409, { error: CHANGED_UNDER_YOU });
        saved = { data: upd.data[0] };
      } else {
        // A plain insert: if someone added this address meanwhile it fails, never overwrites.
        saved = await db().from("staff_roster").insert(fields).select(cols).single();
        if (saved.error) return json(event, 409, { error: CHANGED_UNDER_YOU });
      }
      const { password_hash: hasHash, ...person } = saved.data;
      // Adding someone is what lets them in: a person with no password yet gets a
      // one-time code to hand over. Saving someone who already has a password
      // changes nothing about how they sign in.
      const setup = hasHash ? {} : await issueSetupCode(email, { notAdmin: !owner });
      if (!setup) return json(event, 409, { error: CHANGED_UNDER_YOU });
      return json(event, 200, hasHash
        ? { person }
        : { person, setupCode: setup.code, setupCodeExpiresAt: setup.expiresAt });
    }

    if (action === "roster_issue_code") {
      const email = normalizeEmail(body.email);
      const { data: row } = await db().from("staff_roster").select("email, role, password_hash").eq("email", email).maybeSingle();
      if (!row) return json(event, 404, { error: "Add them to People first." });
      const refusal = rosterChangeRefusal(staff, row, null, "code");
      if (refusal) return json(event, 403, { error: refusal });
      if (row.password_hash) return json(event, 400, { error: "They already have a password. Use “Let them set a new password” to start over." });
      const setup = await issueSetupCode(email, { notAdmin: !isOwner(staff.email) });
      if (!setup) return json(event, 409, { error: CHANGED_UNDER_YOU });
      return json(event, 200, { setupCode: setup.code, setupCodeExpiresAt: setup.expiresAt });
    }

    if (action === "roster_clear_password") {
      const email = normalizeEmail(body.email);
      if (!email) return json(event, 400, { error: "Email required" });
      const { data: target, error: targetErr } = await db().from("staff_roster")
        .select("email, role").eq("email", email).maybeSingle();
      if (targetErr) throw targetErr;
      if (!target) return json(event, 404, { error: "They are not on the roster." });
      const refusal = rosterChangeRefusal(staff, target, null, "reset");
      if (refusal) return json(event, 403, { error: refusal });
      // One guarded write clears the password AND stores the fresh one-time code,
      // so a reset never leaves a row with neither (a promotion in between makes
      // the whole write miss: 409, nothing changed). A reset is not an open door:
      // the row waits for that code, so nobody but the person it is handed to
      // can take the account.
      const code = generateSetupCode();
      const expiresAt = new Date(Date.now() + SETUP_CODE_TTL_MS).toISOString();
      const { data: gone, error } = await guardNonAdmin(db().from("staff_roster").update({
        password_hash: null,
        email_code_hash: null, // starting over voids any code they emailed themselves
        email_code_expires_at: null,
        setup_code_hash: hashSetupCode(code),
        setup_code_expires_at: expiresAt,
        setup_code_attempts: 0,
        updated_at: new Date().toISOString()
      }).eq("email", email), staff).select("email");
      if (error) throw error;
      if (!gone || !gone.length) return json(event, 409, { error: CHANGED_UNDER_YOU });
      await db().from("staff_sessions").delete().eq("email", email);
      await clearSetupMisses(email);
      return json(event, 200, { ok: true, setupCode: code, setupCodeExpiresAt: expiresAt });
    }

    if (action === "roster_delete") {
      const email = normalizeEmail(body.email);
      if (!email || isOwner(email)) {
        return json(event, 400, { error: "Cannot remove Ashley." });
      }
      const { data: target, error: targetErr } = await db().from("staff_roster")
        .select("email, role").eq("email", email).maybeSingle();
      if (targetErr) throw targetErr;
      const refusal = target && rosterChangeRefusal(staff, target, null, "delete");
      if (refusal) return json(event, 403, { error: refusal });
      const { data: removed, error } = await guardNonAdmin(db().from("staff_roster").delete().eq("email", email), staff).select("email");
      if (error) throw error;
      if (target && (!removed || !removed.length)) return json(event, 409, { error: CHANGED_UNDER_YOU });
      await db().from("staff_sessions").delete().eq("email", email);
      return json(event, 200, { ok: true });
    }

    if (action === "corner_items") {
      const campusId = body.campusId;
      if (!isCampusId(campusId, await campusList())) return json(event, 400, { error: "Campus required" });
      const { data, error } = await db()
        .from("campus_content")
        .select("id, type, title, created_at")
        .eq("campus", campusId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return json(event, 200, { items: data || [] });
    }

    // ── Campuses (B09-02) ── The one campus list, kept by the owner in /staff ->
    // Settings -> Campuses. Admin only (the gate above); the backend reads the
    // table with the service key; anon and authenticated have no grant on it.
    // An id is never renamed or deleted: "Hide from readers" sets active=false.
    if (action === "campuses_list") {
      // The editor reads the table itself, never the bundled copy: a save from
      // stale seed values would un-hide a campus and drop the owner's edits.
      clearCampusCache();
      const { data: rows, error: readErr } = await db().from("dw_campuses")
        .select(CAMPUS_COLUMNS)
        .order("sort_order", { ascending: true }).order("id", { ascending: true });
      if (readErr) throw readErr;
      const list = (rows || []).map(fromRow);
      return json(event, 200, {
        campuses: list.map((c) => ({ ...publicCampus(c), pcoNames: c.pcoNames, active: c.active }))
      });
    }

    if (action === "campus_save") {
      clearCampusCache();
      const { data: rows, error: readErr } = await db().from("dw_campuses")
        .select(CAMPUS_COLUMNS);
      if (readErr) throw readErr;
      const list = (rows || []).map(fromRow);
      const checked = validateCampusSave(body.campus, list);
      if (checked.error) return json(event, 400, { error: checked.error });
      const row = { ...checked.row, updated_at: new Date().toISOString(), updated_by: staff.email };
      const { data, error } = await db().from("dw_campuses").upsert(row, { onConflict: "id" })
        .select(CAMPUS_COLUMNS).single();
      if (error) throw error;
      clearCampusCache();
      const saved = fromRow(data);
      console.log("[intake] campus_save", JSON.stringify({ id: saved.id, isNew: checked.isNew, active: saved.active }));
      return json(event, 200, { campus: { ...publicCampus(saved), pcoNames: saved.pcoNames, active: saved.active }, isNew: checked.isNew });
    }

    if (action === "campus_move") {
      clearCampusCache();
      const { data: rows, error: readErr } = await db().from("dw_campuses").select("id, name, sort_order");
      if (readErr) throw readErr;
      const list = (rows || []).map((r) => ({ id: r.id, name: r.name, sortOrder: Number(r.sort_order) || 0 }));
      const plan = planCampusMove(body.id, body.direction, list);
      if (plan.error) return json(event, 400, { error: plan.error });
      const at = new Date().toISOString();
      for (const ch of plan.changes) {
        const { error } = await db().from("dw_campuses")
          .update({ sort_order: ch.sort_order, updated_at: at, updated_by: staff.email }).eq("id", ch.id);
        if (error) throw error;
      }
      clearCampusCache();
      return json(event, 200, { ok: true, changed: plan.changes.length });
    }

    return json(event, 400, { error: "Unknown action" });
  } catch (err) {
    console.error("intake", err);
    if (err && err.status === 400) return json(event, 400, { error: err.message || "Bad request", ...(err.code ? { code: err.code } : {}) });
    return json(event, 500, { error: "Server error" });
  }
};
