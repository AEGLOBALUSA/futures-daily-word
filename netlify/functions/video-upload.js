const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

// ── Config ──
const PASTOR_SECRET = process.env.PASTOR_SECRET || "";
const BUCKET = "campus-videos";
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

let supabase;
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

function generateCode(campusId) {
  if (!PASTOR_SECRET) return null;
  return crypto.createHash("sha256").update(campusId + ":" + PASTOR_SECRET).digest("hex").slice(0, 8).toUpperCase();
}

function validateCode(campusId, code) {
  if (!PASTOR_SECRET || !code) return false;
  const expected = generateCode(campusId);
  return expected && code.toUpperCase() === expected;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: corsHeaders, body: "Method not allowed" };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { action, campusId, code, fileName, fileType } = body;

  // Validate pastor
  if (!campusId || !code) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing campusId or code" }) };
  if (!validateCode(campusId, code)) return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: "Invalid code" }) };

  const db = getSupabase();

  // ── Action: get-upload-url ── Generate a signed URL for direct upload to Supabase Storage
  if (action === "get-upload-url") {
    if (!fileName || !fileType) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing fileName or fileType" }) };

    // Only allow video MIME types
    if (!fileType.startsWith("video/")) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Only video files are allowed" }) };
    }

    // Generate unique path: campus-id/timestamp-filename
    const ext = fileName.split(".").pop() || "mp4";
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const ts = Date.now();
    const path = `${campusId}/${ts}-${safeName}`;

    try {
      // Create signed upload URL (valid for 10 minutes)
      const { data, error } = await db.storage
        .from(BUCKET)
        .createSignedUploadUrl(path);

      if (error) {
        console.error("Signed URL error:", error);
        // If bucket doesn't exist, try to create it
        if (error.message && error.message.includes("not found")) {
          try {
            await db.storage.createBucket(BUCKET, {
              public: true,
              fileSizeLimit: MAX_SIZE,
              allowedMimeTypes: ["video/*"]
            });
            // Retry
            const retry = await db.storage.from(BUCKET).createSignedUploadUrl(path);
            if (retry.error) throw retry.error;
            const publicUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
            return {
              statusCode: 200,
              headers: corsHeaders,
              body: JSON.stringify({
                signedUrl: retry.data.signedUrl,
                token: retry.data.token,
                path: path,
                publicUrl: publicUrl
              })
            };
          } catch (bucketErr) {
            console.error("Bucket creation error:", bucketErr);
            return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Storage not configured. Please create a 'campus-videos' bucket in Supabase Storage." }) };
          }
        }
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Failed to generate upload URL" }) };
      }

      const publicUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          signedUrl: data.signedUrl,
          token: data.token,
          path: path,
          publicUrl: publicUrl
        })
      };
    } catch (err) {
      console.error("Upload URL error:", err);
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Server error" }) };
    }
  }

  // ── Action: confirm-upload ── After successful upload, create campus_content entry
  if (action === "confirm-upload") {
    const { videoUrl, title, author } = body;
    if (!videoUrl) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing videoUrl" }) };

    try {
      const { data, error } = await db.from("campus_content").insert({
        campus: campusId,
        type: "video",
        title: (title || "Video Message").slice(0, 200),
        content: videoUrl.slice(0, 2000),
        author: (author || "Campus Pastor").slice(0, 100)
      }).select();

      if (error) throw error;
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, item: data[0] }) };
    } catch (err) {
      console.error("Confirm upload error:", err);
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Failed to save video entry" }) };
    }
  }

  return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Unknown action" }) };
};
