/**
 * Email proof — a one-time 6-digit code, typed by the person, that turns an
 * UNPROVEN session token (see lib/auth.js) into a proven one.
 *
 * Why: knowing an email address is not proof of owning it. A token issued for
 * an address that already has a profile only identifies the caller. Before it
 * can read or write the reader's journal it has to show that its holder can
 * read the inbox: we email a code to the address on file and the person types
 * it into the app. NO LINKS of any kind are sent or accepted (house rule: a
 * one-time code typed by the person is fine, a clickable sign-in link is not).
 *
 * Storage: the shared `rate_limit_hits` table (key text, created_at), the same
 * table lib/rate-limit.js uses, so no migration is needed. Keys:
 *   dwproof-code:<tokenHash>:<sha256(email|tokenHash|code)>   a live code
 *   dwproof-send:<email>                                       a send, per address
 *   dwproof-send-all                                           a send, global
 *   dwproof-try:<email>                                        a try, per address
 *   dwproof-tryt:<tokenHash>                                   a try, per token
 *
 * Everything here FAILS CLOSED. lib/rate-limit.js degrades to "allow" when the
 * table is unreachable; for a security gate that is the wrong way round, so
 * these counters read and write the table directly and refuse on any error.
 *
 * Sender pattern copied from sermon-notes-email.js (not imported, so the two
 * files can change independently).
 */

const crypto = require("crypto");
const { promoteToken } = require("./auth");

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Futures Daily Word <notes@futuresdailyword.com>";

const CODE_TTL_MS = 10 * 60 * 1000;
const SEND_PER_EMAIL_15M = 3;
const SEND_PER_EMAIL_DAY = 8;
const SEND_GLOBAL_HOUR = 300;
const TRIES_PER_TOKEN_10M = 5;
const TRIES_PER_EMAIL_HOUR = 10;

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const COPY = {
  en: {
    subject: "Your Daily Word code",
    line1: (c) => `Your code is ${c}.`,
    line2: "Type it into Daily Word to bring your journal and highlights onto this device. It works for 10 minutes.",
    line3: "If you did not ask for it, ignore this email; nothing changes on your account.",
  },
  es: {
    subject: "Tu código de Daily Word",
    line1: (c) => `Tu código es ${c}.`,
    line2: "Escríbelo en Daily Word para traer tu diario y tus resaltados a este dispositivo. Funciona durante 10 minutos.",
    line3: "Si no lo pediste, ignora este correo; nada cambia en tu cuenta.",
  },
  pt: {
    subject: "Seu código do Daily Word",
    line1: (c) => `Seu código é ${c}.`,
    line2: "Digite-o no Daily Word para trazer seu diário e seus destaques para este aparelho. Ele vale por 10 minutos.",
    line3: "Se você não pediu, ignore este e-mail; nada muda na sua conta.",
  },
  id: {
    subject: "Kode Daily Word Anda",
    line1: (c) => `Kode Anda adalah ${c}.`,
    line2: "Ketik kode ini di Daily Word untuk membawa jurnal dan sorotan Anda ke perangkat ini. Kode berlaku selama 10 menit.",
    line3: "Jika Anda tidak memintanya, abaikan email ini; tidak ada perubahan pada akun Anda.",
  },
};

function pickLang(lang) {
  const l = String(lang || "en").slice(0, 2).toLowerCase();
  return COPY[l] ? l : "en";
}

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function codeKey(email, tokenHash, code) {
  return `dwproof-code:${tokenHash}:${sha256(`${email}|${tokenHash}|${code}`)}`;
}

function buildMessage(code, lang) {
  const c = COPY[pickLang(lang)];
  const text = `${c.line1(code)}\n\n${c.line2}\n\n${c.line3}\n`;
  const html =
    `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1c140c">` +
    `<p>${c.line1(`<strong style="font-size:24px;letter-spacing:4px">${code}</strong>`)}</p>` +
    `<p>${c.line2}</p><p style="color:#6b6258">${c.line3}</p></div>`;
  return { subject: c.subject, text, html };
}

/** Rows for `key` (exact, or LIKE pattern when `like`) newer than `windowMs`. Throws on any error. */
async function countRows(db, key, windowMs, like = false) {
  const since = new Date(Date.now() - windowMs).toISOString();
  let q = db.from("rate_limit_hits").select("*", { count: "exact", head: true });
  q = like ? q.like("key", key) : q.eq("key", key);
  const { count, error } = await q.gte("created_at", since);
  if (error || count == null) throw new Error("proof count failed");
  return count;
}

