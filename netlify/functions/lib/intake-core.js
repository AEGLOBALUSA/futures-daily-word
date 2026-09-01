/**
 * Pure helpers for staff intake: allowlist, question visibility, campus lock,
 * turning approved answers into campus-corner rows / sermon JSON, and
 * password hashing (each pastor sets their own).
 * No I/O — Netlify functions and vitest both require this file.
 */

const crypto = require("crypto");

const CAMPUS_IDS = [
  "au-paradise", "au-adelaide-city", "au-salisbury", "au-south",
  "au-clare-valley", "au-mount-barker", "au-victor-harbor", "au-copper-coast",
  "us-gwinnett", "us-kennesaw", "us-alpharetta",
  "us-futuros-duluth", "us-futuros-kennesaw", "us-futuros-grayson", "us-franklin",
  "id-solo", "id-cemani", "id-bali", "id-samarinda", "id-langowan",
  "br-rio"
];
const CAMPUS_SET = new Set(CAMPUS_IDS);

/** Named staff from the product request. Do not invent extra people. */
const NAMED_STAFF = {
  "ae@futures.global": { role: "admin", name: "Ashley Evans" },
  "josh@futures.church": { role: "hub", name: "Josh Greenwood" },
  "ryan.rolls@futures.church": { role: "hub", name: "Ryan Rolls" }
};

/** Generic inboxes that appear in this repo — not pastors. */
const BLOCKED_INBOXES = new Set(["hello@futures.church", "care@futures.church"]);

const QUESTION_TYPES = [
  "text", "long_text", "yes_no", "campus", "date",
  "corner_add", "corner_remove", "sermon_notes"
];
const AUDIENCES = ["all", "campus", "hub", "admin"];
const ROLES = ["admin", "hub", "campus"];
const CORNER_TYPES = ["announcement", "note", "prayer_point", "essay"];
const SERMON_FIELD_KEYS = [
  "title", "speaker", "date", "series", "keyVerse", "keyVerseText", "outline"
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

function questionVisible(question, role) {
  if (!question || question.enabled === false) return false;
  if (role === "admin") return true;
  const aud = question.audience || "all";
  if (aud === "all") return true;
  if (aud === "admin") return role === "admin";
  return aud === role;
}

function isCampusId(id) {
  return typeof id === "string" && CAMPUS_SET.has(id);
}

/** Campus pastors may only act on their assigned campus (or the one they pick once). */
function lockCampus(staff, requestedCampus) {
  const requested = isCampusId(requestedCampus) ? requestedCampus : null;
  if (!staff) return null;
  if (staff.role === "campus") {
    if (staff.campusId && isCampusId(staff.campusId)) return staff.campusId;
    return requested;
  }
  return requested || (isCampusId(staff.campusId) ? staff.campusId : null);
}

function sanitize(str, maxLen = 5000) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, maxLen);
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
    commitments
  };
}

function collectCampusFromAnswers(questions, answers) {
  for (const q of questions || []) {
    if (q.type === "campus") {
      const v = answers && answers[q.id];
      if (isCampusId(v)) return v;
    }
  }
  return null;
}

function applyAnswers(questions, answers, ctx) {
  const sermonPatch = {};
  let hasSermon = false;
  const cornerAdds = [];
  const cornerRemoves = [];
  const author = sanitize((ctx && ctx.name) || "", 100);

  for (const q of questions || []) {
    const val = answers ? answers[q.id] : undefined;
    if (val == null || val === "" || val === false) continue;
    const cfg = q.config && typeof q.config === "object" ? q.config : {};

    if (q.type === "corner_add") {
      const items = Array.isArray(val) ? val : [val];
      for (const it of items) {
        if (!it || typeof it !== "object") continue;
        const title = sanitize(it.title || "", 200);
        const content = sanitize(it.content || "", 5000);
        if (!title || !content) continue;
        const type = CORNER_TYPES.includes(it.type) ? it.type : "announcement";
        cornerAdds.push({ type, title, content, author });
      }
    }

    if (q.type === "corner_remove") {
      const ids = Array.isArray(val) ? val : (val && val.ids) || [];
      for (const id of ids) {
        if (typeof id === "string" && id.length > 8 && id.length < 80) cornerRemoves.push(id);
      }
    }

    if (q.type === "sermon_notes" && val && typeof val === "object") {
      Object.assign(sermonPatch, val);
      hasSermon = true;
    }

    if (cfg.publish === "campus_corner") {
      const content = typeof val === "string" ? sanitize(val, 5000) : "";
      if (content) {
        const type = CORNER_TYPES.includes(cfg.itemType) ? cfg.itemType : "note";
        cornerAdds.push({ type, title: sanitize(q.label || "Update", 200), content, author });
      }
    }

    if (cfg.publish === "sermon_field" && SERMON_FIELD_KEYS.includes(cfg.sermonKey)) {
      sermonPatch[cfg.sermonKey] = typeof val === "string" || typeof val === "boolean" ? val : String(val);
      hasSermon = true;
    }
  }

  const sermon = hasSermon && (sermonPatch.title || sermonPatch.outline || sermonPatch.body || sermonPatch.speaker)
    ? sermonFromNotes(sermonPatch)
    : null;

  return { sermon, cornerAdds, cornerRemoves };
}

function publicStaff(staff) {
  if (!staff) return null;
  return {
    email: staff.email,
    role: staff.role,
    campusId: staff.campusId || null,
    name: staff.name || "",
    isAdmin: staff.role === "admin"
  };
}

function passwordIssue(password, email) {
  const p = String(password || "");
  if (p.length < 10) return "Use at least 10 characters.";
  if (p.length > 200) return "Password is too long.";
  if (email && p.toLowerCase() === String(email).toLowerCase()) return "Do not use your email as the password.";
  return null;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string" || typeof password !== "string") return false;
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
  questionVisible,
  isCampusId,
  lockCampus,
  sanitize,
  slugify,
  parseOutline,
  sermonFromNotes,
  collectCampusFromAnswers,
  applyAnswers,
  publicStaff,
  passwordIssue,
  hashPassword,
  verifyPassword
};
