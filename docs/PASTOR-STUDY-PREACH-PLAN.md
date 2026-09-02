# Pastor experience: Study & Preach — findings, design, and next-session prompt

Written 1 Sep 2026, after the pastor sign-in shipped (commit `f7b302ad`).
Everything below is **verified against this repo or a primary licence page**, not assumed.
Read this file first; it replaces the need to re-run the research.

---

## PART 1 — What shipped (done, live)

**Pastor sign-in.** Settings → Pastor account. Staff enter their `@futures.church`
email and **a password they choose themselves on first use** (`auth_status` →
`setup:true` → "first time here", ≥10 chars, confirmed). Same credentials as `/staff`.
Signing in stamps `pastor_leader`, fills name + email from the staff roster, and keeps
the session so re-opens skip the login. Sign-out returns to `congregation`.

Files: `src/components/PastorSignIn.tsx`, `src/utils/staffIdentity.ts`,
`src/utils/useStaffIdentity.ts`, boot restore in `src/App.tsx`, mount in
`src/screens/MoreScreen.tsx`, 24 `pastor_*` keys in `src/utils/i18n.ts`,
tests in `src/utils/staffIdentity.test.ts` + `src/components/PastorSignIn.test.tsx`.
Backend `netlify/functions/intake.js` was **not** touched.

**Deviations from `docs/PASTOR-LOGIN-HANDOFF.md`, all review-driven:**
1. Boot restore re-stamps the persona only when `dw_setup` is absent or auto-sourced
   (`default` / `sunday-guest`). The handoff said "re-stamp every open"; that fights an
   explicit later choice and ping-pongs with a sign-out on another device (the misc bag
   is newest-wins for `dw_setup`).
2. Restore requires `dw_staff_app_signin`, set only by this card. `/staff` writes the
   same `dw_staff_token`, so without the marker a colleague's portal login on a shared
   device would silently re-identify the app.
3. An email switch calls `clearSessionToken()` + `resetSyncSession()` (new export in
   `cloudSync.ts`) + unauthenticated `register` **before** `saveProfile`. Without the
   reset, the persona stamp's queued push runs ungated under the pastor's token carrying
   the previous user's data, and `user-sync` push is a wholesale upsert.
4. Profile comparison is field-by-field (key order differed from the server merge, so
   every boot rewrote the profile and POSTed an update).

**Known gap, not yet built:** no self-service *change password*. `intake.js` has no
`change_password` action. Today's reset = Ashley clears it in `/staff → People`, the
pastor sets a new one next sign-in. Adding it means a small, additive change to
`intake.js` (verify old password with `verifyPassword`, apply `passwordIssue`, write
`hashPassword`, revoke other `staff_sessions` rows for that email).

---

## PART 2 — What a pastor actually gets today (audited, file-level)

**There is no pastor screen.** `src/screens/HomeScreen.tsx` (4,544 lines) is the generic
home with `pastor_leader` gates switched on.

**`sectionOrder` in `src/utils/persona-config.ts` is not an ordered renderer.** HomeScreen
only calls `sectionOrder.includes(key)` inside a fixed JSX order, so the config's ordering
is fiction. Three of the twelve pastor keys render nothing:
- `devotion` — gated behind `pf.faithPathway`, which is `false` for pastors.
- `congregation_stats` — referenced nowhere in the codebase.
- `devotion_scripture` — the known dead block (already noted in `CLAUDE.md`).

**The five real pastor-only surfaces:**
| Surface | Where | Reality |
|---|---|---|
| "Between You & God" prompt | persona-config `journal.prompts` (15) | Rotates; repeats twice a month |
| 5-step plan wizard | `src/components/PastorStudyOnboarding.tsx` | Last step captures "What are you preaching through?" → `src/utils/sermonPrep.ts` |
| Expanded commentary card | HomeScreen | 8 curated sources but **only the same 20 chapters**; otherwise a Haiku "AI Insight" |
| Campus Overview | HomeScreen + `PollDashboard` | Real numbers, but needs a hand-typed 8-hex campus code that **sign-in never provisions** |
| Sermon prep bag | `SermonWorkspace.tsx` (421 lines) | highlight → "To sermon" → MY PREPARATION card |

