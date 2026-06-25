# CLAUDE.md — Futures Daily Word

Standing context for any Claude Code session in this repo. (Session-by-session history +
the full roadmap live in `docs/SESSION-HANDOFF-2026-06-25.md` — read it before big work.)

## What this is
A devotional / Bible-study PWA, live at **https://futuresdailyword.com**.
React 19 + Vite 6 + Tailwind 4 + TypeScript. **localStorage-first** (~45 `dw_*` keys) with a
Supabase cloud-backup layer. The home screen is **persona-driven** — the persona
(`new_to_faith / congregation / deeper_study / pastor_leader / comfort`) re-orders everything
via `sectionOrder` in `src/utils/persona-config.ts`.

## Commands
- Build / typecheck: `npm run build` (`tsc -b && vite build`) — run this to verify a change.
- Typecheck only: `npx tsc -b`
- Lint: `npm run lint` (note: the repo has many pre-existing `no-empty` / `any` lint findings; the build does **not** run lint).
- Tests: `npx vitest run` (sparse coverage).
- Preview (don't use raw `vite dev` for verification): the `.claude/launch.json` server is named **`dw-dev`** — use the `preview_*` MCP tools (`preview_start` → drive the flow → `preview_console_logs`/`preview_snapshot`).

## Architecture orientation
- **Real stylesheet is `src/index.css`.** The root `styles.css` is DEAD (not imported) — ignore it.
- **Cloud sync:** `src/utils/cloudSync.ts` ⇄ netlify `netlify/functions/user-sync.js` ⇄ Supabase table `public.user_data`. The server **whitelists columns**; the long tail of small keys rides in one `misc` JSONB column (timestamped newest-wins via `dw_misc_meta`; free-text keys are fill-only). Use `syncMisc(key, value)` / `pushNow()` / `flushNow()`.
- **Cross-component updates** go through `window` CustomEvents (`dw-journal-updated`, `dw-cloud-sync`, `dw-lang-changed`, …), not a store.
- **Streak:** one source of truth — `src/utils/streak.ts`; call `recordStreakToday()` for any "engagement" action (idempotent per day).
- **Storage registry:** `src/utils/storage.ts` (`LS` key constants + typed helpers). Adopt it in new code; the bulk of old call sites still use inline strings.
- **AI endpoint:** `POST /.netlify/functions/claude` → `data.content[0].text`.
- **Infra:** Supabase project ref `uamavjnjvmsopjzxirsd`; Netlify site `futures-daily-word` (id `5b332733-6735-44a9-90b9-ac21862f2615`). URLs/keys are **Netlify env, not in the repo** — read via the Netlify MCP env reader, never echo secrets.

## Deploy
**Git-connected auto-deploy on `main`.** Merge to `main` → Netlify builds → live. Every PR gets a `deploy-preview` build. Standard flow used here:
> branch → implement → **gated review** → live preview check → commit → PR → wait for `deploy-preview` to pass → squash-merge → poll the prod deploy to `ready` → verify the live artifact.
Keep this discipline — the pre-deploy review caught 3 real bugs (2 data-loss, 1 sync) this far. Don't push to `main` directly; don't commit/push unless asked.

## Conventions
- **Gated review before prod.** For risky/behavior-changing work, run an adversarial pre-deploy review (a Workflow of dimension-reviewers + adversarial verify) and fix what it finds before merging. Pure refactors get a normalized-diff "fidelity + residue" review.
- **Extraction recipe** (proven for breaking up the big HomeScreen): dependency-analysis agent → name-match props so the JSX moves *verbatim* → `sed` the block out, `perl -ni` delete from HomeScreen, insert `<Comp/>` at the **same gate + render position** → tsc/build → live persona test → review → ship.
- **i18n:** `t()` returns the raw key if missing — add new UI strings to `src/utils/i18n.ts` (existing entries use `\uXXXX` escapes). `<html lang>` follows `dw_lang` on boot.

## Gotchas (real traps — read before touching)
- **Dead `devotion_scripture` section:** `HomeScreen` gates a "Today's Reading" block on `sectionOrder.includes('devotion_scripture')`, but **no persona has that key** → it never renders. The live daily reflection is in the **hero reading panel** (`InlineReflection`), not there.
- **KJV offline reader dumps raw JSON** for object-shaped chapter files (`fetchKJV` in `src/utils/api.ts` only handles the array shape) — there's a spawned task to fix it. Prod default is ESV, so most users don't hit it.
- **The hero reading panel is light (#FFFFFF) in BOTH themes** (fresh "Bible-app" reskin, 2026-06-25) and force-sets *dark* color vars inline — keep scripture color `var(--dw-text-secondary)`. The old `[style*="border-radius: 24px"][style*="overflow: hidden"] *` blanket-white rule was **removed** because it whitened this light panel; hero controls get white from the hero content div's own inline `color:#fff`. Don't re-add a blanket white override, and don't revert the panel to dark.
- **`--font-serif-text` is a Georgia stack, NOT DM Serif Text.** The bundled "DM Serif Text — normal" woff2 is itself an *italic* typeface, so scripture rendered slanted even with `fontStyle:normal`. The Georgia stack renders the upright reading serif. Italics are now reserved for special purposes only — don't reintroduce `fontStyle:'italic'` on body/scripture/reflection text.
- **`keepalive` fetch caps body at 64KB** — the flush only enables it under 60KB; don't blanket-enable on the big push.
- **`setup.source` is write-only** (never branched on). Real persona choices use `onboarding`/`settings`/`upgrade` (these stamp + cross-device sync); auto-defaults use `default`/`sunday-guest` (must NOT stamp).
- **Persona testing in preview:** set `dw_setup={persona:X,source:'settings'}`, `dw_profile={email,firstName}`, `dw_cookie_consent='accepted'`, `dw_v7_pathway_done='true'`. The hero shows readable scripture only with an active plan or **reading slots** (`dw_reading_slots=[{id,book,currentChapter}]` + `dw_chapters_per_day`). KJV loads offline (raw-JSON caveat); ESV needs the netlify fn (won't load in plain `vite dev`). new_to_faith also needs `dw_pathway_progress={enrolled:true,currentDay:1,completedDays:[]}`.

## What's next (roadmap — see the handoff doc for detail)
Highest-leverage user-facing move is the **TodayCard**: a read-first hero (auto-expand scripture, demote the big play button) with the inline reflection (shipped) and a calm "done" moment — **preview it for the owner before deploying** (it reshapes the core UX). Then: kill the 3 `window.location.reload()` flashes (reactive state); smart self-scheduled notifications; finish the HomeScreen breakup (easy sections first, hero-audio cluster last).
