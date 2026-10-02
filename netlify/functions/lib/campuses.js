/**
 * The one campus list (MOS-to-8 build B09-02).
 *
 * Every function that needs to know the campuses reads them here, from the
 * `dw_campuses` table the owner keeps in /staff -> Settings -> Campuses. Before
 * this, the list was typed by hand in seven places and adding a campus was a
 * code change.
 *
 *   loadCampuses(db)  every row (active and hidden), in reader order. Cached in
 *                     memory for 5 minutes per function instance. On ANY read
 *                     failure, or an empty table, it answers with the bundled
 *                     copy of the seed (campuses.fallback.json) and does not
 *                     cache that, so the next call tries the table again.
 *
 * The helpers take the list as an argument (no I/O), so pure modules
 * (intake-core, campus-code) and tests can use them without a database. Every
 * helper falls back to the bundled list when it is not given one.
 *
 * A campus id is never renamed or deleted (profiles, prayers, campus_content,
 * staff_roster and campus codes all hold it). A hidden campus (active = false)
 * still names itself and still validates: only the reader pickers drop it.
 *
 * 'other' ("Non-Futures Church") is in the list so readers can choose it and
 * its name resolves, but it is NOT a campus for staff purposes (campus codes,
 * the campus corner, a staff member's campus): isCampusId('other') is false,
 * exactly as before this build.
 */

const FALLBACK = require("./campuses.fallback.json");

const CACHE_MS = 5 * 60 * 1000;
const ID_RE = /^[a-z]{2}-[a-z0-9-]{2,40}$/;
const COLUMNS = "id, name, city, region, congregation, time_zone, sunday_until, video_url, pco_names, sort_order, active";

let cache = null; // { at, list }

function hhmm(v) {
  const m = /^(\d{2}):(\d{2})/.exec(String(v || ""));
  return m ? `${m[1]}:${m[2]}` : "16:00";
}

/** A dw_campuses row → the list's shape (camelCase, the same shape as the fallback). */
function fromRow(row) {
  return {
    id: String(row.id),
    name: String(row.name || row.id),
    city: String(row.city || ""),
    region: String(row.region || "Other"),
    congregation: row.congregation || null,
    timeZone: String(row.time_zone || "UTC"),
    sundayUntil: hhmm(row.sunday_until),
    videoUrl: row.video_url || null,
    pcoNames: Array.isArray(row.pco_names) ? row.pco_names.map((n) => String(n).toLowerCase()) : [],
    sortOrder: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    active: row.active !== false
  };
}

