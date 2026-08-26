export const meta = {
  name: 'daily-word-deep-dive',
  description: 'Audit Daily Word app + futures.church integration: bugs verified adversarially, UX flow expert panel, synthesized fix plan',
  phases: [
    { title: 'Code audit', detail: '5 dimension auditors over prod main' },
    { title: 'Verify', detail: 'adversarial verification per dimension' },
    { title: 'Flow experts', detail: '6 UX journey experts' },
    { title: 'Synthesize', detail: 'ranked fix plan' },
  ],
}

const CTX = `
CONTEXT (verified facts — do not re-litigate; violating an invariant below = P0 finding; a proposal that would "simplify away" an invariant is invalid):

REPO under audit (clean read-only checkout of PRODUCTION main, commit 12861a48): /Users/ashleymarkevans/futures-daily-word-audit
Church site repo (for proxy/CSP/nav questions only): /Users/ashleymarkevans/futures-church-web
Read /Users/ashleymarkevans/futures-daily-word-audit/CLAUDE.md first. Repo docs can be stale — current code wins. Do NOT audit or modify ~/futures-daily-word (it carries another session's WIP). Do NOT use browser/preview tools — the orchestrator handles live-site checks. You may curl https://futuresdailyword.com and https://futures.church/daily-word.

- App: React 19 + Vite + Tailwind 4 PWA, ~144 real users incl. pastoral prayer data. Data loss is the #1 risk.
- Prod deploy = git-connected Netlify on main. Live at futuresdailyword.com AND edge-proxied at futures.church/daily-word (rewrites in futures-church-web netlify.toml; CSP set path-scoped in FCW middleware.ts).
- Architecture is DELIBERATELY localStorage-first (~45 dw_* keys) with cloud backup via netlify/functions/user-sync.js. Zero client-side Supabase; all DB access via ~26 Netlify functions using service_role. Do not propose Supabase Auth / magic links / a v2 rebuild — owner rejected that.
- LOAD-BEARING INVARIANTS (each one cost real user data before): applyCloudData must NOT include journal in jsonFields (syncOnStartup tombstone merge is authoritative); applyMisc is FILL-ONLY; deletes are tombstones (deleted:true), never hard; plan/reading-day logic uses LOCAL dates via toLocaleDateString('en-CA'), never UTC toISOString slices; book plans (plan.bookId) are EXCLUDED from todaysPlanPassages/prefetch (book content renders in the PlansScreen reader); pushSupported() gates native push to futuresdailyword.com/www/localhost with calendar fallback elsewhere, every push await timeout-bounded; /sw.js is deliberately NOT proxied on futures.church (kill-switch in FCW public/sw.js — never suggest re-proxying); NLT bible is removed (no API key); the real stylesheet is src/index.css (root styles.css is dead).
- THE LOOK IS OWNER-LOCKED: light theme default, ivory #FAF6EF, terracotta #A8552F, editorial/minimal/bright/warm, no italics, hero reading panel stays light #FFFFFF in BOTH themes, Georgia serif stack (the DM Serif woff2 is banned — the file is secretly an italic face). Recommend flow/interaction/content changes, NOT a restyle.
- Personas: new_to_faith, pastor_leader, congregation, deeper_study, comfort. i18n: en/es/pt-BR/id via src/utils/i18n.ts; t() returns the raw key when missing.
- Recent history on main: #38-39 owner-directed reskin, #42 plans overhaul, #45 day rollover on focus, #46 every-plan-clicks-to-scripture, #47 church-proxy fixes, #48 calendar fallback, #49 push opt-in trap fix, #50 Pulse Insights collector, #51 "Restore the API (all functions were 502)", #52 header truncation, #53 Bible AI markdown, #54 session-token silent de-auth fix.
- node_modules may still be installing in the audit worktree (log: /tmp/dw-npm-ci.log). Prefer reading code + node one-liners over full builds.

Your final message must be RAW data per the schema only.`

const FINDINGS_SCHEMA = {
  type: 'object', required: ['findings'], additionalProperties: false,
  properties: { findings: { type: 'array', items: {
    type: 'object', required: ['id', 'title', 'severity', 'file', 'detail', 'proposed_fix'], additionalProperties: false,
    properties: {
      id: { type: 'string' }, title: { type: 'string' },
      severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
      file: { type: 'string' }, line: { type: 'number' },
      detail: { type: 'string', description: 'What is wrong, with concrete evidence (code cited). Include the failure scenario: inputs/state -> wrong outcome.' },
      proposed_fix: { type: 'string' },
    } } } },
}

