/**
 * Daily Word: a campus's reading week, without a code (DW-P08).
 *
 *   readingWeekScope(staff, requested, campuses)  which campus this staff
 *                                                 member may read, or a refusal
 *   readingWeekCounts(row)                        the four counts and nothing else
 *   readingWeek(db, staff, requested, campuses)   the intake action `reading_week`
 *
 * The numbers come from the SQL function public.reading_week(p_campus)
 * (supabase/migrations/20261006010000_dw_reading_week.sql, service_role only):
 * people at the campus who opened the Daily Word in the last 7 full days on
 * the campus clock, how many of them for the first time, how many started
 * Bible Basics or the I'm New journey, and the 7 days before. Counts only: no
 * name, email or id is read into this file or sent back, and the code
 * dashboard's global view (with its sign-up list) is never touched.
 *
 * Who may read which campus:
 *   campus  own CONFIRMED roster campus only; naming another campus is a 403
 *   hub, admin  any campus they name; none named: their own roster campus
 *   media, an unconfirmed campus pastor  403
 * No session never reaches this file: intake.js answers 401 first.
 *
 * The tests live in tests/functions/reading-week.test.js, never in this folder.
 */

const { isCampusId, findCampus } = require("./campuses");
const { campusConfirmed } = require("./intake-core");

const KEYS = ["readers", "first_time", "started_journey", "prev_readers"];

function named(requested) {
  return requested !== undefined && requested !== null && requested !== "";
}

/**
 * The campus a staff member may read, or a refusal.
 * Returns { campus } or { status, code, error }.
 */
function readingWeekScope(staff, requested, list) {
  if (!staff) return { status: 401, code: "signin", error: "Sign in required" };
  if (staff.role === "campus") {
    if (!campusConfirmed(staff) || !staff.campusId || !isCampusId(staff.campusId, list)) {
      return { status: 403, code: "campus_unconfirmed", error: "Your campus has not been confirmed yet. An admin confirms it in Staff, People." };
    }
    if (named(requested) && requested !== staff.campusId) {
      return { status: 403, code: "other_campus", error: "You can see your own campus’s reading week only." };
    }
    return { campus: findCampus(staff.campusId, list) };
  }
  if (staff.role === "admin" || staff.role === "hub") {
    if (named(requested)) {
      if (typeof requested !== "string" || !isCampusId(requested, list)) {
        return { status: 400, code: "campus", error: "Choose a campus." };
      }
      return { campus: findCampus(requested, list) };
    }
    if (staff.campusId && isCampusId(staff.campusId, list)) return { campus: findCampus(staff.campusId, list) };
    return { status: 400, code: "campus", error: "Choose a campus." };
  }
  return { status: 403, code: "role", error: "The reading week is for campus pastors, hub and admin staff." };
}

/** A whole, non-negative count, or 0. */
function count(v) {
  const n = typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v;
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

/** Exactly the four counts from the function's row; anything else it carries never leaves. */
function readingWeekCounts(row) {
  const r = row && typeof row === "object" ? row : {};
  const out = {};
  for (const k of KEYS) out[k] = count(r[k]);
  return out;
}

/**
 * The intake action. 200: { campusId, campusName, readers, first_time,
 * started_journey, prev_readers }. A refusal: { status, code, error }.
 */
async function readingWeek(db, staff, requested, list) {
  const scope = readingWeekScope(staff, requested, list);
  if (scope.status) return scope;
  const campus = scope.campus;
  const { data, error } = await db.rpc("reading_week", { p_campus: campus.id });
  if (error) {
    console.error("[intake] reading_week failed", JSON.stringify({ campus: campus.id, code: error.code || null }));
    return { status: 500, code: "server", error: "The reading week did not load." };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { campusId: campus.id, campusName: campus.name, ...readingWeekCounts(row) };
}

module.exports = { readingWeekScope, readingWeekCounts, readingWeek, KEYS };
