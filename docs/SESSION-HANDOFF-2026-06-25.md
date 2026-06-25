# Daily Word — Session Handoff (2026-06-25)

A long working session took **Futures Daily Word** (futuresdailyword.com) from "good with
hidden bugs" to "well-tested, healthier, and noticeably more premium." This doc is the full
record so another session (or person) can pick up cleanly.

---

## 0. TL;DR — current state

- **7 PRs shipped to production**, each gated by an adversarial review + a live preview check.
- **2 data-loss bugs and 1 cross-device sync bug** were caught *by the pre-deploy reviews* before reaching users.
- **HomeScreen god-component: 4,769 → ~3,750 lines** (−21%) across 3 behavior-identical extractions.
- A **forward-looking "make it fantastic" roadmap** exists (below); the first two pieces (premium reading feel + inline reflection) are shipped.
- Everything is on **`main` and live**. No half-finished branches. One spawned follow-up task (KJV reader bug).

**Live:** https://futuresdailyword.com · last prod commit `8c5c4803` (PR #25).

---

## 1. App orientation

| | |
|---|---|
| Repo | `AEGLOBALUSA/futures-daily-word` (local: `~/futures-daily-word`) |
| Stack | React 19 + Vite 6 + Tailwind 4, TypeScript. PWA. Also packaged native via Capacitor. |
| Data model | **localStorage-first** (~45 `dw_*` keys) with a Supabase cloud-backup layer. Cross-component updates via `window` CustomEvents. |
| Cloud sync | netlify function `netlify/functions/user-sync.js` ⇄ Supabase table `public.user_data`. |
| Supabase | project ref **`uamavjnjvmsopjzxirsd`** (URL/keys are Netlify env, not in repo). |
| Hosting | Netlify site **`futures-daily-word`** (site_id `5b332733-6735-44a9-90b9-ac21862f2615`, team `699cdfb0431d03cf896f0cd8`). |
| Deploy | **git-connected auto-deploy on `main`** — merge to main → Netlify builds → live. Branch previews per PR (`deploy-preview` check). |
| AI endpoint | `POST /.netlify/functions/claude` → `data.content[0].text`. |
| Real stylesheet | `src/index.css` (the root `styles.css` is DEAD — only index.css is imported). |
| Personas | `new_to_faith / congregation / deeper_study / pastor_leader / comfort` — drive the whole home via `sectionOrder` in `src/utils/persona-config.ts`. |

---

## 2. Everything shipped this session (in order)

All squash-merged to `main`; each auto-deployed and was verified live.

| PR | commit | What |
|----|--------|------|
| **#19** | `46de28fa` | **Study-platform polish (10 fixes).** Journal delete tombstones; wired the orphaned `dw-cloud-sync`/`dw-sync-conflicts` events; unified Sermon tab; `misc` JSONB sync bag for ~14 unsynced keys; commentary AI fallback; real tappable Bible search; `--dw-success` green + gold consolidation; `storage.ts` + theme split-brain fix; History-API back button. **Review caught 2 data-loss bugs** (journal resurrection in `applyCloudData`; `applyMisc` cloud-wins → made fill-only). Applied the `misc` column migration to Supabase. |
| **#20** | `126a17b5` | **Audit follow-ups.** Persona (`dw_setup`) + language (`dw_lang`) cross-device sync via a **timestamped** misc bag (`dw_misc_meta`, newest-wins for cadence keys, fill-only for free text); keepalive flush (≤60KB) + `flushNow()` before reloads; VerseNoteDrawer notes push to cloud; `clearHighlights` tombstones (no resurrection); startup sync tagged `source:'sync'` so it doesn't yank the Journal tab; **unified `streak.ts`** (was 2 divergent writers); BibleSearch validates refs vs `CANONICAL_BOOKS`; commentary cache LRU+TTL prune; Plans iOS-blues → `--dw-plan*` tokens; `[style*=charcoal]` → `.dw-dark-surface` class. **Review caught a real persona-sync bug** (settings/upgrade re-passed a stale `source`). |
| **#21** | `e0d96b68` | **HomeScreen breakup #1** (behavior-identical). Extracted data → `src/data/{comfort,daily-words,bible-books}.ts`; comfort feature → `src/components/ComfortSection.tsx`. |
| **#22** | `66804a1e` | **HomeScreen breakup #2.** Pastor/Study onboarding wizard → `src/components/PastorStudyOnboarding.tsx`. |
| **#23** | `18b2136d` | **HomeScreen breakup #3.** new_to_faith lesson card → `src/components/NewBelieverLessonCard.tsx`; Pathway types → `src/data/pathway-types.ts`. |
| **#24** | `5d83a005` | **Premium reading & feel.** Scripture renders in `--font-serif-text` (DM Serif Text) @1.85 line-height with sans verse numbers; `<html lang>` follows saved language (a11y) + `aria-current` on active tab; tactile `:active` press-scale; `utils/haptics.ts` + tab haptics. |
| **#25** | `8c5c4803` | **Inline reflection.** The dead static "Reflect" prompt → a real one-tap journal capture in the hero reading panel (`src/components/InlineReflection.tsx`). |

