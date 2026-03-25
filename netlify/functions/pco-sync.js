/**
 * PCO Sync — Planning Center Online integration
 *
 * Looks up a person by email in PCO People, pulls their name + campus,
 * and syncs it to Supabase. Used during email gate to auto-populate profiles.
 *
 * Environment variables required:
 *   PCO_APP_ID       — Planning Center Personal Access Token App ID
 *   PCO_SECRET       — Planning Center Personal Access Token Secret
 *   SUPABASE_URL     — Supabase project URL
 *   SUPABASE_SERVICE_KEY — Supabase service role key
 *
 * To get PCO credentials:
 *   1. Log in to https://api.planningcenteronline.com/oauth/applications
 *   2. Scroll to "Personal Access Tokens"
 *   3. Click "New Personal Access Token"
 *   4. Copy the App ID and Secret
 */

const { createClient } = require("@supabase/supabase-js");

const ALLOWED_ORIGINS = [
  "https://futures-daily-word.netlify.app",
  "https://futuresdailyword.com",
  "https://www.futuresdailyword.com"
];

const PCO_BASE = "https://api.planningcenteronline.com/people/v2";

// Map PCO campus names to our campus IDs. Update as you add campuses.
// Keys = how the campus appears in PCO (lowercase for matching)
// Keys = lowercase PCO campus name. Values = our internal campus ID.
// Add alternate spellings/abbreviations as needed once PCO is connected.
const PCO_CAMPUS_MAP = {
  // Australia
  "paradise": "au-paradise", "futures paradise": "au-paradise",
  "adelaide city": "au-adelaide-city", "futures adelaide city": "au-adelaide-city", "adelaide": "au-adelaide-city",
  "salisbury": "au-salisbury", "futures salisbury": "au-salisbury",
  "south": "au-south", "futures south": "au-south",
  "clare valley": "au-clare-valley", "futures clare valley": "au-clare-valley",
  "mount barker": "au-mount-barker", "futures mount barker": "au-mount-barker", "mt barker": "au-mount-barker",
  "victor harbor": "au-victor-harbor", "futures victor harbor": "au-victor-harbor", "victor harbour": "au-victor-harbor",
  "copper coast": "au-copper-coast", "futures copper coast": "au-copper-coast",
  // North America
  "gwinnett": "us-gwinnett", "futures gwinnett": "us-gwinnett",
  "kennesaw": "us-kennesaw", "futures kennesaw": "us-kennesaw",
  "alpharetta": "us-alpharetta", "futures alpharetta": "us-alpharetta",
  "futuros duluth": "us-futuros-duluth", "duluth": "us-futuros-duluth",
  "futuros kennesaw": "us-futuros-kennesaw",
  "futuros grayson": "us-futuros-grayson", "grayson": "us-futuros-grayson",
  "franklin": "us-franklin", "futures franklin": "us-franklin",
  // Indonesia
  "solo": "id-solo", "futures solo": "id-solo", "surakarta": "id-solo",
  "cemani": "id-cemani", "futures cemani": "id-cemani",
  "bali": "id-bali", "futures bali": "id-bali", "denpasar": "id-bali",
  "samarinda": "id-samarinda", "futures samarinda": "id-samarinda",
  "langowan": "id-langowan", "futures langowan": "id-langowan",
  // Brazil
  "rio": "br-rio", "futures rio": "br-rio", "rio de janeiro": "br-rio"
};

function sanitize(str, maxLen = 254) {
  if (typeof str !== "string") return "";
  return str.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}

let supabase;
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

/**
 * Make an authenticated request to PCO API
 */
async function pcoFetch(path) {
  const appId = process.env.PCO_APP_ID;
  const secret = process.env.PCO_SECRET;
  if (!appId || !secret) throw new Error("PCO credentials not configured");

  const auth = Buffer.from(`${appId}:${secret}`).toString("base64");
  const resp = await fetch(`${PCO_BASE}${path}`, {
    headers: {
      "Authorization": `Basic ${auth}`,
      "Accept": "application/json"
    }
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`PCO API ${resp.status}: ${text.slice(0, 200)}`);
  }
  return resp.json();
}

/**
 * Search PCO for a person by email and return their profile data
 */
