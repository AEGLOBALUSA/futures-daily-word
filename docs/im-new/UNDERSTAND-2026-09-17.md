# UNDERSTAND — I'm New / new_to_faith, 17 Sep 2026

Companion to `docs/im-new/BRIEF-2026-09-17.md`. The brief's §1 is a read of the live site from
outside the repo; this document settles each of its claims against code on this worktree
(`build/im-new-close`, from main 01d70a93). Every statement below carries a `file:line`. Where a
claim needed a live fetch or a platform behaviour to settle, it is marked NOT CHECKABLE IN REPO
and repeated in §7.

Read §1 for what is true, §4 before writing code, §5 and §6 before deciding anything.

---

## 1. Claim table

| # | Brief claim ("as live") | Verdict | Evidence |
|---|---|---|---|
| 1 | Internal id `new_to_faith` | CONFIRMED | `src/utils/persona-config.ts:271` |
| 2 | UI label "I'm New to This" | CONFIRMED | `src/utils/i18n.ts:70` (`persona_new`), rendered `src/components/EmailGate.tsx:257`, `src/components/PathwayPicker.tsx:67`; a third hardcoded copy at `src/utils/persona-config.ts:273` |
| 3 | Path-sheet label "I'm new to faith, or coming back" | CONFIRMED | `src/utils/i18n.ts:929` (`path_new_head`), rendered `src/components/ChoosePathSheet.tsx:224` and `src/screens/MoreScreen.tsx:362` |
| 4 | Tagline "Starting or reigniting my faith journey" | CONFIRMED | `src/utils/i18n.ts:71` (`persona_new_desc`), reached by a dynamic `+ '_desc'` concat at `src/components/PathwayPicker.tsx:72` and `src/components/EmailGate.tsx:260`; duplicated verbatim at `src/utils/persona-config.ts:275` |
| 5 | Journey "Day 1 of 40 · New & Returning to Faith" | CONFIRMED | `books/faith-pathway.json:2-7` (`id: new-believers`, title, subtitle "40 Days to a Strong Foundation"); 40 day objects verified by parse; hero renders Day N of totalDays at `src/screens/HomeScreen.tsx:2139` |
| 6 | Journey UI is sage; global chrome (tab bar active, primary buttons) can still be terracotta | PARTIAL | Journey UI sage: CONFIRMED (`src/index.css:1438` `.dw-day1-cta` background `var(--dw-new)`; `src/components/NewBelieverLessonCard.tsx:286` continue button `var(--dw-new)`; `src/index.css:1668` sage Plans card). Primary buttons terracotta: CONFIRMED and persona-blind (`src/index.css:413` `.dw-btn-primary { background: var(--dw-accent) }`; 17 raw `var(--dw-accent)` sites in `src/screens/MoreScreen.tsx`; 7 more in `src/screens/LibraryScreen.tsx`). Tab bar active terracotta: **only in light theme.** `src/index.css:483` is `.tab-bar-item.active { color: #fff }` for the default (dark) theme and never reads the accent token; terracotta comes from `src/index.css:486` and again with `!important` at `src/index.css:694-696`. In dark theme the active tab is white, not terracotta — wrong, but not the colour the brief names. |
| 7 | Pathway JSON is at `https://futuresdailyword.com/books/faith-pathway.json` | CONFIRMED in repo | The repo file `books/faith-pathway.json` is copied to `dist/books` by the static-dirs plugin at `vite.config.ts:16` and fetched at `src/screens/HomeScreen.tsx:501,532`. Byte-identity with the live URL is NOT CHECKABLE IN REPO. |
| 8 | Each day: reading + lesson + 2 reflection questions | CONFIRMED | Parsed all 40 day objects: every one has a non-empty `reading{book,chapter,verses,ref}` and `lesson`, and `questions`/`questionsEs`/`questionsPt`/`questionsId` each of length exactly 2. |
| 9 | UI promise string "Each day: one scripture, one short teaching, one step. About five minutes." | CONFIRMED | `src/utils/i18n.ts:402` (`pathway_how_it_works`), rendered `src/screens/HomeScreen.tsx:2086`, gated to `completedDays.length < 3` at `src/screens/HomeScreen.tsx:2080` |
| 10 | Hidden/limited: commentary, Greek/Hebrew, Word of the Day, campus counts, search, word studies | CONFIRMED | `src/utils/persona-config.ts:287-304` (`commentary:'hidden'`, `greekHebrew:'hidden'`, `wordOfDay:'hidden'`, `campusCount:'hidden'`, `searchEnabled:false`, `wordStudies:false`) |
| 11 | Sermon notes hidden for this persona | REFUTED | `src/utils/persona-config.ts:299` sets `sermonNotes:false`, but that flag gates a different surface. `src/screens/HomeScreen.tsx:2076` reads `{isNewPath && isSundayWindow() && sermonNotesRow}` — the Sermon Notes row is shown to **this persona and only this persona**, every Sunday, above the reading (deliberate, per the 2 Sep QR-guest ruling). It routes through the congregation chooser to `SermonNotesScreen`/`SermonNotesSurface.tsx:209`. |
| 12 | `showFullCatalog: false` | CONFIRMED but inert | `src/utils/persona-config.ts:307`. The field is written on all five personas and read nowhere in `src`. The live gate is `isNewChristianPersona(persona)` at `src/screens/PlansScreen.tsx:362` and `src/components/SetupPromptModal.tsx:71`. |
| 13 | Recommended plans for this persona = `[]` | CONFIRMED | `src/utils/persona-config.ts:15`, with the reason in the comment at `:10-13`; mirrored at `src/components/SetupPromptModal.tsx:26` |
| 14 | Daily flow today is read → listen → reflect → notes | REFUTED | There is no listen step. `src/screens/HomeScreen.tsx:2120-2124` states this persona's hero carries no audio/translation/chevron chrome, and `src/components/NewBelieverLessonCard.tsx` contains no audio player or Listen control. The flow is read → reflect (2 questions) → Mark Complete → Notes (Journal tab). |
| 15 | No distinct end-of-day close; "evening" is only a time-of-day greeting | CONFIRMED, and weaker than stated | No close surface exists. The greeting for this persona does not vary by time of day at all: `src/utils/persona-config.ts:234` returns the single fixed line "Welcome, {first}. We're glad you're here." for every hour and every day, unlike the other four personas which interpolate `getTimeOfDay()`. |
| 16 | Path sheet footer "Not a test. Not a form. Just where you're starting from." | CONFIRMED | `src/utils/i18n.ts:928` (`path_sheet_footer`), rendered `src/components/ChoosePathSheet.tsx:254-256` |
| 17 | After Day 1 once: "Day 1, done…" keep going vs something else | CONFIRMED | `src/components/PathAskedOnce.tsx:30-52`; strings `src/utils/i18n.ts:953-954`; wired `src/App.tsx:535-540` |
| 18 | Some "Not sure?" CTAs still route to Church Member | REFUTED | `not_sure_start_member` ("Not sure? Start with Church Member →") exists at `src/utils/i18n.ts:474` and has **zero call sites** in `src`. The only live "Not sure?" is `not_sure_begin_day1` (`src/utils/i18n.ts:801`) at `src/components/PathwayPicker.tsx:79`, wired to `onNavigate('home')` at `src/screens/PlansScreen.tsx:465`. `PathAskedOnce`'s "something else" opens the neutral five-path sheet (`src/App.tsx:538`), not congregation. The bug as described is not reproducible. A narrower, real version of it exists — see Trap T7. |
| 19 | Leftover "30-Day Faith Pathway" i18n | PARTIAL | The string is real at `src/utils/i18n.ts:241` (`p_faith_pathway`, all four languages), but it is dead: zero call sites in `src`, and `src/screens/PlansScreen.tsx:1128-1130` carries a comment recording that the card which used it was removed. Not user-visible today. |
| 20 | Day 40 lesson still says "thirty-day journey" | CONFIRMED | `books/faith-pathway.json:1469` — "You've made it through thirty days", "thirty days ago", "this thirty-day journey". Identical in `lessonEs:1472` ("treinta días"), `lessonPt:1475` ("trinta dias"), `lessonId:1478` ("tiga puluh hari"). A full sweep of all 40 days in all four languages found the word nowhere else; the file's own title/subtitle/description at `:2-14` already say 40. |
| 21 | Two similarly named products: taught 40-day vs catalog 30-day "Foundations of Faith" (id `faith-pathway`) | CONFIRMED | `src/data/plans.ts:285-286` (`id:'faith-pathway'`, `title:'Foundations of Faith'`, `totalDays:30` at `:294`, whole-chapter passages at `:296-302`) vs `books/faith-pathway.json:2-7` (`id:'new-believers'`, 40 taught days). The split is deliberate and documented at `src/utils/persona-config.ts:10-13` and `src/utils/coldStart.ts:105-106`. |
| 22 | Mid-path jargon spikes ~D15-16, D20, D24, D33 without a plain lead line | PARTIAL, and the day list is wrong | D15 (`books/faith-pathway.json:535`) opens with reassurance, not a definition — supports the claim. D16 REFUTES it: its first sentence already defines tongues plainly. D24 REFUTES it: "That's 8-12 people who know you, love you, challenge you, and sharpen you" is the third sentence — the best-explained day in the file. D33 partially supports it: "armour" is glossed immediately, but "the Enemy" is never identified as Satan anywhere in that day (grep: "Satan"/"devil" absent from D33's lesson). D20 uses "principalities" and "throne room of hell" unglossed but is a redemptive-history story, not framed as warfare teaching. **The real first offences the brief misses:** "the enemy" first appears unexplained at Day 2 (`:63`); "repent" first appears unexplained at Day 6 (`:248`) and is not redefined until Day 9 (`:359`); "tithed" appears once, unexplained, at Day 26 (`:987`); the literal word "warfare" appears in a lesson body only at Day 37 (`:1357`), outside the brief's day list. Communion, sanctification, anointing and intercession appear nowhere in the 40 days. |
| 23 | Weak handoff after Day 40 to a person / Connect Group / campus | CONFIRMED | On the completion day, `src/components/NewBelieverLessonCard.tsx:329` renders only `pathway_day_complete_final` ("✓ Day {x} complete"); the "show me now" button is gated on `completedToday < totalDays` at `:331` so nothing follows it. The next calendar day, `completedToday` goes null (`:81-83`) and the whole block (`:316-345`) disappears; `currentDay` is capped at 40 by `Math.min(totalDays, currentDay+1)` (`:271`), so the reader is served the finished Day 40 lesson indefinitely with Mark Complete already disabled. |
| 24 | No Connect Group link anywhere | CONFIRMED as a link; REFUTED as a reference | No URL, phone, campus binding or hyperlink exists (grep across `src`, `netlify/functions`, `public`). But Day 24 of the pathway is titled "Connect Groups: Where Life Happens" and tells the reader to find one (`books/faith-pathway.json:869`) with no mechanism to act on it. The app promises the thing and supplies no route. |
| 25 | "Who Am I? Found in Christ" plan not featured for this persona | CONFIRMED | `src/data/plans.ts:355-356` defines it; it appears in `PERSONA_PLAN_IDS.deeper_study` (`src/utils/persona-config.ts:17`) and in `SetupPromptModal.tsx:21/28/33`, never in a new_to_faith list. It is also in `PLAN_PRIORITY_BY_SIGNAL.new` at `src/utils/personalization.ts:46` — see Trap T9. |
| 26 | House ads are off this journey | PARTIAL | Off on Home (`src/screens/HomeScreen.tsx:4435` gates `<PromoAds />` behind `!isNewPath`) and absent from `NewBelieverLessonCard.tsx`. **On** in the More tab: `src/screens/MoreScreen.tsx:1140` renders `<PromoAds />` unconditionally. |
| 27 | The only human route on this path is a More-tab mailto | REFUTED | `mailto:care@futures.church` is gated on `setup?.persona === 'comfort'` at `src/screens/MoreScreen.tsx:785`, so this persona never sees it. This persona does reach the Campus tab, which is in the tab bar for every persona (`src/components/TabBar.tsx:22-28`, `src/App.tsx:421`) and serves real campus-pastor posts (`src/screens/MessagesScreen.tsx:96` → `netlify/functions/campus-content.js`). |

---

## 2. How the I'm New lane works today, by subsystem

### 2.1 Persona resolution and cold start

Every cold device is silently enrolled into `new_to_faith` at module load: `src/App.tsx:68` calls
`startGraceSeriesIfCold('default')` (`src/utils/coldStart.ts:84-100`). The default persona is
new_to_faith, not congregation. `isColdStart()` (`src/utils/coldStart.ts:54-75`) treats a device as
cold unless it carries a persona from `REAL_CHOICE_SOURCES` (`onboarding`/`settings`/`upgrade`,
`:21`) or mid-series progress. Enrollment writes `dw_pathway_progress` fill-only
(`src/utils/coldStart.ts:108-127`) with `GRACE_SERIES_TITLE` from `:17`, and explicitly does not
start the catalog plan `faith-pathway` (`:105-106`).

Four doors can change the path, all through one sheet, `src/components/ChoosePathSheet.tsx`:
Day 1 landing link (`src/components/Day1Landing.tsx:110-120,158-166`, door `landing`), the Home
header `PathSwatch` (`ChoosePathSheet.tsx:85-119`, door `home`), `PathAskedOnce`
(`src/App.tsx:538`, door `asked`), and Settings (`src/screens/MoreScreen.tsx` "Change path", door
`settings`). One tap both saves and opens (`ChoosePathSheet.tsx:161-175`). Two *other*
persona pickers exist and are not part of that family: `src/components/PathwayPicker.tsx`
(Plans tab only, "not a first-run gate" per its own header at `:3`) and
`src/components/EmailGate.tsx:225-266` (profile capture, no fallback CTA).
`src/components/NewToFaithButton.tsx` and `src/components/SetupPromptModal.tsx` are both dead:
the former has zero imports anywhere in `src`; the latter is imported at
`src/screens/HomeScreen.tsx:26` and rendered at `:1825-1829`, but its trigger `showSetupModal`
(`:326`) is only ever set false (`:782,1191,1198`) and never true.

### 2.2 Home surface

`src/screens/HomeScreen.tsx:2125` gates this persona's entire hero on
`isNewPath && pf.faithPathway && pathwayProgress.enrolled && pathwayData`. It renders one sage
journey card (`key="hero-journey"`, `:2139`) with photo, "Day N of 40", a progress bar and a single
Read button, and deliberately no audio, translation or chevron chrome (rationale comment
`:2120-2124`). `sectionOrder` for this persona is `['greeting','hero_audio','scripture',
'faith_pathway']` (`src/utils/persona-config.ts:281-286`); the `'hero_audio'` entry at `:283` is
vestigial — the `isNewPath` branch returns its own hero unconditionally and never consults
`sectionOrder` for audio.

Because `sectionOrder` omits `'devotion'`, the compact "Journey Complete… Tap to explore other
plans" card at `src/screens/HomeScreen.tsx:3006-3039` never mounts for this persona, despite
looking like the answer to the Day-40 gap.

`pathwayDisplayDay` (`src/screens/HomeScreen.tsx:350-356`) shows `lastCompletedDay` while
`lastCompletedDate === today`, otherwise `currentDay`.

### 2.3 Day N surface

Tapping Read sets `showJourneyDay`, which opens `NewBelieverLessonCard` full-screen
(`src/screens/HomeScreen.tsx:4393-4413`). The card is always mounted and gated by an `open` prop
(`src/components/NewBelieverLessonCard.tsx:100`); it was deliberately not unmounted on close
because that leaked a history entry (comment `:37-40`), and it carries `useSubView` exactly once
(`:79`) with no focus trap (comment `:73-78`) because the 28-agent review of PR #81 ruled that a
full-screen host opening overlays must use `useSubView` alone.

Render order: day header and progress (`:167-190`) → verses via `ScripturePassage`, hidden entirely
while peeking tomorrow (`:195-255`, `isPeek` at `:88`) → the pastoral teaching (`:259-261`) → the two
reflection questions (`:264`) → the actions row with Mark Complete and Share (`:266-314`) → the
inline completion panel (`:316-345`).

The two questions render through `PathwayQuestions` → `PathwayAnswer`
(`src/components/PathwayAnswer.tsx:51-61`). The day's verse range, not the whole chapter, is served
by default (`sliceVerseRange` imported at `:24`, used around `:195-225`).

Mark Complete (`:267-297`) appends the day, advances `currentDay` capped at `totalDays` (`:271`),
stamps `lastCompletedDay`/`lastCompletedDate`, fires `track('journey_day_complete', ...)` (`:273`),
and calls `savePathwayProgress`, wired by Home to `savePathwayProgressFromLesson`
(`src/screens/HomeScreen.tsx:4404`).

### 2.4 Completion path — two entry points, one funnel

There are **two** ways a pathway day completes:

1. The lesson card's Mark Complete → `savePathwayProgressFromLesson` (`src/screens/HomeScreen.tsx:598-613`).
2. The Home hero's "Mark as read" → `handleMarkRead` at `:736` → `completeTodaysPathwayDay` (`:572-593`),
   which only credits the day when the hero passage matches the pathway's own reading (`:583-585`).

Both funnel into `savePathwayProgress` (`src/screens/HomeScreen.tsx:555-565`), which calls
`recordReadDay('pathway')` exactly once whenever `completedDays` grows (`:558`). That is the single
correct hook point for any new day-count-keyed behaviour.

`savePathwayProgressFromLesson` also closes out an active plan day and, at `:608`, conditionally
calls `setPlanFinish` when `planResult?.planFinished && pf.celebrations === 'full'`. That branch is
dormant today only because `PERSONA_PLAN_IDS.new_to_faith` is `[]`, so there is usually no matching
`dw_activeplans` row. It then stamps `dw_reading_done` and fires `dw-reading-completed` directly,
with the comment at `:595-597` stating there is deliberately no second celebration.

`dw-reading-completed` drives a gate stack that is not suppressed for this persona: the push
onboarding ask and the path ask both wait on `hasReadOnce` (`src/App.tsx:273-280,287,311-312` — only
`comfort` is excluded from the push ask), and `PWAInstallBanner` listens too (`src/components/PWAInstall.tsx:74-84`).

### 2.5 Completion moment and Day 40

`src/components/NewBelieverLessonCard.tsx:316-345` renders the only close-of-day UI, and only while
`completedToday !== null` (`:81-83`, i.e. the calendar day of completion). Before Day 40 it shows
`pathway_day_complete` plus a "show me now" peek button; on Day 40 it shows only
`pathway_day_complete_final` ("✓ Day {x} complete") with no button, no link, no chip (`:329,331`).
See claim 23 for what happens the next morning.

The milestone celebration overlay a new believer *can* still see is separate: it lives at
`src/screens/HomeScreen.tsx:4284-4320`, is gated on `pf.celebrations === 'full'` (true for this
persona, `src/utils/persona-config.ts:304`) and is driven by the streak, which
`recordStreakToday()` advances on a bare mount effect at `src/screens/HomeScreen.tsx:798-806`
("Keep the streak alive on open") — so it counts app opens, not readings. Its milestone list
(`src/utils/streak.ts:13` `[7,14,30,60,100,365]`) diverges from
`src/sections/GreetingSection.tsx:6` `MILESTONE_STREAKS`, which is dead code:
`GreetingSection` and `HomeProvider` are exported from `src/sections/index.ts` but HomeScreen
imports only `BibleAIPromptSection` and `ComfortVerseBannerSection` (`src/screens/HomeScreen.tsx:34`).

### 2.6 Prompt machinery that exists, and does not apply

`UpgradePromptCard` + `checkForUpgrade` is the only existing day/count-triggered card system. It
excludes this persona at three independent points: `src/screens/HomeScreen.tsx:2989`,
`src/components/UpgradePromptCard.tsx:21-24,29`, and `src/utils/pathway-upgrades.ts:58-59`. Tests
pin the exclusion (`src/utils/pathway-upgrades.test.ts:31-36`, `src/components/UpgradePromptCard.test.tsx:29,37`).
Its dismissal key `dw_upgrade_dismissed_${persona}` (`src/utils/pathway-upgrades.ts:77-79`) is not
in any cloudSync list, so it never syncs.

`PathArrivalStrip` is a one-time banner backed by sessionStorage with a 10-minute TTL
(`src/utils/choosePath.ts:69-88`) — not a day/count trigger.

`src/screens/HomeScreen.tsx:3817` carries the comment "Featured Plan Invite — removed; Plans tab is
the right place to browse", recording that an invite-style Home card was deliberately pulled.

### 2.7 Content pipeline

`books/faith-pathway.json` is a static repo file, copied to `dist/books` by the plugin at
`vite.config.ts:16` and fetched at runtime by `src/screens/HomeScreen.tsx:501,532`. The fetch builds
a per-language URL (`/books/faith-pathway_es.json` etc.) that does not exist on disk, 404s, and falls
back to the single English file, whose inline `lessonEs`/`lessonPt`/`lessonId` fields are what
actually render (`src/components/NewBelieverLessonCard.tsx:111-114`). There is no `?v=` cache-bust
on the URL.

The service worker handles `/books/*` network-first with cache as offline fallback only
(`public/sw.js:84-101`); the inline comment dates a prior incident (1 Sep 2026) where cache-first
meant a content edit never reached a returning device. That is already fixed.

`src/data/day1-landing.test.ts:34,45` reads this JSON as ground truth, which is the existing
precedent for treating it as in-repo checkable content.

### 2.8 Storage, sync and analytics

Reflection answers live in `dw_pathway_qa_<day>`, a JSON `Record<index,string>`
(`src/components/PathwayAnswer.tsx:15-17`). Every keystroke merges by index, writes localStorage and
calls `syncMisc` (`:28-34`). **`syncMisc` does not decide what is pushed.** `collectMisc`
(`src/utils/cloudSync.ts:121-164`) and `applyMisc` both filter through `isSyncedMiscKey`
(`:66-68`), which matches `MISC_KEYS` (`:37-54`) or `MISC_PREFIXES = ['dw_sermon_','dw_book_today_']`
(`:55`). `dw_pathway_qa_` matches neither. **The two existing reflection answers have never
reached the cloud.**

`dw_pathway_progress` is a whitelisted top-level column (`src/utils/cloudSync.ts:24`) but is merged
wholesale — non-empty cloud wins, replace (`:408-431`) — unlike journal (`:535-598`), highlights
(`:433-448`), streak (`:384-400`) or plans (`:351-360`).

Server-side, `netlify/functions/user-sync.js:328-358` accepts any string key under `data.misc`,
caps each value at 20,000 chars (skipping, not truncating) and the bag at 300 keys. No schema change
is needed to add a misc key — only the client allow-set.

Free-text fill-only treatment applies only to `AUTHORED_MISC` (`src/utils/cloudSync.ts:76-79`:
`dw_user_story`, `dw_sermon_notes`, `dw_prayed_for`, plus the `dw_sermon_` prefix).

Analytics: `track()` drops any name not in `TRACKED_EVENTS` (`src/utils/tracked-events.ts:6-47`);
the server keeps an independent mirror Set (`netlify/functions/lib/activity-rows.js:11-35`) gated by
`NAME_RE = /^[a-z][a-z0-9_]{2,47}$/` (`:9`). `src/utils/tracked-events-parity.test.ts:55-73` fails if
the two drift or if a literal `track('...')` call site is missing from the list.
`journey_day_open` / `journey_day_complete` are already in both (`tracked-events.ts:19`,
`activity-rows.js:19`). `track()` auto-attaches `path` and `journey_day`; `getJourneyDay()`
(`src/utils/event-context.ts:30-41`) returns `currentDay` only when the path is `new_to_faith`.

### 2.9 Routes to a person

The Campus tab is in the tab bar for every persona (`src/components/TabBar.tsx:22-28`). With no
campus set it shows `CampusSelect`; with one set it fetches `/api/campus-content`
(`src/screens/MessagesScreen.tsx:96` → `netlify/functions/campus-content.js`). Writes are refused
with a 403 pointing at the `/staff` form (`campus-content.js:52-60`), whose corner types are
`['announcement','note','prayer_point','essay']` with fields `{type,title,content,author}`
(`netlify/functions/lib/intake-core.js:40,299-302`) — free text only, and
`src/screens/MessagesScreen.tsx:215-241` renders it as plain text with no autolink. The prayer wall
inserts into a `prayers` table (`netlify/functions/prayer-wall.js:108-119`) with no staff
notification anywhere in the function, and `netlify/functions/pastor-admin.js` never references
`prayers` or `campus_content`.

There is no link-config table or JSON anywhere in the repo (grep for `site_config`, `app_config`,
`cta_url`, `connect_url`, `link_url`, `external_url` returns nothing). The app is a plain PWA, no
Capacitor; outbound links open a real new tab.

### 2.10 Theming

Tokens are declared on `:root` (dark, the bare default) and `[data-theme="light"]`:
`--dw-accent` `#D89066`/`#A8552F` (`src/index.css:175,251`), `--dw-new` `#8FAF90`/`#3F5E46`
(`:198,263`) plus `-hover`/`-soft`/`-on-fill` (`:199-201`). `src/main.tsx:32-36` writes
`data-theme` explicitly to `"dark"` or `"light"` when a preference is saved, and to `"light"` from
the OS only when none is; there is no `[data-theme="dark"]` selector anywhere in `src/index.css`, so
an explicit dark write and an absent attribute render identically today.

Persona is not reflected on `<body>` or `<html>` as a stable hook. The only body-level persona class
is `dw-new-home` (`src/screens/HomeScreen.tsx:415-416`), added on HomeScreen mount and removed on
unmount, used solely to hide the AI launcher (`src/index.css:962-963`).

Most CTAs read `var(--dw-accent)` rather than a literal, so a scoped token override reaches
`.dw-btn-primary` (`src/index.css:413-419`), `ScreenHeader`'s back button
(`src/components/ScreenHeader.tsx:37`), all of MoreScreen and LibraryScreen, and both light-mode
tab-bar rules. It does **not** reach `src/index.css:483` (literal `#fff`) or the hardcoded
`#A8552F`/`rgba(168,85,47,…)` values in the Sermon Notes stylesheet.

### 2.11 Tests and gates

`npm run build` is `tsc -b && vite build` (`package.json:8`); tests are `npx vitest run`
(`package.json:11`); 75 test files. There is no `.github/workflows`, and `netlify.toml:5` runs only
`npm run build` — **nothing runs vitest on a PR or a merge.** `tsconfig.app.json:25-26` includes
`src` and excludes `src/__tests__`, so the three files in that directory escape typecheck while the
72 colocated ones do not.

House style is raw `react-dom/client` `createRoot` + `act()` (e.g.
`src/components/ChoosePathSheet.test.tsx:2-3`); `@testing-library` is a devDependency with zero
imports. A large share of tests are source-text regex guards
(`src/screens/home-journey.test.ts:12-20`, `src/utils/tracked-events-parity.test.ts:14-24`).

Relevant pins: `src/components/pathway-questions.test.ts` (questions under the lesson, before Mark
Complete), `src/screens/home-journey.test.ts` (`key="hero-journey"`, live `open` prop, absence of the
focus trap), `src/components/choose-path.test.ts:20-24` (sheet must not use `useModalA11y` or
`aria-modal`), `src/utils/promoAds.test.ts:184-208` (sage token values). There is **no test file for
`NewBelieverLessonCard.tsx`**.

---

## 3. Change sites by workstream

### 3.1 Close-the-day module

| File:line | Why |
|---|---|
| `src/components/NewBelieverLessonCard.tsx:264` | The ruled mount point. The 2 Sep ruling fixes `PathwayQuestions` directly under the teaching and before Mark Complete (comment `:262-264`, pinned by `pathway-questions.test.ts`). A close section placed between `:264` and the actions row at `:266` preserves that. Placing it after Mark Complete means the only existing post-complete surface is the compact panel at `:316-345`, which has no room and inherits Trap T4. |
| `src/components/NewBelieverLessonCard.tsx:84` | `currentDay` already in scope; no new prop needed. |
| `src/components/NewBelieverLessonCard.tsx:88` | `isPeek` — a close that reads scripture must gate on `!isPeek` or it will reference a chapter that has not loaded. |
| `src/components/NewBelieverLessonCard.tsx:81-83,131` | `completedToday` (same calendar day only) vs `isCompleted` (forever). Picking the wrong one either fires on every reopen of a long-past day or stops firing the next morning. |
| `src/components/NewBelieverLessonCard.tsx:122` | `rangedSlice`/`effectiveVerseSpec`/`passageText` — the existing scripture handles for a "notice one line again" re-read. |
| `src/data/pathway-types.ts:23` | `reading.ref` is where the human-readable verse range lives for a re-read CTA; `passageText` is the text, they are different things. |
| `src/components/PathwayAnswer.tsx:15,28-34` | Storage decision. Reusing this component with a 3-item array writes indices 0,1,2 into the same `dw_pathway_qa_<day>` record and **silently overwrites the existing two answers**. A new key or an index offset is mandatory. |
| `src/utils/cloudSync.ts:55` | Add the close's storage prefix to `MISC_PREFIXES` (and `dw_pathway_qa_` with it) or the answers never leave the device. This is the only change needed; no server or Supabase edit. |
| `src/utils/cloudSync.ts:76-79` | Decide `AUTHORED_MISC` (fill-only) vs default newest-wins for the answer blob. |
| `src/utils/persona-config.ts:287-305` | The persona gate belongs in this `features` block, per the file's own single-gate convention at `:54-57`, not as a scattered persona string check. |
| `src/utils/i18n.ts:397-402` | Existing `pathway_*` copy keys and the `{x}`/`{y}` placeholder convention the new close copy should follow — **but see Trap T2 before adding keys used via bare `t()` inside the lesson card.** |
| `src/screens/HomeScreen.tsx:555-565` | `savePathwayProgress` is the single funnel both completion entry points share and already fires `recordReadDay` on a real increment — the right place for a day-count-keyed trigger. |

### 3.2 Copy and i18n fixes

| File:line | Why |
|---|---|
| `books/faith-pathway.json:1469` | English Day 40: three occurrences of thirty-day language. |
| `books/faith-pathway.json:1472` | `lessonEs`, same three ("treinta días"). |
| `books/faith-pathway.json:1475` | `lessonPt`, same three ("trinta dias"). |
| `books/faith-pathway.json:1478` | `lessonId`, same three ("tiga puluh hari"). |
| `src/utils/i18n.ts:241` | `p_faith_pathway` "30-Day Faith Pathway" — dead, delete or fix so it cannot be wired up later. |
| `src/utils/i18n.ts:242-243` | `p_faith_desc`, `p_start_faith` — dead siblings. |
| `src/utils/i18n.ts:474` | `not_sure_start_member` — dead, safe to delete, zero behaviour change. |
| `src/utils/i18n.ts:41` | `im_new_to_this` — dead duplicate of `persona_new`. |
| `src/utils/i18n.ts:70` | `persona_new` "I'm New to This" — one of the two competing labels. |
| `src/utils/i18n.ts:929` | `path_new_head` "I'm new to faith, or coming back" — the other. |
| `src/utils/choosePath.ts:31` | `PATHS` maps `headKey`/`labelKey` per persona; a label unification changes this mapping, not only the strings. |
| `src/components/EmailGate.tsx:16` and `src/components/PathwayPicker.tsx:12` | Two duplicate `PERSONA_I18N` tables that must move together. |
| `src/utils/persona-config.ts:273,275` | A third hardcoded copy of the label and tagline, read as a fallback at `EmailGate.tsx:257,260` when the map lookup is falsy. |

### 3.3 "Not sure?" routing

The bug as the brief describes it does not exist (claim 18). What is actually available:

| File:line | Why |
|---|---|
| `src/utils/i18n.ts:474` | Delete the dead Church Member string so it cannot be resurrected. |
| `src/components/PathwayPicker.tsx:79` → `src/screens/PlansScreen.tsx:465` | The live "Not sure? Begin Day 1", already routing to Home. Confirm it is reachable for this persona before claiming the acceptance check passes — `PathwayPicker` is embedded on the Plans tab at `PlansScreen.tsx:451-464`, which for `isNewChristian` is replaced by the hard-coded journey card at `:576-598`. |
| `src/utils/choosePath.ts:38-40` | `pathFor()` falls back to `PATHS[1]` (congregation) for any unrecognised persona string. |
| `src/contexts/UserContext.tsx:84-92` | Legacy persona strings (`new_returning`, `believer`, …) are migrated in a `useEffect` that runs **after** first mount, so on first paint a legacy device resolves to Church Member in the PathSwatch (`ChoosePathSheet.tsx:87`), the sheet's current selection (`:138`) and the Settings card (`MoreScreen.tsx:151`). This is the real version of the brief's worry. |
| `src/utils/persona-config.ts:579-583` | `getPersonaConfig()` defaults an unknown persona to `congregation` — a config fallback, distinct from any CTA. |

### 3.4 Handoff cards

| File:line | Why |
|---|---|
| `src/screens/HomeScreen.tsx:555-565` | The one funnel both completion paths share; a day-count trigger belongs here, not in the lesson component (Trap T3). |
| `src/screens/HomeScreen.tsx:2125` | The journey-hero block is the only Home surface unique to this persona and already has `pathwayDisplayDay`/`jCompleted` in scope. The competing compact card at `:3006` never mounts here. |
| `src/components/NewBelieverLessonCard.tsx:316-345` | The completion panel's else-branch for Day 40 currently holds only the bare checkmark; extending it is the most surgical in-card option, but see T4 — it disappears at midnight. |
| `src/screens/HomeScreen.tsx:718-719` | The `finishedCelebrated` one-shot boolean is the existing in-repo precedent for a persistent "shown once" flag (a `day40HandoffShown` field on `pathwayProgress` would follow it). |
| `src/components/PathArrivalStrip.tsx:21,29` | The closest existing shape for a persona-aware card that routes in-app via `onNavigate(tab)`. (`BibleAIPromptSection` is **not** a precedent — its prop is `onOpenAI`, a modal opener, `src/sections/BibleAIPromptSection.tsx:3`.) |
| `src/screens/MessagesScreen.tsx:96` | The destination that already exists: `onNavigate('messages')`. No new tab or nav entry is needed. |
| `netlify/functions/lib/intake-core.js:40` | `CORNER_TYPES` has no type suited to "how to reach me"; without a new type or a structured field, campus content stays free text. |
| `src/utils/cloudSync.ts:37-55` | Any per-card dismissal key must be added here or it repeats the `dw_upgrade_dismissed_*` no-sync gap. |
| `src/utils/pathway-upgrades.ts:40-51,58-59` | The pattern to copy, not to extend: tests assert this function returns null for this persona. |

### 3.5 Mid-path content pass

| File:line | Why |
|---|---|
| `books/faith-pathway.json:63` | Day 2 — first, unexplained use of "the enemy", well before the brief's arc. A first-mention gloss rule must key here. |
| `books/faith-pathway.json:248` | Day 6 — first, unexplained "repented"; not redefined until Day 9 (`:359`). |
| `books/faith-pathway.json:535` | Day 15 — opens with reassurance, not a definition. The brief's one correct target. |
| `books/faith-pathway.json:987` | Day 26 — the file's only occurrence of "tithed", in a list, unglossed. (Not Day 27.) |
| `books/faith-pathway.json:1201` | Day 33 — "armour" is glossed immediately; "the Enemy" is never identified. The gloss needed here is who, not what. |
| `books/faith-pathway.json:1357` | Day 37 — the only lesson-body use of the literal word "warfare", outside the brief's day list. |
| `books/faith-pathway.json:581` (D16), `:869` (D24) | Already plainly defined on first use. Do not re-explain. |
| `src/screens/HomeScreen.tsx:501` | The per-language fetch builds `/books/faith-pathway_<lang>.json`, which does not exist — a guaranteed 404 for every es/pt/id reader before the fallback. Either ship those files or delete the branch. |

### 3.6 Catalog naming

| File:line | Why |
|---|---|
| `src/data/plans.ts:286` (+ `:287-289`) | Rename "Foundations of Faith". Safe: `dw_activeplans` keys by id (`src/screens/PlansScreen.tsx:279-282`), titles are looked up live via `tField` (`:551,607`), and analytics pass the id (`:283-284`). |
| `src/utils/persona-config.ts:15` | `PERSONA_PLAN_IDS.new_to_faith` must stay `[]`. No change; this is the guard not to break. |
| `src/utils/personalization.ts:43,46,79` | A **second** recommendation path that mixes both `faith-pathway` and `identity-christ` into a signal literally named `new`, derived for exactly this persona. Inert today only because of `src/screens/HomeScreen.tsx:4010` and because its single caller (`:4015`) drops `rankedPlanIds`. See T9. |
| `src/screens/PlansScreen.tsx:576-598` | The only Plans render path for this persona. The `!isNewChristian` gates at `:468,497,531,626` and the two `setShowPlanDetail(true)` call sites at `:540,550` are what keep the catalog unreachable. |
| `src/utils/coldStart.ts:17` | `GRACE_SERIES_TITLE` is persisted into `dw_pathway_progress.title` fill-only at enrollment (`:108-127`) and overwritten from the live JSON title on the next HomeScreen mount (`src/screens/HomeScreen.tsx:504-524`) — a rename here propagates with mount-dependent lag, unlike a catalog title. |
| `src/utils/persona-config.ts:307` | `showFullCatalog` is inert. Wire it or remove it; do not leave a second, false source of truth. |

### 3.7 Sage chrome

| File:line | Why |
|---|---|
| `src/App.tsx:217` | `const { userProfile, setup } = useUser()` — App is mounted for the app's whole life. A body-class toggle here (e.g. `dw-persona-new`) survives tab changes. |
| `src/screens/HomeScreen.tsx:415-416` | Do **not** reuse `dw-new-home`: it is added and removed with HomeScreen's own mount/unmount, so a chrome override keyed on it vanishes the moment the reader taps Plans, Notes, Campus or More. |
| `src/index.css:175` | Add a scoped block after the dark `:root` tokens redefining `--dw-accent`/`-hover`/`-active`/`-bg` to the `--dw-new` family under the persona class. This one block reaches `.dw-btn-primary`, ScreenHeader, all 17 MoreScreen sites, all 7 LibraryScreen sites, and both light-mode tab-bar rules without editing any of them. |
| `src/index.css:483` | Dark-mode `.tab-bar-item.active { color: #fff }` is a literal and will **not** follow the token override. It needs its own persona-scoped rule at higher specificity. This is the rule that makes the acceptance check "sage chrome on tabs" fail in the default theme. |
| `src/index.css:486` and `:694-696` | The light-mode active-tab colour is asserted twice, the second with `!important` and higher specificity. Both read `var(--dw-accent)`, so the token override reaches both; a rule that sets `.tab-bar-item.active` colour directly loses to the second. (The section header there reads "LIGHT MODE CONTRAST SYSTEM" at `:648-653` — the block titled "Contrast Fix Overrides" is the unrelated dark-mode block at `:534-537`.) |
| `src/screens/LibraryScreen.tsx:144,175,178,207,230,251,269,283` | Seven persona-blind `var(--dw-accent)` sites on a screen reachable from `src/screens/MoreScreen.tsx:761` with no persona gate. Fixed by the token override; listed so nobody believes More is the only terracotta surface. |
| `src/index.css:1909,2018,2059,2148` | Four hardcoded `#A8552F` values in the Sermon Notes stylesheet. **Reachable by this persona every Sunday** via `src/screens/HomeScreen.tsx:2076`. The token override will not touch them. |
| `src/screens/PlansScreen.tsx:1052`, `src/screens/HomeScreen.tsx:2586,2773,2884` | Other hardcoded terracotta, genuinely unreachable for this persona today (PlansScreen's sits inside `{!isNewChristian && …}` opening at `:626`; HomeScreen's sit behind `greekHebrew === 'full'`, hidden per `persona-config.ts:288`, or an explicit `persona !== 'new_to_faith'` guard at `:2884`). |

### 3.8 Analytics and storage

| File:line | Why |
|---|---|
| `src/utils/tracked-events.ts:6-47` | Client allowlist. New close events go here. `journey_day_open`/`journey_day_complete` already exist at `:19`. |
| `netlify/functions/lib/activity-rows.js:11-35` | The server mirror must get the identical names, and they must match `NAME_RE` at `:9` (lowercase snake_case, 3-48 chars). |
| `src/utils/tracked-events-parity.test.ts:55-73` | Fails loudly if only one side is edited. Its `emittedNames()` scans literal `track('...')` only, so a dynamically-built name escapes the check — use string literals. |
| `src/utils/cloudSync.ts:55` | Add `dw_pathway_qa_` (and any new close prefix) to `MISC_PREFIXES`. |
| `src/utils/cloudSync.ts:24,408-431` | Do not put answers in `dw_pathway_progress`: it is merged wholesale, so a stale cloud copy clobbers fresh answers along with the counters. |
| `netlify/functions/user-sync.js:334,343` | 20,000 chars per key (skipped, not truncated, if over) and 300 keys per push. Per-day keys already consume up to 40; a key-per-question design would triple that. |
| `src/utils/storage.ts:16-40` | The `LS` registry does not cover dynamic per-day keys; the convention for this family stays interpolated strings. |

---

## 4. Traps, most expensive first

**T1 — Reusing `PathwayAnswer` for the close silently destroys the existing two answers.**
`src/components/PathwayAnswer.tsx:28-34` merges by array index into one record shared by every
caller for that day. Both current call sites pass a 2-item array
(`src/components/NewBelieverLessonCard.tsx:264`, `src/components/Day1Landing.tsx:143`), so indices
are 0 and 1. A new 3-question set rendered through the same component and key writes 0, 1, 2 over
the top of them. `src/components/pathway-questions.test.ts` asserts render position, not index
uniqueness, so nothing catches it. The close needs its own storage key or a fixed index offset.

**T2 — `NewBelieverLessonCard` reads copy from two different tables.**
It is on the hardcoded "prop-t" allowlist in `src/__tests__/i18n-keys.test.ts:87-92`: any bare
`t('key')` inside it is validated against **HomeScreen's own `UI_STRINGS` map**, not
`src/utils/i18n.ts`. The file already uses both — `t('mark_complete')` at `:295` (HomeScreen's) and
`trans('pathway_day_complete', lang)` at `:326` (shared i18n). A key added to the wrong table
renders literally on screen, and only one of the two paths is guarded.

**T3 — There are two completion entry points, not one.**
`src/components/NewBelieverLessonCard.tsx:267` (Mark Complete) and
`src/screens/HomeScreen.tsx:572-593` (`completeTodaysPathwayDay`, reached from `handleMarkRead` at
`:736`). A close or handoff keyed to "just completed" that only hooks the lesson card misses the
hero path. Hook `savePathwayProgress` (`src/screens/HomeScreen.tsx:555-565`) instead.

**T4 — `completedToday` is a one-day window.**
`src/components/NewBelieverLessonCard.tsx:81-83` is non-null only while
`lastCompletedDate === today`. Anything gated on it disappears at midnight, exactly as the Day 40
checkmark does. A durable post-Day-40 handoff needs a flag derived from
`completedDays.length >= totalDays`, with a one-shot marker modelled on `finishedCelebrated`
(`src/screens/HomeScreen.tsx:718-719`).

**T5 — `syncMisc()` is a silent no-op for unlisted keys.**
`src/utils/cloudSync.ts:91-99` writes locally and stamps meta unconditionally; only
`isSyncedMiscKey` (`:66-68`) decides what is pushed. `dw_pathway_qa_<day>` has been calling
`syncMisc` on every keystroke since it shipped and has never reached the cloud. Repeating the
pattern for the close repeats the gap.

**T6 — Dark mode is the default, and its tab-bar rule ignores the token.**
`src/index.css:483` sets a literal `#fff`. A pure custom-property override fixes light mode and
every button and still leaves the dark active tab white. The acceptance check "sage chrome on tabs"
fails in the default theme unless that rule gets its own persona-scoped override.

**T7 — Legacy persona strings resolve to Church Member on first paint.**
`src/utils/choosePath.ts:38-40` falls back to `PATHS[1]` for any unrecognised persona;
`src/contexts/UserContext.tsx:84-92` migrates legacy values in a post-mount effect. On first paint a
device carrying `new_returning` or `believer` shows Church Member in the PathSwatch, the sheet and
Settings. This is the brief's "routes to Church Member" worry, at the data layer rather than a CTA.

**T8 — Sermon Notes is live for this persona on Sundays.**
`src/screens/HomeScreen.tsx:2076`. The `sermonNotes:false` flag at
`src/utils/persona-config.ts:299` gates a different surface. So the four hardcoded `#A8552F` rules
at `src/index.css:1909,2018,2059,2148` are reachable terracotta, not inert, and the brief's §1
statement that sermon notes are hidden for this persona is wrong.

**T9 — A second recommendation path exists outside `PERSONA_PLAN_IDS`.**
`src/utils/personalization.ts:41-47` puts both `faith-pathway` and `identity-christ` in a signal
named `new`, and `:79` derives that signal for `new_to_faith`/`new_returning`. It is inert only
because `src/screens/HomeScreen.tsx:4010` gates the whole "For You" block off for this persona and
because the caller at `:4015` destructures only `{ suggestedPassages, insight, signal }`. Anyone
implementing §3.4 (feature "Who Am I? Found in Christ") or §3.6 who loosens either of those
reintroduces the 30-day plan to this persona through a path neither documented guard covers.

**T10 — `dw_pathway_progress` is merged wholesale.**
`src/utils/cloudSync.ts:408-431`. A non-empty cloud copy replaces the whole local object at any
`syncOnStartup()`. Never store answers or a handoff flag in it without accepting that risk.

**T11 — The brief's SW-caching worry is already fixed; the real content bug is elsewhere.**
`public/sw.js:84-101` is network-first for `/books/*` with cache as offline fallback only, with an
inline comment dating the incident it fixed. An edit to the JSON reaches any device on the current
SW on its next fetch. The live open item is the dead per-language URL at
`src/screens/HomeScreen.tsx:501`.

**T12 — Nothing runs the tests.**
No `.github/workflows`; `netlify.toml:5` runs only `npm run build`. A broken suite blocks neither a
deploy preview nor a merge. Only `tsc -b` or a vite failure does. And
`src/components/NewBelieverLessonCard.tsx` has no test file at all, so "no test broke" proves
nothing about the surface this brief changes most.

**T13 — Day-object key order is not uniform in `books/faith-pathway.json`.**
In 10 of the 40 days (6, 8, 9, 19, 20, 22, 27, 30, 37, 38) the four `questions` arrays serialize
immediately after `day`, before `title`/`reading`/`lesson`. Locate fields by key name, never by
position or ordinal offset.

**T14 — `ChoosePathSheet` is pinned non-modal.**
`src/components/choose-path.test.ts:20-24` asserts the file does not match `useModalA11y` and does
not contain `aria-modal`; `src/components/ChoosePathSheet.tsx:142` uses `useSubView` alone, and it is
mounted with a permanently live `open` prop so its single history entry is always consumed
(`:11-13`). The lesson card carries the same contract (`NewBelieverLessonCard.tsx:73-79`). A new
close section must be a plain DOM sibling inside the existing scroll surface — no second
`useSubView`, no focus trap.

**T15 — One tap must still open the path.**
`src/components/ChoosePathSheet.tsx:20-23` records Ashley's 2 Sep 2026 ruling: a prior version
requiring a second CTA below the fold looked broken. Do not reintroduce a confirm step.

**T16 — `recordStreakToday()` fires on bare mount.**
`src/screens/HomeScreen.tsx:798-806` ("Keep the streak alive on open"). The streak counts opens, not
readings, and it drives the milestone overlay at `:4284-4320`, which is ungated for this persona
(`celebrations:'full'`). A "no scoring / no streak pressure" acceptance check is not satisfied
today. Its milestone list `[7,14,30,60,100,365]` (`src/utils/streak.ts:13`) already contains 14 — a
naming collision with the brief's proposed Day-14 card that must be kept distinct in copy and
analytics.

**T17 — `src/sections/GreetingSection.tsx` is dead code.**
Exported from `src/sections/index.ts` but never imported by HomeScreen, which imports only
`BibleAIPromptSection` and `ComfortVerseBannerSection` at `:34`. The live greeting is rendered inline
in HomeScreen from `getGreeting()`. Anyone following a build step that says "rewrite
GreetingSection" edits nothing a user sees.

**T18 — Three dead persona surfaces look live.**
`src/components/NewToFaithButton.tsx` (zero imports), `src/components/SetupPromptModal.tsx` (mounted
at `src/screens/HomeScreen.tsx:1825-1829` but its trigger is never set true), and the four dead i18n
keys in §3.2. Changing their copy or colour changes nothing.

**T19 — House ads are not off this path.**
`src/screens/MoreScreen.tsx:1140` renders `<PromoAds />` unconditionally. Only Home
(`src/screens/HomeScreen.tsx:4435`) and the Day-N card are clean. The acceptance check is not
satisfied if "this path" means the whole persona.

**T20 — `pathway_how_it_works` only renders for the first three completed days.**
`src/screens/HomeScreen.tsx:2080`. Testing a copy change to it on Day 10 shows nothing, which reads
as a failed fix.

**T21 — `dw_v7_pathway_done` is a naming trap.**
`src/utils/coldStart.ts:60,70,89` and `src/utils/sunday.ts:47-48` — it marks that the path picker
was completed, not that the 40-day pathway finished.

**T22 — The catalog plan id and the content filename are both `faith-pathway`.**
`src/data/plans.ts:285` vs `books/faith-pathway.json`. A grep returns both. The comments at
`src/utils/persona-config.ts:10-13` and `src/utils/coldStart.ts:105-106` exist because this has
already caught people.

**T23 — Tests placed in `src/__tests__/` escape typecheck.**
`tsconfig.app.json:25-26`. Colocate.

---

## 5. Conflicts between the brief and recorded rulings or the judged 10 Sep spec

**C1 — Three questions vs the 2 Sep ruling on two.**
Brief §3.2 ("Exactly 3 questions") and §2 item 3 ("keep the existing 2 pathway questions (or fold
into the close)", BRIEF:67-68). Ruling, 2 Sep 2026: "questions are part of the lesson — on the Day N
surface they sit directly under the lesson text, before Mark Complete"
(`docs/experience-design/rulings-packet-2026-09-10.md:100`), implemented at
`src/components/NewBelieverLessonCard.tsx:262-264` and pinned by
`src/components/pathway-questions.test.ts`. The brief is internally unresolved on whether the two
ruled questions survive, are replaced, or are folded in — which is itself evidence it did not engage
the ruling. It also runs against the judged spec's principle 1 (`docs/experience-design/new_to_faith.md`:
"one day is one thought and a few verses, never a chapter, never more content"). Adding five
free-text boxes to one day is more content, not less.

**C2 — The handoff card has no recipient; the judged spec escalated exactly that.**
Brief §3.4 asks for a card after ~Day 14 and/or Day 40 pointing at "Connect Group / campus / talk to
someone at Futures", with no routing mechanism and no named person. The judged design
(`docs/experience-design/new_to_faith.md:364-391`) specifies a Day-10 invitation routed through the
existing intake pipeline resolved against `staff_roster.campus_id`, never a chat, and escalates
"who at each campus receives the request" as owner decision 27 (`:385,525`), unresolved, with the
reason: a new believer asking for help and hearing nothing is worse than not offering. The code
supports that worry — the prayer wall has no staff notification
(`netlify/functions/prayer-wall.js:108-119`; `pastor-admin.js` never references `prayers`) and
campus corner posts are free text with no autolink (`src/screens/MessagesScreen.tsx:215-241`).
The brief also drops the Day-10 timing entirely; it says Day 14.

**C3 — The next-step chip against the no-performance principle.**
Brief §3.2 proposes an "optional single next-step chip: One small step of love or obedience",
adjacent to a stated identity line. Judged spec principle 4
(`docs/experience-design/new_to_faith.md:69`): "no word on this path may imply performance… grace
doesn't reward performance, it replaces it". An action chip beside an identity line is the shape the
judged design avoided.

**C4 — The "Not sure?" bug the brief fixes does not exist.**
Brief §3.3 and acceptance check 5. `not_sure_start_member` (`src/utils/i18n.ts:474`) has zero call
sites; `not_sure_begin_day1` already exists and is already wired
(`src/components/PathwayPicker.tsx:79`). Building a fix around this key touches nothing a user sees.
The real defect is T7.

**C5 — The brief's §1 says sermon notes are hidden for this persona; the 2 Sep ruling says the
opposite.** BRIEF:41 lists sermon notes among hidden/limited. Ruling
(`docs/experience-design/rulings-packet-2026-09-10.md:16`): "Sermon Notes row demoted below the
reading for the four; I'm New keeps it above only in the Sunday window (QR guests)" — implemented at
`src/screens/HomeScreen.tsx:2076`. A change made on the brief's reading would remove a surface the
owner ruled in.

**C6 — §3.7 asks for a persona-scoped global chrome override the judged design never contemplated.**
`docs/experience-design/new_to_faith.md:293` treats the sage token family as already correct and
proposes no chrome override. §3.7 asks to force sage on the tab bar and primary buttons "even if
global default is terracotta" — new, unruled surface area that touches shared CSS for all five
personas. It is also the one place the brief's own framing is right about a real defect (§3.7 is
supported by claim 6), so it should be built, but as new work, not as a regression fix.

