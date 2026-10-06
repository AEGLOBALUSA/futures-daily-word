/**
 * Hourly: the one nameless "a prayer request has waited two days" email
 * (MOS-to-8 B09-13). Netlify runs it every hour (netlify.toml
 * [functions."prayer-waiting"]). It reads the switch dw_prayer_waiting first
 * and does nothing else while it is off (the seeded default); a deploy preview
 * does nothing at all. The rules live in lib/prayer-waiting.js and
 * lib/prayer-lines.js.
 */
const { createClient } = require("@supabase/supabase-js");
const { runPrayerWaiting } = require("./lib/prayer-waiting");

exports.handler = async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("[prayer-waiting] Supabase is not configured");
    return { statusCode: 200, body: JSON.stringify({ ok: false }) };
  }
  const summary = await runPrayerWaiting(createClient(url, key));
  console.log("[prayer-waiting]", JSON.stringify(summary));
  return { statusCode: 200, body: JSON.stringify({ ok: true, mode: summary.mode }) };
};
