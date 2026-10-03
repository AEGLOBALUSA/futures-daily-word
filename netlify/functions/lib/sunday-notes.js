/**
 * The Saturday nudge when Sunday's notes are not up (MOS-to-8 build B09-10).
 *
 * Saturday 18:00–18:59 on each congregation's own clock (Adelaide for Futures
 * Australia, New York for Futures USA and Futuros USA), when the congregation
 * page still shows an earlier message (or none), each hub and admin member on
 * staff_roster gets ONE email for that congregation and that Sunday. If Sermon
 * Prep's Send to Sunday or anyone else publishes first, nothing goes.
 *
 * Kind `dw_sunday_notes_missing` (seeded OFF by B09-01). Every email goes
 * through lib/prompts.js raiseStaffEmail:
 *   off     nothing is generated, nothing is logged (the default);
 *   shadow  one log row per stale congregation per hub/admin recipient
 *           (logInShadow), delivered only to the kind's shadow list;
 *   live    only the owner sets it, after the region switch-on. B09-13 adds the
 *           Daily Word nation gate in front of this when it lands.
 * The claim key is notes_missing:<congregation>:<sunday>:<recipient>, so a
 * second run in the same hour (or a retry) claims nothing and sends nothing.
 *
 * The words are a template (no model), English, and Spanish for Futuros USA.
 * The owner reads them before the kind leaves off. Recipients come from the
 * roster only, never from a hard-coded address.
 *
 * The tests live in tests/functions/sunday-notes.test.js.
 */
const { CONGREGATIONS, congregationName } = require("./congregations");
const { congregationTimeZone, localParts, parseDateOnly } = require("./sermon-window");
const { isForSunday } = require("./quick-notes");
const { modeOf, raiseStaffEmail, normalizeRecipient } = require("./prompts");
const { loadCampuses, campusCongregation } = require("./campuses");

const KIND = "dw_sunday_notes_missing";
const NUDGE_HOUR = 18;
const RECIPIENT_ROLES = ["hub", "admin"];
const DEFAULT_SITE = "https://futuresdailyword.com";

function pad(n) {
  return String(n).padStart(2, "0");
}

/** Saturday 18:00–18:59 on that congregation's clock? Then the Sunday it is for. */
function nudgeSunday(congregation, now = new Date()) {
  const tz = congregationTimeZone(congregation);
  const p = localParts(now, tz);
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  if (weekday !== 6 || p.hour !== NUDGE_HOUR) return null;
  const sun = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
  return `${sun.getUTCFullYear()}-${pad(sun.getUTCMonth() + 1)}-${pad(sun.getUTCDate())}`;
}

/**
 * Who hears about this congregation: admin staff for every congregation; hub
 * staff for the congregation their campus reads (any hub member without one
 * hears about every congregation, as the hub job covers all three).
 */
function recipientsFor(congregation, roster, campuses) {
  const out = [];
  const seen = new Set();
  for (const row of roster || []) {
    if (!row || !RECIPIENT_ROLES.includes(row.role)) continue;
    const email = normalizeRecipient(row.email);
    if (!email || seen.has(email)) continue;
    if (row.role === "hub" && row.campus_id) {
      const theirs = campusCongregation(row.campus_id, campuses);
      if (theirs && theirs !== congregation) continue;
    }
    seen.add(email);
    out.push(email);
  }
  return out;
}

const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"]
};

/** "27 Sep" / "27 sept": the same on every server, whatever its ICU data. */
function shortDate(value, lang) {
  const d = parseDateOnly(value);
  if (!d) return "";
  return `${d.day} ${(MONTHS[lang] || MONTHS.en)[d.month - 1]}`;
}

/**
 * The email, word for word. `current` is the congregation's current published
 * sermon (or null). Spanish for Futuros USA, English for the others.
 */
