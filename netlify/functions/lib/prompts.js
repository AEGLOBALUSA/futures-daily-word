/**
 * Daily Word prompt switches and send log (MOS-to-8 build B09-01).
 *
 * Every Daily Word notice (Sunday notes missing, the corner draft, the prayer
 * and reading lines, the I'm New hello, the v2 daily push) goes through these
 * helpers, in this order:
 *
 *   const { mode, shadowRecipients } = await switchOf(db, kind);   // fail closed
 *   if (!deliverable(mode, recipient, shadowRecipients)) return;    // off / not on the list
 *   if (!(await claim(db, { kind, dedupeKey, recipient, mode, writtenBy, ... }))) return; // raised already
 *   await sendStaffEmail({ to: recipient, subject, text });
 *
 * Modes (chapter 13 contract C4; tables in
 * supabase/migrations/20261002120000_dw_prompt_switches.sql):
 *   off     nothing is generated for anyone. The default for every kind.
 *   shadow  delivered only to addresses on that kind's shadow_recipients list
 *           (Ashley alone by default, set by hand with one SQL update, never
 *           committed: this repo is public).
 *   live    delivered to everyone the kind allows. Only Ashley sets it, and
 *           only after he switches the region on (Ashley, 1 Oct 2026: all
 *           alerts off until a region is switched on; B09-13 adds the gate).
 *
 * Fail closed everywhere: a database error reads as "off", a failed or
 * duplicate log insert means "do not send", and sendStaffEmail never throws.
 * Kinds about readers keep counts and links only in the log's title and body:
 * never a reader's name, email or prayer text. Nothing here calls a model.
 *
 * The tests live in tests/functions/prompts.test.js, never in this folder
 * (Netlify treats every file under netlify/functions as a function).
 */

const MODES = new Set(["off", "shadow", "live"]);
const LOGGED_MODES = new Set(["shadow", "live"]);
const WRITERS = new Set(["template", "model"]);
const KIND_RE = /^dw_[a-z0-9_]{2,60}$/;

const RESEND_URL = "https://api.resend.com/emails";
// The same sender as sermon-notes-email.js (futuresdailyword.com is verified
// in Resend; SERMON_NOTES_FROM overrides both).
const DEFAULT_FROM = "Futures Daily Word <notes@futuresdailyword.com>";
const SEND_TIMEOUT_MS = 12000;

const MAX_DEDUPE = 300;
const MAX_RECIPIENT = 320;
const MAX_TITLE = 200;
const MAX_BODY = 4000;
const MAX_LINK = 1000;
const MAX_SUBJECT = 200;
const MAX_TEXT = 20000;

