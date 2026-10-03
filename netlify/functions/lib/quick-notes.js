/**
 * Sunday's notes, pasted once (MOS-to-8 build B09-10).
 *
 * A hub pastor pastes Sunday's notes (or only the YouTube link) into ONE box
 * on /staff. This works out everything the long hub form used to ask for: the
 * date (the next Sunday on the congregation's own clock), the title, the
 * speaker, the series, the key verse and the YouTube link, and fills the hub
 * form's answers by CONFIG (never by question id), so publishing reuses the
 * existing `submit` unchanged. It never publishes: intake.js `notes_quick`
 * returns the preview and the filled answers, and the person confirms the
 * preview with "Put this on the congregation page" (drafts first).
 *
 * The model sees only the pasted notes (sermon text the hub chose to publish),
 * through the existing sermon-format.js path: one Claude call returning JSON,
 * the rule-based formatter when it is down or not configured.
 *
 * Pure except for the injected `format` function, so every rule is testable
 * at any instant. The tests live in tests/functions/quick-notes.test.js.
 */
const { sanitize, slugify, youtubeWatchUrl, parseYoutubeId, questionVisibleForJob } = require("./intake-core");
const { congregationTimeZone, localParts, serviceSunday, parseDateOnly } = require("./sermon-window");

const MAX_TEXT = 20000;

/** The sermon details the quick path fills, in the order a person would be asked for a missing one. */
const DETAIL_KEYS = ["title", "speaker", "date", "series", "youtubeUrl"];

function pad(n) {
  return String(n).padStart(2, "0");
}

function ymd(d) {
  return `${d.year}-${pad(d.month)}-${pad(d.day)}`;
}

/**
 * The Sunday these notes are for: the first Sunday on or after today on the
 * congregation's own clock (Adelaide for Futures Australia, New York for the
 * two USA congregations). On a Sunday it is that Sunday. `YYYY-MM-DD`.
 */
function nextSundayFor(congregation, now = new Date()) {
  const p = localParts(now, congregationTimeZone(congregation));
  return ymd(serviceSunday(p.year, p.month, p.day));
}

const LABELS = [
  { key: "title", re: /^\s*(?:title|message|sermon(?:\s+title)?)\s*[:\-–—]\s*(.+?)\s*$/i },
  { key: "speaker", re: /^\s*(?:speaker|preacher|preached\s+by|speaking)\s*[:\-–—]\s*(.+?)\s*$/i },
  { key: "series", re: /^\s*series\s*[:\-–—]\s*(.+?)\s*$/i }
];
// "Ps Jo Smith", "Pastor Jo Smith", "Ptr Jo" on a line of its own.
const PASTOR_LINE = /^\s*((?:ps|pr|ptr|pastor|rev|reverend)\.?\s+[^\s].{0,60}?)\s*$/i;
const URL_ONLY_LINE = /^\s*(?:<)?(https?:\/\/\S+|(?:www\.)?(?:youtube\.com|youtu\.be|m\.youtube\.com)\/\S+)(?:>)?\s*$/i;

function isScriptureOnly(line) {
  return /^\s*(?:[1-3]\s+)?[A-Za-z]+\.?\s+\d{1,3}:\d{1,3}(?:\s*[–\-]\s*\d{1,3})?\s*$/.test(line);
}

/**
 * Split what was pasted into the notes, the YouTube link and the details the
 * pastor labelled ("Title:", "Speaker:", "Series:", a "Ps …" line). Labelled
 * lines and link lines come out of the notes; everything else stays as typed.
 * `youtubeOnly` is true when the box held nothing but a YouTube link.
 */
function parseQuickText(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n").slice(0, MAX_TEXT);
  const lines = text.split("\n");
  const labelled = {};
  let youtubeUrl = "";
  let badLink = false;
  const kept = [];
  const headLimit = 15; // labels and a "Ps …" line only count near the top
  let seen = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { kept.push(line); continue; }
    seen += 1;
    const url = trimmed.match(URL_ONLY_LINE);
    if (url) {
      const yt = youtubeWatchUrl(url[1]);
      if (yt) { if (!youtubeUrl) youtubeUrl = yt; continue; }
      if (/youtu/i.test(url[1])) { badLink = true; continue; }
    }
    if (seen <= headLimit) {
      let hit = false;
      for (const { key, re } of LABELS) {
        const m = trimmed.match(re);
        if (m && !labelled[key]) { labelled[key] = sanitize(m[1], key === "title" ? 200 : 120); hit = true; break; }
      }
      if (hit) continue;
      if (!labelled.speaker && trimmed.split(/\s+/).length <= 6) {
        const ps = trimmed.match(PASTOR_LINE);
        if (ps) { labelled.speaker = sanitize(ps[1], 120); continue; }
      }
    }
    kept.push(line);
  }
  // A bare 11-character id or a link with no scheme pasted alone.
  const notes = kept.join("\n").replace(/^\n+|\n+$/g, "");
  if (!notes && !youtubeUrl && parseYoutubeId(text.trim())) youtubeUrl = youtubeWatchUrl(text.trim());
  const youtubeOnly = !!youtubeUrl && !notes.trim();
  return { notes: notes.trim() ? notes : "", youtubeUrl, youtubeOnly, labelled, badLink: badLink && !youtubeUrl };
}

