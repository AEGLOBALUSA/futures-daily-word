/**
 * Turn pasted hub/media notes into the congregation-writable sermon JSON.
 * Tries Claude when ANTHROPIC_API_KEY is set; always falls back to a
 * deterministic formatter so a down model never blocks Ashley's review.
 */
const {
  sanitize,
  slugify,
  parseOutline,
  sermonFromNotes,
  youtubeWatchUrl,
  hasNotesContent
} = require("./intake-core");
const { callClaudeMessages } = require("./claude-messages");

const CONTENT_TYPES = new Set(["text", "bold", "bullet", "subhead", "note", "blank", "quote"]);
const MAX_SECTIONS = 4;
const MAX_POINTS = 5;
const MAX_POINT_WORDS = 18;
const MAX_TOTAL_WORDS = 400;
const MAX_PROMPTS = 3;

function defaultPrompts(fields) {
  const verse = sanitize((fields && fields.keyVerse) || "", 80);
  const out = [
    "What is God saying to you through this message?",
    "Where does this land in your life this week?"
  ];
  if (verse) out.push("How does " + verse + " speak to you today?");
  return out.slice(0, MAX_PROMPTS);
}

function defaultCommitments() {
  return [];
}

function wordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function splitLongLine(text) {
  const raw = sanitize(String(text || "").replace(/^[-*•]\s+/, ""), 4000);
  if (!raw) return [];
  if (wordCount(raw) <= MAX_POINT_WORDS) return [raw];
  const chunks = raw.split(/(?<=[.;:])\s+/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const chunk of chunks) {
    if (wordCount(chunk) <= MAX_POINT_WORDS) {
      out.push(chunk);
      continue;
    }
    const words = chunk.split(/\s+/);
    for (let i = 0; i < words.length; i += MAX_POINT_WORDS) {
      out.push(words.slice(i, i + MAX_POINT_WORDS).join(" "));
    }
  }
  return out.slice(0, MAX_POINTS);
}

