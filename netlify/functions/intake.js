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
  questionVisibleForJob,
  isCampusId,
  lockCampus,
  sanitize,
  QUESTION_TYPES,
  AUDIENCES,
  ROLES,
  collectCampusFromAnswers,
  applyAnswers,
  publicStaff,
  passwordIssue,
  hashPassword,
  verifyPassword,
  youtubeWatchUrl,
  hasNotesContent
} = require("./lib/intake-core");
const { formatSermon, mergeYoutube, answersToOutline, sanitizeAiSermon } = require("./lib/sermon-format");

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

function clientIp(event) {
  return (event.headers["x-forwarded-for"] || event.headers["client-ip"] || "unknown").split(",")[0].trim();
}

async function resolveStaff(email) {
  const e = normalizeEmail(email);
  if (!isAllowlistedEmail(e)) return null;
  const { data } = await db().from("staff_roster").select("email, role, campus_id, display_name").eq("email", e).maybeSingle();
  // Ashley is the only admin — lock it even if the roster row was edited.
  if (e === "ae@futures.global") {
    return {
      email: e,
      role: "admin",
      campusId: (data && data.campus_id) || null,
      name: (data && data.display_name) || "Ashley Evans"
    };
  }
  if (data) {
    const named = fallbackStaff(e);
    const role = data.role === "admin" ? (named && named.role) || "campus" : data.role;
    return {
      email: e,
      role,
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
  }
  return raw;
}

async function getCurrentPublished() {
  const { data } = await db()
    .from("published_sermons")
    .select("id, sermon, is_current")
    .eq("is_current", true)
    .maybeSingle();
  return data || null;
}

async function findPublished(target) {
  const t = String(target || "").trim();
  if (!t || t === "__current__") return getCurrentPublished();
  const byId = await db().from("published_sermons").select("id, sermon, is_current").eq("id", t).maybeSingle();
  if (byId.data) return byId.data;
  const { data: rows } = await db()
    .from("published_sermons")
    .select("id, sermon, is_current")
    .order("published_at", { ascending: false })
    .limit(40);
  const needle = t.toLowerCase();
  return (rows || []).find((r) => {
    const s = r.sermon || {};
    return String(s.title || "").toLowerCase() === needle || String(s.id || "").toLowerCase() === needle;
  }) || null;
}

async function listSermonChoices() {
  const { data: published } = await db()
    .from("published_sermons")
    .select("id, sermon, is_current, published_at")
    .order("published_at", { ascending: false })
    .limit(20);
  const { data: pending } = await db()
    .from("intake_submissions")
    .select("id, formatted_sermon, created_at, status, role")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);
  const out = [];
  if ((published || []).some((r) => r.is_current)) {
    out.push({ id: "__current__", title: "This week's published message", source: "current" });
  }
  for (const r of published || []) {
    const s = r.sermon || {};
    out.push({
      id: r.id,
      title: s.title || r.id,
      date: s.date || "",
      speaker: s.speaker || "",
      current: !!r.is_current,
      source: "published"
    });
  }
  for (const r of pending || []) {
    const s = r.formatted_sermon || {};
    if (!s.title && !s.id) continue;
    out.push({
      id: "pending:" + r.id,
      title: (s.title || "Pending notes") + " (awaiting review)",
      date: s.date || "",
      speaker: s.speaker || "",
      current: false,
      source: "pending"
    });
  }
  return out;
}

function stripPublishFlags(sermon) {
  if (!sermon || typeof sermon !== "object") return sermon;
  const next = { ...sermon };
  delete next.youtubeOnly;
  return next;
}

