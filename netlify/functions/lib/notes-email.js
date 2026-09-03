/**
 * "Email these notes to me" — the pure part (Ashley, 2 Sep 2026, night).
 *
 * A person on the Sermon Notes page types an address and gets their own
 * filled-in notes, once. This module decides WHAT goes in the email; the
 * function `sermon-notes-email.js` decides whether to send it.
 *
 * Two rules that are not negotiable:
 *
 * 1. The answers the client posts are accepted ONLY under the keys the
 *    published sermon actually has — the same ids SermonNotesSurface and
 *    SermonWorkspace write (`blank-<id>-<section>-<i>`, `resp-<id>-<i>`,
 *    `commit-<i>`, and the workspace's `ws-*` boxes). Anything else is
 *    dropped, every value is bounded, so the email can never carry arbitrary
 *    text under our sender.
 *
 * 2. LICENCE: references and public-domain text only. No NIV, NLT or ESV verse
 *    text ever goes into an email, and the published notes do not say which
 *    edition a quoted verse came from — so NO verse text goes out at all:
 *    `keyVerseText` is dropped and a `quote` item becomes its reference.
 */

const WORKSPACE_KEYS = ["ws-notes", "ws-takeaways", "ws-god", "ws-prayer", "ws-actions", "ws-followup"];
// Generous, and never silent: a value over the cap ends with an ellipsis and
// the email says where the rest is; past the total, the email says so once.
// (Review, 3 Sep 2026: the first cut trimmed a long "My notes" without a word.)
const MAX_VALUE_CHARS = 20000;
const MAX_TOTAL_CHARS = 120000;
const CUT_MARK = "\u2026";

/**
 * Four languages, like the app. Labels only; the notes are the person's own
 * words. The workspace labels (myNotes … followUp) are copied VERBATIM from
 * src/utils/i18n.ts (ws_my_notes, ws_key_takeaways, ws_what_god, ws_prayer,
 * ws_action_steps, ws_follow_up) — this file cannot import the TS table, so
 * when those strings change there, change them here.
 */
const LABELS = {
  en: {
    subject: "Your notes — {title}",
    heading: "Sermon Notes",
    yourNotes: "Your notes",
    response: "My response",
    myNotes: "My Notes",
    takeaways: "Key Takeaways",
    god: "What God Is Saying to Me",
    prayer: "Prayer",
    actions: "Action Steps",
    followUp: "Follow Up",
    cut: "(cut here — the rest is in the app)",
    footer: "Sent once from the Futures Daily Word app because you asked for a copy of your notes.",
    open: "Open the app"
  },
  es: {
    subject: "Tus notas — {title}",
    heading: "Notas del Sermón",
    yourNotes: "Tus notas",
    response: "Mi respuesta",
    myNotes: "Mis notas",
    takeaways: "Ideas clave",
    god: "Lo que Dios me está diciendo",
    prayer: "Oración",
    actions: "Pasos a seguir",
    followUp: "Seguimiento",
    cut: "(cortado aquí; el resto está en la app)",
    footer: "Enviado una sola vez desde la app Futures Daily Word porque pediste una copia de tus notas.",
    open: "Abrir la app"
  },
  pt: {
    subject: "Suas anotações — {title}",
    heading: "Notas do Sermão",
    yourNotes: "Suas anotações",
    response: "Minha resposta",
    myNotes: "Minhas notas",
    takeaways: "Pontos principais",
    god: "O que Deus está me dizendo",
    prayer: "Oração",
    actions: "Próximos passos",
    followUp: "Acompanhamento",
    cut: "(cortado aqui; o resto está no app)",
    footer: "Enviado uma única vez pelo app Futures Daily Word porque você pediu uma cópia das suas anotações.",
    open: "Abrir o app"
  },
  id: {
    subject: "Catatan Anda — {title}",
    heading: "Catatan Khotbah",
    yourNotes: "Catatan Anda",
    response: "Respons saya",
    myNotes: "Catatan Saya",
    takeaways: "Poin Utama",
    god: "Apa yang Tuhan Katakan Padaku",
    prayer: "Doa",
    actions: "Langkah Tindakan",
    followUp: "Tindak Lanjut",
    cut: "(dipotong di sini; sisanya ada di aplikasi)",
    footer: "Dikirim sekali dari aplikasi Futures Daily Word karena Anda meminta salinan catatan Anda.",
    open: "Buka aplikasi"
  }
};

