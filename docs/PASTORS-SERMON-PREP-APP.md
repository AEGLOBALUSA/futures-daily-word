# Pastors Sermon Prep — documentation of what exists, and the prompt for the standalone app

Written 2 Sep 2026 after Phases 1–4 of the pastor Study & Preach work shipped inside
Futures Daily Word (commits `c2cb4612`, `b544b02c`, and the Preach workspace commit
that follows this file). Part A documents everything that was built, precisely enough
to rebuild it elsewhere. Part B is the prompt for a fresh Claude Code session (another
subscription, no memory) to create the separate app **Pastors Sermon Prep** from it.

---

## PART A — What exists today (in `AEGLOBALUSA/futures-daily-word`)

### A1. Shape of the thing

One devotional PWA (React 19, Vite 6, Tailwind 4, TypeScript; CommonJS Netlify
functions; Supabase project `uamavjnjvmsopjzxirsd`, org plan Pro) with a pastor layer
switched on by the `pastor_leader` persona. Nothing in the pastor layer is visible to
any other persona. Three parts:

1. **Identity** — pastor sign-in (Settings → Pastor account) against the existing
   staff intake backend; roster campus and campus pastor code provisioned at sign-in;
   self-service password change.
2. **Study data layer** — ~1M rows of public-domain / Creative Commons reference data
   in 11 `study_*` tables, served by ONE function, `GET /api/study`.
3. **Preach workspace** — the hidden `sermon-notes` tab becomes "Preach" for pastors:
   This week · Prep sheet · Outline builder · Publish · Archive.

### A2. Identity (files: `src/utils/staffIdentity.ts`, `src/utils/useStaffIdentity.ts`, `src/components/PastorSignIn.tsx`, `netlify/functions/intake.js`, `netlify/functions/pastor-admin.js`, `netlify/functions/lib/campus-code.js`)

- Staff sign in with their `@futures.church` email (or `ae@futures.global`) and a
  password they choose on first use (`auth_status` → `set_password`; then `login`).
  Backend = `intake.js` (`staff_roster`, `staff_sessions`, 14-day Bearer tokens,
  bcrypt hashes). Token in `localStorage.dw_staff_token`; the in-app marker
  `dw_staff_app_signin='1'` distinguishes an app sign-in from a `/staff` portal login
  on a shared device — without the marker, boot never re-identifies the app.
- Sign-in stamps `dw_setup={persona:'pastor_leader',source:'settings'}`, fills
  name/email from the roster, writes the roster campus into `dw_profile.campus`
  (explicit sign-in: roster wins; silent boot restore: only fills an empty campus),
  and provisions `dw_pastor_code`.
- **Campus pastor code** = first 8 hex of `SHA-256("<campusId>:<PASTOR_SECRET>")`,
  upper-cased. ONE derivation, in `lib/campus-code.js`, for minting
  (`pastor-admin list-codes`, `my-campus-code`) and checking (`analytics-dashboard`,
  `video-upload`). The dashboard used to hash the short slug (`gwinnett`) — every
  listed code was rejected there until 2 Sep. Checking still accepts the legacy slug
  form. `my-campus-code` (Bearer staff token → `staff_sessions` → `staff_roster`) mints
  only when `staff_roster.campus_set_by='admin'` (set by `roster_save`; the pastor's
  own first-submission self-assignment writes `'self'`, answered with
  `{code:null, reason:"campus_not_confirmed"}`). Marker `dw_pastor_code_src='signin'`
  + `dw_pastor_code_campus` mean sign-out or a rejected token clears only what sign-in
  wrote; a hand-typed code survives; boot re-asks when the stored code was provisioned
  for a different campus.
- `change_password` (intake.js, additive): rate-limited 5/min, verifies the current
  password, refuses the same password, `passwordIssue` rules (≥10 chars …), rehashes,
  deletes the pastor's OTHER `staff_sessions` rows. Home persona chip is locked while
  signed in ("Sign out of pastor account"); Settings' own persona picker is not.
- Deviations that each fix a real bug (keep them): boot re-stamps the persona only over
  auto sources (`default`/`sunday-guest`); an email switch calls `clearSessionToken()`
  + `resetSyncSession()` + unauthenticated `register` BEFORE `saveProfile` (the cloud
  token authenticates the OLD email and `user-sync` push is a wholesale upsert);
  profile idempotency compares fields, not JSON key order.

### A3. Study data layer