const VERDICTS_SCHEMA = {
  type: 'object', required: ['verdicts'], additionalProperties: false,
  properties: { verdicts: { type: 'array', items: {
    type: 'object', required: ['id', 'verdict', 'reason'], additionalProperties: false,
    properties: { id: { type: 'string' }, verdict: { type: 'string', enum: ['CONFIRMED', 'REFUTED', 'UNCERTAIN'] }, reason: { type: 'string' } } } } },
}

const UX_SCHEMA = {
  type: 'object', required: ['flow_walkthrough', 'recommendations'], additionalProperties: false,
  properties: {
    flow_walkthrough: { type: 'string', description: 'Step-by-step of what the user actually experiences in this journey per the CODE, with screen/component names and every decision/tap counted.' },
    recommendations: { type: 'array', items: {
      type: 'object', required: ['id', 'title', 'impact', 'effort', 'detail', 'concrete_change'], additionalProperties: false,
      properties: {
        id: { type: 'string' }, title: { type: 'string' },
        impact: { type: 'string', enum: ['high', 'medium', 'low'] },
        effort: { type: 'string', enum: ['small', 'medium', 'large'] },
        detail: { type: 'string', description: 'The friction/problem and why it matters for this journey' },
        concrete_change: { type: 'string', description: 'Exactly what to change: files, components, copy, behavior' },
      } } } },
}

const CODE_DIMS = [
  { key: 'sync-data', prompt: `You are auditing DATA INTEGRITY & SYNC. Files: src/utils/cloudSync.ts, src/utils/storage.ts (if present), netlify/functions/user-sync.js, and every localStorage writer/reader you can find (grep "localStorage" and "dw_"). Hunt: violations of the sync invariants in CONTEXT; race conditions between syncOnStartup/applyCloudData/pushNow/flushNow; the 64KB keepalive cap handling; tombstone merge correctness incl. the 180-day prune; dw_misc_meta newest-wins vs fill-only classification; quota-exceeded handling; the dual-write to sync_user_data_to_normalized being genuinely non-fatal; any path where a user's journal, highlights, prayed-for list, streaks or plan state can be lost, duplicated, resurrected, or cross-contaminated between devices. Verify each claim against actual current code with line numbers.` },
  { key: 'functions-api', prompt: `You are auditing the NETLIFY FUNCTIONS BACKEND (netlify/functions/*). Hunt: auth/session-token handling bugs (PR #54 fixed a silent de-auth — check for remaining instances of that class); what caused the all-functions-502 incident (#51) and whether that failure class is structurally prevented now; input validation and injection; secrets required-but-missing at runtime; CORS coverage via lib/cors.js (which functions skip it); error responses that leak internals; push-cron.js + push-send.js + push-subscribe.js correctness — especially REMINDER TIME AND TIMEZONE handling (users pick a local reminder time; what timezone does the cron fire in?); rate limiting / abuse exposure on expensive endpoints (claude.js AI, elevenlabs-tts.js, polly-tts.js, video-upload.js); dead endpoints (nlt.js — NLT is removed); pastor-admin.js and analytics-dashboard.js / export-profiles.js access control (who can call them?).` },
  { key: 'scripture-reading', prompt: `You are auditing the SCRIPTURE & READING PIPELINE. Files: src/screens/HomeScreen.tsx (the hero + plan-driven scripture), src/components/ScripturePassage.tsx, ScriptureBlock.tsx, src/data/plans.ts, src/utils around passage fetching (fetchPassage/fetchKJV/_doFetch), the audio chain (audioPlayer, ListenButton, esv-audio/tts functions from the client side), and PlansScreen.tsx. Hunt: date-axis violations (LOCAL vs UTC) in plan-day/reading-done/streak logic; rollover-on-focus correctness (#45) incl. midnight-crossing while app open; plan boundaries (day 1, final day, past-end); book-plan exclusion holding everywhere; passage reference parsing edge cases (multi-chapter refs, Psalm 119, single-verse books); empty/error render states (what does the user see when a fetch fails offline?); translation fallback chain; audio play/pause state machine bugs (the TDZ unsub trap class); the "every plan click through to scripture" guarantee (#46) still holding for all 21 plans (verify plan data referential integrity across PLAN_PRIORITY_BY_SIGNAL, SetupPromptModal DEFAULT_FEATURED + PERSONA_PLANS, PlansScreen PERSONA_PRIORITY, PastorStudyOnboarding picker groups — a plan id referenced anywhere but not defined in plans.ts = P0).` },
  { key: 'i18n-a11y', prompt: `You are auditing I18N COMPLETENESS and ACCESSIBILITY. i18n: src/utils/i18n.ts holds en/es/pt-BR/id. Write a quick node script to extract the key sets per language and diff them — list every key missing from any language (t() falls back to the RAW KEY on screen, so each gap is user-visible garbage). Then grep screens/components for hardcoded English strings that bypass t() entirely (buttons, empty states, aria-labels, toasts). A11y: modal focus management (EmailGate, SetupPromptModal, PushOptIn, drawers), aria-labels on icon-only buttons (play/pause, day arrows, tab bar), touch-target sizes, keyboard operability of the highlight toolbar and hero controls, prefers-reduced-motion coverage, and contrast ONLY where it deviates from the locked palette in CONTEXT (the palette itself is settled; do not relitigate it).` },
  { key: 'pwa-proxy', prompt: `You are auditing PWA + CHURCH-PROXY INTEGRATION. App side: public/sw.js (or equivalent) caching strategy and update flow, index.html fdw_nuked block, manifest.json, offline.html, deep-link handling. Proxy side (repo /Users/ashleymarkevans/futures-church-web): the /daily-word rewrites in netlify.toml, DAILY_WORD_CSP in middleware.ts (does it still cover every origin the CURRENT app code calls — check #50 Pulse collector, tts/audio origins, Cloudinary), and the church nav/homepage: WHERE is Daily Word linked on futures.church today (grep the FCW app/ for daily-word links)? Specific questions: when the SPA runs under futures.church/daily-word, does client-side routing rewrite the URL to church-root paths (e.g. history.pushState to '/') such that a refresh or shared link lands on the wrong page? Does every runtime asset the app requests resolve through the proxy list (assets/bible/books/fonts/essays/sermons/manifest) — anything new on main that is NOT proxied and thus 404s/SPA-fallbacks on the church origin? Is SRI (integrity attributes) consistent through the proxy? Does the app's SW try to register on the church origin and what happens given /sw.js is not proxied (this must stay a no-op — confirm it fails silently, no console spam, no broken offline)? curl both origins to compare served HTML.` },
]

