// Builds insertable activity_events rows from client-submitted events.
// The client's TRACKED_EVENTS allowlist (src/utils/analytics.ts) is the single
// name gate; this module only validates shape (name pattern, path, journey_day,
// detail length) so the server stays defensive without duplicating the list.

const NAME_RE = /^[a-z][a-z0-9_]{2,47}$/;
const PATH_RE = /^[a-z][a-z0-9_]{2,23}$/;

function buildActivityRows(cleanEmail, events) {
  const rows = [];
  for (const evt of events) {
    if (!evt || typeof evt.type !== 'string' || !NAME_RE.test(evt.type)) continue;

    const detail = typeof evt.detail === 'string' ? evt.detail.slice(0, 500) : '';
    const path = typeof evt.path === 'string' && PATH_RE.test(evt.path) ? evt.path : null;
    const journeyDay = Number.isInteger(evt.journey_day) && evt.journey_day >= 1 && evt.journey_day <= 1000
      ? evt.journey_day
      : null;

    rows.push({
      email: cleanEmail,
      event_type: evt.type,
      detail,
      path,
      journey_day: journeyDay
    });
  }
  return rows;
}

module.exports = { buildActivityRows };
