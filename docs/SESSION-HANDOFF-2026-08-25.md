# Session handoff — Daily Word deep-dive, 2026-08-25

Written mid-flight so a NEW session (new subscription) can finish the job. The
prior session ran a 17-agent audit + a 14-agent implementation workflow;
**workflow runs die with their session and `resumeFromRunId` is same-session
only** — a new session works from THIS document, the plan JSON, and whatever is
on disk in the worktree.

## The mission (Ashley's words)
Deep dive on futuresdailyword.com AND the relevant tab on futures.church; get
the app fixed; bring in flow experts to improve the interface; get it done.
**TT (token trigger) is active** — lean paths, no second agent fleet, local
code for exact work, tight reports, count tokens.

## Already SHIPPED (futures-church-web, live on prod)
- **PR #937** (merged, live-verified): `futures.church/daily-word-app` — the
  footer/nav "Daily Word" tab — was a **black empty page**: `DAILY_WORD_CSP` in
  `middleware.ts` had no `frame-src`, so the `DailyWordEmbed` iframe of
  futuresdailyword.com was blocked by `default-src 'self'`. Added
  `frame-src https://futuresdailyword.com`, mirrored `GOOGLE_BEACON_HOSTS` into
  its connect-src (Ads conversion pings were CSP-blocked), fixed the embed
  bar's "← Futures Church" link (pointed at /daily-word, i.e. back into the
  app). **Verified rendering live** — screenshot-confirmed, console clean.
- **PR #940** (merged; ⚠️ deploy NOT yet verified): non-forced `/data/*` proxy
  to the app. Library's Bible Characters/Locations/Timeline fetch
  `/data/*.js`; on the church origin they got the Next 404 page rendered as
  "content". **VERIFY:** `curl -s -o /dev/null -w "%{http_code} %{content_type}" https://futures.church/data/characters.js`
  → expect `200 application/javascript` (404/html = build not out yet).

## The audit (complete)
17 agents: 5 code auditors + adversarial verifiers + 6 UX flow experts +
synthesis. **62 confirmed findings, 1 refuted.** Everything lives in
`docs/audit-2026-08-25/dw-plan.json`:
- `synthesis.fix_now` — 18 ranked bug clusters (rank/title/files/plan/source_ids)
- `synthesis.ux_ship_now` — 17 implementable UX improvements
- `synthesis.propose_to_owner` — 8 decisions for Ashley (below)
- `confirmed[]` — the underlying verified findings (id → detail/proposed_fix)
Also in that folder: both workflow scripts (the wave prompts define per-agent
FILE OWNERSHIP and the invariants block — reuse that block for any new agents).

## Implementation state (branch `fix/deep-dive-audit`, THIS worktree)
Worktree: `~/futures-daily-word-audit` (of repo `~/futures-daily-word` —
**do not touch the main tree**; its `feat/reading-experience` WIP is committed
and pushed separately and will need rebasing after this branch merges —
HomeScreen/JournalScreen/i18n overlap).

Wave plan (exclusive file ownership per agent, waves sequential):
1. ✅ **Wave 1** — sync/data-safety (cloudSync.ts, user-sync.js), security
   endpoints (pco-sync, user-profile, lib/auth, tts fns, analytics-dashboard,
   dead-code purge incl. send-push2/nlt), highlights context, streak.ts +
   DoneCelebration, audio (esv-audio 302, api.ts cache key, audioPlayer Media
   Session, ListenButton), PWA (sw.js church-origin guard, manifest unify,
   Seam link → https://futures.church), small components (Comfort*, NewBeliever,
   PastoralReflection, JournalScreen lines).
2. ✅ **Wave 2** — HomeScreen owner (fix_now 3,4,5,6,7,9,10,11,17 + ux 1 parts;
   CampusCountBadge) and PlansScreen owner (fix_now 3,10,11,15 + "Tap a plan"
   copy/behavior mismatch).
3. ⏳ **Wave 3** (was running at handoff) — HomeScreen UX owner (ux 3,5,6,11,
   13,14,16 + kill the false "1 day / Welcome back." chip for brand-new users)
   and nav/IA owner (App.tsx history/back-gesture, MoreScreen, MessagesScreen
   campus picker + admin friction, LibraryScreen, JournalScreen sermon-notes
   step 1, PushOptIn church-origin bridge).
4. ⬜ **Wave 4** — a11y batch (ux_ship_now rank 9 + confirmed A11Y-* findings:
   modal semantics/focus traps, unnamed persona buttons, keyboard verse
   selection, aria-live, Space-key hijack, `<html lang>` on switch).
5. ⬜ **Wave 5** — i18n sweep (ux rank 7: wire ~75 already-translated unused
   keys; key remaining hardcoded strings in ALL FOUR languages en/es/pt-BR/id;
   fix I18N-1 raw-key render on new-believer card).
