/**
 * Pure helpers for staff intake: allowlist, question visibility, campus lock,
 * turning approved answers into campus-corner rows / sermon JSON, and
 * password hashing (each pastor sets their own).
 * No I/O — Netlify functions and vitest both require this file.
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// The campus list lives in the dw_campuses table (lib/campuses.js, B09-02).
// CAMPUS_IDS is the bundled copy's staff campuses (no 'other'), kept for tests
// and for callers that have no list to hand; every function passes the loaded
// list where it has one.
const campuses = require("./campuses");
const CAMPUS_IDS = campuses.campusIds();

/** Named staff from the product request. Do not invent extra people. */
const NAMED_STAFF = {
  "ae@futures.global": { role: "admin", name: "Ashley Evans" },
  "josh@futures.church": { role: "hub", name: "Josh Greenwood" },
  "alexis@futuros.global": { role: "hub", name: "Alexis Principal" },
  "jane0202@me.com": { role: "hub", name: "Jane Evans" },
  "ryan.rolls@futures.church": { role: "hub", name: "Ryan Rolls" },
  "alexi.patsianis@futures.church": { role: "media", name: "Alexi Patsianis" },
  "jessie.ramos@futures.church": { role: "media", name: "Jessie Ramos" },
  "noah.terrell@futures.church": { role: "media", name: "Noah Terrell" }
};

/** Generic inboxes that appear in this repo — not pastors. */
const BLOCKED_INBOXES = new Set(["hello@futures.church", "care@futures.church"]);

const QUESTION_TYPES = [
  "text", "long_text", "yes_no", "campus", "date",
  "corner_add", "corner_remove", "sermon_notes", "sermon_pick"
];
const AUDIENCES = ["all", "campus", "hub", "admin", "media"];
const ROLES = ["admin", "hub", "campus", "media"];
const CORNER_TYPES = ["announcement", "note", "prayer_point", "essay"];
const SERMON_FIELD_KEYS = [
  "title", "speaker", "date", "series", "keyVerse", "keyVerseText", "outline", "youtubeUrl",
  "bigIdea", "point1Heading", "point1Body", "point2Heading", "point2Body",
  "point3Heading", "point3Body", "weeklyAction"
];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isAllowlistedEmail(email) {
  const e = normalizeEmail(email);
  if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
  if (BLOCKED_INBOXES.has(e)) return false;
  if (NAMED_STAFF[e]) return true;
  if (e.endsWith("@futures.church")) return true;
  return false;
}

function fallbackStaff(email) {
  const e = normalizeEmail(email);
  if (!isAllowlistedEmail(e)) return null;
  if (NAMED_STAFF[e]) {
    return { email: e, role: NAMED_STAFF[e].role, campusId: null, name: NAMED_STAFF[e].name };
  }
  return { email: e, role: "campus", campusId: null, name: "" };
}

/**
 * Who counts as staff: a ROSTER ROW, never the shape of the address.
 * `row` is the staff_roster row (or null). With no row the answer is null for
 * everyone, named people included: a name in NAMED_STAFF only supplies a default
 * role and display name once Ashley has added the person (roster_save), which
 * is also what issues their setup code. Ashley's own address always resolves to
 * admin once his row exists.
 */
function staffFromRoster(email, row) {
  const e = normalizeEmail(email);
  if (!isAllowlistedEmail(e)) return null;
  if (!row) return null;
  const named = NAMED_STAFF[e] || null;
  if (e === "ae@futures.global") {
    return {
      email: e,
      role: "admin",
      campusId: row.campus_id || null,
      campusSetBy: row.campus_set_by || null,
      name: row.display_name || "Ashley Evans"
    };
  }
  return {
    email: e,
    role: row.role === "admin" ? (named && named.role) || "campus" : row.role,
    campusId: row.campus_id || null,
    campusSetBy: row.campus_set_by == null ? null : row.campus_set_by,
    name: row.display_name || (named && named.name) || ""
  };
}

/**
 * Has Ashley confirmed this person's campus? Only campus pastors need it.
 * campus_set_by null with a campus id is the legacy case and counts as
 * confirmed, the same convention as pastor-admin.js.
 */