**Schema** — `supabase/migrations/20260902_study_layer.sql` (applied). Tables, all
keyed by the app's canonical English book name (`src/data/bible-books.ts`:
`'Genesis'…'Revelation'`, `'Psalms'`, `'Song of Solomon'`), 1-based chapter/verse,
0 = whole chapter:

| table | key | holds |
|---|---|---|
| `study_sources` | id | name, licence, **attribution** (the exact credit to print), url, share_alike, language, loaded_at, record_count |
| `study_crossrefs` | (source, book, ch, v, to_book, to_ch, to_v) | to_verse_end, votes (signed) |
| `study_commentary` | (source, book, ch, verse_from, verse_to) | plain-text content; 0/0 = chapter introduction |
| `study_words` | (source, book, ch, v, position) | original-language word, lemma, strongs `G3056`/`H2617`, morph, gloss, translit |
| `study_lexicon` | strongs | language, lemma, translit, pronunciation, gloss, definition, usage |
| `study_tagged_english` | (source, book, ch, v) | `words` jsonb `[{w, s:[strongs…]}]` |
| `study_places` | id | name, lat, lon, description, refs[] (`'Book C:V'`) |
| `study_people` | id | name, description, refs[] |
| `study_illustrations` | id | topic, title, body, refs[], `search` tsvector |
| `study_topics` | (source, topic, book, ch, v, v_end) | Nave / Torrey topical index |
| `study_lectionary` | (source, year, slug) | name, season, readings jsonb |

RLS is ON with **no anon/authenticated grants** (revoked by role name); only the
function reads them with the service role. Nothing reads these tables from the browser.

**Sources loaded (2 Sep 2026)** — `scripts/load-study-data.mjs <name>` with loaders in
`scripts/study/*.mjs` (each: `fetchCached` → parse → `clearSource` → `upsertBatches` →
`recordSource`; repeatable; raw files cache in `~/.cache/futures-study-sources`;
`STUDY_LIMIT` applies to `--dry-run` only):

| loader | source id | licence | rows |
|---|---|---|---|
| crossrefs | `openbible-crossrefs` | CC BY 4.0 | 344,799 |
| lexicon | `strongs-greek-xml` (CC0) + `oshb-hebrew-strongs` (CC BY 4.0) | | 5,523 + 8,674 |
| places | `openbible-geocoding` | CC BY 4.0 (OSM geometry ODbL) | 1,285 |
| words | `stepbible-tagnt` + `stepbible-tahot` | CC BY 4.0 ("STEP Bible") | 137,562 + 305,421 |
| tagged | `ebible-web-strongs` | Public domain (WEB name is a trademark) | 31,098 verses |
| commentary | `helloao-matthew-henry`, `-jfb`, `-gill`, `-clarke`, `-calvin`, `-keil-delitzsch` | CC Public Domain Mark | 5,279 / 18,213 / 29,707 / 14,149 / 7,318 / 6,861 |
| topics | `nave-topical` + `torrey-topical` | Public domain | 41,278 + 32,274 |
| people | `theographic-people` | **CC BY-SA 4.0** (share_alike=true) | 3,067 |
| illustrations | `gutenberg-74575` (Cyclopedia of Illustrations, 1911) | Public domain | 3,517 |
| lectionary | `rcl-date-lectionary` (marmanold rcl_lect.xml, BSD; CCT notice printed) | | 234 |

Coverage gaps by design: Clarke lacks several books (incl. Matthew); Calvin 48 books;
K&D is OT only; Henry lacks Song of Solomon; the RCL load is the complementary track
only; illustrations have no titles (topic headings only).

**Function** — `netlify/functions/study.js`, `lib/study-ref.js` (the one reference
parser: USFM/OSIS/loose names, `"Romans 8"`, `"Romans 8:1-4"`, `"Gen.1.1"`, `"Jude 3"`):

- `?ref=Romans+8:1-4[&depth=full][&commentary=id,id]` → `{ref, book, chapter, verse,
  verseEnd, testament, depth, wordsMode, crossRefs[{verse, refs[{ref, votes}]}]
  (top 12 per verse, paged past PostgREST's 1,000-row cap), commentary[{sourceId,
  count, preview, entries[]}] (summary = count + 500-char preview; `depth=full` inlines
  entries), words (a verse span → every token; a whole chapter → top 40 content words
  aggregated by Strong's with `count`), lexicon{strongs→entry}, places/people (refs
  clipped to the chapter, `refCount`), topics[], illustrations[] (matched by the
  passage's Nave/Torrey topics against the Cyclopedia's headings)}`.