const UX_DIMS = [
  { key: 'first-run', prompt: `You are a UX flow expert on FIRST-RUN ONBOARDING. Walk the code path of a brand-new visitor on a phone: what renders first, every decision/tap/modal between cold load and actually reading scripture. Components: the welcome/persona screen, SetupPromptModal, EmailGate, PushOptIn, PathwayPicker, PastorStudyOnboarding. HISTORY YOU MUST RECONCILE: a 2026-05-21 rework (PRs #4-#10) deliberately removed the full-screen persona tollgate so first run defaulted to persona=congregation and landed straight on content (7 cold-start decisions -> content). The live site TODAY shows a full-screen "Welcome to Daily Word / Where are you?" persona picker as screen one. Use git log/blame to determine when and why that returned (deliberate in the #38-39 reskin, or regression?), then judge the CURRENT total friction honestly: count decisions to first scripture for each persona answer, including what EmailGate and PushOptIn add and when they fire. Recommend the minimal-friction flow that still captures persona+email without losing the owner-approved editorial feel.` },
  { key: 'daily-loop', prompt: `You are a UX flow expert on the DAILY RETURN VISIT — the core habit loop. Walk the code path of a returning user with an active plan: open app -> today's reading -> read/listen -> mark done -> streak/celebration -> tomorrow. Components: HomeScreen hero (photo-plate carousel = one big play button, day arrows), ScripturePassage, DoneCelebration, WeeklyReviewCard, streak logic, InlineReflection, the journal hand-off. Evaluate: is "today's reading" unmistakably THE thing on screen one? How many taps to yesterday's / tomorrow's? Is done-marking satisfying and unambiguous? Does the streak survive real life (missed a day, timezone travel, read at 11:58pm)? Is audio-first usage (commuters) first-class — lock-screen/background behavior, resume position? Where does the loop leak users? Recommend concrete changes that deepen the habit loop without gamification kitsch and without touching the locked look.` },
  { key: 'comfort-newfaith', prompt: `You are a UX flow expert on the VULNERABLE-USER JOURNEYS: persona comfort ("I need comfort right now") and new_to_faith ("I'm new to this"). Walk both code paths end-to-end: what each persona sees on Home (sectionOrder), ComfortSection/ComfortCard, NewBelieverLessonCard, pathway enrollment, their plan defaults, the tone of every string shown. Judge: does someone in crisis reach comforting content in seconds or hit setup friction? Does a brand-new believer get orientation or get dropped into deep water? Are the next-step ladders (lesson -> pathway -> plan) coherent and visible? Is the language warm and non-churchy-jargon for someone with zero background? Recommend concrete flow/copy/content-order changes.` },
  { key: 'pastor-leader', prompt: `You are a UX flow expert on the PASTOR/LEADER JOURNEY. Walk the code: persona pastor_leader Home experience, PastorStudyOnboarding wizard (all steps and picker groups), SermonNotesScreen, PastoralReflectionSection, GreekHebrewPopup/Strongs and deep-study tools, pastor-admin surface if user-facing. Judge: does the wizard earn its length? Does a busy pastor get a distinct, obviously-for-me experience vs congregation, or a reskin of the same feed? Is sermon-note capture fast enough to use mid-prep (taps to a saved note)? Are study tools discoverable from the passage or buried? NOTE: a sermon-workspace feature is in-flight on another branch — do not design it, but flag where it should slot into the flow. Recommend concrete changes.` },
  { key: 'nav-ia', prompt: `You are a UX/IA expert on NAVIGATION & INFORMATION ARCHITECTURE. Map the full surface from code: TabBar tabs (Home, Journal, Library, Messages, More + PlansScreen, SermonNotesScreen — which are reachable from where), everything inside MoreScreen, and every feature's discovery path (Bible search, Bible AI, highlights, prayer wall/globe, polls, campus content, essays/books/sermons libraries, theme, language, reminders, export). Judge: do the tab names match user intent (is "Library" vs "Plans" vs "Messages" clear)? What high-value features are buried in More that deserve surfacing? What is dead weight or duplicated? Is there any orphan screen with no entry point, or entry points to nothing? How does back/gesture navigation behave between screens (SPA state vs URL)? Recommend a concrete IA: what the tabs should be, what moves up, what merges, what dies — while keeping change scope realistic (this ships incrementally, no ground-up rebuild).` },
  { key: 'church-entry', prompt: `You are a UX flow expert on the CHURCH-SITE ENTRY JOURNEY: a futures.church visitor discovering and entering Daily Word. In /Users/ashleymarkevans/futures-church-web, find every Daily Word touchpoint: nav entry, homepage card/section, footer, sitemap, any /daily-word marketing copy. Walk: what does a church visitor see that tells them Daily Word exists and why they'd want it? When they click through to the proxied app, is the hand-off coherent (branding continuity, does the church header/nav disappear, can they get back)? What happens to shared/bookmarked links on each origin (og/meta tags for /daily-word — what does a shared link preview show)? Does the app inside the church origin nudge users to the native/installable experience at futuresdailyword.com (should it?), given push notifications only work on the app's own origin? Judge whether the current entry sells the app at all, and recommend concrete changes on BOTH repos (entry-point placement/copy on the church side; landing/hand-off behavior on the app side).` },
]

