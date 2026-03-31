/**
 * User Sync — cloud backup and restore for all user data.
 *
 * Stores journal entries, streak, reading plans, reactions,
 * preferences, and settings in Supabase so users can switch
 * devices without losing anything.
 *
 * Actions:
 *   pull  — fetch all cloud data for a user
 *   push  — write all user data to cloud (upsert)
 *   merge — smart-merge journal entries by ID, push result
 */

const { createClient } = require("@supabase/supabase-js");
const { authenticateRequest, migrateRequest } = require("./lib/auth");

const { ALLOWED_ORIGINS } = require('./lib/cors');

function sanitize(str, maxLen = 200) {
  if (typeof str !== "string") return "";
  return str.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}

// Rate limit per IP
const ipHits = {};
function checkRateLimit(ip, maxPerMin = 30) {
  const now = Date.now();
  if (!ipHits[ip]) ipHits[ip] = [];
  ipHits[ip] = ipHits[ip].filter(t => now - t < 60000);
  if (ipHits[ip].length >= maxPerMin) return true;
  ipHits[ip].push(now);
  if (Object.keys(ipHits).length > 500) {
    for (const k of Object.keys(ipHits)) {
      if (ipHits[k].every(t => now - t >= 60000)) delete ipHits[k];
    }
  }
  return false;
}

let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
}

/**
 * Merge two journal arrays by entry ID.
 * If both have an entry with the same id, keep the one with the later updatedAt.
 * Returns a merged, deduplicated, date-sorted array.
 */
function mergeJournals(cloudJournal, localJournal) {
  const map = new Map();

  // Index cloud entries
  for (const entry of (cloudJournal || [])) {
    if (entry && entry.id) {
      map.set(entry.id, entry);
    }
  }

  // Merge local entries — overwrite if newer
  for (const entry of (localJournal || [])) {
    if (!entry || !entry.id) continue;
    const existing = map.get(entry.id);
    if (!existing) {
      map.set(entry.id, entry);
    } else {
      // Keep whichever was updated more recently
      const existingTime = new Date(existing.updatedAt || existing.date || 0).getTime();
      const localTime = new Date(entry.updatedAt || entry.date || 0).getTime();
      if (localTime >= existingTime) {
        map.set(entry.id, entry);
      }
    }
  }

  // Sort newest first
  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.date || a.updatedAt || 0).getTime();
    const bTime = new Date(b.date || b.updatedAt || 0).getTime();
    return bTime - aTime;
  });
}

/**
 * Validate and cap the size of the payload to prevent abuse.
 * Returns the cleaned data object or throws if invalid.
 */
function validatePayload(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid data payload");
  }

  const cleaned = {};

  // JSONB fields — validate they're the right type, cap size
  if (Array.isArray(data.journal)) {
    // Cap at 5000 entries to prevent abuse
    cleaned.journal = data.journal.slice(0, 5000);
  }
  if (Array.isArray(data.activePlans)) {
    cleaned.active_plans = data.activePlans.slice(0, 100);
  }
  if (data.streak && typeof data.streak === "object" && !Array.isArray(data.streak)) {
    cleaned.streak = data.streak;
  }
  if (data.bookPlans && typeof data.bookPlans === "object" && !Array.isArray(data.bookPlans)) {
    cleaned.book_plans = data.bookPlans;
  }
  if (data.reactions && typeof data.reactions === "object" && !Array.isArray(data.reactions)) {
    cleaned.reactions = data.reactions;
  }
  if (data.pathwayProgress && typeof data.pathwayProgress === "object" && !Array.isArray(data.pathwayProgress)) {
    cleaned.pathway_progress = data.pathwayProgress;
  }

  // String preferences
  if (data.fontSize !== undefined) cleaned.font_size = sanitize(String(data.fontSize), 10);
  if (data.darkMode !== undefined) cleaned.dark_mode = sanitize(String(data.darkMode), 10);
  if (data.translation !== undefined) cleaned.translation = sanitize(String(data.translation), 20);
  if (data.translationManual !== undefined) cleaned.translation_manual = sanitize(String(data.translationManual), 20);

  // Profile pic — cap at 500KB to prevent bloat
  if (data.profilePic !== undefined) {
    const pic = String(data.profilePic || "");
    cleaned.profile_pic = pic.length <= 500000 ? pic : "";
  }

  return cleaned;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const headers = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Rate limit
  const clientIP = event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (checkRateLimit(clientIP)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many requests" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { action } = body;
    const db = getSupabase();

    // Authenticate via session token
    let email = await authenticateRequest(event, db);
    let migrationToken = null;

    if (!email) {
      const migration = await migrateRequest(event, db, sanitize(body.email, 254));
      if (!migration) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
      }
      email = migration.email;
      migrationToken = migration.token;
    }

    // ── PULL: fetch all cloud data for user ──
    if (action === "pull") {
      const { data, error } = await db
        .from("user_data")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !data) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: "No data found" })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          ...(migrationToken ? { sessionToken: migrationToken } : {}),
          data: {
            journal: data.journal || [],
            streak: data.streak || {},
            activePlans: data.active_plans || [],
            bookPlans: data.book_plans || {},
            reactions: data.reactions || {},
            pathwayProgress: data.pathway_progress || {},
            fontSize: data.font_size || "15",
            darkMode: data.dark_mode || "",
            translation: data.translation || "",
            translationManual: data.translation_manual || "",
            profilePic: data.profile_pic || "",
            syncVersion: data.sync_version || 1,
            updatedAt: data.updated_at
          }
        })
      };
    }

    // ── PUSH: write all user data to cloud (upsert) ──
    if (action === "push") {
      const cleaned = validatePayload(body.data || {});
      cleaned.email = email;

      const { data, error } = await db
        .from("user_data")
        .upsert(cleaned, { onConflict: "email" })
        .select("sync_version")
        .single();

      if (error) {
        console.error("Push error:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Failed to save data" })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          syncVersion: data?.sync_version || 1,
          ...(migrationToken ? { sessionToken: migrationToken } : {})
        })
      };
    }

    // ── MERGE: smart-merge journal entries ──
    if (action === "merge") {
      // Fetch current cloud data
      const { data: existing } = await db
        .from("user_data")
        .select("journal, sync_version")
        .eq("email", email)
        .single();

      const cloudJournal = existing?.journal || [];
      const localJournal = body.localJournal || [];

      // Merge
      const merged = mergeJournals(cloudJournal, localJournal);

      // Also accept other data fields if provided
      const otherData = validatePayload(body.data || {});

      // Write merged journal + any other data back
      const record = {
        ...otherData,
        email,
        journal: merged
      };

      const { data, error } = await db
        .from("user_data")
        .upsert(record, { onConflict: "email" })
        .select("sync_version")
        .single();

      if (error) {
        console.error("Merge error:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Failed to merge data" })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          journal: merged,
          syncVersion: data?.sync_version || 1,
          ...(migrationToken ? { sessionToken: migrationToken } : {})
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid action. Use pull, push, or merge." })
    };

  } catch (err) {
    console.error("User sync error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error" })
    };
  }
};
