const { createClient } = require("@supabase/supabase-js");

const { ALLOWED_ORIGINS } = require('./lib/cors');

// The campus names come from the one campus list (dw_campuses, lib/campuses.js,
// B09-02), so a campus the owner adds in /staff names itself here too.
const { loadCampuses, campusName, isKnownCampus } = require('./lib/campuses');
const { clientIp } = require('./lib/client-ip');
const { switchOf, deliverable } = require('./lib/prompts');

// B09-11: "{n} people prayed for your request". The poster's own phone keeps
// the ids of the requests it posted (device-only) and asks GET ?mine=<ids> for
// their counts. The answer is counts only, never text, name, email or campus,
// and [] unless the kind is live (or shadow with the id on its list).
const PRAYED_KIND = 'dw_prayed_count';
const MINE_MAX = 10;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The ?mine= list: lower-cased, de-duplicated uuids, or null when it is not a valid list. */
function parseMine(raw) {
  if (typeof raw !== 'string' || raw.length > 400) return null;
  const ids = [...new Set(raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (ids.length === 0 || ids.length > MINE_MAX) return null;
  return ids.every((id) => UUID_RE.test(id)) ? ids : null;
}

/** Counts for the poster's own request ids. Fails closed: any doubt answers []. */
async function prayedCounts(db, ids) {
  const { mode, shadowRecipients } = await switchOf(db, PRAYED_KIND);
  const allowed = mode === 'live' ? ids : ids.filter((id) => deliverable(mode, id, shadowRecipients));
  if (allowed.length === 0) return [];
  try {
    const { data, error } = await db.from('prayers').select('id, prayer_count').in('id', allowed);
    if (error || !Array.isArray(data)) return [];
    const asked = new Set(allowed);
    return data
      .filter((row) => row && asked.has(String(row.id).toLowerCase()))
      .map((row) => ({ id: String(row.id).toLowerCase(), prayerCount: Math.max(0, Number(row.prayer_count) || 0) }));
  } catch {
    return [];
  }
}

function sanitize(str, maxLen = 500) {
  if (typeof str !== "string") return "";
  return str.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}

let supabase;
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

// Simple rate limit
const ipHits = {};
function checkRate(ip, max = 20) {
  const now = Date.now();
  if (!ipHits[ip]) ipHits[ip] = [];
  ipHits[ip] = ipHits[ip].filter(t => now - t < 60000);
  if (ipHits[ip].length >= max) return true;
  ipHits[ip].push(now);
  return false;
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString();
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const headers = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };

  // The platform's client address (lib/client-ip.js): a caller cannot pick it,
  // as it could with the first x-forwarded-for entry.
  const clientIP = clientIp(event);
  if (checkRate(clientIP)) return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many requests" }) };

  const db = getSupabase();

  try {
    // GET - list prayers
    if (event.httpMethod === "GET") {
      const params = event.queryStringParameters || {};

      if (params.mine !== undefined) {
        const ids = parseMine(params.mine);
        if (!ids) return { statusCode: 400, headers, body: JSON.stringify({ error: `Up to ${MINE_MAX} request ids` }) };
        return { statusCode: 200, headers, body: JSON.stringify(await prayedCounts(db, ids)) };
      }

      const filter = params.filter || 'all';
      const campus = params.campus || '';

      let query = db.from("prayers").select("*").order("created_at", { ascending: false }).limit(50);
      if (filter === 'my-campus' && campus) {
        query = query.eq("campus", campus);
      }

      const { data, error } = await query;
      if (error) throw error;

      const campuses = await loadCampuses(db);
      const prayers = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        campus: p.campus,
        campusName: campusName(p.campus, campuses),
        prayer: p.prayer,
        prayerCount: p.prayer_count || 0,
        timeAgo: timeAgo(p.created_at),
        createdAt: p.created_at
      }));

      // The Pray button promises "They'll know someone prayed" only while the
      // poster's phone is really told (the kind is live).
      const prayedConfirm = (await switchOf(db, PRAYED_KIND)).mode === 'live';

      return { statusCode: 200, headers, body: JSON.stringify({ prayers, prayedConfirm }) };
    }

    // POST actions
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body);

      if (body.action === 'create') {
        const prayer = sanitize(body.prayer, 500);
        const name = sanitize(body.name, 100) || 'Anonymous';
        // A campus id that is not on the list is stored as '' (it was not
        // checked at all before B09-02).
        const rawCampus = sanitize(body.campus, 100);
        const campus = rawCampus && isKnownCampus(rawCampus, await loadCampuses(db)) ? rawCampus : '';
        const email = sanitize(body.email, 254);

        if (!prayer) return { statusCode: 400, headers, body: JSON.stringify({ error: "Prayer text required" }) };

        const { data: created, error } = await db.from("prayers").insert({ prayer, name, campus, email, prayer_count: 0 }).select("id").single();
        if (error) throw error;

        // The id goes back to the poster's own phone only (B09-11), so it can
        // ask how many people prayed. It is not a secret: ids are on the wall.
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: created && created.id ? String(created.id) : null }) };
      }

      if (body.action === 'pray') {
        const id = body.id;
        if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Prayer ID required" }) };

        // Atomic increment via RPC — fallback to manual increment if RPC doesn't exist
        try {
          const { error } = await db.rpc("increment_prayer_count", { prayer_id: id });
          if (error) throw error;
        } catch {
          // Fallback: read current count and increment manually
          const { data: prayer } = await db.from("prayers").select("prayer_count").eq("id", id).single();
          if (prayer) {
            await db.from("prayers").update({ prayer_count: (prayer.prayer_count || 0) + 1 }).eq("id", id);
          }
        }

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid action" }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (err) {
    console.error("Prayer wall error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