---

## 3. HomeScreen breakup — status

The audit's #1 architecture finding was the **3,746-line `HomeScreen.tsx` god-component (~80 hooks)**.
Three clean increments are done; the file is now ~3,750 lines.

**Extracted (each behavior-identical, gated-review GO):**
- `ComfortSection.tsx` — comfort persona reading flow (4 useStates + audio-shared-via-AP-singleton).
- `PastorStudyOnboarding.tsx` — multi-step onboarding wizard (1 wizard-only state).
- `NewBelieverLessonCard.tsx` — Faith-Pathway day lesson (pure render, 18 props).
- Data modules: `data/comfort.ts`, `data/daily-words.ts`, `data/bible-books.ts`, `data/pathway-types.ts`.

**Remaining (in rough risk order):**
1. *Easy/low-risk:* daily-word, weekly-review, campus-count sections; "Plan-Driven Scripture" (deeper_study) and "Pastoral Reflection" sections.
2. *Hard/last:* the **hero multi-chapter audio cluster** (~15 hooks, the playback chain) — save for a dedicated careful pass.

### The proven extraction recipe (used 3×)
1. **Dependency-analysis agent** maps the target: owned state vs external reads vs mutations; outside→inside coupling; verdict + exact props interface.
2. **Name-match props** to the identifiers the render already uses → the JSX moves *verbatim* (zero rewrite).
3. `sed -n 'A,Bp' HomeScreen.tsx` to extract the block; substitute only inline helper calls → props (e.g. `getTranslationsForPersona('x', appLanguage)` → a `translations` prop).
4. `perl -ni -e 'print unless …'` to delete the block + its state from HomeScreen; insert `<Comp …/>` at the **same gate + render position**.
5. `tsc -b` + `vite build` → live persona test in preview → **gated refactor review** (normalized-diff fidelity + residue) → ship.

---

## 4. The "make it fantastic" roadmap (forward-looking panel)

A 5-expert panel (reading loop / study depth / visual polish / habit / onboarding+a11y) produced this.
**Headline gap:** *the home screen has no center of gravity* — a 20-card scroll that buries reading
under audio, with no inline reflection and no "done" moment. **Fix the core loop first.**