**Day 1 for a new pastor is close to empty.** `heroChapterRefs` has fallbacks only for
`comfort` and `new_to_faith`, so a pastor with no plan and no reading slots gets an
**empty hero**. They see: greeting, Sermon Notes card, empty hero, reflection prompt,
setup wizard, AI prompt, two book cards (one — Grace & Truth — has no content and just
opens Plans), word-of-the-day, campus picker, campus-code prompt.

**Declared but never read:** `features.adminTools`, `sermonNotes`, `wordStudies`,
`campusCount: 'detailed'`. **Expired:** `FeedbackPoll` window closed 21 Mar 2026.
**No pastor rule:** `UpgradePromptCard`.

**The resource inventory is thin:** 20 curated commentary chapters, 30 word studies, one
essay, Strong's via bolls.life, three of Ashley's books as JSON. **No** illustrations,
**no** outline builder, **no** cross-references except what the AI volunteers. Bible AI
has **no pastor quick-prompts**, even though its system prompt already promises teaching
angles and sermon illustrations.

**Two bugs worth fixing with the next change:**
- `staff.campusId` is returned by `me`/`login` but never written to `dw_profile.campus`,
  and `dw_pastor_code` is never set — so a signed-in campus pastor is still asked to type
  a code, and the campus chip may read "Select campus".
- `src/components/HomeContextChips.tsx` lets a signed-in pastor switch themselves off the
  pastor persona with no lock while a staff token exists.

---

## PART 3 — Resource catalogue (licences read at the primary source)

**Bulk-load into our own storage — no usage limits, safe to feed to Claude:**

| What | Licence | Source |
|---|---|---|
| Berean Standard Bible (BSB) | Public domain (30 Apr 2023 dedication) | berean.bible/licensing.htm |
| World English Bible | PD (name is a trademark — rename if altered) | ebible.org/web/copyright.htm |
| Reina-Valera 1909 (ES) | PD | ebible.org spaRV1909 |
| Bíblia Livre (PT) | CC BY 4.0, credit "BLIVRE" | ebible.org porbr2018 |
| Terjemahan Sederhana Indonesia (ID) | CC BY-SA 4.0 | ebible.org ind |
| Matthew Henry, JFB, Gill, Adam Clarke, Calvin, Keil & Delitzsch | CC Public Domain Mark | bible.helloao.org/api/available_commentaries.json |
| Tyndale Open Study Notes + Bible Dictionary | CC BY-SA 4.0 | tyndaleopenresources.com |
| STEPBible TAGNT / TAHOT / TBESG / TBESH / TIPNR | CC BY 4.0, credit "STEP Bible" | github.com/STEPBible/STEPBible-Data |
| OpenScriptures morphhb + HebrewLexicon (BDB) | CC BY 4.0 | github.com/openscriptures |
| SBLGNT | CC BY 4.0 | sblgnt.com/license |
| Abbott-Smith lexicon | PD (TEI XML) | github.com/translatable-exegetical-tools/Abbott-Smith |
| Strong's Greek XML | CC0 | github.com/morphgnt/strongs-dictionary-xml |
| OpenBible cross-references (~340k weighted links) | CC BY 4.0 | openbible.info/labs/cross-references |
| OpenBible geocoding (every place + coordinates) | CC BY 4.0 | github.com/openbibleinfo/Bible-Geocoding-Data |
| Theographic metadata (people/places/events/timeline) | CC BY-SA 4.0 | github.com/robertrouse/theographic-bible-metadata |
| Nave, Torrey, Easton, Smith, ISBE 1915, Hitchcock, TSK | PD | crosswire.org SWORD ModInfo pages |
| Cyclopedia of Illustrations for Public Speakers (1911) | PD, clean text (strip PG header) | Project Gutenberg #74575 |
| Revised Common Lectionary | Free for a church's own worship/education incl. digital; print the CCT notice | commontexts.org/rcl/permissions |

