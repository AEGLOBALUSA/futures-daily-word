// Owner's ruling, 7 Oct 2026: these five sign in with their email alone until the deadline, then this path is dead.
const TEAM_EMAIL_ONLY = [
  "ae@futures.global",
  "josh@futures.church",
  "mark@futures.church",
  "alexis@futuros.global",
  "jane0202@me.com"
];
const TEAM_EMAIL_ONLY_UNTIL = "2026-10-08T13:05:00Z";

function isTeamEmailOnly(email, now = new Date()) {
  if (now.getTime() >= Date.parse(TEAM_EMAIL_ONLY_UNTIL)) return false;
  return TEAM_EMAIL_ONLY.includes(String(email || "").trim().toLowerCase());
}

module.exports = { TEAM_EMAIL_ONLY, TEAM_EMAIL_ONLY_UNTIL, isTeamEmailOnly };
