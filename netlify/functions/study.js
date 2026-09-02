/**
 * Study data layer — one passage in, everything we hold about it out.
 * Public-domain / Creative Commons reference data loaded by
 * scripts/load-study-data.mjs (see docs/PASTOR-STUDY-PREACH-PLAN.md Part 3).
 *
 *   GET /api/study?ref=Romans+8:1-4[&depth=summary|full][&commentary=mhc,jfb]
 *   GET /api/study?strongs=G3056           lexicon entry
 *   GET /api/study?words=Romans+8          English words → Strong's for a chapter
 *   GET /api/study?illustrations=faith     topic / free-text search
 *   GET /api/study?lectionary=A            a lectionary year (or ?lectionary=A&slug=advent-1)
 *   GET /api/study?sources=1               every loaded source with its attribution
 *
 * Reads with the service role — the study_* tables have no anon policy. Data
 * is immutable between loads, so responses are cacheable at the edge.
 */
const { createClient } = require("@supabase/supabase-js");
const { ALLOWED_ORIGINS, isAllowedOrigin, parseRequestOrigin } = require("./lib/cors");
const { isSharedRateLimited } = require("./lib/rate-limit");
const { parseRef, formatRef, canonicalBook, isOldTestament } = require("./lib/study-ref");

let sb;
function db() {
  if (!sb) sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  return sb;
}

const MAX_CROSSREFS_PER_VERSE = 12;
const MAX_ILLUSTRATIONS = 12;
const COMMENTARY_SOURCES_DEFAULT = null; // null = every loaded commentary

function json(status, body, headers, cache) {
  return {
    statusCode: status,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": cache || "no-store" },
    body: JSON.stringify(body),
  };
}

function refString(book, chapter, verse, verseEnd) {
  return formatRef({ book, chapter, verse: verse || 0, verseEnd: verseEnd || null });
}

/** Cross-references for a verse span, best first, grouped by verse.
 *  PostgREST caps a request at 1,000 rows and a chapter like Psalm 119 or
 *  Genesis 1 has more, so the query pages (stable order: verse, votes desc,
 *  target) until the chapter is exhausted or 8,000 rows are in. */