**Call live, never over-cache:**
- **ESV API** — 5,000/day, 1,000/hr, 60/min; **may not store more than 500 verses**;
  non-commercial. Already wired.
- **API.Bible** for NIV/NLT/NASB/RVR1960 — cached content must refresh ≤30 days,
  **FUMS v3 reporting is mandatory**, and **training LLMs on any of it is prohibited**
  (including its CC content) without written consent.
- **BibleBrain (Faith Comes By Hearing)** — free, non-commercial ministry; the realistic
  route to **Spanish, Portuguese and Indonesian audio**. Key: 4.dbt.io/api_key/request.
- **BibleProject** — embed only, with a visible credit and link.

**Avoid:** Bolls.Life for anything copyrighted (it redistributes ESV/NIV/NLT/RVR1960 with
no stated rights — we currently use it for Strong's); scraping Bible Hub or StudyLight;
modernised Spurgeon editions (Spurgeon Gems / Chapel Library); bulk CCEL editions without
asking; THGNT; `sil-ai/pericopes`; `khornberg` ESV-branded plans.

**AI rule of thumb:** run every AI feature on **public-domain / CC text (BSB, WEB, KJV)**.
Hold **NIV out of Claude prompts entirely** (Biblica requires a licence for any AI use).
ESV has no AI clause but forbids derivative works and >500 stored verses. LSB expressly
permits AI quoting up to 1,000 verses.

**Not verified (check in a browser before relying on them):** YouVersion Platform terms
(JS-rendered), Biblica permissions page (403), NET bulk download (403), Cambridge KJV
Crown copyright (403), SBB's Portuguese ARA/ARC status, helloao's ES/PT/ID coverage.

---

## PART 4 — The design

**Principle: one new pastor surface, not a sixth tab.** The tab bar is five tabs plus the
hidden `sermon-notes` tab. Extend that hidden tab into **"Preach"** — the pastor's
workspace — and keep Home as a *reader's* home for everyone.

### 4.1 Fix the floor first (small, high-value, ~1 day)
1. **Pastor hero fallback** — give `pastor_leader` a default reading in `heroChapterRefs`
   so day 1 is never empty.
2. **Provision campus at sign-in** — write `staff.campusId` into `dw_profile.campus` and
   set `dw_pastor_code`, so the Campus Overview stops asking for an 8-hex code.
3. **Lock the persona chip while signed in** (`HomeContextChips`) — offer "Sign out of
   pastor account" instead of a silent persona switch.
4. **Delete the fiction** — remove `devotion` / `congregation_stats` from the pastor
   `sectionOrder`, or wire them. Retire the expired `FeedbackPoll` gate.
5. **Pastor quick-prompts in Bible AI** — "Give me three teaching angles on this passage",
   "Find an illustration for this idea", "What's the Greek behind this word?", "Turn my
   highlights into an outline". The system prompt already promises these.

### 4.2 The resource layer (the "vast" part)
One Netlify function, `netlify/functions/study.js`, over a Supabase schema loaded from the
bulk-load table above. One passage → everything we hold about it:

    GET /api/study?ref=romans+8&depth=full
    → { crossRefs[], commentary[6 sources], words[Greek/Hebrew + lexicon],
        places[], people[], illustrations[], topics[], timeline[] }

Tables: `study_crossrefs`, `study_commentary`, `study_words`, `study_lexicon`,
`study_places`, `study_people`, `study_illustrations`, `study_topics`, `study_sources`.
Everything keyed by a normalised `book/chapter/verse` so one lookup serves the hero, the
Bible AI context builder, and the prep sheet. Rows carry a `source_id` → `study_sources`
(name, licence, attribution string, URL) so a single **Sources** screen in Settings prints
every required credit. CC BY-SA content stays flagged so anything derived from it is
marked share-alike.

Load it with a repeatable script (`scripts/load-study-data.mjs`), not by hand — the
licences change and the data needs re-pulling.

### 4.3 The Preach workspace (the "easy" part)
The pastor's week, in one place, in this order:

1. **This week** — what they told the wizard they're preaching through, or the current
   `published_sermons` row. One tap to open.
2. **Prep sheet** — pick a passage → the study function fills a working page: the text in
   two translations, weighted cross-references, six classic commentaries (collapsed, with
   a Claude summary on top), three or four key words with Greek/Hebrew, a map/timeline
   chip where the passage has places or events, and illustrations matched by topic.
3. **Outline builder** — big idea, three points, weekly action. Pre-seeded from their
   highlights (the existing "To sermon" bag) and editable. Ashley's frameworks (H.E.A.T.,
   P.A.I.D., 4D, Five Fences, Five Batons) as optional scaffolds.