log('Launching 5 code auditors and 6 UX flow experts over prod main (12861a48)')

const bugPipeline = pipeline(
  CODE_DIMS,
  d => agent(`${d.prompt}\n${CTX}`, { label: `audit:${d.key}`, phase: 'Code audit', schema: FINDINGS_SCHEMA }),
  (res, d) => {
    if (!res || !res.findings || res.findings.length === 0) return { key: d.key, findings: [], verdicts: [] }
    return agent(
      `You are an adversarial verifier. Another auditor reported the findings below about the Daily Word codebase. For EACH finding, open the actual code and try to REFUTE it: is the claimed behavior real on current main, is the failure scenario actually reachable, is the severity honest? A finding whose "fix" would violate one of the LOAD-BEARING INVARIANTS in CONTEXT is automatically REFUTED. Default to REFUTED when the evidence is weak; use UNCERTAIN only when you genuinely cannot determine it from code. Keep the finding ids exactly as given.\n\nFINDINGS:\n${JSON.stringify(res.findings, null, 2)}\n${CTX}`,
      { label: `verify:${d.key}`, phase: 'Verify', schema: VERDICTS_SCHEMA }
    ).then(v => ({ key: d.key, findings: res.findings, verdicts: (v && v.verdicts) || [] }))
  }
)