function campusConfirmed(staff) {
  if (!staff) return false;
  if (staff.role !== "campus") return true;
  return !!staff.campusId && staff.campusSetBy !== "self";
}

function questionVisible(question, role) {
  return questionVisibleForJob(question, role, null);
}

function isKeyVerseField(question) {
  const key = question && question.config && question.config.sermonKey;
  return key === "keyVerse" || key === "keyVerseText";
}

/** When a job is set (hub / media / campus), only that audience’s questions show — even for Ashley. */
function questionVisibleForJob(question, role, job) {
  if (!question || question.enabled === false) return false;
  // Pastor form has no key-verse boxes. AI pulls a verse from pasted notes if one is there.
  if (isKeyVerseField(question)) return false;
  const aud = question.audience || "all";
  if (aud === "all") return true;
  if (aud === "admin") return role === "admin";
  if (aud === "hub") {
    if (role === "campus") return false;
    if (job === "media" || job === "campus") return false;
    if (job === "hub") return role === "admin" || role === "hub" || role === "media";
    return role === "hub" || role === "media";
  }
  const viewAs = job === "hub" || job === "media" || job === "campus" ? job : role;
  return aud === viewAs;
}

/**
 * Who may change a form question's wording in /staff (B09-03; Ashley, 2 Oct
 * 2026: "Yes, wording only."): admin on every question, hub on questions whose
 * audience is hub or all. Campus pastors and media never: a campus question is
 * shared by every campus, so one pastor's edit would change it for all of them.
 */
function canRewordQuestion(role, question) {
  if (!question) return false;
  if (role === "admin") return true;
  const aud = question.audience || "all";
  return role === "hub" && (aud === "hub" || aud === "all");
}

const WORDING_LABEL_MIN = 2;
const WORDING_LABEL_MAX = 200;
const WORDING_HELP_MAX = 500;

/**
 * The only columns a wording change may write: label and help, sanitised with
 * the same caps as the old question editor (so no existing label is refused),
 * and updated_at. Returns { error } when the label is too short.
 */
function wordingPatch(input, now = new Date()) {
  const label = sanitize(typeof input?.label === "string" ? input.label : "", WORDING_LABEL_MAX);
  const help = sanitize(typeof input?.help === "string" ? input.help : "", WORDING_HELP_MAX);
  if (label.length < WORDING_LABEL_MIN) return { error: "Write the question in at least 2 characters." };
  return { patch: { label, help, updated_at: now.toISOString() } };
}

/** A campus id on `list` (the loaded campus list; the bundled one when omitted). */
function isCampusId(id, list) {
  return campuses.isCampusId(id, list);
}

/** Campus pastors may only act on their assigned campus (or the one they pick once). */
function lockCampus(staff, requestedCampus, list) {
  const requested = isCampusId(requestedCampus, list) ? requestedCampus : null;
  if (!staff) return null;
  if (staff.role === "campus") {
    if (staff.campusId && isCampusId(staff.campusId, list)) return staff.campusId;
    return requested;
  }
  return requested || (isCampusId(staff.campusId, list) ? staff.campusId : null);
}

function sanitize(str, maxLen = 5000) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}

function isYoutubeId(id) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(id || ""));
}