- `?ref=…&only=commentary&commentary=<id>` → that commentary's entries in full.
- `?strongs=G26` · `?words=Romans+8` (tagged English) · `?illustrations=<query>`
  (topic prefix, then full text) · `?lectionary=A[&slug=advent-1]` · `?sources=1`.
- Cache-Control 1 day; cheap lookups (`strongs`, `sources`, `words`) are not
  rate-limited (a congregation shares one IP); passage/search paths 240/min/IP.
- Response sizes after tuning: a chapter ≈ 40–60 KB, a verse span ≈ 25 KB.

**Client** — `src/utils/study.ts` (`fetchStudyPassage`, `fetchStudyCommentary`,
`fetchLexiconEntry`, `fetchTaggedChapter`, `searchIllustrations`, `fetchLectionary`,
`fetchStudySources`, `COMMENTARY_NAMES`), using `localApiBase()` (relative on the app
origin and previews, absolute when proxied on futures.church). The Greek/Hebrew popup
reads definitions from the layer first, the old `strongs.js` second. The tap-a-word map
(`fetchStrongsMap`) keeps Bolls' KJV S-tags FIRST — the WEB's word-level tags are
misaligned for common words (Gen 1:1 tags "In" as H8064) — with the tagged layer as
fallback, clipped to the verse span. Sources card in Settings (pastors) prints every
attribution; the static Scripture Attribution card carries the lexicon credits for
everyone.

### A4. Preach workspace (files: `src/screens/PreachScreen.tsx`, `src/components/preach/{PrepSheet,OutlineBuilder,PublishSermon,SermonArchive}.tsx`, `src/utils/{preachOutline,preachPublish,sermonArchive}.ts`, `src/data/preach-frameworks.ts`)

- Mounted on the hidden `sermon-notes` tab when `setup.persona==='pastor_leader'`
  (`App.tsx`); the Home card reads "Preach — Prepare this week's message". Every other
  persona still gets the congregation Sermon Notes surface.
- **This week**: focus line (`dw_sermon_prep_focus`) + the published message
  (`/api/published-sermon`) with the congregation's notes in a read-only overlay.
- **Prep sheet**: passage picker; text in the reader's translation + KJV; cross-ref
  chips (tap = navigate); six commentaries collapsed with count + preview, entries
  fetched per source on expand; "Summarise" (one Claude call, commentary text ONLY —
  never ESV/NIV/NLT text); key words → Greek/Hebrew popup; places, people,
  illustrations; "+" files any item into the sermon-prep bag (`dw_sermon_prep`).
- **Outline builder**: title, passage, series, date, speaker, big idea, 1–5 points,
  weekly action; "Seed from my highlights" (prep bag → point bodies); scaffolds ONLY for
  the two frameworks with verified definitions — **The 4D Protocol** (Discover /
  Develop / Deploy / Depart) and **H.E.A.T.** (Hungry / Effective / Adaptable /
  Transferable), both "from Multiply or Die". P.A.I.D., Five Fences and Five Batons
  have no definition on record and were left out. Stored as `dw_preach_outline`
  (≤18 KB, newest-wins through the misc bag — deliberately off the authored, fill-only
  `dw_sermon_` prefix); a debounced save is flushed on unmount; the builder re-reads
  after a cloud pull.
- **Publish** (`preachPublish.ts`): questions matched by CONFIG, never by id
  (`config.publish==='sermon_field'` + `sermonKey`; `flow==='notes_have'`;
  `flow==='notes_ai'`; campus: the `campus` question + the `campus_corner`
  announcement long_text). admin/hub → `intake('form')` → `format_preview` (rendered
  with `SermonNotesSurface`) → explicit **Send to Sunday** → second tap **Confirm** →
  `intake('submit')` which publishes the church-wide message immediately. campus role
  → campus-corner announcement (title + notes, sanitised/capped like the server). media
  role is refused (its form requires `sermon_pick`). Missing required fields are
  listed before preview. A 401 mid-flow drops the session marker so the card swaps to
  the sign-in line. `outlineToNotes()` produces exactly the shape
  `lib/sermon-format.js answersToOutline` expects (no invented "Point N" headings).
- **Archive**: `published-sermon.js?list=1` (public rows) + client search by title,
  series, speaker, key verse, section text and scripture reference; opens read-only;
  memo invalidated on publish.

### A5. Operating facts (traps)

