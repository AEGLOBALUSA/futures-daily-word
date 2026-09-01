/**
 * Staff intake API — one form, Ashley reviews, then campus corner / sermon notes go live.
 *
 * POST /.netlify/functions/intake  { action, ... }
 */
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const { getAllowedOrigin } = require("./lib/cors");
const { isSharedRateLimited } = require("./lib/rate-limit");
const {
  normalizeEmail,
  isAllowlistedEmail,
  fallbackStaff,
  questionVisible,
  isCampusId,
  lockCampus,
  sanitize,
  QUESTION_TYPES,
  AUDIENCES,
  ROLES,
  collectCampusFromAnswers,
  applyAnswers,
  publicStaff
} = require("./lib/intake-core");

let supabase;
function db() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

function headersFor(event) {
  const origin = event.headers.origin || event.headers.Origin || event.headers.referer || "";
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
}

function json(event, status, payload) {
  return { statusCode: status, headers: headersFor(event), body: JSON.stringify(payload) };
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function hashOtp(email, code) {
  const secret = process.env.STAFF_SESSION_SECRET || process.env.PASTOR_SECRET || "intake";
  return hashToken(`${email}:${String(code).trim()}:${secret}`);
}

function safeEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b || a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}

function clientIp(event) {
  return (event.headers["x-forwarded-for"] || event.headers["client-ip"] || "unknown").split(",")[0].trim();
}

async function resolveStaff(email) {
  const e = normalizeEmail(email);
  if (!isAllowlistedEmail(e)) return null;
  const { data } = await db().from("staff_roster").select("email, role, campus_id, display_name").eq("email", e).maybeSingle();
  if (data) {
    const named = fallbackStaff(e);
    return {
      email: e,
      role: data.role,
      campusId: data.campus_id || null,
      name: data.display_name || (named && named.name) || ""
    };
  }
  return fallbackStaff(e);
}

async function ensureRoster(staff) {
  await db().from("staff_roster").upsert({
    email: staff.email,
    role: staff.role,
    campus_id: staff.campusId || null,
    display_name: staff.name || "",
    updated_at: new Date().toISOString()
  }, { onConflict: "email" });
}

async function sessionStaff(event) {
  const auth = event.headers.authorization || event.headers.Authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  const raw = auth.slice(7).trim();
  if (!raw || raw.length < 32) return null;
  const { data } = await db()
    .from("staff_sessions")
    .select("email, expires_at")
    .eq("token_hash", hashToken(raw))
    .maybeSingle();
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return null;
  return resolveStaff(data.email);
}

async function issueSession(email) {
  const raw = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
  await db().from("staff_sessions").insert({
    token_hash: hashToken(raw),
    email,
    expires_at: expires
  });
  // Opportunistic cleanup
  if (Math.random() < 0.1) {
    await db().from("staff_sessions").delete().lt("expires_at", new Date().toISOString());
    await db().from("staff_otp").delete().lt("expires_at", new Date().toISOString());
  }
  return raw;
}

function sixDigit() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

async function sendOtpEmail(to, code) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "logged";
  const from = process.env.STAFF_OTP_FROM || "Futures Daily Word <noreply@futuresdailyword.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Your Daily Word sign-in code",
        text: `Your sign-in code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, ignore this email.`
      })
    });
    if (!res.ok) {
      console.error("intake otp email failed", res.status);
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("intake otp email error", err);
    return "failed";
  }
}

