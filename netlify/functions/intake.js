/**
 * Staff intake API — one form. Save publishes to campus corner / sermon notes.
 *
 * POST /.netlify/functions/intake  { action, ... }
 */
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const { getAllowedOrigin } = require("./lib/cors");
const { isSharedRateLimited } = require("./lib/rate-limit");
// The sign-in rate limits key on an address the client cannot choose (see
// lib/client-ip.js); the setup-code limits key on its /64 for IPv6.
const { clientIp, rateLimitIp } = require("./lib/client-ip");
const {
  normalizeEmail,
  isAllowlistedEmail,
  fallbackStaff,
  staffFromRoster,
  campusConfirmed,
  questionVisibleForJob,
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
  SETUP_CODE_MAX_ATTEMPTS,
  generateSetupCode,
  hashSetupCode,
  normalizeSetupCode,
  verifySetupCode,
  DUMMY_HASH,
  youtubeWatchUrl,
  hasNotesContent
} = require("./lib/intake-core");
const { formatSermon, mergeYoutube, answersToOutline, sanitizeAiSermon, extractKeyVerseFromNotes } = require("./lib/sermon-format");
const { normalizeCongregation, congregationName, congregationSermonId, DEFAULT_CONGREGATION } = require("./lib/congregations");
const { isCurrentAt } = require("./lib/sermon-window");
const { issueToken, claimProvenToken, revokeToken } = require("./lib/auth");

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
  // Staff means "on the roster" (or a named person, or Ashley). An address that
  // only looks like a futures.church address is not staff.
  return staffFromRoster(e, data);
}

/**
 * Issue a one-time setup code for a roster row that has no password. The plain
 * code is returned ONCE (to Ashley, to hand over); only a hash is stored. A new
 * code replaces any earlier one and resets the wrong-guess count.
 */
async function issueSetupCode(email) {
  const code = generateSetupCode();
  const expiresAt = new Date(Date.now() + SETUP_CODE_TTL_MS).toISOString();
  const { error } = await db().from("staff_roster").update({
    setup_code_hash: hashSetupCode(code),
    setup_code_expires_at: expiresAt,
    setup_code_attempts: 0,
    updated_at: new Date().toISOString()
  }).eq("email", email);
  if (error) throw error;
  // A fresh code starts with a clean slate of guesses.
  await clearSetupMisses(email);
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

const SETUP_REFUSED = "That setup code did not work. Check it, or ask Ashley Evans for a new one. If you have already set a password, sign in instead.";

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
  return resolveStaff(data.email);
}

