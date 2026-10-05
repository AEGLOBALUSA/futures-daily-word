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
const { congregationTimeZone, localParts, serviceSunday, parseDateOnly, isCurrentAt } = require("./sermon-window");

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

/** `YYYY-MM-DD` moved by whole days. */
function shiftDays(date, n) {
  const d = parseDateOnly(date);
  if (!d) return "";
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day) + n * 86400000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/**
 * The Sunday just preached on the congregation's own clock: today on a Sunday,
 * else the Sunday before. A YouTube link is the video of a message already
 * preached, so this is the date a link on its own belongs to. `YYYY-MM-DD`.
 */
function lastSundayFor(congregation, now = new Date()) {
  const p = localParts(now, congregationTimeZone(congregation));
  const next = nextSundayFor(congregation, now);
  return next === ymd(p) ? next : shiftDays(next, -7);
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
function firstMissing(questions, answers, audience = "hub") {
  const order = (q) => {
    const k = q.config && q.config.sermonKey;
    const i = DETAIL_KEYS.indexOf(k);
    return i < 0 ? DETAIL_KEYS.length : i;
  };
  const required = (questions || [])
    .filter((q) => q && q.required && (q.audience === audience || q.audience === "all"))
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

/**
 * The Sunday a published row is for on that congregation's clock: its typed
 * date's Sunday, else the Sunday on or after the day it was published.
 * `YYYY-MM-DD`, or "" when the row says neither.
 */
function rowSunday(row, congregation) {
  if (!row || !row.sermon) return "";
  const typed = parseDateOnly(row.sermon.date);
  if (typed) return ymd(serviceSunday(typed.year, typed.month, typed.day));
  const at = new Date(row.published_at || NaN);
  if (Number.isNaN(at.getTime())) return "";
  const p = localParts(at, congregationTimeZone(congregation));
  return ymd(serviceSunday(p.year, p.month, p.day));
}

/** Is this published row this Sunday's message on that congregation's clock? */
function isForSunday(row, sunday, congregation) {
  const s = rowSunday(row, congregation);
  return !!s && s === sunday;
}

/**
 * The published message a YouTube link pasted on its own belongs to: the
 * congregation's current row, still inside its week (lib/sermon-window.js),
 * when it is the message just preached (today's on a Sunday). On Monday the
 * link is yesterday's video: it joins yesterday's message with that message's
 * own date and id, and never becomes a new message for next Sunday (review of
 * B09-10, 4 Oct 2026). A later Sunday's message is never picked for it: that
 * is `laterMessage`. null when there is no such row.
 */
function linkTarget(current, congregation, now = new Date()) {
  if (!current || !current.sermon || !isCurrentAt(current, now)) return null;
  const s = rowSunday(current, congregation);
  return s && s === lastSundayFor(congregation, now) ? current : null;
}

/**
 * The current row when it is for a Sunday still to come (next Sunday's notes
 * already up on a weekday). A link on its own may then be the video of the
 * message just preached or a link for the coming one: the app cannot tell, so
 * the person picks the message in the media form, the link already filled in
 * (flow review of B09-10, 4 Oct 2026: never pick a future Sunday on its own).
 * null otherwise.
 */
function laterMessage(current, congregation, now = new Date()) {
  if (!current || !current.sermon || !isCurrentAt(current, now)) return null;
  const s = rowSunday(current, congregation);
  return s && s > lastSundayFor(congregation, now) ? current : null;
}

/**
 * The media form's question that names the message being updated (the
 * sermon pick), or null.
 */
function mediaPickQuestion(questions) {
  return (questions || []).find((q) => {
    const cfg = q && q.config && typeof q.config === "object" ? q.config : {};
    return q && (q.type === "sermon_pick" || cfg.publish === "sermon_target");
  }) || null;
}

/**
 * The media form's answers for attaching a link to one published row: the
 * row picked (sermon_pick / sermon_target) and the link, by CONFIG. `submit`
 * with job "media" then merges the link into that row and keeps its date,
 * id and published_at (intake.js publishApproved). Without a `targetId` the
 * pick is left for the person. null when the media form has no question that
 * carries a link.
 */
function mediaAnswersByConfig(questions, { targetId, youtubeUrl }) {
  const answers = {};
  let carriesLink = false;
  let namesMessage = false;
  for (const q of questions || []) {
    const cfg = q && q.config && typeof q.config === "object" ? q.config : {};
    if (q.type === "sermon_pick" || cfg.publish === "sermon_target") { namesMessage = true; if (targetId) answers[q.id] = targetId; continue; }
    if (cfg.sermonKey === "youtubeUrl") { answers[q.id] = youtubeUrl; carriesLink = true; }
  }
  // Both are needed: without the message question the save would land on
  // whatever is current, without the link question there is nothing to add
  // (B09-10 round 10).
  return carriesLink && namesMessage ? answers : null;
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
 *   mediaQuestions the media form's visible questions (for a link on its own)
 *   format       async (fields, { useAI, base, retry }) => { sermon, source }
 *
 * output: { sunday, details, guessed, youtubeOnly, preview, answers, needs, source, attach }
 * or { error, code } when there is nothing to work from. `attach` is set when
 * a link on its own joins a message already up: { id, title, job: "media",
 * answers } is what publishing sends to `submit` instead of the hub answers.
 * With `id` "" (a later Sunday's message is up, so which message the link is
 * for is the person's call) it carries `later: { title, date }`, `needs` is
 * the media form's sermon pick, and there is no preview: the card opens the
 * media form with the link filled in.
 */
async function quickNotes({ questions, text, congregation, now = new Date(), overrides, preview, current, mediaQuestions, format }) {
  const parsed = parseQuickText(text);
  if (!parsed.notes && !parsed.youtubeUrl) {
    if (parsed.badLink) return { error: "Paste a YouTube watch, youtu.be, shorts, or embed link.", code: "bad_link" };
    return { error: "Paste Sunday's notes or the YouTube link.", code: "empty" };
  }
  const sunday = nextSundayFor(congregation, now);
  const given = cleanOverrides(overrides);
  const target = parsed.youtubeOnly ? linkTarget(current, congregation, now) : null;
  const later = parsed.youtubeOnly && !target ? laterMessage(current, congregation, now) : null;
  const last = current && current.sermon ? current.sermon : null;
  const guessed = [];
  let attach = null;

  const details = {
    title: given.title || parsed.labelled.title || "",
    speaker: given.speaker || parsed.labelled.speaker || "",
    // Notes are for the coming Sunday; a link on its own is the video of the
    // message just preached.
    date: given.date || (parsed.youtubeOnly ? lastSundayFor(congregation, now) : sunday),
    series: given.series || parsed.labelled.series || "",
    youtubeUrl: given.youtubeUrl || parsed.youtubeUrl || "",
    keyVerse: ""
  };

  let sermon = null;
  let source = "none";

  if (parsed.youtubeOnly && (target || later) && !mediaAnswersByConfig(mediaQuestions, { targetId: "", youtubeUrl: details.youtubeUrl })) {
    // A message is up but the media form cannot name it or carry the link:
    // never fall back to re-putting a message up, which could replace the
    // one on the page (B09-10 round 10).
    return { error: "A link on its own needs the media form\u2019s message and YouTube questions. Ask an admin to switch them back on in History, Ask this again.", code: "media_form_off" };
  }
  if (parsed.youtubeOnly) {
    // Only the link. When the message just preached is up, the link joins it:
    // its own title, date and id, nothing to ask, published through the media
    // form's merge (`attach`). When a later Sunday's message is already up,
    // the person picks the message in the media form, the link filled in
    // (`attach` without an id). Otherwise ask for the title.
    if (target) {
      const msg = target.sermon;
      for (const key of ["title", "speaker", "series"]) if (!details[key] && msg[key]) details[key] = sanitize(String(msg[key]), 200);
      if (!given.date) details.date = cleanDetail("date", msg.date) || rowSunday(target, congregation);
      sermon = { ...msg, id: msg.id || target.id, youtubeUrl: details.youtubeUrl };
      source = "current";
      const media = mediaAnswersByConfig(mediaQuestions, { targetId: target.id, youtubeUrl: details.youtubeUrl });
      if (media) attach = { id: target.id, title: details.title || sanitize(String(msg.title || ""), 200), job: "media", answers: media };
    } else if (later) {
      // Never a new message here: publishing one would take the later
      // Sunday's notes off the congregation page.
      const msg = later.sermon;
      attach = {
        id: "",
        title: "",
        job: "media",
        answers: mediaAnswersByConfig(mediaQuestions, { targetId: "", youtubeUrl: details.youtubeUrl }) || {},
        later: { title: sanitize(String(msg.title || ""), 200), date: rowSunday(later, congregation) }
      };
      source = "later";
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
  let needs;
  if (attach && !attach.id) {
    // Which message the video is for: a pick list, so always the media form.
    const pick = mediaPickQuestion(mediaQuestions);
    needs = { key: "other", questionId: pick ? pick.id : "", label: pick ? pick.label || "" : "", type: "sermon_pick" };
  } else {
    needs = attach ? firstMissing(mediaQuestions, attach.answers, "media") : firstMissing(questions, answers);
  }
  return {
    sunday,
    details,
    guessed,
    youtubeOnly: parsed.youtubeOnly,
    preview: needs && needs.key === "title" ? null : sermon,
    answers,
    needs,
    source,
    attach
  };
}

/** The hub form's questions as `submit` sees them for the hub job. */
function hubQuestions(questions, role) {
  return (questions || []).filter((q) => questionVisibleForJob(q, role, "hub"));
}

/** The media form's questions as `submit` sees them for the media job. */
function mediaQuestions(questions, role) {
  return (questions || []).filter((q) => questionVisibleForJob(q, role, "media"));
}

module.exports = {
  DETAIL_KEYS,
  nextSundayFor,
  lastSundayFor,
  parseQuickText,
  titleFromFirstLine,
  cleanOverrides,
  answersByConfig,
  firstMissing,
  rowSunday,
  isForSunday,
  linkTarget,
  laterMessage,
  mediaPickQuestion,
  mediaAnswersByConfig,
  quickNotes,
  hubQuestions,
  mediaQuestions
};