async function publishApproved(submission, staff) {
  const { data: questions } = await db().from("intake_questions").select("*").eq("enabled", true);
  const plan = applyAnswers(questions || [], submission.answers || {}, { name: staff.name || submission.email });
  const campusId = submission.campus_id;
  const result = { cornerAdded: 0, cornerRemoved: 0, sermon: null };

  if (plan.cornerAdds.length) {
    if (!campusId) throw new Error("Campus required to publish campus corner items");
    const rows = plan.cornerAdds.map((it) => ({
      campus: campusId,
      type: it.type,
      title: it.title,
      content: it.content,
      author: it.author || staff.name || ""
    }));
    const { error } = await db().from("campus_content").insert(rows);
    if (error) throw error;
    result.cornerAdded = rows.length;
  }

  if (plan.cornerRemoves.length) {
    if (!campusId) throw new Error("Campus required to remove campus corner items");
    for (const id of plan.cornerRemoves) {
      const { error } = await db().from("campus_content").delete().eq("id", id).eq("campus", campusId);
      if (error) throw error;
      result.cornerRemoved += 1;
    }
  }

  if (plan.sermon) {
    await db().from("published_sermons").update({ is_current: false }).eq("is_current", true);
    const { error } = await db().from("published_sermons").upsert({
      id: plan.sermon.id,
      sermon: plan.sermon,
      is_current: true,
      submission_id: submission.id,
      published_at: new Date().toISOString(),
      published_by: staff.email
    }, { onConflict: "id" });
    if (error) throw error;
    result.sermon = { id: plan.sermon.id, title: plan.sermon.title };
  }

  return result;
}