const uxPanel = parallel(UX_DIMS.map(d => () =>
  agent(`${d.prompt}\n${CTX}`, { label: `flow:${d.key}`, phase: 'Flow experts', schema: UX_SCHEMA })
    .then(r => ({ key: d.key, ...r }))
))

const [bugResults, uxResults] = await Promise.all([bugPipeline, uxPanel])

const dims = bugResults.filter(Boolean)
const confirmed = [], uncertain = [], refuted = []
for (const dim of dims) {
  const vmap = {}
  for (const v of dim.verdicts) vmap[v.id] = v
  for (const f of dim.findings) {
    const v = vmap[f.id]
    const entry = { ...f, area: dim.key, verify_reason: v ? v.reason : 'no verdict returned' }
    if (v && v.verdict === 'CONFIRMED') confirmed.push(entry)
    else if (v && v.verdict === 'UNCERTAIN') uncertain.push(entry)
    else refuted.push(entry)
  }
}
const ux = uxResults.filter(Boolean)
log(`Bugs: ${confirmed.length} confirmed, ${uncertain.length} uncertain, ${refuted.length} refuted. UX experts reporting: ${ux.length}/6`)

const SYNTH_SCHEMA = {
  type: 'object', required: ['summary', 'fix_now', 'ux_ship_now', 'propose_to_owner'], additionalProperties: false,
  properties: {
    summary: { type: 'string', description: 'Honest 1-paragraph state-of-the-app verdict' },
    fix_now: { type: 'array', items: { type: 'object', required: ['rank', 'title', 'files', 'plan'], additionalProperties: false, properties: { rank: { type: 'number' }, title: { type: 'string' }, files: { type: 'string' }, plan: { type: 'string' }, source_ids: { type: 'array', items: { type: 'string' } } } }, description: 'Confirmed bugs worth fixing, ranked' },
    ux_ship_now: { type: 'array', items: { type: 'object', required: ['rank', 'title', 'files', 'plan'], additionalProperties: false, properties: { rank: { type: 'number' }, title: { type: 'string' }, files: { type: 'string' }, plan: { type: 'string' }, source_ids: { type: 'array', items: { type: 'string' } } } }, description: 'Small/medium-effort high-impact UX changes implementable this session without owner sign-off (no look changes, no data-model changes)' },
    propose_to_owner: { type: 'array', items: { type: 'object', required: ['title', 'why', 'scope'], additionalProperties: false, properties: { title: { type: 'string' }, why: { type: 'string' }, scope: { type: 'string' } } }, description: 'Larger or taste-level changes Ashley should decide on' },
  },
}

const synthesis = await agent(
  `You are the synthesis lead for a deep audit of the Futures Daily Word app. Merge the verified bug findings and the 6 UX flow-expert reports below into ONE ranked execution plan. Rules: dedupe overlapping recommendations; anything touching the owner-locked look, the data model, or requiring owner taste goes in propose_to_owner, NOT ux_ship_now; ux_ship_now items must be concretely implementable (name files/components) and must not violate the CONTEXT invariants; rank by user impact for a ~144-user daily-habit app where data safety and the daily reading loop matter most; UNCERTAIN bugs may appear in fix_now only if cheap to fix and harmless if the report was wrong. Sanity-check recommendations against the code when they conflict with each other.\n\nCONFIRMED BUGS:\n${JSON.stringify(confirmed, null, 2)}\n\nUNCERTAIN:\n${JSON.stringify(uncertain, null, 2)}\n\nUX REPORTS:\n${JSON.stringify(ux, null, 2)}\n${CTX}`,
  { label: 'synthesis', phase: 'Synthesize', schema: SYNTH_SCHEMA, effort: 'high' }
)

return { synthesis, confirmed, uncertain, refutedCount: refuted.length, ux }