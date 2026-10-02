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

const { ALLOWED_ORIGINS, isAllowedOrigin } = require('./lib/cors');
const { authenticateSession } = require('./lib/auth');
const { isSharedRateLimited } = require('./lib/rate-limit');
const { clientIp } = require('./lib/client-ip');

const PCO_BASE = "https://api.planningcenteronline.com/people/v2";

// Planning Center campus name → our campus id comes from the one campus list
// (dw_campuses.pco_names, lower-case, kept by the owner in /staff; B09-02).
const { loadCampuses, campusIdForPcoName } = require("./lib/campuses");

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

    // Only a person who really holds this address. The search also matches
    // names, so a single hit (or the first of several) may be someone else
    // entirely; copying their name and campus would be wrong.
    if (hasMatch) {
      matchedPerson = person;
      break;
    }
  }

  if (!matchedPerson) return null;

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
      campusId = campusIdForPcoName(campusName, await loadCampuses(getSupabase()));
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  // Reject requests not from our app — this endpoint looks up third parties'
  // PII (name + campus) by email, so it must not be curl-able from anywhere.
  if (!isAllowedOrigin(origin)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Forbidden" }) };
  }

  try {
    const body = JSON.parse(event.body);
    const action = body.action;
    const email = sanitize(body.email, 254).toLowerCase();

    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Email required" }) };
    }

    // Anti-enumeration: holders of a PROVEN session token pass freely; anonymous
    // callers (the email gate fires exactly one call per submission) and holders
    // of an unproven token are capped at the same 5/min-per-IP budget the
    // migration path uses. An unproven token is free to mint for any address that
    // has a profile, so it must not lift the cap on name + campus lookups.
    const session = await authenticateSession(event, getSupabase());
    if (!session || !session.proven || session.provisional) {
      const clientIP = clientIp(event);
      if (await isSharedRateLimited("pco-sync", clientIP, 5)) {
        return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many requests" }) };
      }
    }

    // ── Lookup: search PCO for this email and return profile data ──
    if (action === "lookup") {
      // Check if PCO credentials are configured — don't tell callers why
      if (!process.env.PCO_APP_ID || !process.env.PCO_SECRET) {
        return { statusCode: 200, headers, body: JSON.stringify({ found: false }) };
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
        return { statusCode: 200, headers, body: JSON.stringify({ synced: false }) };
      }

      const pcoProfile = await lookupByEmail(email);
      if (!pcoProfile) {
        return { statusCode: 200, headers, body: JSON.stringify({ synced: false }) };
      }

      const lookedUp = {
        firstName: pcoProfile.firstName,
        lastName: pcoProfile.lastName,
        email: email,
        campus: pcoProfile.campusId,
        campusName: pcoProfile.campusName
      };

      // Only the address's own proven owner gets anything written: a PROVEN,
      // non-provisional token for this same address. Anyone else (no token, an
      // unproven or first-device token, or a token for another address) gets the
      // lookup back and nothing is written, and that includes creating a NEW
      // profile. A first-time reader's EmailGate calls this before register; if
      // sync created the row, register would take the existing-address path and
      // drop their persona, language and campus, hand them an unproven token
      // (a code before the first sync) and put them on the strangers' code
      // budget. Left alone, register creates the row with everything it was
      // sent and gives the first device a first-device token.
      if (!(session && session.proven && !session.provisional && session.email === email)) {
        return { statusCode: 200, headers, body: JSON.stringify({ synced: false, profile: lookedUp }) };
      }

      // Update — only overwrite fields that have PCO data. A proven token for
      // this address means its profile row exists; nothing is inserted here.
      const db = getSupabase();
      const updates = {};
      if (pcoProfile.firstName) updates.first_name = pcoProfile.firstName;
      if (pcoProfile.lastName) updates.last_name = pcoProfile.lastName;
      if (pcoProfile.campusId) updates.campus = pcoProfile.campusId;
      updates.last_active_at = new Date().toISOString();

      await db.from("profiles").update(updates).eq("email", email);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ synced: true, profile: lookedUp })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid action. Use 'lookup' or 'sync'" }) };
  } catch (err) {
    // err.message can echo PCO's raw upstream response — log it, never return it
    console.error("PCO sync error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