/**
 * When the model is not there: the first line of the notes is the title when
 * it reads like one (short, not a verse, not a bullet, not a sentence).
 */
function titleFromFirstLine(notes) {
  for (const line of String(notes || "").split("\n")) {
    const t = line.trim().replace(/^#{1,3}\s+/, "");
    if (!t) continue;
    if (t.length > 80 || t.split(/\s+/).length > 10) return "";
    if (/^[-*•\d]/.test(t) || isScriptureOnly(t) || /[.?!:]$/.test(t)) return "";
    return sanitize(t, 200);
  }
  return "";
}

function cleanDetail(key, value) {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";
  if (key === "date") {
    const d = parseDateOnly(s);
    return d ? ymd(d) : "";
  }
  if (key === "youtubeUrl") return youtubeWatchUrl(s);
  return sanitize(s, key === "title" || key === "series" ? 200 : 120);
}

/** Only the known detail keys, cleaned; anything else in `overrides` is ignored. */
function cleanOverrides(overrides) {
  const out = {};
  const o = overrides && typeof overrides === "object" ? overrides : {};
  for (const key of DETAIL_KEYS) {
    const v = cleanDetail(key, o[key]);
    if (v) out[key] = v;
  }
  return out;
}

/**
 * The hub form's answers, filled by each question's CONFIG (never its id), so
 * `submit` publishes exactly what the long form would have. Questions the
 * quick path cannot fill stay out; `firstMissing` asks for the first required one.
 */
function answersByConfig(questions, { details, notes }) {
  const answers = {};
  const hasNotes = !!String(notes || "").trim();
  for (const q of questions || []) {
    const cfg = q && q.config && typeof q.config === "object" ? q.config : {};
    if (cfg.flow === "notes_have") { answers[q.id] = hasNotes; continue; }
    if (cfg.flow === "notes_paste") { if (hasNotes) answers[q.id] = notes; continue; }
    if (cfg.flow === "notes_ai") { if (hasNotes) answers[q.id] = true; continue; }
    if (cfg.publish === "sermon_reformat") { if (hasNotes) answers[q.id] = true; continue; }
    const key = cfg.sermonKey;
    if (key === "outline") { if (hasNotes) answers[q.id] = notes; continue; }
    if (DETAIL_KEYS.includes(key) && details[key]) answers[q.id] = details[key];
  }
  return answers;
}

/**
 * The first required question the quick path left empty, the same rule
 * `submit` refuses on (yes/no and corner removals never count as empty).
 * { key, questionId, label } or null. `key` is the sermon detail it fills, or
 * "other" for a required question the quick path does not know.
 */
function firstMissing(questions, answers) {
  const order = (q) => {
    const k = q.config && q.config.sermonKey;
    const i = DETAIL_KEYS.indexOf(k);
    return i < 0 ? DETAIL_KEYS.length : i;
  };
  const required = (questions || [])
    .filter((q) => q && q.required && (q.audience === "hub" || q.audience === "all"))
    .filter((q) => q.type !== "yes_no" && q.type !== "corner_remove")
    .slice()
    .sort((a, b) => order(a) - order(b));
  for (const q of required) {
    const v = answers[q.id];
    const empty = v == null || v === "" || (Array.isArray(v) && !v.length);
    if (!empty) continue;
    const key = q.config && DETAIL_KEYS.includes(q.config.sermonKey) ? q.config.sermonKey : "other";
    return { key, questionId: q.id, label: q.label || "", type: q.type || "text" };
  }
  return null;
}

/** Is this published row this Sunday's message on that congregation's clock? */
function isForSunday(row, sunday, congregation) {
  if (!row || !row.sermon) return false;
  const typed = parseDateOnly(row.sermon.date);
  if (typed) return ymd(serviceSunday(typed.year, typed.month, typed.day)) === sunday;
  const at = new Date(row.published_at || NaN);
  if (Number.isNaN(at.getTime())) return false;
  const p = localParts(at, congregationTimeZone(congregation));
  return ymd(serviceSunday(p.year, p.month, p.day)) === sunday;
}

/**
 * Work out Sunday's notes from one pasted box.
 *
 * input:
 *   questions    the hub form's visible questions (intake_questions, enabled)
 *   text         what was pasted
 *   congregation 'futures-us' | 'futures-au' | 'futuros-us'
 *   now          the instant (tests freeze it)
 *   overrides    details the person has given since ({ title, speaker, … })
 *   preview      the preview this box already made (a follow-up answer reuses
 *                it instead of calling the model again)
 *   current      the congregation's current published row, or null
 *   format       async (fields, { useAI, base, retry }) => { sermon, source }
 *
 * output: { sunday, details, guessed, youtubeOnly, preview, answers, needs, source }
 * or { error, code } when there is nothing to work from.
 */
async function quickNotes({ questions, text, congregation, now = new Date(), overrides, preview, current, format }) {
  const parsed = parseQuickText(text);
  if (!parsed.notes && !parsed.youtubeUrl) {
    if (parsed.badLink) return { error: "Paste a YouTube watch, youtu.be, shorts, or embed link.", code: "bad_link" };
    return { error: "Paste Sunday's notes or the YouTube link.", code: "empty" };
  }
  const sunday = nextSundayFor(congregation, now);
  const given = cleanOverrides(overrides);
  const currentIsThisSunday = isForSunday(current, sunday, congregation);
  const last = current && current.sermon ? current.sermon : null;
  const guessed = [];

  const details = {
    title: given.title || parsed.labelled.title || "",
    speaker: given.speaker || parsed.labelled.speaker || "",
    date: given.date || sunday,
    series: given.series || parsed.labelled.series || "",
    youtubeUrl: given.youtubeUrl || parsed.youtubeUrl || "",
    keyVerse: ""
  };

  let sermon = null;
  let source = "none";

  if (parsed.youtubeOnly) {
    // Only the link. When this Sunday's message is already up, the link joins
    // it (the same message, the same details). Otherwise ask for the title.
    if (currentIsThisSunday && last) {
      for (const key of ["title", "speaker", "series"]) if (!details[key] && last[key]) details[key] = sanitize(String(last[key]), 200);
      if (!given.date && parseDateOnly(last.date)) details.date = cleanDetail("date", last.date);
      sermon = { ...last, youtubeUrl: details.youtubeUrl };
      source = "current";
    } else if (details.title) {
      const out = await format({ title: details.title, speaker: details.speaker, date: details.date, series: details.series, youtubeUrl: details.youtubeUrl }, { useAI: false, base: null, retry: false });
      sermon = out && out.sermon;
      source = "deterministic";
    }
  } else {
    const fields = {
      title: details.title,
      speaker: details.speaker,
      date: details.date,
      series: details.series,
      youtubeUrl: details.youtubeUrl,
      outline: parsed.notes
    };
    let out = null;
    if (preview && typeof preview === "object" && Array.isArray(preview.sections) && preview.sections.length) {
      // A follow-up answer: keep the formatted notes, apply the new details.
      out = { sermon: { ...preview }, source: "preview" };
    } else {
      out = await format(fields, { useAI: true, base: null, retry: false });
    }
    sermon = out && out.sermon;
    source = (out && out.source) || "deterministic";
    if (sermon) {
      const fromModel = source === "ai" || source === "preview";
      if (!details.title) details.title = fromModel ? sanitize(String(sermon.title || ""), 200) : titleFromFirstLine(parsed.notes);
      if (!details.speaker && fromModel && sermon.speaker) details.speaker = sanitize(String(sermon.speaker), 120);
      if (!details.series && fromModel && sermon.series) details.series = sanitize(String(sermon.series), 200);
      details.keyVerse = sanitize(String(sermon.keyVerse || ""), 80);
    }
    // The speaker is usually the same as last week's: offer it, marked as a guess.
    if (!details.speaker && last && last.speaker) {
      details.speaker = sanitize(String(last.speaker), 120);
      guessed.push("speaker");
    }
  }

  if (sermon) {
    const title = details.title || sermon.title || "";
    sermon = {
      ...sermon,
      title,
      speaker: details.speaker,
      series: details.series,
      date: details.date,
      youtubeUrl: details.youtubeUrl || sermon.youtubeUrl || "",
      id: source === "current" ? sermon.id : slugify(title) + "-" + details.date
    };
    delete sermon.youtubeOnly;
    if (!details.keyVerse && sermon.keyVerse) details.keyVerse = sanitize(String(sermon.keyVerse), 80);
  }

  const answers = answersByConfig(questions, { details, notes: parsed.notes });
  const needs = firstMissing(questions, answers);
  return {
    sunday,
    details,
    guessed,
    youtubeOnly: parsed.youtubeOnly,
    preview: needs && needs.key === "title" ? null : sermon,
    answers,
    needs,
    source
  };
}

/** The hub form's questions as `submit` sees them for the hub job. */
function hubQuestions(questions, role) {
  return (questions || []).filter((q) => questionVisibleForJob(q, role, "hub"));
}

module.exports = {
  DETAIL_KEYS,
  nextSundayFor,
  parseQuickText,
  titleFromFirstLine,
  cleanOverrides,
  answersByConfig,
  firstMissing,
  isForSunday,
  quickNotes,
  hubQuestions
};