async function buildFormattedFromPlan(plan, { useAI }) {
  const patch = plan.sermonPatch || {};
  if (patch.youtubeInvalid) {
    const err = new Error("Paste a YouTube watch, youtu.be, shorts, or embed link.");
    err.status = 400;
    throw err;
  }
  const row = await findPublished(patch.target);
  const base = row && row.sermon ? { ...row.sermon, id: row.sermon.id || row.id } : null;
  const youtubeUrl = youtubeWatchUrl(patch.youtubeUrl) || (base && base.youtubeUrl) || "";

  if (plan.youtubeOnly && base) {
    return { sermon: mergeYoutube(base, youtubeUrl), source: "merge" };
  }
  if (plan.youtubeOnly && !base && youtubeUrl) {
    return { sermon: mergeYoutube({ id: "current", title: "This week's message" }, youtubeUrl), source: "merge" };
  }

  const outline = answersToOutline(patch) || patch.outline || patch.body || "";
  const fields = {
    title: patch.title || (base && base.title) || "",
    speaker: patch.speaker || (base && base.speaker) || "",
    date: patch.date || (base && base.date) || "",
    series: patch.series || (base && base.series) || "",
    keyVerse: patch.keyVerse || (base && base.keyVerse) || "",
    keyVerseText: patch.keyVerseText || (base && base.keyVerseText) || "",
    outline,
    bigIdea: patch.bigIdea || "",
    point1Heading: patch.point1Heading || "",
    point1Body: patch.point1Body || "",
    point2Heading: patch.point2Heading || "",
    point2Body: patch.point2Body || "",
    point3Heading: patch.point3Heading || "",
    point3Body: patch.point3Body || "",
    weeklyAction: patch.weeklyAction || "",
    youtubeUrl,
    responsePrompts: base && base.responsePrompts,
    commitments: base && base.commitments,
    sections: !hasNotesContent(patch) && base ? base.sections : undefined
  };

  const shouldAI = useAI === true && hasNotesContent(patch);
  if (!hasNotesContent(patch) && !fields.title && youtubeUrl && base) {
    return { sermon: mergeYoutube(base, youtubeUrl), source: "merge" };
  }
  if (!hasNotesContent(patch) && !fields.title && !youtubeUrl) return { sermon: null, source: "none" };

  const formatted = await formatSermon(fields, { useAI: shouldAI, base });
  if (youtubeUrl) formatted.sermon.youtubeUrl = youtubeUrl;
  if (plan.youtubeOnly) formatted.sermon.youtubeOnly = true;
  if (plan.notesPolish && base) formatted.sermon.id = base.id;
  return formatted;
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

  let sermon = submission.formatted_sermon;
  if (!sermon || typeof sermon !== "object") {
    const built = await buildFormattedFromPlan(plan, { useAI: false });
    sermon = built.sermon;
  }
  if (sermon && sermon.id) {
    const youtubeOnly = !!sermon.youtubeOnly;
    sermon = stripPublishFlags(sermon);
    if (youtubeOnly) {
      const row = await findPublished(sermon.id) || await getCurrentPublished();
      if (!row) throw new Error("No published sermon to attach this video to");
      const merged = stripPublishFlags({ ...(row.sermon || {}), youtubeUrl: sermon.youtubeUrl || (row.sermon && row.sermon.youtubeUrl) || "" });
      const { error } = await db().from("published_sermons").update({
        sermon: merged,
        submission_id: submission.id,
        published_at: new Date().toISOString(),
        published_by: staff.email
      }).eq("id", row.id);
      if (error) throw error;
      result.sermon = { id: row.id, title: merged.title, youtubeUrl: merged.youtubeUrl || "" };
    } else {
      const current = await getCurrentPublished();
      if (!current || current.id !== sermon.id) {
        await db().from("published_sermons").update({ is_current: false }).eq("is_current", true);
      }
      const { error } = await db().from("published_sermons").upsert({
        id: sermon.id,
        sermon,
        is_current: true,
        submission_id: submission.id,
        published_at: new Date().toISOString(),
        published_by: staff.email
      }, { onConflict: "id" });
      if (error) throw error;
      result.sermon = { id: sermon.id, title: sermon.title, youtubeUrl: sermon.youtubeUrl || "" };
    }
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
    // ── auth_status ── First visit: set your own password. After that: sign in.
    if (action === "auth_status") {
      if (await isSharedRateLimited("intake-auth", ip, 20, 15 * 60 * 1000)) {
        return json(event, 429, { error: "Too many attempts. Try again later." });
      }
      const email = normalizeEmail(body.email);
      if (!isAllowlistedEmail(email)) {
        return json(event, 200, { setup: false });
      }
      const { data } = await db().from("staff_roster").select("password_hash").eq("email", email).maybeSingle();
      return json(event, 200, { setup: !data || !data.password_hash });
    }

    // ── set_password ── First-time only. Each person chooses their own.
    if (action === "set_password") {
      if (await isSharedRateLimited("intake-set-password", ip, 10, 15 * 60 * 1000)) {
        return json(event, 429, { error: "Too many attempts. Try again later." });
      }
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const staff = await resolveStaff(email);
      if (!staff) return json(event, 403, { error: "Invalid email or password" });
      const issue = passwordIssue(password, email);
      if (issue) return json(event, 400, { error: issue });
      const { data: row } = await db().from("staff_roster").select("password_hash").eq("email", email).maybeSingle();
      if (row && row.password_hash) {
        return json(event, 403, { error: "Password already set. Sign in with email and password." });
      }
      await ensureRoster(staff);
      const { error } = await db().from("staff_roster").update({
        password_hash: hashPassword(password),
        updated_at: new Date().toISOString()
      }).eq("email", email);
      if (error) throw error;
      const token = await issueSession(staff.email);
      return json(event, 200, { token, staff: publicStaff(staff) });
    }

    // ── login ── Returning staff: email + the password they set.
    if (action === "login") {
      if (await isSharedRateLimited("intake-login", ip, 20, 15 * 60 * 1000)) {
        return json(event, 429, { error: "Too many attempts. Try again later." });
      }
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const staff = await resolveStaff(email);
      if (!staff || !password) return json(event, 403, { error: "Invalid email or password" });
      const { data: row } = await db().from("staff_roster").select("password_hash").eq("email", email).maybeSingle();
      if (!row || !row.password_hash) {
        return json(event, 403, { error: "Set your own password first.", setup: true });
      }
      if (!verifyPassword(password, row.password_hash)) {
        return json(event, 403, { error: "Invalid email or password" });
      }
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
      let pendingCount = 0;
      if (staff.role === "admin") {
        const { count } = await db().from("intake_submissions").select("id", { count: "exact", head: true }).eq("status", "pending");
        pendingCount = count || 0;
      }
      return json(event, 200, { staff: publicStaff(staff), pendingCount });
    }

    if (action === "form") {
      const { data: questions, error } = await db()
        .from("intake_questions")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const job = body.job === "hub" || body.job === "media" || body.job === "campus" ? body.job : null;
      const visible = (questions || []).filter((q) => questionVisibleForJob(q, staff.role, job));
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
      const sermons = (staff.role === "media" || staff.role === "hub" || staff.role === "admin")
        ? await listSermonChoices()
        : [];
      return json(event, 200, {
        staff: publicStaff(staff),
        questions: visible,
        cornerItems,
        submissions: mine || [],
        sermons
      });
    }

    if (action === "submit") {
      const { data: questions, error } = await db()
        .from("intake_questions")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const job = body.job === "hub" || body.job === "media" || body.job === "campus" ? body.job : null;
      const visible = (questions || []).filter((q) => questionVisibleForJob(q, staff.role, job));
      const answersIn = body.answers && typeof body.answers === "object" ? body.answers : {};
      const answers = {};
      const viewAs = job || staff.role;
      for (const q of visible) {
        if (answersIn[q.id] !== undefined) answers[q.id] = answersIn[q.id];
        if (q.required && (q.audience === viewAs || q.audience === "all")) {
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
      const plan = applyAnswers(visible, answers, { name: staff.name || staff.email });
      let formatted_sermon = null;
      let format_source = null;
      try {
        const wantAI = plan.sermonPatch && plan.sermonPatch.reformat === true && hasNotesContent(plan.sermonPatch);
        if (wantAI) {
          if (!body.signedOff || !body.formatted_sermon || typeof body.formatted_sermon !== "object") {
            return json(event, 400, { error: "Sign off on the formatted notes before sending to Ashley." });
          }
          const row = await findPublished(plan.sermonPatch.target);
          const base = row && row.sermon ? { ...row.sermon, id: row.sermon.id || row.id } : null;
          formatted_sermon = sanitizeAiSermon(body.formatted_sermon, {
            title: plan.sermonPatch.title || "",
            speaker: plan.sermonPatch.speaker || "",
            date: plan.sermonPatch.date || "",
            series: plan.sermonPatch.series || "",
            keyVerse: plan.sermonPatch.keyVerse || "",
            keyVerseText: plan.sermonPatch.keyVerseText || "",
            youtubeUrl: plan.sermonPatch.youtubeUrl || "",
            outline: plan.sermonPatch.outline || ""
          }, base);
          if (!formatted_sermon) {
            const built = await buildFormattedFromPlan(plan, { useAI: true });
            formatted_sermon = built.sermon;
            format_source = built.source;
          } else {
            format_source = "signed-off";
          }
        } else {
          const built = await buildFormattedFromPlan(plan, { useAI: false });
          formatted_sermon = built.sermon;
          format_source = built.source;
        }
      } catch (fmtErr) {
        if (fmtErr && fmtErr.status === 400) return json(event, 400, { error: fmtErr.message });
        throw fmtErr;
      }
      const { data: row, error: insErr } = await db().from("intake_submissions").insert({
        email: staff.email,
        role: staff.role,
        campus_id: campusId,
        answers,
        formatted_sermon,
        status: "pending"
      }).select("id, status, created_at, formatted_sermon").single();
      if (insErr) throw insErr;
      const publishNow = staff.role === "admin" && body.publishNow === true;
      if (publishNow) {
        const publish_result = await publishApproved({ ...row, answers, formatted_sermon, campus_id: campusId, email: staff.email, role: staff.role }, staff);
        const { data: updated, error: upErr } = await db().from("intake_submissions").update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: staff.email,
          publish_result
        }).eq("id", row.id).select("id, status, created_at, formatted_sermon").single();
        if (upErr) throw upErr;
        return json(event, 200, { ok: true, submission: updated, preview: formatted_sermon, format_source, published: true, publish_result });
      }
      return json(event, 200, { ok: true, submission: row, preview: formatted_sermon, format_source });
    }

    if (action === "format_preview") {
      const { data: questions, error } = await db()
        .from("intake_questions")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const job = body.job === "hub" || body.job === "media" || body.job === "campus" ? body.job : null;
      const visible = (questions || []).filter((q) => questionVisibleForJob(q, staff.role, job));
      const answersIn = body.answers && typeof body.answers === "object" ? body.answers : {};
      const answers = {};
      for (const q of visible) {
        if (answersIn[q.id] !== undefined) answers[q.id] = answersIn[q.id];
      }
      const plan = applyAnswers(visible, answers, { name: staff.name || staff.email });
      try {
        const useAI = body.useAI === true;
        const built = await buildFormattedFromPlan(plan, { useAI });
        return json(event, 200, { preview: built.sermon, source: built.source });
      } catch (fmtErr) {
        if (fmtErr && fmtErr.status === 400) return json(event, 400, { error: fmtErr.message });
        throw fmtErr;
      }
    }

    if (action === "sermons_list") {
      return json(event, 200, { sermons: await listSermonChoices() });
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
      const { data, error } = await db()
        .from("staff_roster")
        .select("email, role, campus_id, display_name, password_hash")
        .order("email");
      if (error) throw error;
      const roster = (data || []).map((row) => ({
        email: row.email,
        role: row.role,
        campus_id: row.campus_id,
        display_name: row.display_name,
        has_password: !!row.password_hash
      }));
      return json(event, 200, { roster });
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
      if (role === "admin" && email !== "ae@futures.global") {
        return json(event, 400, { error: "Ashley Evans (ae@futures.global) is the only admin." });
      }
      const campus_id = isCampusId(body.campusId) ? body.campusId : null;
      const named = fallbackStaff(email);
      const { data, error } = await db().from("staff_roster").upsert({
        email,
        role,
        campus_id,
        display_name: sanitize(body.name || (named && named.name) || "", 80),
        updated_at: new Date().toISOString()
      }, { onConflict: "email" }).select("email, role, campus_id, display_name").single();
      if (error) throw error;
      return json(event, 200, { person: data });
    }

    if (action === "roster_clear_password") {
      const email = normalizeEmail(body.email);
      if (!email) return json(event, 400, { error: "Email required" });
      const { error } = await db().from("staff_roster").update({
        password_hash: null,
        updated_at: new Date().toISOString()
      }).eq("email", email);
      if (error) throw error;
      await db().from("staff_sessions").delete().eq("email", email);
      return json(event, 200, { ok: true });
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
    if (err && err.status === 400) return json(event, 400, { error: err.message || "Bad request" });
    return json(event, 500, { error: "Server error" });
  }
};
