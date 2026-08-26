const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const { ALLOWED_ORIGINS, isAllowedOrigin, parseRequestOrigin } = require('./lib/cors');
const { isSharedRateLimited } = require('./lib/rate-limit');

let sb;
function db() {
  if (!sb) sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return sb;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const co = isAllowedOrigin(origin) ? parseRequestOrigin(origin) : ALLOWED_ORIGINS[0];
  const h = {
    "Access-Control-Allow-Origin": co,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Pastor-Code",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: h, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: h, body: '{"error":"Not allowed"}' };

  const code = (event.headers["x-pastor-code"] || "").trim().toUpperCase();
  const secret = process.env.PASTOR_SECRET;
  if (!code || !secret) return { statusCode: 403, headers: h, body: '{"error":"Forbidden"}' };

  // Rate limit — campus codes are 8 hex chars; cap online guessing per IP
  const clientIP = event.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (await isSharedRateLimited("analytics-dashboard", clientIP, 15)) {
    return { statusCode: 429, headers: h, body: '{"error":"Too many requests"}' };
  }

  const CS = ["paradise","adelaide-city","salisbury","south","clare-valley","mount-barker",
    "victor-harbor","copper-coast","gwinnett","kennesaw","alpharetta","futuros-duluth",
    "futuros-kennesaw","futuros-grayson","franklin","solo","cemani","bali","samarinda","langowan","rio"];
  // Campus-code slug → the campus id stored on profiles.campus / prayers.campus
  // (the prefixed ids from src/data/tokens.ts CAMPUSES / pco-sync PCO_CAMPUS_MAP)
  const CAMPUS_IDS = {
    "paradise": "au-paradise", "adelaide-city": "au-adelaide-city", "salisbury": "au-salisbury",
    "south": "au-south", "clare-valley": "au-clare-valley", "mount-barker": "au-mount-barker",
    "victor-harbor": "au-victor-harbor", "copper-coast": "au-copper-coast",
    "gwinnett": "us-gwinnett", "kennesaw": "us-kennesaw", "alpharetta": "us-alpharetta",
    "futuros-duluth": "us-futuros-duluth", "futuros-kennesaw": "us-futuros-kennesaw",
    "futuros-grayson": "us-futuros-grayson", "franklin": "us-franklin",
    "solo": "id-solo", "cemani": "id-cemani", "bali": "id-bali",
    "samarinda": "id-samarinda", "langowan": "id-langowan", "rio": "br-rio"
  };
  // Accept: campus pastor codes (SHA-256), master secret, or admin PIN
  // Use constant-time comparison to prevent timing attacks
  const ADMIN_PIN = process.env.ADMIN_PIN || "";
  const safeEq = (a, b) => {
    if (!a || !b || a.length !== b.length) return false;
    try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
  };
  // A campus code identifies ONE campus and gets only that campus's aggregate
  // numbers; the global view (incl. recentSignups PII) is admin/master only.
  const isAdmin = safeEq(code, ADMIN_PIN) || safeEq(code, secret.toUpperCase());
  let campusSlug = null;
  if (!isAdmin) {
    for (const c of CS) {
      const expected = crypto.createHash("sha256").update(c + ":" + secret).digest("hex").slice(0, 8).toUpperCase();
      if (safeEq(expected, code)) { campusSlug = c; break; }
    }
  }
  if (!isAdmin && !campusSlug) {
    return { statusCode: 403, headers: h, body: '{"error":"Bad code"}' };
  }

  try {
    const d = db();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const w = new Date(now - 7 * 864e5).toISOString();
    const m = new Date(now - 30 * 864e5).toISOString();

    // ── Campus-scoped view: real counts for THIS campus only, no PII ──
    if (!isAdmin) {
      const campusId = CAMPUS_IDS[campusSlug] || campusSlug;
      const [rt, awc, pc] = await Promise.all([
        d.from("profiles").select("*", { count: "exact", head: true })
          .eq("campus", campusId).gte("last_active_at", today + "T00:00:00Z"),
        d.from("profiles").select("*", { count: "exact", head: true })
          .eq("campus", campusId).gte("last_active_at", w),
        d.from("prayers").select("*", { count: "exact", head: true })
          .eq("campus", campusId).gte("created_at", m),
      ]);
      return {
        statusCode: 200, headers: h,
        body: JSON.stringify({
          scope: "campus",
          campus: campusId,
          campusSlug,
          readingToday: rt.count || 0,
          activeThisWeek: awc.count || 0,
          prayerCount: pc.count || 0,
          generatedAt: now.toISOString(),
        })
      };
    }

    // ── Global view: admin PIN / master secret only ──
    const [tu, at, aw, am, ecm, ecw, cr, ci, rs, pr, lr, da] = await Promise.all([
      d.from("profiles").select("*", { count: "exact", head: true }),
      d.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", today + "T00:00:00Z"),
      d.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", w),
      d.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", m),
      d.from("activity_events").select("event_type").gte("created_at", m),
      d.from("activity_events").select("event_type").gte("created_at", w),
      d.from("profiles").select("campus"),
      d.from("profiles").select("city"),
      d.from("profiles").select("email,first_name,campus,city,registered_at,last_active_at")
        .gte("registered_at", m).order("registered_at", { ascending: false }).limit(50),
      d.from("profiles").select("persona"),
      d.from("profiles").select("lang"),
      d.from("activity_events").select("email,created_at")
        .gte("created_at", new Date(now - 14 * 864e5).toISOString()),
    ]);

    const cb = (a, k) => {
      const x = {};
      if (a) for (const r of a) { const v = r[k] || "Unknown"; x[v] = (x[v] || 0) + 1; }
      return Object.entries(x).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
    };

    const dau = {};
    if (da.data) {
      for (const r of da.data) {
        const dy = r.created_at.slice(0, 10);
        if (!dau[dy]) dau[dy] = new Set();
        dau[dy].add(r.email);
      }
    }
    const dauChart = Object.entries(dau)
      .map(([date, e]) => ({ date, count: e.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      statusCode: 200, headers: h,
      body: JSON.stringify({
        overview: {
          totalUsers: tu.count || 0,
          activeToday: at.count || 0,
          activeWeek: aw.count || 0,
          activeMonth: am.count || 0,
        },
        topFeatures: cb(ecm.data, "event_type").map(e => ({ event: e.name, count: e.count })),
        topFeaturesWeek: cb(ecw.data, "event_type").map(e => ({ event: e.name, count: e.count })),
        campuses: cb(cr.data, "campus"),
        cities: cb(ci.data, "city").slice(0, 30),
        personas: cb(pr.data, "persona"),
        languages: cb(lr.data, "lang"),
        dailyActive: dauChart,
        recentSignups: (rs.data || []).map(p => ({
          name: p.first_name || p.email.split("@")[0],
          email: p.email,
          campus: p.campus || "",
          city: p.city || "",
          registered: p.registered_at,
          lastActive: p.last_active_at,
        })),
        generatedAt: now.toISOString(),
      })
    };
  } catch (err) {
    console.error("Analytics error:", err);
    return { statusCode: 500, headers: h, body: '{"error":"Server error"}' };
  }
};