function normalizeQuestion(input) {
  const type = QUESTION_TYPES.includes(input.type) ? input.type : "text";
  const audience = AUDIENCES.includes(input.audience) ? input.audience : "all";
  const config = input.config && typeof input.config === "object" ? input.config : {};
  return {
    label: sanitize(input.label || "", 200),
    help: sanitize(input.help || "", 500),
    type,
    audience,
    required: !!input.required,
    enabled: input.enabled !== false,
    sort_order: Number.isFinite(input.sort_order) ? input.sort_order : 100,
    config
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: headersFor(event), body: "" };
  if (event.httpMethod !== "POST") return json(event, 405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch {
    return json(event, 400, { error: "Invalid JSON" });
  }
  const action = body.action;
  const ip = clientIp(event);

  try {
    // ── request_otp ──
    if (action === "request_otp") {
      if (await isSharedRateLimited("intake-otp", ip, 8, 15 * 60 * 1000)) {
        return json(event, 429, { error: "Too many attempts. Try again later." });
      }
      const email = normalizeEmail(body.email);
      // Same response whether or not the email is allowlisted.
      if (isAllowlistedEmail(email)) {
        const code = sixDigit();
        await db().from("staff_otp").upsert({
          email,
          code_hash: hashOtp(email, code),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          attempts: 0
        }, { onConflict: "email" });
        const mail = await sendOtpEmail(email, code);
        if (mail === "logged") {
          console.log("intake otp issued (no mailer configured) for", email);
        }
      }
      return json(event, 200, { ok: true });
    }

    // ── verify_otp ──
    if (action === "verify_otp") {
      if (await isSharedRateLimited("intake-verify", ip, 20, 15 * 60 * 1000)) {
        return json(event, 429, { error: "Too many attempts. Try again later." });
      }
      const email = normalizeEmail(body.email);
      const code = String(body.code || "").trim();
      const staff = await resolveStaff(email);
      if (!staff || !code) return json(event, 403, { error: "Invalid code" });

      const pin = process.env.ADMIN_PIN || "";
      const pinOk = staff.role === "admin" && pin && safeEq(code, pin);

      if (!pinOk) {
        const { data: otp } = await db().from("staff_otp").select("*").eq("email", email).maybeSingle();
        if (!otp || new Date(otp.expires_at).getTime() < Date.now()) {
          return json(event, 403, { error: "Invalid code" });
        }
        if ((otp.attempts || 0) >= 5) return json(event, 403, { error: "Invalid code" });
        if (!safeEq(otp.code_hash, hashOtp(email, code))) {
          await db().from("staff_otp").update({ attempts: (otp.attempts || 0) + 1 }).eq("email", email);
          return json(event, 403, { error: "Invalid code" });
        }
        await db().from("staff_otp").delete().eq("email", email);
      }

      await ensureRoster(staff);
      const token = await issueSession(staff.email);
      return json(event, 200, { token, staff: publicStaff(staff) });
    }

    // Authenticated actions
    const staff = await sessionStaff(event);
    if (!staff) return json(event, 401, { error: "Sign in required" });

    if (action === "logout") {
      const auth = event.headers.authorization || event.headers.Authorization || "";
      const raw = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
      if (raw) await db().from("staff_sessions").delete().eq("token_hash", hashToken(raw));
      return json(event, 200, { ok: true });
    }

    if (action === "me") {
      return json(event, 200, { staff: publicStaff(staff) });
    }

    if (action === "form") {
      const { data: questions, error } = await db()
        .from("intake_questions")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const visible = (questions || []).filter((q) => questionVisible(q, staff.role));
      let cornerItems = [];
      const campusId = staff.role === "campus" ? staff.campusId : null;
      if (campusId) {
        const { data: items } = await db()
          .from("campus_content")
          .select("id, type, title, created_at")
          .eq("campus", campusId)
          .order("created_at", { ascending: false })
          .limit(40);
        cornerItems = items || [];
      } else if (staff.role === "admin" && isCampusId(body.campusId)) {
        const { data: items } = await db()
          .from("campus_content")
          .select("id, type, title, created_at")
          .eq("campus", body.campusId)
          .order("created_at", { ascending: false })
          .limit(40);
        cornerItems = items || [];
      }
      const { data: mine } = await db()
        .from("intake_submissions")
        .select("id, status, campus_id, created_at, reviewed_at")
        .eq("email", staff.email)
        .order("created_at", { ascending: false })
        .limit(10);
      return json(event, 200, {
        staff: publicStaff(staff),
        questions: visible,
        cornerItems,
        submissions: mine || []
      });
    }

    if (action === "submit") {
      const { data: questions, error } = await db()
        .from("intake_questions")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const visible = (questions || []).filter((q) => questionVisible(q, staff.role));
      const answersIn = body.answers && typeof body.answers === "object" ? body.answers : {};
      const answers = {};
      for (const q of visible) {
        if (answersIn[q.id] !== undefined) answers[q.id] = answersIn[q.id];
        if (q.required) {
          const v = answers[q.id];
          const empty = v == null || v === "" || (Array.isArray(v) && !v.length);
          if (empty && q.type !== "corner_remove" && q.type !== "yes_no") {
            return json(event, 400, { error: `Missing: ${q.label}` });
          }
        }
      }
      const requested = collectCampusFromAnswers(visible, answers) || body.campusId;
      let campusId = lockCampus(staff, requested);
      if (staff.role === "campus") {
        if (!campusId) return json(event, 400, { error: "Choose your campus" });
        if (staff.campusId && campusId !== staff.campusId) {
          return json(event, 403, { error: "You can only update your own campus" });
        }
        if (!staff.campusId) {
          await db().from("staff_roster").update({
            campus_id: campusId,
            updated_at: new Date().toISOString()
          }).eq("email", staff.email);
          staff.campusId = campusId;
        }
      }
      const { data: row, error: insErr } = await db().from("intake_submissions").insert({
        email: staff.email,
        role: staff.role,
        campus_id: campusId,
        answers,
        status: "pending"
      }).select("id, status, created_at").single();
      if (insErr) throw insErr;
      return json(event, 200, { ok: true, submission: row });
    }

    // ── Admin-only ──
    if (staff.role !== "admin") return json(event, 403, { error: "Ashley reviews and publishes from here." });

    if (action === "questions_list") {
      const { data, error } = await db().from("intake_questions").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return json(event, 200, { questions: data || [] });
    }

    if (action === "question_save") {
      const q = normalizeQuestion(body.question || {});
      if (!q.label) return json(event, 400, { error: "Label required" });
      const id = body.question && body.question.id ? body.question.id : undefined;
      if (id) {
        const { data, error } = await db().from("intake_questions").update({
          ...q,
          updated_at: new Date().toISOString()
        }).eq("id", id).select().single();
        if (error) throw error;
        return json(event, 200, { question: data });
      }
      const { data, error } = await db().from("intake_questions").insert(q).select().single();
      if (error) throw error;
      return json(event, 200, { question: data });
    }

    if (action === "question_delete") {
      const id = body.id;
      if (!id) return json(event, 400, { error: "Missing id" });
      const { error } = await db().from("intake_questions").delete().eq("id", id);
      if (error) throw error;
      return json(event, 200, { ok: true });
    }

    if (action === "question_reorder") {
      const ids = Array.isArray(body.ids) ? body.ids : [];
      for (let i = 0; i < ids.length; i++) {
        await db().from("intake_questions").update({
          sort_order: (i + 1) * 10,
          updated_at: new Date().toISOString()
        }).eq("id", ids[i]);
      }
      return json(event, 200, { ok: true });
    }

    if (action === "submissions") {
      const status = ["pending", "approved", "declined"].includes(body.status) ? body.status : "pending";
      const { data, error } = await db()
        .from("intake_submissions")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return json(event, 200, { submissions: data || [] });
    }

    if (action === "review") {
      const id = body.id;
      const decision = body.decision;
      if (!id || (decision !== "approved" && decision !== "declined")) {
        return json(event, 400, { error: "Need id and decision" });
      }
      const { data: sub, error } = await db().from("intake_submissions").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!sub || sub.status !== "pending") return json(event, 400, { error: "Already reviewed" });

      let publish_result = null;
      if (decision === "approved") {
        publish_result = await publishApproved(sub, staff);
      }
      const { data: updated, error: upErr } = await db().from("intake_submissions").update({
        status: decision,
        reviewed_at: new Date().toISOString(),
        reviewed_by: staff.email,
        publish_result
      }).eq("id", id).select().single();
      if (upErr) throw upErr;
      return json(event, 200, { submission: updated });
    }

    if (action === "roster_list") {
      const { data, error } = await db().from("staff_roster").select("*").order("email");
      if (error) throw error;
      return json(event, 200, { roster: data || [] });
    }

    if (action === "roster_save") {
      const email = normalizeEmail(body.email);
      if (!isAllowlistedEmail(email)) {
        return json(event, 400, { error: "Use a futures.church email (or ae@futures.global)." });
      }
      const role = ROLES.includes(body.role) ? body.role : "campus";
      if (email === "ae@futures.global" && role !== "admin") {
        return json(event, 400, { error: "Ashley stays admin." });
      }
      const campus_id = isCampusId(body.campusId) ? body.campusId : null;
      const named = fallbackStaff(email);
      const { data, error } = await db().from("staff_roster").upsert({
        email,
        role,
        campus_id,
        display_name: sanitize(body.name || (named && named.name) || "", 80),
        updated_at: new Date().toISOString()
      }, { onConflict: "email" }).select().single();
      if (error) throw error;
      return json(event, 200, { person: data });
    }

    if (action === "roster_delete") {
      const email = normalizeEmail(body.email);
      if (!email || email === "ae@futures.global") {
        return json(event, 400, { error: "Cannot remove Ashley." });
      }
      const { error } = await db().from("staff_roster").delete().eq("email", email);
      if (error) throw error;
      await db().from("staff_sessions").delete().eq("email", email);
      return json(event, 200, { ok: true });
    }

    if (action === "corner_items") {
      const campusId = body.campusId;
      if (!isCampusId(campusId)) return json(event, 400, { error: "Campus required" });
      const { data, error } = await db()
        .from("campus_content")
        .select("id, type, title, created_at")
        .eq("campus", campusId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return json(event, 200, { items: data || [] });
    }

    return json(event, 400, { error: "Unknown action" });
  } catch (err) {
    console.error("intake", err);
    return json(event, 500, { error: "Server error" });
  }
};