/** Lower-cased and trimmed, so an address compares the same however it was typed. */
function normalizeRecipient(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** For logs: never a whole address. */
function maskRecipient(value) {
  const s = String(value || "");
  const at = s.indexOf("@");
  if (at < 0) return s ? `${s.slice(0, 2)}***` : "";
  return `${s.slice(0, 1)}***${s.slice(at)}`;
}

/**
 * A kind's switch: its mode and its shadow list. Any error, a missing row, an
 * unknown kind or an unexpected value reads as off with an empty list.
 */
async function switchOf(db, kind) {
  const off = { mode: "off", shadowRecipients: [] };
  if (!db || typeof kind !== "string" || !KIND_RE.test(kind)) return off;
  try {
    const { data, error } = await db
      .from("dw_prompt_kind")
      .select("mode, shadow_recipients")
      .eq("kind", kind)
      .maybeSingle();
    if (error || !data || !MODES.has(data.mode)) return off;
    const list = Array.isArray(data.shadow_recipients)
      ? data.shadow_recipients.map(normalizeRecipient).filter(Boolean)
      : [];
    return { mode: data.mode, shadowRecipients: list };
  } catch (err) {
    console.error(`[prompts] switchOf ${kind} failed: ${err && err.message}`);
    return off;
  }
}

/** The kind's mode: 'off' | 'shadow' | 'live', and 'off' on any error. */
async function modeOf(db, kind) {
  return (await switchOf(db, kind)).mode;
}

/**
 * May this recipient be sent this kind right now?
 *   live   → yes
 *   shadow → only when the recipient is on the shadow list
 *   off, or anything else → no
 */
function deliverable(mode, recipient, shadowRecipients) {
  const who = normalizeRecipient(recipient);
  if (!who) return false;
  if (mode === "live") return true;
  if (mode !== "shadow") return false;
  if (!Array.isArray(shadowRecipients)) return false;
  return shadowRecipients.some((r) => normalizeRecipient(r) === who);
}

function clip(value, max) {
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Write the log row BEFORE delivering. true = this is the first time, go ahead;
 * false = raised already (unique dedupe_key), or the row could not be written,
 * or the input is wrong. Either way false means "do not send".
 */
async function claim(db, { kind, dedupeKey, recipient, writtenBy, title, body, link, mode } = {}) {
  if (!db) return false;
  if (typeof kind !== "string" || !KIND_RE.test(kind)) return false;
  if (!LOGGED_MODES.has(mode)) return false;
  if (!WRITERS.has(writtenBy)) return false;
  const key = typeof dedupeKey === "string" ? dedupeKey.trim() : "";
  if (!key || key.length > MAX_DEDUPE) return false;
  const who = normalizeRecipient(recipient);
  if (!who || who.length > MAX_RECIPIENT) return false;

  const row = {
    kind,
    dedupe_key: key,
    recipient: who,
    mode,
    written_by: writtenBy,
    title: clip(title, MAX_TITLE),
    body: clip(body, MAX_BODY),
    link: clip(link, MAX_LINK),
  };
  try {
    const { error } = await db.from("dw_prompt_log").insert(row);
    if (!error) return true;
    if (error.code !== "23505") {
      console.error(`[prompts] claim ${kind} for ${maskRecipient(who)} failed: ${error.code || ""} ${error.message || ""}`);
    }
    return false;
  } catch (err) {
    console.error(`[prompts] claim ${kind} threw: ${err && err.message}`);
    return false;
  }
}

/**
 * Text that must never reach a person: empty, the words "undefined" or "null"
 * left by a missing value, or template braces that were never filled.
 * Returns { ok, reasons }.
 */
function lintStaffText(text) {
  const reasons = [];
  if (typeof text !== "string" || !text.trim()) {
    reasons.push("empty");
    return { ok: false, reasons };
  }
  if (/\bundefined\b/i.test(text)) reasons.push("undefined");
  if (/\bnull\b/i.test(text)) reasons.push("null");
  if (/\bNaN\b/.test(text)) reasons.push("nan");
  if (/\{\{|\}\}|\$\{|\{[A-Za-z_][\w.]*\}/.test(text)) reasons.push("template_braces");
  if (/\[object Object\]/.test(text)) reasons.push("object");
  return { ok: reasons.length === 0, reasons };
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * One plain-text email to a staff member, through Resend, from the same sender
 * as the Sermon Notes email. Never throws; returns { ok, id } or
 * { ok: false, error }. It sends whatever it is given: the caller decides with
 * switchOf + deliverable + claim first. Subject and text are linted, and a
 * failure refuses the send.
 */
async function sendStaffEmail({ to, subject, text } = {}) {
  try {
    const who = normalizeRecipient(to);
    if (!who || !isEmail(who)) return { ok: false, error: "bad_recipient" };
    if (!lintStaffText(subject).ok || !lintStaffText(text).ok) return { ok: false, error: "lint" };
    if (subject.length > MAX_SUBJECT || text.length > MAX_TEXT) return { ok: false, error: "too_long" };
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, error: "not_configured" };
    const from = process.env.SERMON_NOTES_FROM || DEFAULT_FROM;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      const res = await fetch(RESEND_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [who],
          subject: subject.trim(),
          text,
          tags: [{ name: "app", value: "daily-word" }, { name: "kind", value: "staff-prompt" }],
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`[prompts] resend ${res.status} to ${maskRecipient(who)}`);
        return { ok: false, error: "provider" };
      }
      return { ok: true, id: data && data.id };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.error(`[prompts] sendStaffEmail threw: ${err && err.message}`);
    return { ok: false, error: "provider" };
  }
}

module.exports = {
  switchOf,
  modeOf,
  deliverable,
  claim,
  sendStaffEmail,
  lintStaffText,
  normalizeRecipient,
};