4. **Publish** — the outline is already the shape `intake.js` expects, so "Send to Sunday"
   submits it through the existing staff intake and it appears in the congregation's
   Sermon Notes. This closes the loop the app already half-builds.
5. **Archive & search** — past `published_sermons` rows, searchable by text and passage.
   Nothing like this exists today.

### 4.4 Order of work
- **Phase 1** (~1 day): §4.1 floor fixes + pastor quick-prompts. Ships value immediately.
- **Phase 2** (~2–3 days): study schema + loader + `study.js` + Sources screen. Start with
  cross-references, the six commentaries, and Strong's/STEPBible (this also lets us drop
  Bolls.Life for lexicon data).
- **Phase 3** (~3–4 days): Preach workspace — prep sheet, then outline builder, then
  publish, then archive.
- **Phase 4**: illustrations, places/timeline, lectionary, `change_password`.

---

## PART 5 — Prompt for a fresh session

Paste everything between the lines into a new Claude Code session started in
`~/futures-daily-word`.

---

You are continuing work on **Futures Daily Word** — a devotional and Bible-study PWA,
live at https://futuresdailyword.com, used by a real congregation. React 19, Vite 6,
Tailwind 4, TypeScript. localStorage-first (~45 `dw_*` keys) with Supabase cloud backup
through Netlify functions. Repo: https://github.com/AEGLOBALUSA/futures-daily-word.

**Read `docs/PASTOR-STUDY-PREACH-PLAN.md` in full before doing anything.** It is the
file-level audit of the pastor experience, a resource catalogue with every licence read at
its primary source, and the design for this work. It replaces re-running that research —
do not spawn agents to rediscover it. Then read `CLAUDE.md` for repo conventions.

**Ground rules, no exceptions:**
- `main` is production. Pushing to `main` deploys automatically. Verify the live bundle
  hash matches your local `dist/assets/index-*.js` after every push.
- `npm run build` must succeed and `npx vitest run` must pass before any push. The suite
  was 186 green at commit `f7b302ad`. Never push red.
- Push every commit.
- Do not modify `netlify/functions/intake.js`, `user-sync.js`, or the `/staff` portal
  unless the task explicitly calls for it.
- Every change must be persona-gated so nothing changes for non-pastors. Most of the
  congregation is not staff.

**Already shipped (do not rebuild):** pastor sign-in at Settings → Pastor account.
Staff sign in with their `@futures.church` email and a password they choose themselves on
first use; the app stamps the `pastor_leader` persona and fills their name and email from
the staff roster. See Part 1 of the plan for the four review-driven deviations from the
original handoff — respect them, they each fix a real bug.

