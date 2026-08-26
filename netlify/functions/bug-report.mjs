import { createClient } from "@supabase/supabase-js";
// Default-import interop: CJS libs load fine from ESM this way (the old inline
// copy of the allowlist omitted the church origins).
import corsLib from "./lib/cors.js";

const { getAllowedOrigin } = corsLib;

function getCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

let supabase;
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

// Simple in-memory rate limit: 1 report per IP per 60s
const recentIPs = new Map();

export const handler = async (event) => {
  const origin = event.headers.origin || "";
  const cors = getCorsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Rate limit
  const ip = event.headers["x-forwarded-for"] || event.headers["client-ip"] || "unknown";
  const now = Date.now();
  const lastSubmit = recentIPs.get(ip);
  if (lastSubmit && now - lastSubmit < 60_000) {
    return { statusCode: 429, headers: cors, body: JSON.stringify({ error: "Please wait before submitting another report" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { message, category, email, persona, campus, lang, userAgent, screenSize } = body;

    if (!message || !message.trim()) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Message is required" }) };
    }

    const validCategories = ["audio", "display", "navigation", "other"];
    const safeCategory = validCategories.includes(category) ? category : "other";

    const db = getSupabase();
    const { error } = await db.from("bug_reports").insert({
      category: safeCategory,
      message: message.trim().slice(0, 600),
      email: email || null,
      persona: persona || null,
      campus: campus || null,
      lang: lang || null,
      user_agent: (userAgent || "").slice(0, 500),
      screen_size: (screenSize || "").slice(0, 50),
    });

    if (error) {
      console.error("Bug report insert error:", error);
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Failed to save report" }) };
    }

    recentIPs.set(ip, now);

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error("Bug report error:", e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server error" }) };
  }
};