function displayTitle(text) {
  const s = sanitize(text || "", 200);
  if (!s) return "Sunday Message";
  if (s === s.toUpperCase() && /[A-Z]/.test(s)) {
    return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

function pointWordCount(sermon) {
  let n = 0;
  for (const s of (sermon && sermon.sections) || []) {
    for (const c of s.content || []) {
      if (!c || c.type === "blank" || c.type === "note") continue;
      n += wordCount(c.value || c.text || "");
    }
  }
  return n;
}

function ensureBlanks(sections) {
  return (Array.isArray(sections) ? sections : []).map((s, i) => {
    const content = Array.isArray(s.content) ? s.content.filter((c) => c && c.type !== "blank") : [];
    content.push({ type: "blank", before: "" });
    return {
      num: String(s.num || i + 1),
      title: sanitize(s.title || "Notes", 200) || "Notes",
      content: content.filter((c) => c && CONTENT_TYPES.has(c.type)).map((c) => {
        if (c.type === "blank") return { type: "blank", before: sanitize(c.before || "", 400), after: sanitize(c.after || "", 400) };
        if (c.type === "quote") return { type: "quote", text: sanitize(c.text || c.value || "", 2000), ref: sanitize(c.ref || "", 120) };
        return { type: c.type, value: sanitize(c.value || "", 4000) };
      })
    };
  });
}

function tightenSermon(sermon) {
  const src = sermon && typeof sermon === "object" ? sermon : {};
  let quoteUsed = false;
  const sections = ensureBlanks(src.sections).slice(0, MAX_SECTIONS).map((s, i) => {
    const points = [];
    const extras = [];
    for (const c of s.content || []) {
      if (!c || c.type === "blank") continue;
      if (c.type === "quote") {
        if (quoteUsed) continue;
        quoteUsed = true;
        extras.push({ type: "quote", text: sanitize(c.text || c.value || "", 800), ref: sanitize(c.ref || "", 120) });
        continue;
      }
      if (c.type === "note") {
        extras.push({ type: "note", value: splitLongLine(c.value).join(" ") });
        continue;
      }
      if (c.type === "subhead") continue;
      const lines = splitLongLine(c.value);
      for (const line of lines) {
        if (points.length >= MAX_POINTS) break;
        points.push({ type: c.type === "bold" ? "bold" : "bullet", value: line });
      }
    }
    return {
      num: String(i + 1),
      title: sanitize(s.title || "Notes", 200) || "Notes",
      content: extras.concat(points).concat([{ type: "blank", before: "" }])
    };
  });
  const prompts = Array.isArray(src.responsePrompts)
    ? src.responsePrompts.map((s) => sanitize(String(s), 180)).filter(Boolean).slice(0, MAX_PROMPTS)
    : [];
  return {
    id: src.id,
    title: displayTitle(src.title),
    series: sanitize(src.series || "", 200),
    date: String(src.date || "").slice(0, 10),
    speaker: sanitize(src.speaker || "", 120),
    keyVerse: sanitize(src.keyVerse || "", 80),
    keyVerseText: sanitize(src.keyVerseText || "", 2000),
    sections: sections.length ? sections : [{ num: "1", title: "Notes", content: [{ type: "blank", before: "" }] }],
    responsePrompts: prompts.length ? prompts : defaultPrompts(src),
    commitments: [],
    youtubeUrl: youtubeWatchUrl(src.youtubeUrl)
  };
}

function splitWalls(text) {
  const raw = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";
  if (/^(?:#{1,3}\s+|\d+[.)]\s+)/m.test(raw)) return raw;
  const blocks = raw.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length >= 2) {
    return blocks.slice(0, MAX_SECTIONS).map((b, i) => (i + 1) + ". " + b.split("\n")[0] + "\n" + b.split("\n").slice(1).join("\n")).join("\n");
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

function answersToOutline(fields) {
  const f = fields || {};
  if (f.outline) return String(f.outline);
  const parts = [];
  if (f.bigIdea) parts.push(f.bigIdea);
  for (let i = 1; i <= 3; i++) {
    const h = f["point" + i + "Heading"];
    const b = f["point" + i + "Body"];
    if (!h && !b) continue;
    parts.push((h || "Point " + i) + "\n" + (b || ""));
  }
  if (f.weeklyAction) parts.push(f.weeklyAction);
  return parts.join("\n\n");
}

/** Pull a scripture reference out of pasted notes. Empty if none — never invent. */
function extractKeyVerseFromNotes(notes) {
  const raw = String(notes || "").replace(/\r\n/g, "\n");
  if (!raw.trim()) return { keyVerse: "", keyVerseText: "" };
  const labeled = raw.match(/(?:^|\n)\s*(?:key\s*verse|scripture|passage)\s*[:.\-–]\s*([^\n]+)/i);
  const hay = labeled ? labeled[1] : raw;
  const ref = hay.match(
    /\b(?:(?:[1-3]|I{1,3})\s+)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Psalms|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation|Gen|Ex|Lev|Num|Deut|Josh|Ps|Prov|Isa|Jer|Ezek|Dan|Matt|Rom|Cor|Gal|Eph|Phil|Col|Thess|Tim|Heb|Rev)\.?\s+\d{1,3}:\d{1,3}(?:\s*[–\-]\s*\d{1,3})?\b/i
  );
  const keyVerse = ref ? sanitize(ref[0].replace(/\s+/g, " "), 80) : "";
  const textLine = raw.match(/(?:^|\n)\s*(?:verse\s*text|text)\s*[:.\-–]\s*["“]?([^\n"”]+)["”]?/i);
  const keyVerseText = textLine ? sanitize(textLine[1], 2000) : "";
  return { keyVerse, keyVerseText };
}

function verseFromFieldsOrNotes(fields, notes, { keepExisting } = {}) {
  const f = fields || {};
  const fromField = {
    keyVerse: sanitize(f.keyVerse || "", 80),
    keyVerseText: sanitize(f.keyVerseText || "", 2000)
  };
  if (fromField.keyVerse || fromField.keyVerseText) return fromField;
  const fromNotes = extractKeyVerseFromNotes(notes || answersToOutline(f) || f.outline || "");
  if (fromNotes.keyVerse || fromNotes.keyVerseText) return fromNotes;
  if (keepExisting) {
    return {
      keyVerse: sanitize(f.keyVerse || "", 80),
      keyVerseText: sanitize(f.keyVerseText || "", 2000)
    };
  }
  return { keyVerse: "", keyVerseText: "" };
}

function splitBody(text) {
  return String(text || "").replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean).map((t) => {
    if (/^[-*•]\s+/.test(t)) return { type: "bullet", value: sanitize(t.replace(/^[-*•]\s+/, ""), 2000) };
    return { type: "text", value: sanitize(t, 4000) };
  });
}

function sectionsFromAnswers(fields) {
  const f = fields || {};
  if (f.outline) return parseOutline(splitWalls(f.outline));
  const sections = [];
  const big = sanitize(f.bigIdea || "", 4000);
  if (big) {
    sections.push({
      num: String(sections.length + 1),
      title: "The one thing",
      content: [{ type: "text", value: big }, { type: "blank", before: "" }]
    });
  }
  for (let i = 1; i <= 3; i++) {
    const heading = sanitize(f["point" + i + "Heading"] || "", 200);
    const body = f["point" + i + "Body"] || "";
    if (!heading && !String(body).trim()) continue;
    const content = splitBody(body);
    content.push({ type: "blank", before: "" });
    sections.push({
      num: String(sections.length + 1),
      title: heading || ("Point " + i),
      content
    });
  }
  return sections;
}

function formatSermonDeterministic(fields, base) {
  const src = { ...(base || {}), ...(fields || {}) };
  const fromAnswers = sectionsFromAnswers(src);
  if (fromAnswers.length) {
    src.sections = fromAnswers;
  } else if (Array.isArray(src.sections) && src.sections.length && !hasNotesContent(fields)) {
    // keep existing sections (YouTube-only)
  } else if (src.outline) {
    src.sections = parseOutline(splitWalls(src.outline));
  } else if (!Array.isArray(src.sections) || !src.sections.length) {
    src.sections = parseOutline("");
  }
  if (hasNotesContent(fields)) {
    const verse = verseFromFieldsOrNotes(fields, answersToOutline(fields) || fields.outline);
    src.keyVerse = verse.keyVerse;
    src.keyVerseText = verse.keyVerseText;
  }
  const sermon = sermonFromNotes(src);
  sermon.title = displayTitle(sermon.title);
  const tightened = tightenSermon(sermon);
  if (base && base.id && !fields.title) tightened.id = base.id;
  tightened.youtubeUrl = youtubeWatchUrl(src.youtubeUrl || tightened.youtubeUrl);
  return tightened;
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
  const title = displayTitle(parsed.title || fallback.title);
  const date = String(parsed.date || fallback.date || "").slice(0, 10) || fallback.date;
  const sections = ensureBlanks(parsed.sections);
  if (!sections.length) return null;
  const prompts = Array.isArray(parsed.responsePrompts)
    ? parsed.responsePrompts.map((s) => sanitize(String(s), 180)).filter(Boolean).slice(0, MAX_PROMPTS)
    : [];
  const notes = answersToOutline(fields) || String((fields && fields.outline) || "").trim();
  const fromNotes = extractKeyVerseFromNotes(notes);
  const sermon = tightenSermon({
    id: (base && base.id) || slugify(title) + "-" + date,
    title,
    series: sanitize(parsed.series || fallback.series || "", 200),
    date,
    speaker: sanitize(parsed.speaker || fallback.speaker || "", 120),
    keyVerse: sanitize(parsed.keyVerse || "", 80) || fromNotes.keyVerse,
    keyVerseText: sanitize(parsed.keyVerseText || "", 2000) || fromNotes.keyVerseText,
    sections,
    responsePrompts: (prompts.length ? prompts : fallback.responsePrompts).slice(0, MAX_PROMPTS),
    commitments: [],
    youtubeUrl: youtubeWatchUrl(parsed.youtubeUrl || fields.youtubeUrl || fallback.youtubeUrl)
  });
  return sermon;
}

const FORMAT_SYSTEM = `You format a pastor's pasted Sunday notes into JSON for a congregation fill-in page.
Return ONLY JSON (no markdown) with this exact shape:
{"id":"slug-yyyy-mm-dd","title":"","series":"","date":"YYYY-MM-DD","speaker":"","keyVerse":"","keyVerseText":"","sections":[{"num":"1","title":"","content":[{"type":"bullet","value":""},{"type":"blank","before":""}]}],"responsePrompts":[""],"youtubeUrl":""}
Rules:
- Title: 3–8 words, title case, never ALL CAPS, never underline.
- At most 4 sections. Each section: a short serif subhead + 3–5 short points (one thought per line).
- If a bullet is more than 18 words, split or cut it. Total point words under 400.
- Content types: bullet (short points), bold (weight, not a new heading), quote (max one in the whole message), note (small muted line), blank.
- After EVERY section include {"type":"blank","before":""}.
- 1–3 responsePrompts that are questions. No recap, no "In conclusion", no emoji, no prayer box unless the pastor typed a prayer as a final section.
- Do not invent points. Keep the pastor's meaning. youtubeUrl is a YouTube watch URL or empty — video is block 1 only, never inside a section.
- keyVerse is a short reference (e.g. John 21:15-19) taken from the pasted notes. keyVerseText is the verse wording only if it is in the notes. If the notes have no scripture, leave both "". Never invent a verse.`;

async function formatSermon(fields, { useAI, base } = {}) {
  const fallback = formatSermonDeterministic(fields, base);
  const notes = answersToOutline(fields) || String((fields && fields.outline) || "").trim();
  if (!useAI || !notes) {
    return { sermon: fallback, source: "deterministic" };
  }
  const user = JSON.stringify({
    title: fields.title || "",
    speaker: fields.speaker || "",
    date: fields.date || "",
    series: fields.series || "",
    youtubeUrl: fields.youtubeUrl || "",
    notes: notes.slice(0, 12000)
  });
  const text = await callClaudeMessages({ system: FORMAT_SYSTEM, user, maxTokens: 1800 });
  let parsed = extractJson(text);
  let sermon = sanitizeAiSermon(parsed, fields, base);
  if (sermon) return { sermon, source: "ai" };
  const shorter = await callClaudeMessages({
    system: FORMAT_SYSTEM + "\nTOO LONG OR INVALID. Cut to 4 sections, 3–5 short points each, under 400 words.",
    user,
    maxTokens: 1400
  });
  sermon = sanitizeAiSermon(extractJson(shorter), fields, base);
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
  extractKeyVerseFromNotes,
  verseFromFieldsOrNotes,
  formatSermonDeterministic,
  formatSermon,
  mergeYoutube,
  extractJson,
  sanitizeAiSermon,
  answersToOutline,
  sectionsFromAnswers,
  tightenSermon,
  pointWordCount
};
