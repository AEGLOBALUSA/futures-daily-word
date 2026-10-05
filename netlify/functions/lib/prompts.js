/**
 * Daily Word prompt switches and send log (MOS-to-8 build B09-01).
 *
 * Every Daily Word staff email (Sunday notes missing, the corner draft, the
 * prayer and reading lines, the I'm New hello) goes through ONE helper:
 *
 *   await raiseStaffEmail(db, { kind, dedupeKey, recipient, writtenBy,
 *                               title, body, link, subject, text });
 *
 * It runs, in this order: switchOf (fail closed) -> deliverable (off / not on
 * the shadow list) -> lint -> claim (raised already) -> sendStaffEmail ->
 * markDelivered. Later builds (B09-10 to B09-18) call raiseStaffEmail and
 * NEVER sendStaffEmail directly: sendStaffEmail checks no switch and would
 * email a real person while the region is off. A notice that is not an email
 * (the v2 daily push) uses switchOf + deliverable + claim + markDelivered in
 * the same order.
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
 * { ok: false, error }. It sends whatever it is given and checks no switch:
 * call raiseStaffEmail instead, never this directly from a function. Subject
 * and text are linted, and a failure refuses the send.
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

/**
 * Mark a claimed row as delivered once the provider accepted it, so the log
 * tells a notice that arrived from one that failed (Ashley's shadow review
 * reads delivered). Never throws; true when the row was updated.
 */
async function markDelivered(db, dedupeKey) {
  const key = typeof dedupeKey === "string" ? dedupeKey.trim() : "";
  if (!db || !key || key.length > MAX_DEDUPE) return false;
  try {
    const { error } = await db.from("dw_prompt_log").update({ delivered: true }).eq("dedupe_key", key);
    if (error) {
      console.error(`[prompts] markDelivered failed: ${error.code || ""} ${error.message || ""}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[prompts] markDelivered threw: ${err && err.message}`);
    return false;
  }
}

/**
 * The one way a Daily Word function emails a staff member about a prompt kind.
 * Never throws. Returns { sent: true, id } or { sent: false, reason } where
 * reason is one of: off (the switch, or not on the shadow list), shadow_logged
 * (logInShadow: logged for a recipient off the shadow list, not sent), lint (the
 * words would reach a person broken; checked BEFORE the claim so the key is
 * not spent), duplicate (raised already, or the log row could not be written),
 * provider (the send failed; the row stays delivered = false).
 */
async function raiseStaffEmail(db, { kind, dedupeKey, recipient, writtenBy, title, body, link, subject, text, logInShadow = false } = {}) {
  try {
    const { mode, shadowRecipients } = await switchOf(db, kind);
    const canDeliver = deliverable(mode, recipient, shadowRecipients);
    // logInShadow (B09-10): in shadow, a recipient who is NOT on the shadow list
    // still gets their log row (delivered stays false) and is never emailed, so
    // the owner's shadow weekend shows exactly who live would have reached. Off
    // still logs nothing.
    const logOnly = !canDeliver && logInShadow === true && mode === "shadow" && !!normalizeRecipient(recipient);
    if (!canDeliver && !logOnly) return { sent: false, reason: "off" };
    if (!lintStaffText(subject).ok || !lintStaffText(text).ok) return { sent: false, reason: "lint" };
    const claimed = await claim(db, { kind, dedupeKey, recipient, writtenBy, title, body, link, mode });
    if (!claimed) return { sent: false, reason: "duplicate" };
    if (logOnly) return { sent: false, reason: "shadow_logged" };
    const out = await sendStaffEmail({ to: recipient, subject, text });
    if (!out.ok) return { sent: false, reason: "provider" };
    await markDelivered(db, dedupeKey);
    return { sent: true, id: out.id };
  } catch (err) {
    console.error(`[prompts] raiseStaffEmail ${kind} threw: ${err && err.message}`);
    return { sent: false, reason: "provider" };
  }
}

module.exports = {
  raiseStaffEmail,
  markDelivered,
  switchOf,
  modeOf,
  deliverable,
  claim,
  sendStaffEmail,
  lintStaffText,
  normalizeRecipient,
};
