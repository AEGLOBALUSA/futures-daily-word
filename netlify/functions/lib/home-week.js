"use strict";

/**
 * Staff home names the person's church's week (readiness 10 Oct 2026, Heart):
 * how many prayer requests came in over the last seven days and how many
 * corner posts went up, for the place this person serves. Reads only, counts
 * only: no prayer text, name or email leaves this function.
 *
 * The place: a campus pastor's own campus; everyone else, their church
 * (congregation), i.e. every campus whose congregation it is. Prayer counts
 * follow the same gate as prayer care (prayerScope): a role that cannot see
 * prayer requests gets null, never a number. The prayer count matches the
 * "Prayer requests this week" list (shown and private; a held post is
 * counted once it is decided), so home and the list never disagree.
 */
const { prayerScope } = require("./prayer-care");
const { campusName, campusCongregation } = require("./campuses");
const { congregationName } = require("./congregations");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Which campuses, and what to call them, for this person's week. Pure. */
function weekPlace(staff, campuses, congregation) {
  if (staff && staff.role === "campus" && staff.campusId) {
    return { campusIds: [staff.campusId], name: campusName(staff.campusId, campuses) };
  }
  const campusIds = (campuses || [])
    .filter((c) => c && c.id && campusCongregation(c.id, campuses) === congregation)
    .map((c) => c.id);
  return { campusIds, name: congregationName(congregation) };
}

async function countRows(q) {
  const { count, error } = await q;
  if (error) throw error;
  return Number.isFinite(count) ? count : 0;
}

/**
 * { place, prayers, corner } for the last seven days. `prayers` is null when
 * the person may not see prayer requests; `corner` is null when the place
 * has no campus to count.
 */
async function homeWeek(db, staff, campuses, congregation, now = new Date()) {
  const place = weekPlace(staff, campuses, congregation);
  const since = new Date(now.getTime() - WEEK_MS).toISOString();
  if (!place.campusIds.length) return { place: place.name, prayers: null, corner: null };
  const scope = prayerScope(staff, campuses);
  const [prayers, corner] = await Promise.all([
    scope.error
      ? null
      : countRows(db.from("prayers").select("id", { count: "exact", head: true })
        .in("status", ["shown", "private"])
        .in("campus", place.campusIds)
        .gte("created_at", since)),
    countRows(db.from("campus_content").select("id", { count: "exact", head: true })
      .in("campus", place.campusIds)
      .gte("created_at", since)),
  ]);
  return { place: place.name, prayers, corner };
}

module.exports = { homeWeek, weekPlace, WEEK_MS };
