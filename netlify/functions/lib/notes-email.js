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
const MAX_VALUE_CHARS = 4000;
const MAX_TOTAL_CHARS = 40000;

/** Four languages, like the app. Labels only; the notes are the person's own words. */
const LABELS = {
  en: {
    subject: "Your notes — {title}",
    heading: "Sermon Notes",
    yourNotes: "Your notes",
    response: "My response",
    myNotes: "My notes",
    takeaways: "Key takeaways",
    god: "What God is saying to me",
    prayer: "Prayer",
    actions: "Action steps",
    followUp: "Follow up",
    done: "Done",
    footer: "Sent once from the Futures Daily Word app because you asked for a copy of your notes.",
    open: "Open the app"
  },
  es: {
    subject: "Tus notas — {title}",
    heading: "Notas del Sermón",
    yourNotes: "Tus notas",
    response: "Mi respuesta",
    myNotes: "Mis notas",
    takeaways: "Puntos clave",
    god: "Lo que Dios me está diciendo",
    prayer: "Oración",
    actions: "Pasos de acción",
    followUp: "Seguimiento",
    done: "Hecho",
    footer: "Enviado una sola vez desde la app Futures Daily Word porque pediste una copia de tus notas.",
    open: "Abrir la app"
  },
  pt: {
    subject: "Suas anotações — {title}",
    heading: "Notas do Sermão",
    yourNotes: "Suas anotações",
    response: "Minha resposta",
    myNotes: "Minhas anotações",
    takeaways: "Pontos principais",
    god: "O que Deus está me dizendo",
    prayer: "Oração",
    actions: "Passos de ação",
    followUp: "Acompanhamento",
    done: "Feito",
    footer: "Enviado uma única vez pelo app Futures Daily Word porque você pediu uma cópia das suas anotações.",
    open: "Abrir o app"
  },
  id: {
    subject: "Catatan Anda — {title}",
    heading: "Catatan Khotbah",
    yourNotes: "Catatan Anda",
    response: "Respons saya",
    myNotes: "Catatan saya",
    takeaways: "Poin utama",
    god: "Apa yang Tuhan katakan kepada saya",
    prayer: "Doa",
    actions: "Langkah tindakan",
    followUp: "Tindak lanjut",
    done: "Selesai",
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

function cleanValue(v) {
  if (typeof v !== "string") return "";
  return v
    .replace(/\r\n?/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, MAX_VALUE_CHARS);
}

/** The subset of `raw` this sermon can carry, cleaned and bounded. Never throws. */
function pickResponses(sermon, raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const allowed = responseKeys(sermon);
  let total = 0;
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) continue;
    const value = cleanValue(raw[key]);
    if (!value) continue;
    if (total + value.length > MAX_TOTAL_CHARS) break;
    total += value.length;
    out[key] = value;
  }
  return out;
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
    subject: L.subject.replace("{title}", title).slice(0, 200),
    text: renderText(blocks, appUrl, lang),
    html: renderHtml(blocks, appUrl, lang, L.heading)
  };
}

module.exports = {
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