- `main` is production (Netlify auto-deploy). Verify the live `index-*.js` hash after
  every push. `npm run build` + `npx vitest run` (315 green) before any push.
- **This repo's Netlify link points at the wrong site** (`futures-people`). Every CLI
  call needs `NETLIFY_SITE_ID=5b332733-6735-44a9-90b9-ac21862f2615`. Env names on that
  site: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `PASTOR_SECRET`,
  `ADMIN_PIN`, `ANTHROPIC_API_KEY`, `ESV_API_KEY`, `API_BIBLE_KEY`. Never print values.
- PostgREST caps every request at 1,000 rows; page with `.range()`.
- Any `dw_setup` write from a user action uses `source:'settings'`.
- New UI strings: `src/utils/i18n.ts`, all four languages (en/es/pt/id), one line each,
  `\uXXXX` escapes; `src/__tests__/i18n-keys.test.ts` fails the build otherwise.
- `vite preview` on :4175 (`~/.claude/launch.json` → `dw-pastor-preview`) proxies
  `/api` to production; a fake staff token is rejected and cleared at boot.
- Licence hard limits: bulk-load only PD/CC; never send NIV to Claude; ESV ≤500
  stored verses and no derivative works; API.Bible forbids training and needs FUMS;
  every bulk-loaded source's attribution must be printed.

---

## PART B — The prompt for the new job

Paste everything between the lines into a fresh Claude Code session. It assumes no
memory of this repo; every fact it needs is in Part A of this file, which it must read.

---

You are building **Pastors Sermon Prep** — a standalone web app for pastors, extracted
from the pastor layer of Futures Daily Word (a devotional PWA used by a real
congregation). Ashley Evans (he/him), Senior Pastor of Futures Church, is the product
owner and the ONLY developer you will hand this to; he is an expert — write for
experts, no hand-holding, no invented content.

**Read first, in full, before doing anything:**
1. `docs/PASTORS-SERMON-PREP-APP.md` Part A in the source repo
   `https://github.com/AEGLOBALUSA/futures-daily-word` (clone it read-only into a
   sibling directory). It documents everything already built: identity, the study data
   layer (schema, loaders, function contract, licences, sizes), the Preach workspace,
   and the operating traps. Do not re-derive any of it.
2. `docs/PASTOR-STUDY-PREACH-PLAN.md` in the same repo — Part 3 is the licence-verified
   source catalogue; Part 1 records what shipped and why the design deviated from the
   original handoff.

**What to build.** A new repository `AEGLOBALUSA/pastors-sermon-prep`, a new Netlify
site, and a new Supabase project, holding a pastor-only app with the same five
surfaces the Daily Word Preach workspace has — This week, Prep sheet, Outline builder,
Publish, Archive — plus a Sources screen, sign-in, and settings. Port the code; do not
rewrite it from memory. Port by NAME and contract: `study.js`, `lib/study-ref.js`,
`lib/campus-code.js`, `scripts/load-study-data.mjs` + `scripts/study/*`, the
`20260902_study_layer.sql` schema, `src/utils/{study,preachOutline,preachPublish,
sermonArchive,pastorPrompts,staffIdentity,useStaffIdentity}.ts`, the four `preach/*`
components, `PreachScreen.tsx`, `StudySourcesCard.tsx`, the Greek/Hebrew popup, and the
i18n keys prefixed `preach_`, `study_sources_`, `pastor_`, `ai_pastor_`.

**Decisions already made — do not reopen:**
- Stack stays React 19 + Vite 6 + TypeScript + Tailwind 4, CommonJS Netlify functions,
  Supabase. localStorage-first with the same misc-bag cloud sync semantics
  (`dw_preach_outline` newest-wins; `dw_sermon_prep`/`_focus` authored fill-only).
- Data: run the loaders into the NEW Supabase project (Pro plan needed — ~260 MB).
  Bulk-load only the public-domain / Creative Commons sources in the catalogue. Never
  send NIV text to Claude; ESV only via the live API, ≤500 stored verses, no derivative
  works; API.Bible needs FUMS reporting and forbids training; the Sources screen prints
  every attribution; Theographic is share-alike — label anything derived from it.