async function issueSession(email) {
  const raw = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
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

async function findPublished(target, congregation) {
  const t = String(target || "").trim();
  if (!t || t === "__current__") return getCurrentPublished(congregation);
  const byId = await db().from("published_sermons").select("id, sermon, is_current, congregation").eq("id", t).maybeSingle();
  if (byId.data) return byId.data;
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
  const base = row && row.sermon ? { ...row.sermon, id: row.sermon.id || row.id } : null;
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
      const row = await findPublished(sermon.id, congregation) || await getCurrentPublished(congregation);
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
      // has no password yet AND holds a live code. Anyone else sees the plain
      // sign-in, so this answer is not a list of unclaimed accounts.
      const live = !!(data.setup_code_hash && data.setup_code_expires_at && new Date(data.setup_code_expires_at).getTime() > Date.now());
      return json(event, 200, { setup: !data.password_hash && live });
    }

    // ── set_password ── First time only, and only with the one-time setup code
    // Ashley issued when he added the person. No code, a wrong, used or expired
    // code, an unknown address, or a row that already has a password: the same
    // refusal, and nothing is changed. The code is spent in the same statement
    // that stores the password, so two racing claims cannot both win.
    if (action === "set_password") {
      if (await isSharedRateLimited("intake-set-password", rlIp, 10, 15 * 60 * 1000)) {
        return json(event, 429, { error: "Too many attempts. Try again later." });
      }
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const issue = passwordIssue(password, email);
      if (issue) return json(event, 400, { error: issue });
      const refuse = () => json(event, 403, { error: SETUP_REFUSED });
      if (!normalizeSetupCode(body.setupCode)) return refuse();
      const { data: row } = await db().from("staff_roster")
        .select("email, role, campus_id, display_name, campus_set_by, password_hash, setup_code_hash, setup_code_expires_at, setup_code_attempts")
        .eq("email", email).maybeSingle();
      const staff = row && staffFromRoster(email, row);
      const live = !!(staff && !row.password_hash && row.setup_code_hash && row.setup_code_expires_at
        && new Date(row.setup_code_expires_at).getTime() > Date.now());
      if (!live) {
        verifySetupCode(String(body.setupCode), DUMMY_HASH); // same cost as a real check
        return refuse();
      }
      // Wrong guesses lock this caller IP out of this address for a while (and
      // the address as a whole only under a spread-out flood); they never burn
      // the code (a stranger steered here by auth_status could otherwise destroy
      // a new pastor's code with five guesses, and only Ashley can issue
      // another), and a stranger's lock never refuses the pastor on their own
      // connection. Each attempt writes its OWN row before the code is checked,
      // then counts the rows, so parallel guesses are all counted (a
      // read-then-write counter let them share one count). Fails closed: if the
      // row cannot be written or counted, the attempt is refused.
      const lock = await setupMissLock(email, rlIp);
      if (lock === "error") return json(event, 503, { error: "Sign-in is unavailable right now. Try again shortly." });
      if (lock === "locked") return json(event, 429, { error: "Too many attempts. Try again later." });
      if (!verifySetupCode(String(body.setupCode), row.setup_code_hash)) {
        return refuse();
      }
      const { data: claimed, error } = await db().from("staff_roster").update({
        password_hash: hashPassword(password),
        setup_code_hash: null,
        setup_code_expires_at: null,
        setup_code_attempts: 0,
        updated_at: new Date().toISOString()
      }).eq("email", email).is("password_hash", null).eq("setup_code_hash", row.setup_code_hash).select("email");
      if (error) throw error;
      if (!claimed || claimed.length !== 1) return refuse(); // someone else spent it first
      // The code is spent; its attempt rows are of no further use.
      await clearSetupMisses(email);
      const token = await issueSession(staff.email);
      return json(event, 200, { token, staff: publicStaff(staff) });
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
      if (!staff || !password) return refuse();
      const { data: row } = await db().from("staff_roster").select("password_hash").eq("email", email).maybeSingle();
      // Same answer, with no "set up" hint, for a person who has no password yet:
      // sign-in must not say which addresses are waiting to be set up.
      if (!row || !row.password_hash) {
        verifyPassword(password, DUMMY_HASH);
        return refuse();
      }
      if (!verifyPassword(password, row.password_hash)) return refuse();
      const token = await issueSession(staff.email);
      return json(event, 200, { token, staff: publicStaff(staff) });
    }

    // Authenticated actions
    const staff = await sessionStaff(event);
    if (!staff) return json(event, 401, { error: "Sign in required" });

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
      return json(event, 200, { staff: publicStaff(staff), pendingCount });
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
        if (claimed) return json(event, 200, { token: claimed });
        return json(event, 200, { token: await issueToken(db(), staff.email, { proven: true }) });
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
      const { error } = await db().from("staff_roster").update({
        password_hash: hashPassword(newPassword),
        updated_at: new Date().toISOString()
      }).eq("email", staff.email);
      if (error) throw error;
      // Same token extraction as logout: keep this request's session, drop the rest.
      const auth = event.headers.authorization || event.headers.Authorization || "";
      const raw = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
      let revoke = db().from("staff_sessions").delete().eq("email", staff.email);
      if (raw) revoke = revoke.neq("token_hash", hashToken(raw));
      const { error: revokeErr } = await revoke;
      // The password is already changed at this point — report, don't fail the call.
      if (revokeErr) console.error("intake change_password: revoking other sessions failed", revokeErr);
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
      } else if (staff.role === "admin" && isCampusId(body.campusId)) {
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
        staff: publicStaff(staff),
        questions: visible,
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
      const requested = collectCampusFromAnswers(visible, answers) || body.campusId;
      let campusId = lockCampus(staff, requested);
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
          return json(event, 400, { error: fmtErr.message });
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
          return json(event, 400, { error: fmtErr.message });
        }
        throw fmtErr;
      }
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

    // ── Admin-only ──
    if (staff.role !== "admin") return json(event, 403, { error: "Only Ashley can change this." });

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
        return json(event, 400, { error: "Use a futures.church email (or ae@futures.global)." });
      }
      const role = ROLES.includes(body.role) ? body.role : "campus";
      if (email === "ae@futures.global" && role !== "admin") {
        return json(event, 400, { error: "Ashley stays admin." });
      }
      if (role === "admin" && email !== "ae@futures.global") {
        return json(event, 400, { error: "Ashley Evans (ae@futures.global) is the only admin." });
      }
      const campus_id = isCampusId(body.campusId) ? body.campusId : null;
      const named = fallbackStaff(email);
      const { data, error } = await db().from("staff_roster").upsert({
        email,
        role,
        campus_id,
        // Admin-confirmed (Ashley, 2 Sep 2026): the only kind of campus that mints
        // a campus code. Goes with the campus when it is cleared.
        campus_set_by: campus_id ? "admin" : null,
        display_name: sanitize(body.name || (named && named.name) || "", 80),
        updated_at: new Date().toISOString()
      }, { onConflict: "email" }).select("email, role, campus_id, display_name, password_hash").single();
      if (error) throw error;
      const { password_hash: hasHash, ...person } = data;
      // Adding someone is what lets them in: a person with no password yet gets a
      // one-time code to hand over. Saving someone who already has a password
      // changes nothing about how they sign in.
      const setup = hasHash ? {} : await issueSetupCode(email);
      return json(event, 200, hasHash
        ? { person }
        : { person, setupCode: setup.code, setupCodeExpiresAt: setup.expiresAt });
    }

    if (action === "roster_issue_code") {
      const email = normalizeEmail(body.email);
      const { data: row } = await db().from("staff_roster").select("email, password_hash").eq("email", email).maybeSingle();
      if (!row) return json(event, 404, { error: "Add them to People first." });
      if (row.password_hash) return json(event, 400, { error: "They already have a password. Use “Let them set a new password” to start over." });
      const setup = await issueSetupCode(email);
      return json(event, 200, { setupCode: setup.code, setupCodeExpiresAt: setup.expiresAt });
    }

    if (action === "roster_clear_password") {
      const email = normalizeEmail(body.email);
      if (!email) return json(event, 400, { error: "Email required" });
      const { data: gone, error } = await db().from("staff_roster").update({
        password_hash: null,
        updated_at: new Date().toISOString()
      }).eq("email", email).select("email");
      if (error) throw error;
      await db().from("staff_sessions").delete().eq("email", email);
      if (!gone || !gone.length) return json(event, 404, { error: "They are not on the roster." });
      // A reset is not an open door: the row waits for a fresh one-time code, so
      // nobody but the person Ashley hands it to can take the account.
      const setup = await issueSetupCode(email);
      return json(event, 200, { ok: true, setupCode: setup.code, setupCodeExpiresAt: setup.expiresAt });
    }

    if (action === "roster_delete") {
      const email = normalizeEmail(body.email);
      if (!email || email === "ae@futures.global") {
        return json(event, 400, { error: "Cannot remove Ashley." });
      }
      const { error } = await db().from("staff_roster").delete().eq("email", email);
      if (error) throw error;
      await db().from("staff_sessions").delete().eq("email", email);
      return json(event, 200, { ok: true });
    }

    if (action === "corner_items") {
      const campusId = body.campusId;
      if (!isCampusId(campusId)) return json(event, 400, { error: "Campus required" });
      const { data, error } = await db()
        .from("campus_content")
        .select("id, type, title, created_at")
        .eq("campus", campusId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return json(event, 200, { items: data || [] });
    }

    return json(event, 400, { error: "Unknown action" });
  } catch (err) {
    console.error("intake", err);
    if (err && err.status === 400) return json(event, 400, { error: err.message || "Bad request" });
    return json(event, 500, { error: "Server error" });
  }
};