**Your work — Phase 1 from Part 4.1 of the plan.** Small, high-value, roughly a day:
1. Give `pastor_leader` a fallback reading in `heroChapterRefs` so a new pastor's home is
   never empty on day one. Only the comfort and new-believer paths have one today.
2. Write `staff.campusId` into `dw_profile.campus` and set `dw_pastor_code` at sign-in, so
   a campus pastor stops being asked to hand-type an eight-character code the sign-in
   already knows.
3. Lock the persona chip in `src/components/HomeContextChips.tsx` while a pastor is signed
   in. Offer "Sign out of pastor account" instead of a silent persona switch.
4. Remove the dead `devotion` and `congregation_stats` keys from the pastor `sectionOrder`
   (they render nothing), and retire the `FeedbackPoll` gate whose window closed in March.
5. Add pastor quick-prompts to Bible AI: three teaching angles on this passage, find an
   illustration for this idea, what's the Greek behind this word, turn my highlights into
   an outline. The AI system prompt already promises these; nothing surfaces them.

Then stop and report before starting Phase 2 (the study data layer) — Ashley wants to see
Phase 1 land first.

**Repo traps that will bite you:**
- `sectionOrder` in `src/utils/persona-config.ts` is **not** an ordered renderer.
  `HomeScreen.tsx` (4,544 lines) only calls `sectionOrder.includes(key)` inside a fixed
  JSX order. Adding a key to the array does not place it anywhere.
- Any `dw_setup` write from a real user action uses `source: 'settings'`. Never `default`
  or `sunday-guest` — those are auto-detection sources and must not stamp a persona.
- New UI strings go in `src/utils/i18n.ts` in **all four languages** (en/es/pt/id), as
  single-line entries with `\uXXXX` escapes for non-ASCII.
  `src/__tests__/i18n-keys.test.ts` enforces both rules and will fail the build otherwise.
- The real stylesheet is `src/index.css`. The root `styles.css` is dead.

**If you reach the resource work (Phase 2), the licence rules are hard limits:**
bulk-load only public-domain and Creative Commons sources; never send NIV text to Claude
(Biblica requires a licence for any AI use); ESV allows at most 500 stored verses and
forbids derivative works; API.Bible forbids training on any of its content and requires
FUMS reporting. Every bulk-loaded source needs its attribution on a Sources screen. The
verified list is in Part 3 of the plan.

**Verify in the browser before pushing.** Start the preview with `preview_start` using the
`dw-pastor-preview` entry on port 4175. That entry lives in `~/.claude/launch.json`, not
this repo's `.claude/launch.json`, because the session's working directory decides which
file is read — a session started in the home directory silently served a different clone
of this app once. Confirm the served bundle hash matches your build. Seed localStorage
with `dw_setup={persona:'pastor_leader',source:'settings'}`, a `dw_profile` with an email
and first name, `dw_cookie_consent='accepted'` and `dw_v7_pathway_done='true'`, then check
the pastor home is not empty on a fresh install. If the Browser pane is hidden, pointer
clicks time out after 30 seconds — drive the page with `javascript_tool` instead
(click DOM buttons, set inputs with the native value setter plus an `input` event, read
`document.body.innerText` back).

**Before you push anything that changes behaviour, run an adversarial review of your own
diff** and fix what it confirms. That gate caught a data-loss bug in the sign-in work.

Report what you changed, what you verified, and what you deliberately left out.

---

## PART 6 — Open items

- **Self-service password change.** No `change_password` action exists in `intake.js`.
  Reset today = Ashley clears the password in `/staff → People`, the pastor sets a new one
  on next sign-in. Adding it is additive: verify the old password with `verifyPassword`,
  validate with `passwordIssue`, write `hashPassword`, revoke that email's other
  `staff_sessions` rows.
- **Bolls.Life dependency.** We currently pull Strong's from it. It redistributes
  copyrighted translations with no stated rights. Phase 2's STEPBible load lets us drop it.
- **Grace & Truth book card** renders with no content and just opens the Plans tab.