function nudgeEmail(congregation, current, link) {
  const name = congregationName(congregation);
  const spanish = congregation === "futuros-us";
  const title = current && current.title ? String(current.title).trim() : "";
  const when = current ? shortDate(current.date, spanish ? "es" : "en") : "";
  if (spanish) {
    const lastWeek = title
      ? `La página de ${name} todavía muestra el mensaje de la semana pasada («${title}»${when ? `, ${when}` : ""}).`
      : `La página de ${name} todavía no tiene un mensaje para el domingo.`;
    return {
      subject: `Las notas del domingo para ${name} aún no están publicadas`,
      text: `${lastWeek} Si el sermón se preparó en Sermon Prep, «Send to Sunday» lo publica; si no, pega las notas aquí:\n${link}\n\nFutures Daily Word`
    };
  }
  const lastWeek = title
    ? `The ${name} page still shows last week's message (“${title}”${when ? `, ${when}` : ""}).`
    : `The ${name} page has no message for Sunday yet.`;
  return {
    subject: `Sunday's notes for ${name} aren't up yet`,
    text: `${lastWeek} If the sermon was prepared in Sermon Prep, Send to Sunday puts it up; otherwise paste the notes here:\n${link}\n\nFutures Daily Word`
  };
}

function staffLink() {
  const url = String(process.env.URL || "");
  return (/^https:\/\//.test(url) ? url.replace(/\/+$/, "") : DEFAULT_SITE) + "/staff";
}

/**
 * One run of the hourly check. Never throws. Returns a summary for the log:
 * { mode, due: [congregation], results: [{ congregation, up, sent, logged, skipped }] }.
 */
async function runSundayNotesCheck(db, { now = new Date(), link = staffLink() } = {}) {
  const summary = { mode: "off", due: [], results: [] };
  try {
    // The switch first: while the kind is off this reads nothing else.
    const mode = await modeOf(db, KIND);
    summary.mode = mode;
    if (mode === "off") return summary;

    const due = CONGREGATIONS
      .map((c) => ({ congregation: c.id, sunday: nudgeSunday(c.id, now) }))
      .filter((d) => d.sunday);
    summary.due = due.map((d) => d.congregation);
    if (!due.length) return summary;

    const { data: roster, error: rosterErr } = await db
      .from("staff_roster")
      .select("email, role, campus_id")
      .in("role", RECIPIENT_ROLES);
    if (rosterErr || !Array.isArray(roster)) {
      console.error(`[sunday-notes] roster read failed: ${(rosterErr && rosterErr.message) || "no rows"}`);
      return summary;
    }
    const campuses = await loadCampuses(db);

    for (const { congregation, sunday } of due) {
      const result = { congregation, sunday, up: false, sent: 0, logged: 0, skipped: 0 };
      summary.results.push(result);
      const { data: row, error } = await db
        .from("published_sermons")
        .select("id, sermon, is_current, congregation, published_at")
        .eq("is_current", true)
        .eq("congregation", congregation)
        .maybeSingle();
      if (error) {
        console.error(`[sunday-notes] ${congregation}: current read failed: ${error.message || ""}`);
        result.skipped = -1;
        continue;
      }
      if (isForSunday(row, sunday, congregation)) {
        result.up = true;
        continue;
      }
      const current = row && row.sermon ? row.sermon : null;
      const { subject, text } = nudgeEmail(congregation, current, link);
      for (const recipient of recipientsFor(congregation, roster, campuses)) {
        const out = await raiseStaffEmail(db, {
          kind: KIND,
          dedupeKey: `notes_missing:${congregation}:${sunday}:${recipient}`,
          recipient,
          writtenBy: "template",
          title: subject,
          body: text,
          link,
          subject,
          text,
          logInShadow: true
        });
        if (out.sent) result.sent += 1;
        else if (out.reason === "shadow_logged") result.logged += 1;
        else result.skipped += 1;
      }
    }
    return summary;
  } catch (err) {
    console.error(`[sunday-notes] check threw: ${err && err.message}`);
    return summary;
  }
}

module.exports = { KIND, NUDGE_HOUR, nudgeSunday, recipientsFor, nudgeEmail, runSundayNotesCheck, staffLink };
