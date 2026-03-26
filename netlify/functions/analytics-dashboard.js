const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const ORIGINS = [
  "https://futures-daily-word.netlify.app",
  "https://futuresdailyword.com",
  "https://www.futuresdailyword.com",
  "http://localhost:5173"
];

let sb;
function db() {
  if (!sb) sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return sb;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || "";
  const co = ORIGINS.find(o => origin.startsWith(o)) || ORIGINS[0];
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

  const CS = ["paradise","adelaide-city","salisbury","south","clare-valley","mount-barker",
    "victor-harbor","copper-coast","gwinnett","kennesaw","alpharetta","futuros-duluth",
    "futuros-kennesaw","futuros-grayson","franklin","solo","cemani","bali","samarinda","langowan","rio"];
  // Accept: campus pastor codes (SHA-256), master secret, or admin PIN
  // Use constant-time comparison to prevent timing attacks
  const ADMIN_PIN = process.env.ADMIN_PIN || "";
  const safeEq = (a, b) => {
    if (!a || !b || a.length !== b.length) return false;
    try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
  };
  const ok = safeEq(code, ADMIN_PIN) || safeEq(code, secret.toUpperCase()) || CS.some(c => {
    const expected = crypto.createHash("sha256").update(c + ":" + secret).digest("hex").slice(0, 8).toUpperCase();
    return safeEq(expected, code);
  });
  if (!ok) {
    return { statusCode: 403, headers: h, body: '{"error":"Bad code"}' };
  }

  try {
    const d = db();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const w = new Date(now - 7 * 864e5).toISOString();
    const m = new Date(now - 30 * 864e5).toISOString();

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