async function crossRefs(ref) {
  const rows = [];
  for (let from = 0; from < 8000; from += 1000) {
    let q = db().from("study_crossrefs")
      .select("verse, to_book, to_chapter, to_verse, to_verse_end, votes")
      .eq("book", ref.book).eq("chapter", ref.chapter)
      .order("verse", { ascending: true }).order("votes", { ascending: false })
      .order("to_book").order("to_chapter").order("to_verse");
    if (ref.verse) q = q.gte("verse", ref.verse).lte("verse", ref.verseEnd || ref.verse);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const byVerse = new Map();
  for (const r of rows) {
    const list = byVerse.get(r.verse) || [];
    if (list.length >= MAX_CROSSREFS_PER_VERSE) continue;
    list.push({ ref: refString(r.to_book, r.to_chapter, r.to_verse, r.to_verse_end), votes: r.votes });
    byVerse.set(r.verse, list);
  }
  return [...byVerse.entries()].map(([verse, refs]) => ({ verse, refs }));
}

/** Commentary entries overlapping the span, grouped by source. */
async function commentary(ref, sourceIds, depth) {
  let q = db().from("study_commentary")
    .select("source_id, verse_from, verse_to, content")
    .eq("book", ref.book).eq("chapter", ref.chapter)
    .order("source_id").order("verse_from");
  if (sourceIds && sourceIds.length) q = q.in("source_id", sourceIds);
  if (ref.verse) {
    // Chapter-level material (0,0) plus anything overlapping the span.
    const end = ref.verseEnd || ref.verse;
    q = q.or(`and(verse_from.eq.0,verse_to.eq.0),and(verse_from.lte.${end},verse_to.gte.${ref.verse})`);
  }
  const { data, error } = await q;
  if (error) throw error;
  const bySource = new Map();
  for (const r of data || []) {
    const list = bySource.get(r.source_id) || [];
    list.push({ verseFrom: r.verse_from, verseTo: r.verse_to, content: r.content });
    bySource.set(r.source_id, list);
  }
  // summary = what the passage response carries: a count and a short preview
  // per source (six commentaries on one chapter run to a megabyte otherwise).
  // The full entries come from ?ref=…&only=commentary&commentary=<id>.
  if (depth === "summary") {
    return [...bySource.entries()].map(([sourceId, entries]) => {
      const first = entries[0] ? entries[0].content : "";
      const preview = first.length > 500 ? first.slice(0, 500).replace(/\s+\S*$/, "") + " …" : first;
      return { sourceId, count: entries.length, preview, entries: [] };
    });
  }
  return [...bySource.entries()].map(([sourceId, entries]) => ({ sourceId, count: entries.length, entries }));
}

const WORD_COLUMNS = "verse, position, word, lemma, strongs, morph, gloss, translit";

/** Original-language words for the span (TAGNT / TAHOT), plus their lexicon entries.
 *  A verse span returns every token in order. A WHOLE chapter returns one row
 *  per Strong's number with a `count`, most frequent first (top 40) — Psalm 119
 *  alone is ~2,500 tokens, and PostgREST caps a request at 1,000 rows, so the
 *  chapter query pages before aggregating. */
async function words(ref) {
  let rows = [];
  if (ref.verse) {
    const { data, error } = await db().from("study_words").select(WORD_COLUMNS)
      .eq("book", ref.book).eq("chapter", ref.chapter)
      .gte("verse", ref.verse).lte("verse", ref.verseEnd || ref.verse)
      .order("verse").order("position").limit(1000);
    if (error) throw error;
    rows = data || [];
  } else {
    for (let from = 0; from < 6000; from += 1000) {
      const { data, error } = await db().from("study_words").select(WORD_COLUMNS)
        .eq("book", ref.book).eq("chapter", ref.chapter)
        .order("verse").order("position").range(from, from + 999);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    // Content words only: Greek N-/V-/A- and Hebrew/Aramaic HN/HV/HA (ANx for
    // Aramaic) — articles, conjunctions, prepositions and pronouns would
    // otherwise top every chapter (τοῖς, καί, δέ, אֵת).
    const isContentWord = r => {
      const m = String(r.morph || "");
      if (/^[NVA]-/.test(m)) return true;                     // TAGNT
      if (/^[HA][NVA]/.test(m)) return true;                  // TAHOT (Hebrew / Aramaic)
      return false;
    };
    const agg = new Map();
    for (const r of rows.filter(isContentWord)) {
      const key = r.strongs || `${r.lemma || ""}|${r.word}`;
      const hit = agg.get(key);
      if (hit) hit.count += 1;
      else agg.set(key, { ...r, count: 1 });
    }
    rows = [...agg.values()].sort((a, b) => b.count - a.count).slice(0, 40);
  }
  const strongs = [...new Set(rows.map(r => r.strongs).filter(Boolean))];
  let lexicon = {};
  if (strongs.length) {
    const { data: lex, error: lerr } = await db().from("study_lexicon")
      .select("strongs, language, lemma, translit, pronunciation, gloss, definition, usage")
      .in("strongs", strongs.slice(0, 400));
    if (lerr) throw lerr;
    for (const e of lex || []) lexicon[e.strongs] = e;
  }
  return { words: rows, lexicon };
}

async function placesAndPeople(ref) {
  // refs are stored as 'Book C:V' (or 'Book C') strings — match any key the span can carry.
  const keys = chapterRefs(ref);
  const [{ data: places, error: e1 }, { data: people, error: e2 }] = await Promise.all([
    db().from("study_places").select("id, name, lat, lon, description, refs, source_id").overlaps("refs", keys).limit(40),
    db().from("study_people").select("id, name, description, refs, source_id").overlaps("refs", keys).limit(40),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  // A record like "God" or "Jerusalem" carries thousands of refs; the passage
  // response keeps only the ones inside this chapter (the count says the rest).
  const prefix = `${ref.book} ${ref.chapter}`;
  const clip = r => ({
    ...r,
    refCount: (r.refs || []).length,
    refs: (r.refs || []).filter(x => x === prefix || x.startsWith(prefix + ":")).slice(0, 40),
  });
  return { places: (places || []).map(clip), people: (people || []).map(clip) };
}

/** Every 'Book C:V' key a chapter can carry (plus the chapter itself). */
function chapterRefs(ref) {
  const out = [`${ref.book} ${ref.chapter}`];
  const from = ref.verse || 1;
  const to = ref.verse ? (ref.verseEnd || ref.verse) : 176; // Psalm 119 is the longest chapter
  for (let v = from; v <= to; v++) out.push(`${ref.book} ${ref.chapter}:${v}`);
  return out;
}

async function topics(ref) {
  let q = db().from("study_topics").select("topic, verse, verse_end, source_id")
    .eq("book", ref.book).eq("chapter", ref.chapter)
    .order("verse").order("topic").limit(1000);
  if (ref.verse) q = q.or(`verse.eq.0,and(verse.lte.${ref.verseEnd || ref.verse},verse_end.gte.${ref.verse}),and(verse.gte.${ref.verse},verse.lte.${ref.verseEnd || ref.verse})`);
  const { data, error } = await q;
  if (error) throw error;
  return [...new Set((data || []).map(r => r.topic))].slice(0, 40);
}

async function illustrationsFor(query, limit, { topicOnly = false } = {}) {
  const q = String(query || "").trim().slice(0, 120);
  if (!q) return [];
  // Topic prefix first (the 1911 Cyclopedia's own headings), then full-text —
  // unless topicOnly: the passage response must not pad with loose text hits.
  const { data: byTopic, error: e1 } = await db().from("study_illustrations")
    .select("id, topic, title, body, refs, source_id").ilike("topic", `${q}%`).limit(limit);
  if (e1) throw e1;
  if (topicOnly || (byTopic || []).length >= limit) return byTopic || [];
  const { data: byText, error: e2 } = await db().from("study_illustrations")
    .select("id, topic, title, body, refs, source_id").textSearch("search", q, { type: "websearch", config: "english" }).limit(limit);
  if (e2) throw e2;
  const seen = new Set((byTopic || []).map(r => r.id));
  return [...(byTopic || []), ...(byText || []).filter(r => !seen.has(r.id))].slice(0, limit);
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const h = {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? parseRequestOrigin(origin) : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: h, body: "" };
  if (event.httpMethod !== "GET") return json(405, { error: "Not allowed" }, h);

  const p = event.queryStringParameters || {};
  // Rate limit only the expensive reads. A congregation on church wifi shares
  // ONE IP (the /lean-in incident), so the cheap primary-key lookups the popup
  // and the Sources screen make are never counted; the passage / search paths
  // get a bucket wide enough for a room of pastors.
  const cheap = p.strongs || p.sources || p.words;
  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (!cheap && await isSharedRateLimited("study", ip, 240)) return json(429, { error: "Too many requests" }, h);

  const CACHE = "public, max-age=86400, s-maxage=86400";
  try {
    if (p.sources) {
      const { data, error } = await db().from("study_sources")
        .select("id, name, licence, attribution, url, share_alike, language, loaded_at, record_count")
        .order("name");
      if (error) throw error;
      return json(200, { sources: data || [] }, h, "public, max-age=3600");
    }

    if (p.strongs) {
      const num = String(p.strongs).trim().toUpperCase();
      if (!/^[GH]\d{1,5}[A-Z]?$/.test(num)) return json(400, { error: "Bad Strong's number" }, h);
      const { data, error } = await db().from("study_lexicon")
        .select("strongs, language, lemma, translit, pronunciation, gloss, definition, usage, source_id")
        .eq("strongs", num).maybeSingle();
      if (error) throw error;
      if (!data) return json(404, { error: "No entry" }, h, CACHE);
      return json(200, data, h, CACHE);
    }

    if (p.words) {
      const ref = parseRef(p.words);
      if (!ref) return json(400, { error: "Bad reference" }, h);
      const { data, error } = await db().from("study_tagged_english")
        .select("verse, words, source_id").eq("book", ref.book).eq("chapter", ref.chapter).order("verse");
      if (error) throw error;
      return json(200, { ref: formatRef({ ...ref, verse: 0, verseEnd: null }), testament: isOldTestament(ref.book) ? "OT" : "NT", verses: data || [] }, h, CACHE);
    }

    if (p.illustrations !== undefined) {
      const limit = Math.min(Math.max(Number(p.limit) || MAX_ILLUSTRATIONS, 1), 30);
      return json(200, { query: p.illustrations, illustrations: await illustrationsFor(p.illustrations, limit) }, h, CACHE);
    }

    if (p.lectionary) {
      const year = String(p.lectionary).trim().toUpperCase();
      if (!/^[ABC]$/.test(year)) return json(400, { error: "Year must be A, B or C" }, h);
      let q = db().from("study_lectionary").select("year, slug, name, season, readings, source_id").eq("year", year).order("slug");
      if (p.slug) q = q.eq("slug", String(p.slug).slice(0, 60));
      const { data, error } = await q;
      if (error) throw error;
      return json(200, { year, entries: data || [] }, h, CACHE);
    }

    if (p.ref) {
      const ref = parseRef(p.ref);
      if (!ref) return json(400, { error: "Bad reference — try 'Romans 8' or 'Romans 8:1-4'" }, h);
      const commentarySources = p.commentary ? String(p.commentary).split(",").map(s => s.trim()).filter(Boolean).slice(0, 12) : COMMENTARY_SOURCES_DEFAULT;
      // ?ref=…&commentary=<id>: just that commentary, in full — how the prep
      // sheet expands one source without re-pulling the whole passage.
      if (commentarySources && p.only === "commentary") {
        return json(200, { ref: formatRef(ref), commentary: await commentary(ref, commentarySources, "full") }, h, CACHE);
      }
      // Commentary defaults to summary (count + preview per source); ?depth=full
      // inlines every entry — fine for a verse span, heavy for a chapter.
      const depth = p.depth === "full" ? "full" : "summary";
      const [xr, cm, wd, pp, tp] = await Promise.all([
        crossRefs(ref), commentary(ref, commentarySources, depth), words(ref), placesAndPeople(ref), topics(ref),
      ]);
      // Illustrations for a passage: the Nave/Torrey topics on it, matched to
      // the Cyclopedia's headings only (first three topics, six illustrations).
      let illustrations = [];
      for (const topic of tp.slice(0, 3)) {
        if (illustrations.length >= 6) break;
        const hits = await illustrationsFor(topic.replace(/,.*$/, ""), 6 - illustrations.length, { topicOnly: true });
        for (const h of hits) if (!illustrations.some(x => x.id === h.id)) illustrations.push(h);
      }
      return json(200, {
        ref: formatRef(ref), book: ref.book, chapter: ref.chapter, verse: ref.verse || null, verseEnd: ref.verseEnd,
        testament: isOldTestament(ref.book) ? "OT" : "NT",
        depth, wordsMode: ref.verse ? "tokens" : "aggregate",
        crossRefs: xr, commentary: cm, words: wd.words, lexicon: wd.lexicon,
        places: pp.places, people: pp.people, topics: tp, illustrations,
      }, h, CACHE);
    }

    return json(400, { error: "Give one of: ref, strongs, words, illustrations, lectionary, sources" }, h);
  } catch (err) {
    console.error("[study]", err && err.message);
    return json(500, { error: "Server error" }, h);
  }
};

module.exports.__test = { chapterRefs, canonicalBook };
