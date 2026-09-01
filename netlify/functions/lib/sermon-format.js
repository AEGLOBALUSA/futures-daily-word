/**
 * Turn raw hub/media notes into the congregation-writable sermon JSON
 * (SermonNotesScreen / SermonWorkspace / published_sermons).
 * Tries Claude when ANTHROPIC_API_KEY is set; always falls back to a
 * deterministic formatter so a down model never blocks Ashley's review.
 */
const {
  sanitize,
  slugify,
  parseOutline,
  sermonFromNotes,
  youtubeWatchUrl
} = require("./intake-core");
const { callClaudeMessages } = require("./claude-messages");

const CONTENT_TYPES = new Set(["text", "bold", "bullet", "subhead", "note", "blank", "quote"]);

function defaultPrompts(fields) {
  const verse = sanitize((fields && fields.keyVerse) || "", 80);
  const out = [
    "What is God saying to you through this message?",
    "Where does this land in your life this week?",
    "What will you do with what you heard?"
  ];
  if (verse) out.push("How does " + verse + " speak to you today?");
  return out.slice(0, 4);
}

function defaultCommitments() {
  return [
    "I will take one step on this word this week",
    "I will share this with someone",
    "I will pray this through"
  ];
}

function ensureBlanks(sections) {
  return (Array.isArray(sections) ? sections : []).map((s, i) => {
    const content = Array.isArray(s.content) ? s.content.slice() : [];
    const hasBlank = content.some((c) => c && c.type === "blank");
    if (!hasBlank) content.push({ type: "blank", before: "" });
    return {
      num: String(s.num || i + 1),
      title: sanitize(s.title || "Notes", 200) || "Notes",
      content: content.filter((c) => c && CONTENT_TYPES.has(c.type)).map((c) => {
        if (c.type === "blank") return { type: "blank", before: sanitize(c.before || "", 400), after: sanitize(c.after || "", 400) };
        if (c.type === "quote") return { type: "quote", text: sanitize(c.text || "", 2000), ref: sanitize(c.ref || "", 120) };
        return { type: c.type, value: sanitize(c.value || "", 4000) };
      })
    };
  });
}

