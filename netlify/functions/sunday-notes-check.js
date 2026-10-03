/**
 * Hourly: the Saturday nudge when Sunday's notes are not up (MOS-to-8 B09-10).
 *
 * Netlify runs this every hour (netlify.toml [functions."sunday-notes-check"]).
 * It reads the switch `dw_sunday_notes_missing` first and does nothing while it
 * is off (the seeded default). The rules live in lib/sunday-notes.js. It reads
 * with the service key and is not an endpoint anyone else needs: a hand call
 * outside Saturday 18:00 on a congregation's clock does nothing, and inside it
 * the per-recipient claim keys still allow one email per congregation per Sunday.
 */
const { createClient } = require("@supabase/supabase-js");
const { runSundayNotesCheck } = require("./lib/sunday-notes");

exports.handler = async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("[sunday-notes-check] Supabase is not configured");
    return { statusCode: 200, body: JSON.stringify({ ok: false }) };
  }
  const summary = await runSundayNotesCheck(createClient(url, key));
  console.log("[sunday-notes-check]", JSON.stringify(summary));
  return { statusCode: 200, body: JSON.stringify({ ok: true, mode: summary.mode, due: summary.due.length }) };
};