/** Accept watch, youtu.be, shorts, embed, live. Return the 11-char id or null. */
function parseYoutubeId(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  if (isYoutubeId(raw)) return raw;
  let href = raw;
  if (!/^https?:\/\//i.test(href)) href = "https://" + href;
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return isYoutubeId(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (isYoutubeId(v)) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" || parts[0] === "v") {
        return isYoutubeId(parts[1]) ? parts[1] : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function youtubeWatchUrl(url) {
  const id = parseYoutubeId(url);
  return id ? "https://www.youtube.com/watch?v=" + id : "";
}

function youtubeEmbedUrl(url) {
  const id = parseYoutubeId(url);
  return id ? "https://www.youtube-nocookie.com/embed/" + id : "";
}

function slugify(s) {
  const slug = String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "sermon";
}

function parseOutline(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const sections = [];
  let current = null;

  const startSection = (title) => {
    if (current) sections.push(current);
    current = { num: String(sections.length + 1), title: sanitize(title, 200) || "Notes", content: [] };
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const heading = trimmed.match(/^(?:#{1,3}\s+|(\d+)[.)]\s+)(.+)$/);
    if (heading && heading[2]) {
      startSection(heading[2].trim());
      continue;
    }
    if (!current) startSection("Notes");
    if (/^[-*•]\s+/.test(trimmed)) {
      current.content.push({ type: "bullet", value: sanitize(trimmed.replace(/^[-*•]\s+/, ""), 2000) });
    } else {
      current.content.push({ type: "text", value: sanitize(trimmed, 4000) });
    }
  }
  if (current) sections.push(current);
  if (!sections.length) {
    sections.push({ num: "1", title: "Notes", content: [] });
  }
  for (const s of sections) {
    s.content.push({ type: "blank", before: "" });
  }
  return sections;
}

function sermonFromNotes(notes) {
  const src = notes && typeof notes === "object" ? notes : {};
  const title = sanitize(src.title || "Sunday Message", 200);
  const date = String(src.date || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
  const outline = src.outline || src.body || "";
  const prompts = Array.isArray(src.responsePrompts)
    ? src.responsePrompts.map((s) => sanitize(String(s), 300)).filter(Boolean)
    : [];
  const commitments = Array.isArray(src.commitments)
    ? src.commitments.map((s) => sanitize(String(s), 200)).filter(Boolean)
    : [];
  return {
    id: slugify(title) + "-" + date,
    title,
    series: sanitize(src.series || "", 200),
    date,
    speaker: sanitize(src.speaker || "", 120),
    keyVerse: sanitize(src.keyVerse || "", 80),
    keyVerseText: sanitize(src.keyVerseText || "", 2000),
    sections: Array.isArray(src.sections) && src.sections.length ? src.sections : parseOutline(outline),
    responsePrompts: prompts.length ? prompts : ["What is God saying to you through this message?"],
    commitments,
    youtubeUrl: youtubeWatchUrl(src.youtubeUrl)
  };
}

function collectCampusFromAnswers(questions, answers, list) {
  for (const q of questions || []) {
    if (q.type === "campus") {
      const v = answers && answers[q.id];
      if (isCampusId(v, list)) return v;
    }
  }
  return null;
}

function hasNotesContent(patch) {
  const p = patch && typeof patch === "object" ? patch : {};
  return !!(p.bigIdea || p.outline || p.body
    || p.point1Heading || p.point1Body
    || p.point2Heading || p.point2Body
    || p.point3Heading || p.point3Body
    || p.weeklyAction);
}

function sermonKeyFromConfig(cfg) {
  const c = cfg && typeof cfg === "object" ? cfg : {};
  if (c.sermonKey === "commitments") return "weeklyAction";
  if (SERMON_FIELD_KEYS.includes(c.sermonKey)) return c.sermonKey;
  const n = Number(c.point);
  if (n >= 1 && n <= 3 && (c.part === "heading" || c.part === "body")) {
    return c.part === "heading" ? ("point" + n + "Heading") : ("point" + n + "Body");
  }
  return null;
}

/** First line = title (max 80). Rest = body. One line is both. */
function splitCampusCorner(raw) {
  const text = sanitize(String(raw || ""), 5000);
  if (!text) return null;
  const nl = text.search(/\r?\n/);
  if (nl < 0) {
    return { title: sanitize(text, 80), content: text };
  }
  const first = text.slice(0, nl).trim();
  const rest = text.slice(nl).replace(/^\r?\n/, "").trim();
  const title = sanitize(first || rest, 80);
  const content = rest || first;
  if (!title) return null;
  return { title, content: content || title };
}

function applyAnswers(questions, answers, ctx) {
  const sermonPatch = { reformat: false };
  let hasSermon = false;
  const cornerAdds = [];
  const cornerRemoves = [];
  const author = sanitize((ctx && ctx.name) || "", 100);
  let campusTitle = "";
  let campusBody = "";

  for (const q of questions || []) {
    const val = answers ? answers[q.id] : undefined;
    if (val == null || val === "") continue;
    const cfg = q.config && typeof q.config === "object" ? q.config : {};

    if (q.type === "corner_remove") {
      const ids = Array.isArray(val) ? val : (typeof val === "string" ? [val] : (val && val.ids) || []);
      for (const id of ids) {
        if (typeof id === "string" && id.length > 8 && id.length < 80) cornerRemoves.push(id);
      }
    }

    if (q.type === "corner_add" && Array.isArray(val)) {
      for (const item of val) {
        if (!item || typeof item !== "object") continue;
        const title = sanitize(item.title || "", 200);
        const content = sanitize(item.content || item.body || "", 5000);
        if (!title && !content) continue;
        const type = CORNER_TYPES.includes(item.type) ? item.type : "announcement";
        cornerAdds.push({ type, title: title || "Campus update", content: content || title, author });
      }
    }

    if (q.type === "sermon_pick" || cfg.publish === "sermon_target") {
      sermonPatch.target = typeof val === "string" ? sanitize(val, 200) : sanitize((val && val.id) || "", 200);
      hasSermon = true;
    }

    if (cfg.publish === "sermon_reformat") {
      sermonPatch.reformat = val === true || val === "yes";
    }

    if (cfg.publish === "campus_title") {
      campusTitle = typeof val === "string" ? sanitize(val, 200) : "";
    }
    if (cfg.publish === "campus_body") {
      campusBody = typeof val === "string" ? sanitize(val, 5000) : "";
    }
    if (cfg.publish === "campus_corner") {
      const split = splitCampusCorner(typeof val === "string" ? val : "");
      if (split) {
        const type = CORNER_TYPES.includes(cfg.itemType) ? cfg.itemType : "announcement";
        cornerAdds.push({ type, title: split.title, content: split.content, author });
      }
    }

    if (val === false) continue;

    const sermonKey = sermonKeyFromConfig(cfg);
    if ((cfg.publish === "sermon_field" || sermonKey) && sermonKey && SERMON_FIELD_KEYS.includes(sermonKey)) {
      sermonPatch[sermonKey] = typeof val === "string" || typeof val === "boolean" ? val : String(val);
      hasSermon = true;
    }
  }

  if (campusTitle || campusBody) {
    cornerAdds.push({
      type: "announcement",
      title: campusTitle || "Campus update",
      content: campusBody || campusTitle,
      author
    });
  }

  if (sermonPatch.youtubeUrl) {
    const yt = youtubeWatchUrl(sermonPatch.youtubeUrl);
    if (!yt && String(sermonPatch.youtubeUrl).trim()) {
      sermonPatch.youtubeInvalid = true;
    }
    sermonPatch.youtubeUrl = yt;
  }

  const sermon = hasSermon && (sermonPatch.title || hasNotesContent(sermonPatch) || sermonPatch.speaker)
    ? sermonFromNotes(sermonPatch)
    : null;

  const youtubeOnly = !!(sermonPatch.youtubeUrl && !hasNotesContent(sermonPatch) && !sermonPatch.title);
  const notesPolish = !!(hasNotesContent(sermonPatch) && !sermonPatch.title);

  return { sermon, sermonPatch, cornerAdds, cornerRemoves, youtubeOnly, notesPolish };
}

/**
 * What the app (and Sermon Prep, through `me`) is told about the signed-in
 * staff member. `list` is the one campus list (lib/campuses.js loadCampuses);
 * without it the bundled copy answers. campusName and congregation come from
 * that list, never from a name typed here (MOS-to-8 build B08-06):
 *   campusName    the campus's name as /staff -> Campuses has it; the id itself
 *                 when the id is not on the list; null with no campus.
 *   congregation  'futures-us' | 'futures-au' | 'futuros-us' | null (no campus,
 *                 a campus with none set, or an id not on the list).
 */
function publicStaff(staff, list) {
  if (!staff) return null;
  const campusId = staff.campusId || null;
  return {
    email: staff.email,
    role: staff.role,
    campusId,
    campusName: campusId ? campuses.campusName(campusId, list) : null,
    congregation: campusId ? campuses.campusCongregation(campusId, list) : null,
    name: staff.name || "",
    isAdmin: staff.role === "admin",
    // True when this person's saves to the campus corner wait for Ashley to confirm the campus.
    campusPending: staff.role === "campus" && !campusConfirmed(staff)
  };
}

// ── Setup codes ─────────────────────────────────────────────────────────────
// Ashley adds a person (roster_save) and the server issues a one-time code he
// hands over. Choosing a first password needs that code. Stored hashed (bcrypt),
// expires, and works once; a few wrong guesses lock the address out for 15
// minutes (intake.js setupMissLock) without burning the code. A person who
// has not been given a code cannot claim anything, whatever address they type.
// A person on the roster can also email a code to themselves (intake.js
// email_setup_code): it goes only to the roster row's own address, so typing it
// proves they read that inbox. That is also how a forgotten password is reset.
const SETUP_CODE_TTL_MS = 72 * 3600 * 1000;
// A code the person emails to themselves (intake.js email_setup_code) lives for
// 30 minutes: it is in their inbox at once, so it need not wait days.
const EMAIL_SETUP_CODE_TTL_MS = 30 * 60 * 1000;
const SETUP_CODE_MAX_ATTEMPTS = 5;
// No 0/O/1/I/L: the code is read aloud or typed from a message.
const SETUP_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SETUP_CODE_LENGTH = 10;

/** XXXXX-XXXXX, about 49 bits, from the OS random source. */
function generateSetupCode() {
  let out = "";
  for (let i = 0; i < SETUP_CODE_LENGTH; i++) {
    out += SETUP_CODE_ALPHABET[crypto.randomInt(SETUP_CODE_ALPHABET.length)];
    if (i === SETUP_CODE_LENGTH / 2 - 1) out += "-";
  }
  return out;
}

/** Upper-case, letters and digits only, so "abcde 23456" and "ABCDE-23456" match. */
function normalizeSetupCode(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashSetupCode(code) {
  return bcrypt.hashSync(normalizeSetupCode(code), 10);
}

function verifySetupCode(code, stored) {
  const c = normalizeSetupCode(code);
  if (!c || c.length > 40 || !stored || typeof stored !== "string") return false;
  try { return bcrypt.compareSync(c, stored); } catch { return false; }
}

/** Spent on a refusal that never reached a real hash, so timing tells nothing. */
const DUMMY_HASH = bcrypt.hashSync("no-such-credential", 10);

function passwordIssue(password, email) {
  const p = String(password || "");
  if (p.length < 10) return "Use at least 10 characters.";
  if (p.length > 200) return "Password is too long.";
  if (email && p.toLowerCase() === String(email).toLowerCase()) return "Do not use your email as the password.";
  return null;
}

function hashPassword(password) {
  return bcrypt.hashSync(String(password), 10);
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string" || typeof password !== "string") return false;
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    try { return bcrypt.compareSync(password, stored); } catch { return false; }
  }
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = parts[1];
  let prev;
  try { prev = Buffer.from(parts[2], "hex"); } catch { return false; }
  const next = crypto.scryptSync(password, salt, 32);
  if (next.length !== prev.length) return false;
  return crypto.timingSafeEqual(next, prev);
}

module.exports = {
  CAMPUS_IDS,
  NAMED_STAFF,
  BLOCKED_INBOXES,
  QUESTION_TYPES,
  AUDIENCES,
  ROLES,
  CORNER_TYPES,
  SERMON_FIELD_KEYS,
  normalizeEmail,
  isAllowlistedEmail,
  fallbackStaff,
  staffFromRoster,
  campusConfirmed,
  questionVisible,
  questionVisibleForJob,
  canRewordQuestion,
  wordingPatch,
  WORDING_LABEL_MAX,
  WORDING_HELP_MAX,
  isKeyVerseField,
  isCampusId,
  lockCampus,
  sanitize,
  slugify,
  parseOutline,
  sermonFromNotes,
  collectCampusFromAnswers,
  applyAnswers,
  splitCampusCorner,
  publicStaff,
  passwordIssue,
  SETUP_CODE_TTL_MS,
  EMAIL_SETUP_CODE_TTL_MS,
  SETUP_CODE_MAX_ATTEMPTS,
  generateSetupCode,
  normalizeSetupCode,
  hashSetupCode,
  verifySetupCode,
  DUMMY_HASH,
  hashPassword,
  verifyPassword,
  isYoutubeId,
  parseYoutubeId,
  youtubeWatchUrl,
  youtubeEmbedUrl,
  hasNotesContent
};