async function insertRow(db, key) {
  const { error } = await db.from("rate_limit_hits").insert({ key });
  if (error) throw new Error("proof insert failed");
}

async function sendWithResend({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, status: 503, error: "not_configured" };
  const from = process.env.PROOF_CODE_FROM || DEFAULT_FROM;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
        tags: [{ name: "app", value: "daily-word" }, { name: "kind", value: "proof-code" }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error(`[email-proof] resend ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
      return { ok: false, status: 502, error: "provider" };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[email-proof] resend threw: ${err && err.message}`);
    return { ok: false, status: 502, error: "provider" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Email a fresh code to `email`, bound to the token that asked for it.
 * @returns {Promise<{ok: boolean, status: number, error?: string}>}
 */
async function sendProofCode(db, email, tokenHash, lang) {
  if (!process.env.RESEND_API_KEY) return { ok: false, status: 503, error: "not_configured" };

  // Send limits (fail closed): 3 / 15 min and 8 / day per address, 300 / hour overall.
  try {
    const sendKey = `dwproof-send:${email}`;
    if ((await countRows(db, sendKey, 15 * MIN)) >= SEND_PER_EMAIL_15M) return { ok: false, status: 429, error: "too_many" };
    if ((await countRows(db, sendKey, DAY)) >= SEND_PER_EMAIL_DAY) return { ok: false, status: 429, error: "too_many" };
    if ((await countRows(db, "dwproof-send-all", HOUR)) >= SEND_GLOBAL_HOUR) return { ok: false, status: 429, error: "busy" };
    await insertRow(db, sendKey);
    await insertRow(db, "dwproof-send-all");
  } catch (err) {
    console.error("[email-proof] send limiter unavailable:", err && err.message);
    return { ok: false, status: 503, error: "unavailable" };
  }

  // Tidy up: proof rows older than two days are of no use to any limit or code.
  if (Math.random() < 0.05) {
    try {
      await db.from("rate_limit_hits").delete().like("key", "dwproof-%").lt("created_at", new Date(Date.now() - 2 * DAY).toISOString());
    } catch { /* housekeeping only */ }
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const msg = buildMessage(code, lang);
  const sent = await sendWithResend({ to: email, ...msg });
  if (!sent.ok) return sent;

  // Store the code only once the email is really on its way; it replaces any
  // earlier code this token asked for (only the newest one is valid).
  try {
    const { error: delErr } = await db.from("rate_limit_hits").delete().like("key", `dwproof-code:${tokenHash}:%`);
    if (delErr) throw new Error("proof delete failed");
    await insertRow(db, codeKey(email, tokenHash, code));
  } catch (err) {
    console.error("[email-proof] could not store code:", err && err.message);
    return { ok: false, status: 503, error: "unavailable" };
  }
  return { ok: true, status: 200 };
}

/**
 * Check a typed code for this token and, on a match, promote the token.
 * @returns {Promise<{ok: boolean, status: number, error?: string}>}
 */
async function verifyProofCode(db, email, tokenHash, code) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return { ok: false, status: 400, error: "invalid_code" };

  try {
    // The attempt is recorded BEFORE anything is checked; if it cannot be
    // recorded we refuse, so a broken counter can never mean unlimited tries.
    await insertRow(db, `dwproof-tryt:${tokenHash}`);
    await insertRow(db, `dwproof-try:${email}`);
    if ((await countRows(db, `dwproof-tryt:${tokenHash}`, 10 * MIN)) > TRIES_PER_TOKEN_10M) return { ok: false, status: 429, error: "too_many" };
    if ((await countRows(db, `dwproof-try:${email}`, HOUR)) > TRIES_PER_EMAIL_HOUR) return { ok: false, status: 429, error: "too_many" };

    const matches = await countRows(db, codeKey(email, tokenHash, code), CODE_TTL_MS);
    if (matches < 1) return { ok: false, status: 400, error: "invalid_code" };

    // Single use: the code row goes first, so a replay (or a second tab) finds nothing.
    const { error: delErr } = await db.from("rate_limit_hits").delete().like("key", `dwproof-code:${tokenHash}:%`);
    if (delErr) throw new Error("proof delete failed");
  } catch (err) {
    console.error("[email-proof] verify refused:", err && err.message);
    return { ok: false, status: 503, error: "unavailable" };
  }

  const promoted = await promoteToken(db, email, tokenHash);
  if (!promoted) return { ok: false, status: 409, error: "token_gone" };
  return { ok: true, status: 200 };
}

module.exports = { sendProofCode, verifyProofCode, buildMessage, pickLang };
