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
 * <ip> is the caller's rate-limit key (lib/client-ip.js rateLimitKeyIp): an IPv4
 * address as it is, an IPv6 address reduced to its /64.
 *   dwproof-send:<email>:<ip>                                  a send, per address AND caller IP
 *   dwproof-send:<email>                                       a send, per address (loose backstop)
 *   dwproof-send-new:<email>:<ip>                              a send to an address that has never held a proven token, per caller IP
 *   dwproof-send-new:<email>                                   the same, per address (loose backstop, enforced only
 *                                                              on a caller whose own IP already sent to it that day)
 *   dwproof-send-ip:<ip>                                       a send, per caller IP
 *   dwproof-send-all                                           a send to an address with a proven history, global
 *   dwproof-send-all-new                                       a send to an address with no proven history, global
 *   dwproof-try:<email>                                        a try, per address (backstop)
 *   dwproof-tryt:<tokenHash>                                   a try, per token (the real guard)
 *
 * Everything here FAILS CLOSED. lib/rate-limit.js degrades to "allow" when the
 * table is unreachable; for a security gate that is the wrong way round, so
 * these counters read and write the table directly and refuse on any error.
 *
 * Sender pattern copied from sermon-notes-email.js (not imported, so the two
 * files can change independently).
 */

const crypto = require("crypto");
const { promoteToken, proofCodePrefix, CODE_TTL_MS, isPlain } = require("./auth");
const { rateLimitKeyIp } = require("./client-ip");

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Futures Daily Word <notes@futuresdailyword.com>";

// The 3 / 15 min and 8 / day caps are per address AND caller IP, so a stranger
// on another connection cannot use up a reader's sends for the day. The
// address-wide cap is only a loose backstop against a spread-out flood.
const SEND_PER_EMAIL_15M = 3;
const SEND_PER_EMAIL_DAY = 8;
const SEND_PER_EMAIL_ALL_IPS_DAY = 30;
// One caller IP can ask for at most this many code emails an hour, so a single
// attacker cannot spend the global cap (or many readers' per-address budgets).
const SEND_PER_IP_HOUR = 20;
// Two global buckets: sends to addresses that have held a proven token, and
// sends to addresses that never have. Junk addresses (anyone can register one)
// only ever spend the second, smaller bucket, so they cannot use up the budget
// for readers who have proved before.
const SEND_GLOBAL_HOUR = 300;
const SEND_GLOBAL_NEW_HOUR = 150;
// An address that has never held a proven token may be one nobody owns, or a
// stranger's: anyone can register it (new email) and register it again (existing
// email) to get an unproven token, then ask for a code to be mailed to it. So an
// address with no proven history gets a much smaller budget of its own: one send
// per 15 minutes and two a day from one caller IP. A real new reader needs one; a
// typo a second. It is per IP so that a stranger's two sends cannot block the
// reader's second device for the day (every reader who joined since the proof
// change has no proven history: their first device holds an "r:" token). The
// address-wide backstop of six a day refuses only a caller whose own IP (/64)
// has already sent to this address that day, so a stranger's sends from other
// connections (or other addresses in their /64) never take the reader's second
// device's first send; a fresh connection's one send is bounded by the per-IP
// 20 / hour, the address 30 / day and the global 150 / hour for never-proven
// addresses.
const SEND_NEW_15M = 1;
const SEND_NEW_DAY = 2;
const SEND_NEW_ALL_IPS_DAY = 6;
// A code belongs to one token, so the per-TOKEN limit is what stops guessing: 5
// tries on a 1-in-a-million code, and a token only has a code after a send,
// which the per-address send limits cap. The per-ADDRESS limit is only a loose
// backstop: a tight one lets a stranger use up a reader's tries for them.
const TRIES_PER_TOKEN_10M = 5;
const TRIES_PER_EMAIL_HOUR = 60;

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