function splitWalls(text) {
  const raw = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";
  if (/^(?:#{1,3}\s+|\d+[.)]\s+)/m.test(raw)) return raw;
  const blocks = raw.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length >= 2) {
    return blocks.map((b, i) => (i + 1) + ". " + b.split("\n")[0] + "\n" + b.split("\n").slice(1).join("\n")).join("\n");
  }
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const headed = [];
  for (const line of lines) {
    if (/^[A-Z][A-Z0-9 ,'"’:-]{8,}$/.test(line) && line.split(/\s+/).length >= 2) {
      headed.push((headed.length + 1) + ". " + line.replace(/\s+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()));
    } else {
      headed.push(line);
    }
  }
  return headed.join("\n");
}

function formatSermonDeterministic(fields, base) {
  const src = { ...(base || {}), ...(fields || {}) };
  src.outline = splitWalls(src.outline || src.body || "");
  if (Array.isArray(src.sections) && src.sections.length && !src.outline) {
    // keep existing sections (YouTube-only / keep notes)
  } else if (src.outline) {
    src.sections = parseOutline(src.outline);
  } else if (!Array.isArray(src.sections) || !src.sections.length) {
    src.sections = parseOutline("");
  }
  const sermon = sermonFromNotes(src);
  sermon.sections = ensureBlanks(sermon.sections);
  const prompts = Array.isArray(src.responsePrompts) && src.responsePrompts.length
    ? src.responsePrompts.map((s) => sanitize(String(s), 300)).filter(Boolean).slice(0, 4)
    : defaultPrompts(src);
  const commits = Array.isArray(src.commitments) && src.commitments.length
    ? src.commitments.map((s) => sanitize(String(s), 200)).filter(Boolean).slice(0, 3)
    : defaultCommitments();
  while (prompts.length < 2) prompts.push(defaultPrompts(src)[prompts.length]);
  while (commits.length < 2) commits.push(defaultCommitments()[commits.length]);
  sermon.responsePrompts = prompts.slice(0, 4);
  sermon.commitments = commits.slice(0, 3);
  sermon.youtubeUrl = youtubeWatchUrl(src.youtubeUrl || sermon.youtubeUrl);
  if (base && base.id && !fields.title) sermon.id = base.id;
  return sermon;
}

function extractJson(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(body.slice(start, end + 1)); } catch { return null; }
}

function sanitizeAiSermon(parsed, fields, base) {
  if (!parsed || typeof parsed !== "object") return null;
  const fallback = formatSermonDeterministic(fields, base);
  const title = sanitize(parsed.title || fallback.title, 200);
  const date = String(parsed.date || fallback.date || "").slice(0, 10) || fallback.date;
  const sections = ensureBlanks(parsed.sections);
  if (!sections.length) return null;
  const prompts = Array.isArray(parsed.responsePrompts)
    ? parsed.responsePrompts.map((s) => sanitize(String(s), 300)).filter(Boolean).slice(0, 4)
    : [];
  const commits = Array.isArray(parsed.commitments)
    ? parsed.commitments.map((s) => sanitize(String(s), 200)).filter(Boolean).slice(0, 3)
    : [];
  return {
    id: (base && base.id) || slugify(title) + "-" + date,
    title,
    series: sanitize(parsed.series || fallback.series || "", 200),
    date,
    speaker: sanitize(parsed.speaker || fallback.speaker || "", 120),
    keyVerse: sanitize(parsed.keyVerse || fallback.keyVerse || "", 80),
    keyVerseText: sanitize(parsed.keyVerseText || fallback.keyVerseText || "", 2000),
    sections,
    responsePrompts: (prompts.length >= 2 ? prompts : fallback.responsePrompts).slice(0, 4),
    commitments: (commits.length >= 2 ? commits : fallback.commitments).slice(0, 3),
    youtubeUrl: youtubeWatchUrl(parsed.youtubeUrl || fields.youtubeUrl || fallback.youtubeUrl)
  };
}

const FORMAT_SYSTEM = `You format Sunday sermon notes into JSON for a congregation fill-in page.
Return ONLY JSON (no markdown) with this exact shape:
{"id":"slug-yyyy-mm-dd","title":"","series":"","date":"YYYY-MM-DD","speaker":"","keyVerse":"","keyVerseText":"","sections":[{"num":"1","title":"","content":[{"type":"bullet","value":""},{"type":"blank","before":""}]}],"responsePrompts":["",""],"commitments":["",""],"youtubeUrl":""}
Rules:
- Beautiful and simple. Short points, not a wall of paste.
- 3–7 sections with numbered headings.
- content types: text, bold, bullet, subhead, note, blank, quote (quote has text+ref).
- After every section, include {"type":"blank","before":""} so people can write.
- 2–4 responsePrompts. 2–3 short commitments (first-person, checkable).
- Keep the pastor's meaning. Do not invent a different sermon.
- youtubeUrl is a YouTube watch URL or empty string.`;

async function formatSermon(fields, { useAI, base } = {}) {
  const fallback = formatSermonDeterministic(fields, base);
  if (!useAI || !String((fields && fields.outline) || "").trim()) {
    return { sermon: fallback, source: "deterministic" };
  }
  const user = JSON.stringify({
    title: fields.title || "",
    speaker: fields.speaker || "",
    date: fields.date || "",
    series: fields.series || "",
    keyVerse: fields.keyVerse || "",
    keyVerseText: fields.keyVerseText || "",
    youtubeUrl: fields.youtubeUrl || "",
    notes: String(fields.outline || "").slice(0, 12000)
  });
  const text = await callClaudeMessages({ system: FORMAT_SYSTEM, user, maxTokens: 3500 });
  const parsed = extractJson(text);
  const sermon = sanitizeAiSermon(parsed, fields, base);
  if (sermon) return { sermon, source: "ai" };
  return { sermon: fallback, source: "deterministic" };
}

function mergeYoutube(existing, youtubeUrl) {
  const base = existing && typeof existing === "object" ? existing : {};
  const url = youtubeWatchUrl(youtubeUrl);
  return {
    ...base,
    youtubeUrl: url || base.youtubeUrl || "",
    youtubeOnly: true
  };
}

module.exports = {
  defaultPrompts,
  defaultCommitments,
  formatSermonDeterministic,
  formatSermon,
  mergeYoutube,
  extractJson,
  sanitizeAiSermon
};
