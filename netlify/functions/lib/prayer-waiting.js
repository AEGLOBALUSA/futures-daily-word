/**
 * The one nameless nudge when a prayer request waits (MOS-to-8 build B09-13,
 * SF-09-07 step 5). Run hourly by netlify/functions/prayer-waiting.js.
 *
 * For each staff member with an open line (lib/prayer-lines.js) older than 48
 * hours that has never been escalated: at most one email a day, between 07:00
 * and 21:00 on the campus's clock, "A prayer request at {campus} has waited two
 * days." plus the /staff link. Never a name, an address or the prayer: the log
 * row's body holds the count only. A request is escalated once, ever (one
 * email, not a drip): escalated_on is set on the requests a sent email covered.
 * A muted staff member gets no email and still sees the card.
 *
 * Order, fail closed at every step:
 *   a deploy preview or branch deploy (production keys) → nothing at all;
 *   dw_prayer_waiting off (the seeded default) → the switch is the only read;
 *   dw_prayer_pastor_line off → no line exists, so nothing waits;
 *   then the gate, campuses, roster and open requests; planWaiting (pure);
 *   no one mailed in the last 20 hours (dw_prompt_log); raiseStaffEmail per
 *   person (switch, nation gate, lint, claim prayer_waiting:<email>:<local
 *   date>, send, delivered); escalated_on only after a LIVE send the provider
 *   accepted (a shadow send never marks).
 *
 * Tests: tests/functions/prayer-waiting.test.js, never in this folder.
 */
const { switchOf, raiseStaffEmail, regionGate } = require("./prompts");
const { loadCampuses } = require("./campuses");
const { LINE_KIND, WAITING_KIND, WAITING_MS, planWaiting, waitingEmail } = require("./prayer-lines");
const { staffHome } = require("./prayer-care");

const REQUEST_LIMIT = 500;
// One waiting email per person per 20 hours, whichever campus's clock the
// local date came from (a hub covering an Adelaide and an Atlanta campus would
// otherwise get two a few hours apart).
const PER_PERSON_MS = 20 * 60 * 60 * 1000;

/** Netlify sets CONTEXT; anything but production (or a local run with none) does nothing. */
function isNonProductionDeploy(env = process.env) {
  const ctx = String((env && env.CONTEXT) || "");
  return ctx !== "" && ctx !== "production";
}

/**
 * One run. Never throws. Returns a summary for the function log (modes and
 * counts only): { mode, lineMode, planned, sent, skipped, escalated }.
 */
async function runPrayerWaiting(db, { now = new Date(), env = process.env, link = staffHome() } = {}) {
  const summary = { mode: "off", lineMode: "off", planned: 0, sent: 0, skipped: 0, escalated: 0 };
  if (isNonProductionDeploy(env)) {
    summary.mode = "preview";
    return summary;
  }
  try {
    const waiting = await switchOf(db, WAITING_KIND);
    summary.mode = waiting.mode;
    if (waiting.mode === "off") return summary;
    const lineSwitch = await switchOf(db, LINE_KIND);
    summary.lineMode = lineSwitch.mode;
    if (lineSwitch.mode === "off") return summary;

    const gate = lineSwitch.mode === "live" ? await regionGate(db) : {};
    const campuses = await loadCampuses(db);
    const { data: roster, error: rosterErr } = await db
      .from("staff_roster")
      .select("email, role, campus_id, campus_set_by, prayer_waiting_muted");
    if (rosterErr || !Array.isArray(roster)) {
      console.error(`[prayer-waiting] roster read failed: ${(rosterErr && rosterErr.message) || "no rows"}`);
      return summary;
    }
    const before = new Date(now.getTime() - WAITING_MS).toISOString();
    const { data: rows, error } = await db
      .from("prayers")
      // Never the prayer text or an address: the email carries neither.
      .select("id, name, campus, created_at, status, pastor_done_at, escalated_on")
      .in("status", ["shown", "private"])
      .is("pastor_done_at", null)
      .is("escalated_on", null)
      .lt("created_at", before)
      .order("created_at", { ascending: true })
      .limit(REQUEST_LIMIT);
    if (error || !Array.isArray(rows)) {
      console.error(`[prayer-waiting] request read failed: ${(error && error.message) || "no rows"}`);
      return summary;
    }

    const plan = planWaiting({ rows, roster, campuses, lineSwitch, gate, now });
    summary.planned = plan.length;
    if (!plan.length) return summary;

    // Who already had one in the last 20 hours. A failed read sends nothing.
    const { data: recent, error: recentErr } = await db
      .from("dw_prompt_log")
      .select("recipient")
      .eq("kind", WAITING_KIND)
      .gte("created_at", new Date(now.getTime() - PER_PERSON_MS).toISOString());
    if (recentErr || !Array.isArray(recent)) {
      console.error(`[prayer-waiting] log read failed: ${(recentErr && recentErr.message) || "no rows"}`);
      summary.skipped = plan.length;
      return summary;
    }
    const mailedLately = new Set(recent.map((r) => r && r.recipient).filter(Boolean));

    for (const item of plan) {
      if (mailedLately.has(item.recipient)) {
        summary.skipped += 1;
        continue;
      }
      const { subject, text } = waitingEmail(item.campusName, link, item.lang);
      const out = await raiseStaffEmail(db, {
        kind: WAITING_KIND,
        dedupeKey: `prayer_waiting:${item.recipient}:${item.localDate}`,
        recipient: item.recipient,
        writtenBy: "template",
        title: subject,
        body: String(item.count),
        link,
        subject,
        text,
        campusId: item.campusId,
        now,
      });
      if (!out.sent) {
        summary.skipped += 1;
        continue;
      }
      summary.sent += 1;
      mailedLately.add(item.recipient);
      // A shadow send is Ashley's test: it never marks a request, so the
      // pastor still gets his one email after switch-on.
      if (waiting.mode !== "live") continue;
      const { data: marked, error: markErr } = await db
        .from("prayers")
        .update({ escalated_on: item.localDate })
        .in("id", item.ids)
        .is("escalated_on", null)
        .select("id");
      if (markErr) console.error(`[prayer-waiting] escalated_on not set: ${markErr.message || ""}`);
      else summary.escalated += Array.isArray(marked) ? marked.length : 0;
    }
    return summary;
  } catch (err) {
    console.error(`[prayer-waiting] run threw: ${err && err.message}`);
    return summary;
  }
}

module.exports = { runPrayerWaiting, isNonProductionDeploy };