function labelsFor(lang) {
  return LABELS[lang] || LABELS.en;
}

/** Every response key this sermon can legitimately carry. Mirrors the client ids exactly. */
function responseKeys(sermon) {
  const s = sermon && typeof sermon === "object" ? sermon : {};
  const id = String(s.id || "preview");
  const keys = new Set(WORKSPACE_KEYS);
  (Array.isArray(s.sections) ? s.sections : []).slice(0, 4).forEach((section) => {
    const num = section && section.num != null ? String(section.num) : "";
    (Array.isArray(section && section.content) ? section.content : []).forEach((item, i) => {
      if (item && item.type === "blank") keys.add(`blank-${id}-${num}-${i}`);
    });
  });
  (Array.isArray(s.responsePrompts) ? s.responsePrompts : []).filter(Boolean).slice(0, 3)
    .forEach((_, i) => keys.add(`resp-${id}-${i}`));
  (Array.isArray(s.commitments) ? s.commitments : [])
    .forEach((_, i) => keys.add(`commit-${i}`));
  return keys;
}

// Anything a mail client would turn into a link. A person's notes on a sermon
// do not need one; a relay abuser needs nothing else. Scheme URLs and www.
// hosts go unconditionally; so does anything shaped like an email address.
// A bare host.tld goes when it carries a path, or when its (lower-case) top
// level is not an ordinary word — so "futures-secure.tk", "evil.shop" and
// "bit.ly/abc" are removed, while a missing space after a full stop in the
// person's own sentence ("to church.To pray", "loves.Me") is left alone.
// (Review, 3 Sep 2026: a 40-TLD allow-list let every other TLD through and
// ate typo'd words; this is the other way round.)
// Only lower-case matches reach this list (HOST_RE is case-sensitive: "church.To" is a sentence,
// full stop). Kept small and ordinary; spam's own top levels (.top .shop .tk .xyz …) are not here.
const WORD_TLDS = new Set(["to", "me", "us", "co", "app", "info", "link", "click", "site", "online", "live", "church",
  "global", "tv", "ly", "gl", "cc", "so", "it", "is", "be", "at", "in", "no", "am", "by", "do", "go", "my", "one", "now",
  "new", "day", "life", "love", "world", "today", "how", "run"]);
const SCHEME_RE = /\b(?:https?:\/\/|ftp:\/\/|www\.)\S+/gi;
const MAILTO_RE = /[^\s@<>()"']+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}\b/gi;
const HOST_RE = /\b((?:[a-z0-9-]+\.)+)([a-z]{2,24})\b(\/\S*)?/g;
const LINK_STAND_IN = "[link removed]";

function stripLinks(text) {
  return text
    .replace(SCHEME_RE, LINK_STAND_IN)
    .replace(MAILTO_RE, LINK_STAND_IN)
    .replace(HOST_RE, (m, host, tld, path) => {
      if (path) return LINK_STAND_IN;              // anything.tld/… is a link
      if (WORD_TLDS.has(tld)) return m;            // "church.To" typed on a phone — a sentence, not a host
      if (/^\d+(?:\.\d+)*\.$/.test(host)) return m; // "3.16" style numbers never reach here, but be safe
      return LINK_STAND_IN;
    });
}


/** { text, cut } — `cut` is decided by LENGTH before slicing, never by what the text ends with. */
function cleanValue(v) {
  if (typeof v !== "string") return { text: "", cut: false };
  const text = stripLinks(v
    .replace(/\r\n?/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""))
    .trim();
  if (text.length > MAX_VALUE_CHARS) {
    return { text: text.slice(0, MAX_VALUE_CHARS).replace(/\s+$/, "") + CUT_MARK, cut: true };
  }
  return { text, cut: false };
}

/** Non-enumerable marker on the picked set: something was left out for size. */
const CUT_FLAG = Symbol("cut");

/** The subset of `raw` this sermon can carry, cleaned and bounded. Never throws. */
function pickResponses(sermon, raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const allowed = responseKeys(sermon);
  let total = 0;
  let cut = false;
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) continue;
    const cleaned = cleanValue(raw[key]);
    const value = cleaned.text;
    if (!value) continue;
    if (cleaned.cut) cut = true;
    if (total + value.length > MAX_TOTAL_CHARS) { cut = true; break; }
    total += value.length;
    out[key] = value;
  }
  if (cut) Object.defineProperty(out, CUT_FLAG, { value: true, enumerable: false });
  return out;
}

