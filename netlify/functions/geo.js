/**
 * GET /api/geo — ISO country from Netlify edge geo (x-nf-country / x-country).
 * Used by house ads to pick one college campus (AU vs US). Never returns both.
 * Also returns `city` and `subdivision` when Netlify knows them, only for the
 * reader's own device to guess a campus (B09-07). They are never logged, never
 * stored here, and the device keeps them in memory only.
 */
const { getAllowedOrigin } = require("./lib/cors");
const { countryFromRequest, placeFromRequest } = require("./lib/geo-country");

exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const headers = {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
    "Cache-Control": "private, max-age=300"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const country = countryFromRequest(event, context);
  const { city, subdivision } = placeFromRequest(event, context);
  const body = { country };
  if (city) body.city = city;
  if (subdivision) body.subdivision = subdivision;
  return { statusCode: 200, headers, body: JSON.stringify(body) };
};