**Top moves (ranked impact ÷ effort):**
1. 🌟 **TodayCard** *(transformative, L)* — collapse the home into one read-first card: scripture front-and-center, inline reflect, calm "done" moment. **The big one — reshapes the core UX, so PREVIEW it before deploying.** ▸ *Slice 1b (inline reflect) is DONE — PR #25.* Remaining: 1a read-first hero (auto-expand, demote the 88px play button), 1c done-state, and collapsing the rest into a "Keep going" disclosure.
2. **Smart self-scheduled notifications** *(transformative, M)* — the daily *trigger*. Plumbing largely exists (`push-subscribe.js` has a `preferred_hour` path; `push-send.js` runs the query). Offer opt-in at onboarding + a time picker; make sends streak/plan-aware.
3. **Real bundled Bible text + interlinear + cross-refs** *(transformative, L)* — no full Bible ships; the offline fallback returns "…loading", Strong's is faked via a Claude prompt, cross-refs ship zero data. Bundle public-domain WEB JSON into `public/bible/web/...`, prove interlinear on one book (John) via the **already-built but dead** `ScriptureBlock`/`GreekHebrewPopup` token path, then TSK cross-refs.
4. **Prayer-wall "someone is praying for you"** *(high, M)* — return loop via the push pipeline (#2 first).
5. **Persona picker as a 10-second first-launch moment** *(transformative, M)* — the lovely `PathwayPicker.tsx` exists but is never shown on first run (users get silently defaulted to congregation + a grey banner).
6. **Plan momentum + finish-line celebration** *(high, M)*.
7. **Reading typography + kill the `window.location.reload()` white-flash** *(S)* — ▸ *typography DONE (#24).* The 3 `reload()` calls (plan-start, persona-change, language) still cause a jarring flash → replace with reactive state.

**Quick wins worth batching (S):** ▸ *html-lang DONE (#24).* Remaining: darken `--dw-text-faint` (#5C564F fails AA, 33 components); scripture loading **skeletons** instead of "Loading…"; tab cross-fade; soften streak-reset into a "welcome back / longest run" comeback; real `<EmptyState>` for Journal/Plans.

**Explicitly AVOID (per the panel):** OS dynamic-type system rewrite; a separate "first-light" guest screen (folds into TodayCard + persona picker); client concordance/exegesis mode (blocked on bundling full text first); chasing the shadow/radius token scale; a weekly "Wrapped" recap (don't prioritize a weekly moment over the every-day loop).

---

## 5. How this session operated (the discipline that worked)

**Every production change went through the same gate** — this is the single most valuable habit to keep:

> implement → **adversarial pre-deploy review** (a Workflow of dimension-reviewers + adversarial verify) → fix what it catches → live **preview verification** (`preview_start`, drive the actual persona/flow, check console + DOM) → commit → PR → **wait for Netlify `deploy-preview` to pass** → squash-merge → **poll the production deploy to `ready`** → verify the live artifact.

It caught a real bug on **3 of 7** ships (2 data-loss, 1 sync) and gave clean GOs on the refactors.
For pure refactors the review used a **normalized-diff fidelity** check. Behavior-changing features get a
"does it break / harm UX" review instead.

---

## 6. Gotchas & things to know (read before touching)

- **Dead `devotion_scripture` section.** `HomeScreen` has a "Today's Reading" section gated on `sectionOrder.includes('devotion_scripture')`, but **no persona's sectionOrder contains that key** → it never renders. (The static "Reflect" prompt lived there, which is why it was dead.) The *live* reflection now lives in the hero reading panel. If you revive that section, remove the now-dead `<InlineReflection>` left there (documented with a NOTE).
- **KJV offline reader shows raw JSON** for object-shaped chapter files (e.g. John 3): `fetchKJV` in `api.ts` only handles the array shape; the `{book,chapter,verses}` shape falls through to `JSON.stringify`. **Spawned as its own task** (a chip). Real for any user on the KJV translation; production default is ESV so most users don't hit it.
- **The hero panel is dark (#1C1A16) in BOTH themes** and force-sets dark color vars inline; scripture color must stay `var(--dw-text-secondary)` (don't "fix" it to a theme token).
- **`keepalive` fetch caps body at 64KB** → the flush only enables it under 60KB; large payloads fall back to best-effort. Don't blanket-enable.
- **`setup.source` is write-only** (never branched on) — safe to set to a "real choice" source (`onboarding`/`settings`/`upgrade`) so cross-device persona sync stamps. Auto-defaults use `default`/`sunday-guest` and must NOT stamp.
- **i18n:** `t()` returns the raw key if missing — new UI strings MUST be added to `src/utils/i18n.ts`. Existing strings use `\uXXXX` escapes. `<html lang>` now follows `dw_lang` on boot.
- **Persona testing in preview:** `localStorage dw_setup = {persona:X, source:'settings'}`, `dw_profile={email,firstName}`, `dw_cookie_consent='accepted'`, `dw_v7_pathway_done='true'`. The hero only shows readable scripture with an active plan or **reading slots** (`dw_reading_slots=[{id,book,currentChapter}]` + `dw_chapters_per_day`). KJV loads offline (raw-JSON caveat above); ESV needs the netlify fn (won't load in `vite dev`). Comfort persona auto-loads a chapter; new_to_faith needs `dw_pathway_progress={enrolled:true,currentDay:1,completedDays:[]}`.
- **Preview launch name** in `.claude/launch.json` is `dw-dev`.
- **Shared streak** lives in `src/utils/streak.ts` — route any "engagement" action through `recordStreakToday()` (idempotent per calendar day).
- **Secrets:** the Netlify env holds live keys (Supabase service key, AWS/Polly, ElevenLabs, VAPID, ADMIN_PIN). Don't echo them. Read via the Netlify MCP env reader if needed.

---

## 7. Open items / suggested next steps

1. **(spawned task) Fix the KJV raw-JSON reader** — small fix in `api.ts fetchKJV`.
2. **TodayCard read-first hero (roadmap #1a/#1c)** — the highest-impact remaining UX move. **Build on a branch and PREVIEW for the owner before deploying** (it reshapes the core home; subjective).
3. **Kill the 3 `window.location.reload()` flashes** (roadmap #7) — reactive state instead.
4. **Smart notifications (roadmap #2)** — highest-leverage *retention* move; plumbing mostly exists.
5. Continue the HomeScreen breakup with the easy sections (daily-word / weekly-review / campus-count), then the hero-audio cluster last.
6. Quick-win polish batch: `--dw-text-faint` AA, scripture skeletons, tab cross-fade, comeback-streak, EmptyState.

---

## 8. How to hand off / continue

- **Memory auto-loads.** `~/.claude/projects/-Users-ashleymarkevans/memory/project_daily_word_platform_polish.md` is updated and loads automatically in future sessions *in this project dir* — the next session already knows the gist.
- **This doc is the durable detail.** Commit it (it's at `docs/SESSION-HANDOFF-2026-06-25.md`). Point a new session at it: *"read docs/SESSION-HANDOFF-2026-06-25.md, then continue the roadmap."*
- **For a fresh non-Claude reader,** sections 1–4 are the orientation; sections 5–6 are the operating manual.
</content>