function wasCut(responses) {
  return !!(responses && responses[CUT_FLAG]);
}

function hasAnyResponse(responses) {
  return !!responses && Object.keys(responses).length > 0;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function metaDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return "";
  const mon = d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase();
  return `${d.getUTCDate()} ${mon} ${d.getUTCFullYear()}`;
}

function metaLine(sermon) {
  const date = metaDate(sermon.date);
  const lead = String(sermon.series || sermon.speaker || "").trim();
  if (lead && date) return `${lead} · ${date}`;
  return lead || date;
}

/**
 * A neutral document model — one list of blocks — rendered twice below, so the
 * text and HTML parts can never disagree about what went out.
 *   { kind: 'title' | 'meta' | 'ref' | 'h2' | 'p' | 'bold' | 'bullet' | 'note' | 'label' | 'answer' | 'check' | 'footer', text }
 */
function buildBlocks(sermon, responses, lang) {
  const L = labelsFor(lang);
  const s = sermon && typeof sermon === "object" ? sermon : {};
  const id = String(s.id || "preview");
  const r = responses || {};
  const blocks = [];
  // An empty answer still renders (as a blank line): the shape of the notes survives.
  const push = (kind, text) => { if (text || kind === "answer") blocks.push({ kind, text: String(text || "") }); };

  push("title", s.title);
  push("meta", metaLine(s));
  push("ref", String(s.keyVerse || "").trim()); // reference only — never keyVerseText

  let quoteUsed = false; // one quote per article, as the page renders it
  (Array.isArray(s.sections) ? s.sections : []).slice(0, 4).forEach((section) => {
    if (!section) return;
    const num = section.num != null ? String(section.num) : "";
    push("h2", section.title);
    (Array.isArray(section.content) ? section.content : []).forEach((item, i) => {
      if (!item) return;
      if (item.type === "quote") {
        if (quoteUsed) return;
        quoteUsed = true;
        push("ref", String(item.ref || "").trim()); // the reference; the verse text stays home
        return;
      }
      if (item.type === "blank") {
        push("p", item.before);
        push("answer", r[`blank-${id}-${num}-${i}`] || "");
        push("p", item.after);
        return;
      }
      if (item.type === "note") return push("note", item.value);
      if (item.type === "subhead") return push("h2", item.value);
      if (item.type === "bullet") return push("bullet", item.value);
      if (item.type === "bold") return push("bold", item.value);
      push("p", item.value);
    });
  });

  const prompts = (Array.isArray(s.responsePrompts) ? s.responsePrompts : []).filter(Boolean).slice(0, 3);
  if (prompts.length) {
    push("label", L.response);
    prompts.forEach((prompt, i) => {
      push("bold", prompt);
      push("answer", r[`resp-${id}-${i}`] || "");
    });
  }

  const ws = [
    ["ws-notes", L.myNotes], ["ws-takeaways", L.takeaways], ["ws-god", L.god],
    ["ws-prayer", L.prayer], ["ws-actions", L.actions], ["ws-followup", L.followUp]
  ];
  const commitments = Array.isArray(s.commitments) ? s.commitments : [];
  const ticked = commitments.map((c, i) => (r[`commit-${i}`] === "1" ? c : null)).filter(Boolean);
  const anyWs = ws.some(([k]) => r[k]) || ticked.length;
  if (anyWs) {
    push("label", L.yourNotes);
    ws.forEach(([key, label]) => {
      if (key === "ws-actions" && ticked.length) {
        push("bold", label);
        ticked.forEach((c) => push("check", c));
        if (r[key]) push("answer", r[key]);
        return;
      }
      if (!r[key]) return;
      push("bold", label);
      push("answer", r[key]);
    });
  }

  if (wasCut(r)) push("note", L.cut);
  push("footer", L.footer);
  return blocks;
}