// The staff setup code (intake.js email_setup_code). Same look as the reader
// proof email above, and likewise NO links: the person types the code.
const STAFF_COPY = {
  en: {
    subject: "Your Daily Word staff code",
    line1: (c) => `Your code is ${c}.`,
    line2: "Type it in Daily Word or Sermon Prep to choose your password. It works once and expires in 30 minutes.",
    line3: "If you didn't ask for this, ignore this email. Nothing on your account has changed.",
  },
  es: {
    subject: "Tu código de equipo de Daily Word",
    line1: (c) => `Tu código es ${c}.`,
    line2: "Escríbelo en Daily Word o Sermon Prep para elegir tu contraseña. Funciona una sola vez y caduca en 30 minutos.",
    line3: "Si no lo pediste, ignora este correo. No ha cambiado nada en tu cuenta.",
  },
  pt: {
    subject: "Seu código de equipe do Daily Word",
    line1: (c) => `Seu código é ${c}.`,
    line2: "Digite-o no Daily Word ou no Sermon Prep para escolher sua senha. Ele funciona uma vez e expira em 30 minutos.",
    line3: "Se você não pediu isto, ignore este e-mail. Nada mudou na sua conta.",
  },
  id: {
    subject: "Kode staf Daily Word Anda",
    line1: (c) => `Kode Anda adalah ${c}.`,
    line2: "Ketik kode ini di Daily Word atau Sermon Prep untuk memilih kata sandi Anda. Kode ini hanya berlaku sekali dan kedaluwarsa dalam 30 menit.",
    line3: "Jika Anda tidak memintanya, abaikan email ini. Tidak ada yang berubah pada akun Anda.",
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
  return `${proofCodePrefix(tokenHash)}${sha256(`${email}|${tokenHash}|${code}`)}`;
}

function renderMessage(c, code) {
  const text = `${c.line1(code)}\n\n${c.line2}\n\n${c.line3}\n`;
  const html =
    `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1c140c">` +
    `<p>${c.line1(`<strong style="font-size:24px;letter-spacing:4px">${code}</strong>`)}</p>` +
    `<p>${c.line2}</p><p style="color:#6b6258">${c.line3}</p></div>`;
  return { subject: c.subject, text, html };
}

function buildMessage(code, lang) {
  return renderMessage(COPY[pickLang(lang)], code);
}

/** The staff setup-code email (subject, plain text and HTML), in en/es/pt/id. */
function buildStaffCodeMessage(code, lang) {
  return renderMessage(STAFF_COPY[pickLang(lang)], code);
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

/**
 * Has this address ever held a PROVEN token? Plain entries in
 * session_token_hashes are only ever removed by the proven cap (5), so a profile
 * that has had one still has one. "r:" (first-device) tokens do not count: nobody
 * showed they own the inbox. Throws on any error (fail closed).
 */
async function hasProvenHistory(db, email) {
  const { data, error } = await db.from("profiles").select("session_token_hashes").eq("email", email).maybeSingle();
  if (error) throw new Error("proof history read failed");
  const hashes = data && Array.isArray(data.session_token_hashes) ? data.session_token_hashes : [];
  return hashes.some(isPlain);
}

async function insertRow(db, key) {
  const { error } = await db.from("rate_limit_hits").insert({ key });
  if (error) throw new Error("proof insert failed");
}

async function sendWithResend({ to, subject, html, text, kind = "proof-code" }) {
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
        tags: [{ name: "app", value: "daily-word" }, { name: "kind", value: kind }],
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
async function sendProofCode(db, email, tokenHash, lang, ip) {
  if (!process.env.RESEND_API_KEY) return { ok: false, status: 503, error: "not_configured" };

  // Send limits (fail closed): 3 / 15 min and 8 / day per address and caller
  // IP, 30 / day per address from any IP, 20 / hour per caller IP, and a global
  // hourly cap (300 for addresses with a proven history, 150 for the rest). An
  // address that has never held a proven token also gets 1 / 15 min and 2 / day
  // per caller IP, and 6 / day from all IPs together (enforced only on a caller
  // whose own IP already sent to the address today). Every per-IP key uses the
  // caller's /64 for IPv6.
  //
  // Two passes. The first only reads, so an ordinary refused retry writes
  // nothing. The second is what makes the limits hold under a parallel burst
  // (Netlify spreads parallel calls across instances, so the in-memory limit in
  // user-profile.js does not): each key gets this attempt's row FIRST and is
  // only then counted, refusing when the count is above the cap (the row of this
  // attempt is already in it). N parallel calls write N rows, so at most `cap` of
  // them can see a count within the cap; the same shape as setupMissLock in
  // intake.js. Keys go narrowest first (this caller on this address, then this
  // caller, then the address, then the global bucket), so a burst refused at a
  // narrow key never writes a row to a wider one. Rows of a refused attempt stay
  // as recorded attempts, which only ever errs towards refusing.
  try {
    // An IPv6 caller is keyed on its /64: one host can use any address in it.
    const realIp = rateLimitKeyIp(ip || "unknown");
    const proven = await hasProvenHistory(db, email);
    // The never-proven address-wide backstop only binds a caller whose own IP has
    // already sent to this address today (read before this attempt writes).
    const ownNewToday = proven ? 0 : await countRows(db, `dwproof-send-new:${email}:${realIp}`, DAY);
    const stages = [
      { key: `dwproof-send:${email}:${realIp}`, limits: [[15 * MIN, SEND_PER_EMAIL_15M], [DAY, SEND_PER_EMAIL_DAY]], error: "too_many" },
      ...(proven ? [] : [{ key: `dwproof-send-new:${email}:${realIp}`, limits: [[15 * MIN, SEND_NEW_15M], [DAY, SEND_NEW_DAY]], error: "too_many" }]),
      { key: `dwproof-send-ip:${realIp}`, limits: [[HOUR, SEND_PER_IP_HOUR]], error: "too_many" },
      // Recorded for every send; refuses only a caller that already sent here today.
      ...(proven ? [] : [{ key: `dwproof-send-new:${email}`, limits: ownNewToday > 0 ? [[DAY, SEND_NEW_ALL_IPS_DAY]] : [], error: "too_many" }]),
      { key: `dwproof-send:${email}`, limits: [[DAY, SEND_PER_EMAIL_ALL_IPS_DAY]], error: "too_many" },
      proven
        ? { key: "dwproof-send-all", limits: [[HOUR, SEND_GLOBAL_HOUR]], error: "busy" }
        : { key: "dwproof-send-all-new", limits: [[HOUR, SEND_GLOBAL_NEW_HOUR]], error: "busy" },
    ];
    // Pass 1: read only. Already at a cap means refuse, and nothing is written.
    for (const st of stages) {
      for (const [windowMs, cap] of st.limits) {
        if ((await countRows(db, st.key, windowMs)) >= cap) return { ok: false, status: 429, error: st.error };
      }
    }
    // Pass 2: insert, then count (this attempt's own row included).
    for (const st of stages) {
      await insertRow(db, st.key);
      for (const [windowMs, cap] of st.limits) {
        if ((await countRows(db, st.key, windowMs)) > cap) return { ok: false, status: 429, error: st.error };
      }
    }
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
    const { error: delErr } = await db.from("rate_limit_hits").delete().like("key", `${proofCodePrefix(tokenHash)}%`);
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
    // Each attempt is recorded BEFORE it is checked; if it cannot be recorded
    // we refuse, so a broken counter can never mean unlimited tries.
    // 1. The per-token guard first: a token over its limit stops here, before
    //    anything is written against the address.
    await insertRow(db, `dwproof-tryt:${tokenHash}`);
    if ((await countRows(db, `dwproof-tryt:${tokenHash}`, 10 * MIN)) > TRIES_PER_TOKEN_10M) return { ok: false, status: 429, error: "too_many" };
    // 2. A token with no live code cannot match anything, so its try costs the
    //    address nothing: otherwise one stranger token (no code needed) could
    //    fill the address's hourly tries and the reader's right code gets 429.
    if ((await countRows(db, `${proofCodePrefix(tokenHash)}%`, CODE_TTL_MS, true)) < 1) return { ok: false, status: 400, error: "invalid_code" };
    // 3. Only then the loose per-address backstop.
    await insertRow(db, `dwproof-try:${email}`);
    if ((await countRows(db, `dwproof-try:${email}`, HOUR)) > TRIES_PER_EMAIL_HOUR) return { ok: false, status: 429, error: "too_many" };

    const matches = await countRows(db, codeKey(email, tokenHash, code), CODE_TTL_MS);
    if (matches < 1) return { ok: false, status: 400, error: "invalid_code" };

    // Single use: the code row goes first, so a replay (or a second tab) finds nothing.
    const { error: delErr } = await db.from("rate_limit_hits").delete().like("key", `${proofCodePrefix(tokenHash)}%`);
    if (delErr) throw new Error("proof delete failed");
  } catch (err) {
    console.error("[email-proof] verify refused:", err && err.message);
    return { ok: false, status: 503, error: "unavailable" };
  }

  const promoted = await promoteToken(db, email, tokenHash);
  if (!promoted) return { ok: false, status: 409, error: "token_gone" };
  return { ok: true, status: 200 };
}

module.exports = { sendProofCode, verifyProofCode, buildMessage, buildStaffCodeMessage, sendWithResend, pickLang };