function byOrder(a, b) {
  return a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** A fresh copy of the bundled list (callers may not mutate the shared one). */
function fallbackCampuses() {
  return FALLBACK.map((c) => ({ ...c, pcoNames: [...c.pcoNames] })).sort(byOrder);
}

async function loadCampuses(db, { now = Date.now() } = {}) {
  if (cache && now - cache.at < CACHE_MS) return cache.list;
  try {
    const { data, error } = await db.from("dw_campuses").select(COLUMNS).order("sort_order", { ascending: true });
    if (error) throw error;
    if (!Array.isArray(data) || !data.length) throw new Error("dw_campuses is empty");
    const list = data.map(fromRow).sort(byOrder);
    cache = { at: now, list };
    return list;
  } catch (err) {
    console.warn("[campuses] using the bundled list:", (err && err.message) || err);
    return fallbackCampuses();
  }
}

/** Forget the cached list (after a save, so this instance serves the change at once). */
function clearCampusCache() {
  cache = null;
}

function listOr(list) {
  return Array.isArray(list) && list.length ? list : FALLBACK;
}

function findCampus(id, list) {
  if (typeof id !== "string" || !id) return null;
  return listOr(list).find((c) => c.id === id) || null;
}

/** A real campus id (any region prefix, active or hidden). 'other' is not a campus. */
function isCampusId(id, list) {
  if (typeof id !== "string" || id === "other" || !ID_RE.test(id)) return false;
  return !!findCampus(id, list);
}

/** Any id in the list, 'other' included (a reader's choice). */
function isKnownCampus(id, list) {
  return !!findCampus(id, list);
}

/** The campus's name, or the id itself when it is not in the list (never throws). */
function campusName(id, list) {
  const c = findCampus(id, list);
  return c ? c.name : (typeof id === "string" ? id : "");
}

/** Planning Center's campus name → our id ("" when nothing matches). */
function campusIdForPcoName(name, list) {
  const key = String(name || "").trim().toLowerCase();
  if (!key) return "";
  const hit = listOr(list).find((c) => c.id !== "other" && (c.pcoNames.includes(key) || c.name.toLowerCase() === key));
  return hit ? hit.id : "";
}

/** The campus's IANA time zone, or null when the campus is not in the list. */
function campusTimeZone(id, list) {
  const c = findCampus(id, list);
  return c ? c.timeZone : null;
}

/** The campus's congregation ('futures-us' | 'futures-au' | 'futuros-us'), or null when it has none or is not in the list. */
function campusCongregation(id, list) {
  const c = findCampus(id, list);
  return c ? c.congregation || null : null;
}

/** Every id that is a campus for staff purposes (no 'other'), in list order. */
function campusIds(list) {
  return listOr(list).filter((c) => c.id !== "other").map((c) => c.id);
}

/** What the public GET serves for one campus. Never updated_by, never pco_names. */
function publicCampus(c) {
  return {
    id: c.id,
    name: c.name,
    city: c.city,
    region: c.region,
    congregation: c.congregation,
    timeZone: c.timeZone,
    sundayUntil: c.sundayUntil,
    videoUrl: c.videoUrl,
    sortOrder: c.sortOrder
  };
}

// ── The owner's save (/staff -> Campuses → intake.js campus_save) ──────────

/** "Futuros Mérida" → "futuros-merida". */
function slugify(name) {
  return String(name || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

function isTimeZone(tz) {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function clean(v, max) {
  return typeof v === "string" ? v.replace(/<[^>]*>/g, "").replace(/[\x00-\x1F\x7F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/**
 * Check one campus the owner is saving against the current list.
 * Returns { row } (a dw_campuses row ready to upsert, without updated_by) or
 * { error } in words that say the fix. `existing` is the row with that id when
 * it is an edit; an id is never changed (the client sends the saved id back).
 */
function validateCampusSave(input, list) {
  const given = input && typeof input === "object" ? input : {};
  const id = typeof given.id === "string" ? given.id.trim() : "";
  const all = Array.isArray(list) ? list : [];
  const existing = all.find((x) => x.id === id) || null;
  // An edit that leaves a field out keeps what is saved (the livestream link,
  // the Planning Center spellings, hidden or shown). Only an explicit null or ""
  // clears a field.
  const c = existing && given.isNew !== true ? { ...existing, ...given } : given;
  const name = clean(c.name, 80);
  if (name.length < 2) return { error: "Add the campus name first." };
  if (name.length > 60) return { error: "Keep the campus name to 60 characters." };
  if (!id) return { error: "Add the campus id first." };
  if (!(ID_RE.test(id) || id === "other")) {
    return { error: "The id is two letters, a dash, then lower-case letters, numbers or dashes (for example ve-futuros-merida)." };
  }
  const region = clean(c.region, 40);
  if (region.length < 2) return { error: "Choose the campus's region first." };
  const timeZone = typeof c.timeZone === "string" ? c.timeZone.trim() : "";
  if (!isTimeZone(timeZone)) return { error: "Choose the campus's time zone first." };
  const sundayUntil = typeof c.sundayUntil === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(c.sundayUntil.trim())
    ? c.sundayUntil.trim()
    : null;
  if (c.sundayUntil != null && c.sundayUntil !== "" && !sundayUntil) {
    return { error: "Give the Sunday notes time as hours and minutes, for example 16:00." };
  }
  const videoUrl = typeof c.videoUrl === "string" && c.videoUrl.trim() ? c.videoUrl.trim().slice(0, 500) : null;
  if (videoUrl && !/^https:\/\//.test(videoUrl)) return { error: "The livestream link starts with https://." };
  const congregation = ["futures-us", "futures-au", "futuros-us"].includes(c.congregation) ? c.congregation : null;
  const pcoNames = (Array.isArray(c.pcoNames) ? c.pcoNames : String(c.pcoNames || "").split(/\n|,/))
    .map((n) => clean(String(n), 80).toLowerCase())
    .filter(Boolean)
    .filter((n, i, a) => a.indexOf(n) === i)
    .slice(0, 20);

  if (!existing && c.isNew !== true) {
    // An edit names a saved id; a different id than the one saved is a rename.
    return { error: "The id never changes once saved. Add a new campus instead." };
  }
  if (existing && c.isNew === true) {
    return { error: `The id ${id} is already taken. Change the name or the id.` };
  }
  const lowerName = name.toLowerCase();
  if (all.some((x) => x.id !== id && x.name.toLowerCase() === lowerName)) {
    return { error: `${name} is already on the list.` };
  }
  for (const n of pcoNames) {
    const owner = all.find((x) => x.id !== id && x.pcoNames.includes(n));
    if (owner) return { error: `“${n}” already matches ${owner.name} in Planning Center.` };
  }

  // Order is changed with Move up / Move down (campus_move), never by a save. A
  // new campus goes last among the campuses, just ahead of "Non-Futures Church".
  const sortOrder = existing
    ? existing.sortOrder
    : all.filter((x) => x.id !== "other").reduce((m, x) => Math.max(m, x.sortOrder), 0) + 1;

  return {
    row: {
      id,
      name,
      city: clean(c.city, 80),
      region,
      congregation,
      time_zone: timeZone,
      sunday_until: sundayUntil || (existing ? existing.sundayUntil : "16:00"),
      video_url: videoUrl,
      pco_names: pcoNames,
      sort_order: sortOrder,
      active: c.active !== false
    },
    isNew: !existing
  };
}

/**
 * Move one campus a place up or down the reader order. Returns the rows whose
 * sort_order changes ([{ id, sort_order }]), renumbered 10, 20, 30… so ties
 * never stick, or { error }.
 */
function planCampusMove(id, direction, list) {
  const all = (Array.isArray(list) ? list : []).slice().sort(byOrder);
  const i = all.findIndex((c) => c.id === id);
  if (i < 0) return { error: "That campus is not on the list." };
  const j = direction === "up" ? i - 1 : direction === "down" ? i + 1 : -1;
  if (direction !== "up" && direction !== "down") return { error: "Move it up or down." };
  if (j < 0) return { error: `${all[i].name} is already first.` };
  if (j >= all.length) return { error: `${all[i].name} is already last.` };
  const next = all.slice();
  [next[i], next[j]] = [next[j], next[i]];
  const changes = [];
  next.forEach((c, k) => {
    const sort_order = (k + 1) * 10;
    if (c.sortOrder !== sort_order) changes.push({ id: c.id, sort_order });
  });
  return { changes };
}

module.exports = {
  CACHE_MS,
  planCampusMove,
  loadCampuses,
  clearCampusCache,
  fallbackCampuses,
  fromRow,
  isCampusId,
  isKnownCampus,
  campusName,
  campusIdForPcoName,
  campusTimeZone,
  campusCongregation,
  campusIds,
  publicCampus,
  slugify,
  isTimeZone,
  validateCampusSave
};