6. ⬜ **Gate** — `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`,
   `npx vitest run`, eslint on changed files, invariant scan of the diff
   (invariants list is in both workflow scripts — applyCloudData excludes
   journal, applyMisc fill-only, tombstones, LOCAL dates, book-plan hero
   exclusion, push origin gating, no italics, light default, hero panel
   #FFFFFF both themes, 4-language i18n keys).

**On resume:** `git -C ~/futures-daily-word-audit status` tells you where it
stopped. Waves already reflected in the diff stay; finish remaining waves
(agents or by hand — each item's `plan` field in dw-plan.json is precise).
Wave-3 agents may have died MID-EDIT: typecheck first, and diff-review
App.tsx/MoreScreen/MessagesScreen/HomeScreen for half-applied items before
continuing. Deletions so far are intentional (send-push2/, nlt-era dead code,
CampusCountBadge.tsx fabricated-numbers component, data/sermons.ts
consolidation) — but verify each still referenced nowhere before keeping the
deletion.

**KNOWN GAP (assigned to nobody):** fix_now rank 13's app-side parts —
poll.mjs + bug-report.mjs must import shared `lib/cors.js` (their inline
allowlists omit church origins; add origin 403 + rate limit on poll.mjs), and
LibraryScreen's `/data` fetch needs an `r.ok` guard + `API_BASE`-absolute URL.
Do these before the gate.

## After the gate (repo discipline — CLAUDE.md)
1. ONE bounded review of the normalized diff (TT: single reviewer, not a fleet).
2. Commit on `fix/deep-dive-audit` **with hooks enabled** (global
   prepare-commit-msg stamps session/account — never `core.hooksPath=/dev/null`).
   Push. PR to `AEGLOBALUSA/futures-daily-word`.
3. Wait for the Netlify **deploy-preview**; verify in the browser (persona test
   recipe in CLAUDE.md "Gotchas"; deploy-preview /api CORS 403s are a FALSE
   alarm; push path only works on prod/localhost).
4. Squash-merge (git-connected: main = prod), poll deploy to `ready`, verify
   live: first-run flow, plan start → **should now land in the reading**,
   mark-as-read + streak, audio on a long chapter (Psalm 119 — the esv-audio
   502 fix), futures.church/daily-word + /daily-word-app.
5. In-app-browser trap: clicks time out while the pane is hidden (0 rAF) —
   drive flows with `javascript_tool` element .click() instead.

## Owner decisions to put to Ashley (synthesis.propose_to_owner, 8)
1. Re-litigate the first-run gate stack as a whole (persona picker + push ask
   + cookie banner + email moment rebuilt the multi-gate cold start the May
   rework removed; live walk confirmed: no scripture until plan setup).
2. Church-site copy sells an email product that does not exist ("in your
   inbox", "subscribe", **fabricated 300k subscriber figure**) — canon issue,
   run `futures-canon`.
3. Fate of the dead church `app/daily-word/**` doorway (shadowed by the forced
   proxy) + iframe-vs-proxy posture + install nudge.
4. IA restructure: rename Plans → "Read", move Library out of Settings, retire
   duplicated essay readers.
5. Sermon-prep workspace direction (three disjoint note stores today; NOTE:
   `feat/reading-experience` WIP already builds a SermonWorkspace — reconcile,
   don't duplicate).
6. Strongs pipeline: wire GreekHebrewPopup's instant path or retire it (taps
   currently cost a Bible-AI call each).
7. Translated pastoral content backfill (31 comfort devotions have no es/pt —
   crisis-facing content, most vulnerable users least served).
8. Plan catalogue curation (pathway collision, comfort card merge, weekly
   review audience, leader featured row).

## Environment facts (verified this session)
- App: Netlify `futures-daily-word` `5b332733-6735-44a9-90b9-ac21862f2615`,
  git-driven on main. Supabase `uamavjnjvmsopjzxirsd`. FCW: site
  `5d4b5e7e-14cc-44de-a76b-85419b1de3a2`, PRs + admin merge (branch protection
  blocks normal merge; FCW CI billing blocked, checks never arrive).
- API healthy; CORS for futures.church OK. Both origins serve the app; church
  origin has SEPARATE localStorage (users don't carry state between origins —
  the iframe embed partitions storage too).
- The audit found the memory note "`/data/*` is dead on the app" is STALE —
  Library fetches it at runtime now.

## Token accounting (TT)
- Audit workflow: 2,714,425 subagent output tokens, 640 tool uses, 17 agents.
- Implementation workflow: in flight at handoff — totals in its completion
  notification; if the session died first: unavailable.
- Main-loop tokens this session: unavailable (not reported by harness).