**C7 — The brief silently leaves six owner decisions open.**
Decisions 25-30 (`docs/experience-design/DESIGN-EXPERIENCE-2026-09-10.md:79-86`): 25 (Mark Complete
vs Mark as read) not mentioned; 26 (Day 40 named ending) not mentioned; 27 (day-10 recipient)
gestured at, not answered; 28 (the ten glossary terms) not mentioned and no word-help mechanism
proposed anywhere; 29 (anonymous `dw_device_id` behind cookie consent, which the judged design says
must ship first because "nothing else on this list is trustworthy until it lands",
`new_to_faith.md:465`) not mentioned, and the brief's own acceptance list has no instrumentation
item; 30 (comfort line at the foot of the I'm-New Home) not mentioned.

**C8 — Wave 4 is gated on a review that has not run.**
`docs/experience-design/new_to_faith.md:3` records the design as judged but not UX-reviewed and not
verified; `DESIGN-EXPERIENCE-2026-09-10.md:12` shows all three verifier columns "not run", and `:98`
gates wave 4 on running them first. Decision 31 (`:86`) makes every step marked PREVIEW wait for
Ashley's look on a deploy-preview link, and both the Day 1 landing and the Day N reading are named
owner-preview-gated surfaces (`new_to_faith.md:522`).

---

## 6. Decisions that are Ashley's

**D1 — Do the three close questions replace the two ruled Reflect & Respond questions, sit after
them, or fold into them?** Pick one. *Recommended default: fold.* Replace the two with the three
canonical questions in one block that stays in the ruled position (under the teaching, before Mark
Complete). One day, one thought; five free-text boxes on a five-minute promise is a wall. This also
sidesteps T1's index collision by making the close the only question set.

**D2 — Does the close render before Mark Complete, or after it?** *Recommended default: before.*
After Mark Complete is the same instant `dw-reading-completed` fires the push-ask / path-ask / PWA
gate stack (`src/screens/HomeScreen.tsx:610-612`, `src/App.tsx:273-312`), which is the prompt-stacking
problem the `DoneCelebration` sequencing at `HomeScreen.tsx:1813-1816` exists to avoid.

**D3 — Keep the optional next-step chip, yes or no?** *Recommended default: no for v1.* It conflicts
with the judged design's no-performance principle (C3), and question 3 already asks for the step in
words.

**D4 — Day 40 named ending: does finishing offer the congregation path through the existing sheet
(source `upgrade`)?** Open since 10 Sep as decision 26. *Recommended default: yes, one offer, one
sentence, dismissible.* Anything is better than serving the finished Day 40 lesson forever
(claim 23).

**D5 — Who at each campus receives a "want a person with you?" request?** Owner decision 27, still
unanswered. *No recommended default — this one cannot be defaulted.* Until a named recipient and a
route exist, the honest build is a card that points at the Campus tab
(`src/screens/MessagesScreen.tsx`), which already carries real campus-pastor posts, and no form.

**D6 — Day 14 or Day 10 for the soft handoff card?** Brief says 14; judged spec says 10.
*Recommended default: 14.* Day 24 is the Connect Groups lesson
(`books/faith-pathway.json:869`), so a Day-14 card is a warm-up rather than a duplicate, and 14 sits
clear of the Day-10 decision still open in C2/D5.

**D7 — Do the close's answers sync to the cloud, and fill-only or newest-wins?** *Recommended
default: sync, newest-wins.* Add the prefix at `src/utils/cloudSync.ts:55`. Fill-only
(`AUTHORED_MISC`, `:76-79`) protects a local edit against a newer cloud copy, which is wrong for a
reader who answers on their phone and re-reads on a tablet. Fix the existing
`dw_pathway_qa_` gap (T5) in the same change.

**D8 — Rename "Foundations of Faith" to what?** Brief suggests "Bible Basics: 30 Days".
*Recommended default: take the brief's suggestion.* It is display-only and safe
(`src/data/plans.ts:286`); the id stays `faith-pathway`.

**D9 — Unify the persona label on "I'm new to faith, or coming back", or keep two registers?**
*Recommended default: unify on the path-sheet string* (`src/utils/i18n.ts:929`), retire
`persona_new`, `im_new_to_this` and the hardcoded copy at `src/utils/persona-config.ts:273`.

**D10 — Does the sage chrome override extend to the Sermon Notes surface this persona sees on
Sundays?** *Recommended default: yes*, but as four explicit CSS edits
(`src/index.css:1909,2018,2059,2148`), since the token override cannot reach hardcoded hex (T8).

**D11 — Do house ads come off the More tab for this persona?** Acceptance check 8 says house ads
stay off this path. *Recommended default: yes* — gate `src/screens/MoreScreen.tsx:1140` on the
existing `newPathSettings` variable at `:152`.

**D12 — Does this PR also fix the mount-effect streak and the ungated milestone overlay (T16)?**
*Recommended default: no, separate change* — it touches all five personas and the judged design
already owns it. But say so, because acceptance check 8 ("no scoring") is otherwise false on merge.

**D13 — Does the glossary (owner decision 28) come back into scope?** The brief has no word-help
mechanism, and §3.5's day list is wrong in four places (claim 22). *Recommended default: keep the
glossary out of this PR, but key the §3.5 content pass to first use (Days 2, 6, 15, 26, 33, 37),
not to the brief's day list.*

**D14 — Does instrumentation (owner decision 29, anonymous `dw_device_id`) ship before or with
this?** The judged design says first. The brief has no instrumentation item at all.
*Recommended default: state it as a dependency and let Ashley decide the order.*

---

## 7. Gaps

| Unknown | What would settle it |
|---|---|
| Is the deployed `/books/faith-pathway.json` byte-identical to the repo copy? Only the repo copy is confirmed to carry the Day 40 "thirty-day" text. | `curl -s https://futuresdailyword.com/books/faith-pathway.json \| python3 -c "import json,sys; d=json.load(sys.stdin); print([x['lesson'][:60] for x in d['days'] if x['day']==40])"` and diff against `books/faith-pathway.json:1469`. |
| Do `/books/faith-pathway_es.json`, `_pt.json`, `_id.json` exist on the live site, or is the 404 branch at `src/screens/HomeScreen.tsx:501` dead for every non-English reader? | `curl -sI https://futuresdailyword.com/books/faith-pathway_es.json` (and `_pt`, `_id`). |
| Which service-worker version is live? The repo shows `CACHE_NAME 'fdw-v51'` at `public/sw.js:9`, which is this worktree's state, not production's. | `curl -s https://futuresdailyword.com/sw.js \| grep CACHE_NAME`. |
| Does Netlify trigger the `@hourly` scheduled `push-cron` (`netlify.toml:11-13`) on PR deploy previews? Inferred production-only; not stated anywhere in this repo. | Netlify docs or a preview-deploy function-log check in the Netlify dashboard. |
| Is `PathwayPicker` (the only live "Not sure? Begin Day 1") actually reachable for `new_to_faith`? It is embedded at `src/screens/PlansScreen.tsx:451-464`, and the `isNewChristian` branch at `:576-598` replaces the Plans body. | Read `src/screens/PlansScreen.tsx:440-600` end to end, or set the preview persona per CLAUDE.md and open the Plans tab. |
| Which localStorage key and shape does the Journal/Notes tab use, if the close's answers are meant to land there (BRIEF §3.2 "save to existing notes/reflect store if one exists")? The Journal tab and `dw_pathway_qa_<day>` are two separate stores and the brief names neither. | Read `src/screens/JournalScreen.tsx` for its write path and `src/utils/cloudSync.ts:535-598` (`mergeJournals`) for the synced shape. |
| Does `EmailNudgeCard.tsx` exclude this persona from the post-reading gate stack? It sits in the same gate area but its persona logic was not read. | Read `src/components/EmailNudgeCard.tsx` and its mount site in `src/App.tsx`. |
| Is there a third milestone-count list beyond `src/utils/streak.ts:13` and the dead `src/sections/GreetingSection.tsx:6` driving HomeScreen's inline milestone UI? | `grep -rn "MILESTONE" src/` and read `src/screens/HomeScreen.tsx:4284-4320`. |
| Is there a sign-out or account-deletion routine anywhere that would need the new storage key added to a wipe list? `resetSyncSession` (`src/utils/cloudSync.ts:277-286`) only resets in-memory state; no `dw_*` wipe list was found. | `grep -rn "localStorage.clear\|signOut\|deleteAccount\|wipeLocal" src/ netlify/functions/`. |
| Does anything outside `src/` (a Netlify function, an email template) render `p_faith_pathway` or the other dead keys? Only `src/**/*.ts(x)` was searched exhaustively. | `grep -rn "p_faith_pathway\|not_sure_start_member\|im_new_to_this" netlify/ public/ books/`. |
| Do campus pastors actually post to the campus corner often enough that the Campus tab is a real destination rather than an empty feed? | Query the `campus_content` table for row counts and recency per campus (operational, not in-repo). |
| Does `tsc -b` currently pass clean on this worktree? Not run — this pass was read-only. | `npx tsc -b` from the worktree root. |
