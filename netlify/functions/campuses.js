/**
 * GET /.netlify/functions/campuses — the one campus list for readers (B09-02).
 *
 * Answers the ACTIVE rows of dw_campuses (the owner keeps them in /staff ->
 * Settings -> Campuses), in reader order:
 *   { campuses: [{ id, name, city, towns, region, congregation, timeZone, sundayUntil, videoUrl, sortOrder }] }
 *
 * Public by design: a campus row holds public facts only. It never carries
 * updated_by (the saving staff address) or the Planning Center spellings.
 * `towns` (the other towns near a campus, B09-07F) is served so the reader's
 * phone can match its own town in memory; her town never comes here. The
 * table itself has no grant for anon or authenticated; this function reads it
 * with the service key through lib/campuses.js (5-minute cache, the bundled
 * seed if the read fails), so the reader app always gets a list.
 */
const { createClient } = require("@supabase/supabase-js");
const { getAllowedOrigin } = require("./lib/cors");
const { isSharedRateLimited } = require("./lib/rate-limit");
const { clientIp } = require("./lib/client-ip");
const { loadCampuses, publicCampus } = require("./lib/campuses");

let supabase;
function db() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

function headersFor(event, extra = {}) {
  const h = event.headers || {};
  const origin = h.origin || h.Origin || h.referer || "";
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
    Vary: "Origin",
    ...extra
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: headersFor(event), body: "" };
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: headersFor(event), body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (await isSharedRateLimited("campuses", clientIp(event), 60, 60 * 1000)) {
    return { statusCode: 429, headers: headersFor(event), body: JSON.stringify({ error: "Too many requests" }) };
  }
  const list = await loadCampuses(db());
  const campuses = list.filter((c) => c.active).map(publicCampus);
  return {
    statusCode: 200,
    headers: headersFor(event, { "Cache-Control": "public, max-age=300" }),
    body: JSON.stringify({ campuses })
  };
};