async function lookupByEmail(email) {
  // Search PCO People by email
  const searchData = await pcoFetch(
    `/people?where[search_name_or_email]=${encodeURIComponent(email)}&include=primary_campus,emails&per_page=5`
  );

  if (!searchData.data || searchData.data.length === 0) {
    return null; // Person not found in PCO
  }

  // Find the person whose email matches exactly
  const included = searchData.included || [];
  let matchedPerson = null;

  for (const person of searchData.data) {
    // Check if this person has a matching email in the included data
    const personEmails = included.filter(
      inc => inc.type === "Email" && inc.relationships?.person?.data?.id === person.id
    );

    // Also check emails linked via the person's relationships
    const emailRels = person.relationships?.emails?.data || [];
    const emailIds = emailRels.map(e => e.id);
    const matchingEmails = included.filter(
      inc => inc.type === "Email" && emailIds.includes(inc.id)
    );

    const allEmails = [...personEmails, ...matchingEmails];
    const hasMatch = allEmails.some(
      e => e.attributes?.address?.toLowerCase() === email.toLowerCase()
    );

    if (hasMatch || searchData.data.length === 1) {
      matchedPerson = person;
      break;
    }
  }

  if (!matchedPerson) {
    // Fall back to first result if only one
    matchedPerson = searchData.data[0];
  }

  const attrs = matchedPerson.attributes || {};

  // Extract campus from included data
  let campusName = "";
  let campusId = "";
  const campusRel = matchedPerson.relationships?.primary_campus?.data;
  if (campusRel) {
    const campusInc = included.find(
      inc => inc.type === "Campus" && inc.id === campusRel.id
    );
    if (campusInc) {
      campusName = campusInc.attributes?.name || "";
      // Map PCO campus name to our internal ID
      campusId = PCO_CAMPUS_MAP[campusName.toLowerCase()] || "";
    }
  }

  return {
    pcoId: matchedPerson.id,
    firstName: attrs.first_name || "",
    lastName: attrs.last_name || "",
    email: email,
    campusName: campusName,
    campusId: campusId,
    avatar: attrs.avatar || ""
  };
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const headers = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const body = JSON.parse(event.body);
    const action = body.action;
    const email = sanitize(body.email, 254).toLowerCase();

    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Email required" }) };
    }

    // ── Lookup: search PCO for this email and return profile data ──
    if (action === "lookup") {
      // Check if PCO credentials are configured
      if (!process.env.PCO_APP_ID || !process.env.PCO_SECRET) {
        return { statusCode: 200, headers, body: JSON.stringify({ found: false, reason: "PCO not configured" }) };
      }

      const pcoProfile = await lookupByEmail(email);
      if (!pcoProfile) {
        return { statusCode: 200, headers, body: JSON.stringify({ found: false }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          found: true,
          profile: {
            firstName: pcoProfile.firstName,
            lastName: pcoProfile.lastName,
            email: pcoProfile.email,
            campus: pcoProfile.campusId,
            campusName: pcoProfile.campusName
          }
        })
      };
    }

    // ── Sync: lookup from PCO and save/update in Supabase ──
    if (action === "sync") {
      if (!process.env.PCO_APP_ID || !process.env.PCO_SECRET) {
        return { statusCode: 200, headers, body: JSON.stringify({ synced: false, reason: "PCO not configured" }) };
      }

      const pcoProfile = await lookupByEmail(email);
      if (!pcoProfile) {
        return { statusCode: 200, headers, body: JSON.stringify({ synced: false, reason: "Not found in PCO" }) };
      }

      // Upsert into Supabase profiles
      const db = getSupabase();
      const { data: existing } = await db.from("profiles").select("email").eq("email", email).single();

      const profileData = {
        first_name: pcoProfile.firstName,
        last_name: pcoProfile.lastName,
        email: email,
        campus: pcoProfile.campusId || undefined,
        last_active_at: new Date().toISOString()
      };

      // Remove undefined values
      Object.keys(profileData).forEach(k => profileData[k] === undefined && delete profileData[k]);

      if (existing) {
        // Update — only overwrite fields that have PCO data
        const updates = {};
        if (pcoProfile.firstName) updates.first_name = pcoProfile.firstName;
        if (pcoProfile.lastName) updates.last_name = pcoProfile.lastName;
        if (pcoProfile.campusId) updates.campus = pcoProfile.campusId;
        updates.last_active_at = new Date().toISOString();

        await db.from("profiles").update(updates).eq("email", email);
      } else {
        // Insert new
        profileData.registered_at = new Date().toISOString();
        await db.from("profiles").insert(profileData);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          synced: true,
          profile: {
            firstName: pcoProfile.firstName,
            lastName: pcoProfile.lastName,
            email: email,
            campus: pcoProfile.campusId,
            campusName: pcoProfile.campusName
          }
        })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid action. Use 'lookup' or 'sync'" }) };
  } catch (err) {
    console.error("PCO sync error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error", detail: err.message }) };
  }
};
