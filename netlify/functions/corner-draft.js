/**
 * Hourly: the campus corner arrives drafted, "Make this yours" (MOS-to-8 B09-18).
 *
 * Netlify runs this every hour (netlify.toml [functions."corner-draft"]). It
 * reads the switch `dw_corner_draft` first and does nothing while it is off
 * (the seeded default): no read, no model call, no row. In shadow or live it
 * writes one draft per campus with a confirmed campus pastor on Monday morning
 * on that campus's clock (lib/corner-draft.js). It never publishes and never
 * sends anything: the pastor puts the draft on the corner himself on /staff.
 *
 * ‼️ Deploy previews carry production keys: never "Run now" a preview deploy.
 */
const { createClient } = require("@supabase/supabase-js");
const { runCornerDrafts } = require("./lib/corner-draft");

exports.handler = async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("[corner-draft] Supabase is not configured");
    return { statusCode: 200, body: JSON.stringify({ ok: false }) };
  }
  const summary = await runCornerDrafts(createClient(url, key));
  console.log("[corner-draft]", JSON.stringify(summary));
  return { statusCode: 200, body: JSON.stringify({ ok: true, mode: summary.mode, due: summary.due.length }) };
};