- Identity: the SAME staff roster and passwords as Daily Word / `/staff`, so a pastor
  has one login. Either point the new app's auth calls at Daily Word's `intake.js`
  (`https://futuresdailyword.com/api/intake`, CORS allow-list in
  `netlify/functions/lib/cors.js` must add the new origin — a small additive change in
  the Daily Word repo, pushed to main, live hash verified) or copy `intake.js` +
  `intake-core.js` and share the `staff_roster`/`staff_sessions` tables by pointing the
  new site's `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` at the Daily Word project for those
  two functions only. Recommend the first; state which you did. `PASTOR_SECRET` and
  `ADMIN_PIN` stay in Daily Word's env — the campus code is minted there.
- Publishing: "Send to Sunday" MUST still land in the congregation's Sermon Notes in
  Daily Word — call Daily Word's `intake` (`form` → `format_preview` → explicit
  confirm → `submit`), matching questions by config, never by id. Campus pastors post
  to their campus corner. Media role refused.
- Frameworks: only The 4D Protocol and H.E.A.T. have verified definitions. Do not
  invent P.A.I.D., Five Fences or Five Batons; if Ashley supplies definitions, add them
  to `src/data/preach-frameworks.ts` as data.
- Bible AI pastor prompts (`src/utils/pastorPrompts.ts`) come across unchanged.
- Bible text: KJV offline, WEB built in, ESV via `ESV_API_KEY` (live only), NLT via
  API.Bible. Bolls.Life is NOT used in the new app except for the KJV Strong's word map
  (keep it first; the WEB tagged text is the fallback).

**Ground rules, no exceptions:**
- `main` of the new repo is production once the site is connected. Verify the live
  bundle hash matches your build after every push. Build and tests green before any
  push. Push every commit.
- Before pushing anything that changes behaviour, run an adversarial review of your
  own diff (independent reviewers per lens, then refuters per finding) and fix what
  it confirms. In the Daily Word work this caught a data-loss bug, a security fail-open,
  a licence gap and a sync-semantics bug.
- Use a swarm of agents sized to the task: cheap models to find and port, stronger
  models to judge (security, data loss, licence). No agent edits `i18n.ts` — collect
  keys and add them once.
- Secrets never in the repo; Netlify env only. Never print them.
- Every user-visible string in en/es/pt/id.
- Do not delete or modify anything in the Daily Word repo except the additive CORS
  origin (and a note in its `docs/`), and only if you chose the shared-auth route.

**Order of work:** (1) scaffold the repo/site/project and CI-free deploy; (2) schema +
loaders → load all sources → verify counts against Part A's table; (3) `study.js` +
client; (4) identity (shared auth) + password change + Sources screen; (5) the five
Preach surfaces; (6) Sunday publish end-to-end against Daily Word (use a test
submission on a non-current sermon id — never overwrite this week's message without
Ashley's word); (7) review gate → push → live verify; (8) write
`docs/HANDOFF.md` in the new repo with what you built, what you verified in the browser,
and what you deliberately left out.

Report at the end: what changed, what you verified, what you left out, and the model
and call count for every agent you ran.

---

## PART C — What was built (2 Sep 2026, same day)

The app exists: repo `AEGLOBALUSA/pastors-sermon-prep` (private), site
https://pastors-sermon-prep.netlify.app (Netlify id `13a429f2-6403-4f01-9d2f-542a468febb4`,
manual deploys), Supabase project `kbhyvrlbntnhdfzxgufj` (same org as this one) holding the
11 `study_*` tables — all 18 source counts verified equal to Part A's table. Full account in
that repo's `docs/HANDOFF.md`.

**Shared-auth route (option 1) was taken.** The only change in this repo is the additive
origin in `netlify/functions/lib/cors.js` (PR #88, `e25933e2`). The new app calls this
backend cross-origin for `intake` (sign-in, password change, Sunday publish),
`pastor-admin` (`my-campus-code`), `published-sermon`, `user-sync` / `user-profile` (the
pastor's own misc-bag record — so an outline written there is the same record this app
syncs), `track-activity`, `geo`, and `claude` (the commentary summariser; this repo's
`ANTHROPIC_API_KEY` is a write-only secret, so it was not copied). `PASTOR_SECRET` and
`ADMIN_PIN` stay here. `intake.js`, `pastor-admin.js`, `published-sermon.js` were NOT ported.

Two things this repo should know:
- The new app's `cloudSync.ts` misc-key whitelist must stay equal to this one's — a push
  from either side rebuilds the bag from the keys the client sends (`user-sync.js`). PR #89
  landed `dw_path_asked` mid-port; the new app was re-synced to `02bdefe9`.
- Only the production origin is allow-listed; deploy previews of the new app cannot sign
  in or sync (`isDailyWordPreviewOrigin` matches this site's previews only).