function renderText(blocks, appUrl, lang) {
  const L = labelsFor(lang);
  const lines = [];
  for (const b of blocks) {
    switch (b.kind) {
      case "title": lines.push(b.text.toUpperCase(), ""); break;
      case "meta": lines.push(b.text, ""); break;
      case "ref": lines.push(b.text, ""); break;
      case "h2": lines.push("", b.text, "-".repeat(Math.min(b.text.length, 40))); break;
      case "label": lines.push("", b.text.toUpperCase(), ""); break;
      case "bold": lines.push(b.text); break;
      case "bullet": lines.push(`• ${b.text}`); break;
      case "note": lines.push(b.text); break;
      case "check": lines.push(`[x] ${b.text}`); break;
      case "answer": lines.push(b.text ? `    ${b.text.split("\n").join("\n    ")}` : "    ________", ""); break;
      case "footer": lines.push("", "—", b.text, appUrl ? `${L.open}: ${appUrl}` : ""); break;
      default: lines.push(b.text);
    }
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// Literal hexes only: mail clients do not resolve CSS custom properties.
const INK = "#241E17";
const MUTED = "#7A6A54";
const PAPER = "#FAF6EF";
const RULE = "#ECE3D4";
const ACCENT = "#1B4F8A";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function renderHtml(blocks, appUrl, lang, heading) {
  const L = labelsFor(lang);
  const parts = [];
  const p = (text, style) => `<p style="margin:0 0 10px;font-family:${FONT};font-size:16px;line-height:1.55;color:${INK};${style || ""}">${escapeHtml(text)}</p>`;
  for (const b of blocks) {
    switch (b.kind) {
      case "title": parts.push(`<h1 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;font-weight:400;color:${INK}">${escapeHtml(b.text)}</h1>`); break;
      case "meta": parts.push(p(b.text, `font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};`)); break;
      case "ref": parts.push(p(b.text, `font-size:14px;font-weight:600;color:${ACCENT};`)); break;
      case "h2": parts.push(`<h2 style="margin:22px 0 8px;font-family:${FONT};font-size:18px;line-height:1.3;font-weight:600;color:${INK}">${escapeHtml(b.text)}</h2>`); break;
      case "label": parts.push(`<p style="margin:26px 0 12px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED}">${escapeHtml(b.text)}</p>`); break;
      case "bold": parts.push(p(b.text, "font-weight:600;")); break;
      case "bullet": parts.push(p(`• ${b.text}`, "padding-left:8px;")); break;
      case "note": parts.push(p(b.text, `font-style:italic;color:${MUTED};`)); break;
      case "check": parts.push(p(`☑ ${b.text}`)); break;
      case "answer": parts.push(b.text
        ? `<div style="margin:0 0 14px;padding:10px 14px;border-left:3px solid ${RULE};font-family:${FONT};font-size:16px;line-height:1.55;color:${INK};white-space:pre-wrap">${escapeHtml(b.text)}</div>`
        : `<div style="margin:0 0 14px;height:22px;border-bottom:1px solid ${RULE}"></div>`); break;
      case "footer": parts.push(`<p style="margin:28px 0 0;padding-top:14px;border-top:1px solid ${RULE};font-family:${FONT};font-size:12px;line-height:1.5;color:${MUTED}">${escapeHtml(b.text)}${appUrl ? ` <a href="${escapeHtml(appUrl)}" style="color:${ACCENT}">${escapeHtml(L.open)}</a>` : ""}</p>`); break;
      default: parts.push(p(b.text));
    }
  }
  return `<!doctype html><html><body style="margin:0;padding:0;background:${PAPER}">` +
    `<div style="max-width:600px;margin:0 auto;padding:28px 22px 36px;background:${PAPER}">` +
    `<p style="margin:0 0 18px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED}">${escapeHtml(heading)}</p>` +
    parts.join("") +
    `</div></body></html>`;
}

/**
 * The email, ready to send: { subject, text, html }.
 * `responses` must already have been through pickResponses().
 */
function renderNotesEmail({ sermon, responses, lang, appUrl }) {
  const L = labelsFor(lang);
  const s = sermon && typeof sermon === "object" ? sermon : {};
  const title = String(s.title || "").trim() || L.heading;
  const blocks = buildBlocks(s, responses || {}, lang);
  return {
    subject: L.subject.replace("{title}", () => title).slice(0, 200), // a function: "$&" in a title stays literal
    text: renderText(blocks, appUrl, lang),
    html: renderHtml(blocks, appUrl, lang, L.heading)
  };
}

module.exports = {
  wasCut,
  CUT_MARK,
  stripLinks,
  LINK_STAND_IN,
  WORKSPACE_KEYS,
  MAX_VALUE_CHARS,
  MAX_TOTAL_CHARS,
  LABELS,
  labelsFor,
  responseKeys,
  pickResponses,
  hasAnyResponse,
  buildBlocks,
  renderNotesEmail,
  escapeHtml
};
