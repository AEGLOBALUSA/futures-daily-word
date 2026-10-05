/**
 * The prayer wall's deterministic screen (MOS-to-8 build B09-12).
 *
 * A request that carries an email address, a phone number (8 or more digits),
 * a link, or a word on the short language list waits for a staff look before
 * it reaches the wall. Nothing here calls a model: the same text always gets
 * the same answer, and holding by mistake only means a staff member looks.
 *
 *   screenPrayer(text, name) -> { held: false, reason: null }
 *                             | { held: true, reason: 'contact' | 'link' | 'language' }
 *
 * The reason order is contact, then link, then language (the first that
 * matches). The name is screened too: it is shown on the wall beside the text.
 *
 * The tests live in tests/functions/prayer-screen.test.js, never in this folder
 * (Netlify treats every file under netlify/functions as a function).
 */

const EMAIL_RE = /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/i;
// "name at gmail dot com" and friends.
const SPELLED_EMAIL_RE = /\b(?:at|@)\s*(?:gmail|hotmail|outlook|yahoo|icloud|live|bigpond|proton(?:mail)?)\b/i;

// A run of digits with the separators people type in a phone number. Colons
// are not separators, so "John 3:16" or "10:30" never count.
const PHONE_RUN_RE = /\+?\(?\d[\d\s().\-‐-―]*\d/g;
// Calendar dates are taken out first, so "05/10/2026" or "2026-10-05" is not a phone.
const DATE_RE = /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/g;
const MIN_PHONE_DIGITS = 8;

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/i;
const BARE_DOMAIN_RE = /\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:com|org|net|church|global|io|co|au|nz|uk|us|me|ly|gg|info|biz|app|xyz|link|tv|online|site|shop|club|page|id|mx|br)\b(?:\/\S*)?/i;
const HANDLE_RE = /(?:^|\s)@[a-z0-9_.]{3,}/i;

// A short list, matched as whole words (and their endings), in the wall's
// languages. Kept short on purpose: it catches the obvious, a staff look
// catches the rest. "Hell" and "damn" are not on it (they belong in prayers).
const LANGUAGE_RE = new RegExp(
  "\\b(?:" +
    [
      "fuck\\w*", "f\\*+k\\w*", "motherf\\w*", "shit\\w*", "bullshit", "bitch\\w*", "cunt\\w*",
      "asshole\\w*", "arsehole\\w*", "bastard\\w*", "slut\\w*", "whore\\w*", "dickhead\\w*",
      "wanker\\w*", "twat\\w*", "cocksucker\\w*", "retard\\w*", "fag\\w*", "nigg\\w*",
      // es / pt
      "puta\\w*", "puto\\w*", "mierda\\w*", "pendej\\w*", "cabr[oó]n\\w*", "co[nñ]o", "chinga\\w*",
      "caralh\\w*", "porra", "merda\\w*", "foda\\w*",
      // id
      "anjing", "bangsat", "kontol\\w*", "ngentot\\w*", "bajingan",
    ].join("|") +
  ")\\b",
  "iu"
);

function hasPhone(text) {
  const withoutDates = text.replace(DATE_RE, " ");
  const runs = withoutDates.match(PHONE_RUN_RE) || [];
  return runs.some((run) => run.replace(/\D/g, "").length >= MIN_PHONE_DIGITS);
}

function reasonFor(text) {
  if (typeof text !== "string" || !text) return null;
  if (EMAIL_RE.test(text) || SPELLED_EMAIL_RE.test(text) || hasPhone(text)) return "contact";
  if (URL_RE.test(text) || BARE_DOMAIN_RE.test(text) || HANDLE_RE.test(text)) return "link";
  if (LANGUAGE_RE.test(text)) return "language";
  return null;
}

const ORDER = ["contact", "link", "language"];

/** Does this request wait for a look, and why? The text and the name are both screened. */
function screenPrayer(text, name) {
  const reasons = [reasonFor(text), reasonFor(name)].filter(Boolean);
  if (!reasons.length) return { held: false, reason: null };
  const reason = ORDER.find((r) => reasons.includes(r));
  return { held: true, reason };
}

module.exports = { screenPrayer, HELD_REASONS: ORDER };
