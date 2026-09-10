export const meta = {
  name: 'dw-experience-design',
  description: 'Design the Daily Word experience per path: map live surfaces, 3 designers per path, judge, UX rulings, verify, synthesise',
  phases: [
    { title: 'Understand', detail: 'readers map live surfaces, rulings, habit machinery' },
    { title: 'Design', detail: 'three opus designers per path, two per cross-cutting topic' },
    { title: 'Judge', detail: 'one opus judge per item, synthesises the winner with grafts' },
    { title: 'UX rulings', detail: 'ux-reviewer against his settled rulings, then repair' },
    { title: 'Verify', detail: 'three lenses per design: research fidelity, rulings, phone and no-dev' },
    { title: 'Synthesise', detail: 'completeness critic, then the design spec document' },
  ],
}

const baseAgent = agent
async function agentR(p, o) { try { return await baseAgent(p, o) } catch (e) { const m = String(e && e.message); if (m.includes('session limit')) throw e; log(`retrying ${o && o.label}: ${m.slice(0,80)}`); return await baseAgent(p, o) } }

const REPO = '/Users/ashleymarkevans/futures-daily-word'
const RESEARCH = REPO + '/docs/PERSONA-RESEARCH-2026-09-10.md'
const RULINGS = '/private/tmp/claude-501/-Users-ashleymarkevans/f2165489-76e2-473f-94a8-8b0fd9a92fc2/scratchpad/dw-rulings.md'
const OUT = REPO + '/docs/DESIGN-EXPERIENCE-2026-09-10.md'
const OUT_JSON = '/private/tmp/claude-501/-Users-ashleymarkevans/f2165489-76e2-473f-94a8-8b0fd9a92fc2/scratchpad/dw-designs.json'

const PATHS = [
  { id: 'new_to_faith', label: 'New to faith and returning', persona: 1, section: 'Persona 1 — New Christian, and back to faith', surfaces: 'src/components/NewBelieverLessonCard.tsx, src/components/Day1Landing.tsx, src/components/Day1Reading.tsx, src/components/NewToFaithButton.tsx, the new_to_faith branches of src/screens/HomeScreen.tsx and src/utils/persona-config.ts, src/screens/home-journey.test.ts' },
  { id: 'congregation', label: 'Congregation, the 3-minute devotional reader', persona: 2, section: 'Persona 2 — The average devotional Christian', surfaces: 'the congregation branches of src/screens/HomeScreen.tsx (hero reading, InlineReflection, DailyWordCard), src/components/DailyWordCard.tsx, src/components/ReadingActionBar.tsx, src/sections/*.tsx, src/utils/persona-config.ts, src/screens/home-hero-reading.test.ts' },
  { id: 'deeper_study', label: 'Deeper study, the devout daily reader', persona: 3, section: 'Persona 3 — The devout follower', surfaces: 'the deeper_study branches of src/screens/HomeScreen.tsx (commentary, Compare, original languages, study sheet), src/components/BibleAI.tsx, src/components/BibleSearch.tsx, src/screens/PlansScreen.tsx, src/data/plans.ts, src/data/commentary.ts, netlify/functions/strongs.js, the audio functions (esv-audio.js, biblebrain-audio.js, apibible-audio.js, elevenlabs-tts.js, polly-tts.js), src/components/AudioWave.tsx, src/components/StopAllAudio.tsx' },
  { id: 'pastor_leader', label: 'Pastor and leader', persona: 5, section: 'Persona 5 — The pastor', surfaces: 'src/components/PastorStudyOnboarding.tsx, src/screens/PreachScreen.tsx, src/components/SermonWorkspace.tsx, src/screens/SermonNotesScreen.tsx, src/components/SermonNotesSurface.tsx, src/components/StudySourcesCard.tsx, netlify/functions/study.js, src/utils/study.ts, src/utils/preachOutline.ts, src/data/preach-frameworks.ts, the pastor floor of src/screens/HomeScreen.tsx, src/screens/home-pastor-floor.test.ts, src/components/BibleAI.pastor.test.tsx' },
  { id: 'comfort', label: 'Comfort, the person in crisis', persona: 6, section: 'Persona 6 — The person in crisis', surfaces: 'src/components/ComfortSection.tsx, the comfort branches of src/screens/HomeScreen.tsx and src/utils/persona-config.ts, comfort plans in src/data/plans.ts, netlify/functions/prayer-wall.js and src/components/PrayerGlobe.tsx, any crisis or safety handling in src/components/BibleAI.tsx and netlify/functions/claude.js (grep 988, crisis, suicide, self-harm, lifeline)' },
]

const TOPICS = [
  { id: 'comfort_everywhere', label: 'Comfort reachable from every path', brief: 'A persistent one-tap comfort door from every path that opens comfort without switching the saved path; a crisis-language safety flow in Bible AI and prayer requests that confirms gently then shows the region-correct line (988 US, 13 11 14 AU, 0800 543 354 NZ) by the reader\'s congregation; a human next step (prayer request to a real campus pastor, a "when it is bad" card the person fills in once); disclosure on first use that this is scripture and a church, not counselling; NO streak, count, complete or graduation prompt inside comfort.' },
  { id: 'reminders_and_grace', label: 'Reminders, streaks and grace', brief: 'One reminder a day at most; after 5-7 sessions infer the hour the person actually opens and move the reminder there (the current picker is a user-set hour, netlify/functions/push-send.js and push-cron.js hourly, MoreScreen picker); neutral wording, never "your streak is about to die"; streak repair on a missed day (src/utils/streak.ts already has one freeze per week: design the surface and the words); identity language ("you read five days most weeks") not loss language; what the weekly review says.' },
  { id: 'instrumentation', label: 'Instrumentation the design needs', brief: 'The event model that lets Ashley test every claim in the research: D1/D7/D30 by path, session length, reading completion, reminder opt-out, comfort-tap reach, study-collapsed vs open, audio use. Today: src/utils/analytics.ts fires GA4 plus a Supabase activity event for a whitelist, netlify/functions/analytics-dashboard.js and src/components/AnalyticsDashboard.tsx exist. Design the minimum event set, the nightly rollup, and the one dashboard card per persona that answers "is this path working", self-serve, no future dev step.' },
  { id: 'seasonal_reads', label: 'Church-wide seasonal reads', brief: 'Time-boxed church-wide reads (21-day, 40-day: Lent, New Year, a Futures series) with a live "people reading today" count, joinable from congregation and deeper_study with one tap, run by a campus pastor through the existing intake or campus-content function without a developer; how it lands on Home, how it ends, what the person keeps afterwards.' },
]

const RULINGS_SCHEMA = { type: 'object', properties: { rulings: { type: 'array', items: { type: 'object', properties: { rule: { type: 'string' }, source: { type: 'string' }, applies_to: { type: 'string' } }, required: ['rule', 'source', 'applies_to'] } }, locked_look: { type: 'string' }, preview_gate: { type: 'string' } }, required: ['rulings', 'locked_look', 'preview_gate'] }

const MAP_SCHEMA = { type: 'object', properties: { summary: { type: 'string' }, renders_in_order: { type: 'array', items: { type: 'object', properties: { element: { type: 'string' }, file_line: { type: 'string' }, gate: { type: 'string' }, what_it_does: { type: 'string' } }, required: ['element', 'file_line', 'gate', 'what_it_does'] } }, first_visit: { type: 'string' }, return_visit: { type: 'string' }, completion_and_streak: { type: 'string' }, audio: { type: 'string' }, ai: { type: 'string' }, copy_keys: { type: 'array', items: { type: 'string' } }, self_serve_levers: { type: 'array', items: { type: 'string' } }, dev_needed_today: { type: 'array', items: { type: 'string' } }, tests_that_lock_behaviour: { type: 'array', items: { type: 'string' } } }, required: ['summary', 'renders_in_order', 'first_visit', 'return_visit', 'completion_and_streak', 'audio', 'ai', 'copy_keys', 'self_serve_levers', 'dev_needed_today', 'tests_that_lock_behaviour'] }

const SCREEN = { type: 'object', properties: { name: { type: 'string' }, purpose: { type: 'string' }, order: { type: 'array', items: { type: 'string' } }, copy: { type: 'array', items: { type: 'object', properties: { element: { type: 'string' }, text: { type: 'string' } }, required: ['element', 'text'] } }, states: { type: 'array', items: { type: 'string' } }, keep: { type: 'array', items: { type: 'string' } }, change: { type: 'array', items: { type: 'string' } }, remove: { type: 'array', items: { type: 'string' } } }, required: ['name', 'purpose', 'order', 'copy', 'states', 'keep', 'change', 'remove'] }

const DESIGN_SCHEMA = { type: 'object', properties: {
  item: { type: 'string' }, angle: { type: 'string' }, thesis: { type: 'string' },
  principles: { type: 'array', items: { type: 'string' } },
  journey: { type: 'object', properties: { day0: { type: 'string' }, first_session: { type: 'string' }, return_visit: { type: 'string' }, week2: { type: 'string' }, missed_day: { type: 'string' }, seasonal: { type: 'string' } }, required: ['day0', 'first_session', 'return_visit', 'week2', 'missed_day', 'seasonal'] },
  screens: { type: 'array', items: SCREEN },
  comfort_access: { type: 'string' }, reminders: { type: 'string' },
  instrumentation: { type: 'array', items: { type: 'string' } },
  self_serve_levers: { type: 'array', items: { type: 'string' } },
  evidence: { type: 'array', items: { type: 'object', properties: { move: { type: 'string' }, source: { type: 'string' } }, required: ['move', 'source'] } },
  open_decisions: { type: 'array', items: { type: 'string' } },
  risks: { type: 'array', items: { type: 'string' } },
  build_steps: { type: 'array', items: { type: 'object', properties: { step: { type: 'string' }, files: { type: 'string' }, check: { type: 'string' } }, required: ['step', 'files', 'check'] } },
}, required: ['item', 'angle', 'thesis', 'principles', 'journey', 'screens', 'comfort_access', 'reminders', 'instrumentation', 'self_serve_levers', 'evidence', 'open_decisions', 'risks', 'build_steps'] }

const JUDGE_SCHEMA = { type: 'object', properties: { scores: { type: 'array', items: { type: 'object', properties: { index: { type: 'number' }, angle: { type: 'string' }, score: { type: 'number' }, why: { type: 'string' } }, required: ['index', 'angle', 'score', 'why'] } }, winner_index: { type: 'number' }, grafted: { type: 'array', items: { type: 'string' } }, rejected_with_reason: { type: 'array', items: { type: 'string' } }, synthesis: DESIGN_SCHEMA }, required: ['scores', 'winner_index', 'grafted', 'rejected_with_reason', 'synthesis'] }

const FINDINGS_SCHEMA = { type: 'object', properties: { findings: { type: 'array', items: { type: 'object', properties: { element: { type: 'string' }, ruling: { type: 'string' }, severity: { type: 'string' }, change: { type: 'string' } }, required: ['element', 'ruling', 'severity', 'change'] } } }, required: ['findings'] }

const VERDICT_SCHEMA = { type: 'object', properties: { lens: { type: 'string' }, refuted: { type: 'boolean' }, issues: { type: 'array', items: { type: 'object', properties: { move: { type: 'string' }, problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' } }, required: ['move', 'problem', 'evidence', 'fix'] } } }, required: ['lens', 'refuted', 'issues'] }

const GAPS_SCHEMA = { type: 'object', properties: { gaps: { type: 'array', items: { type: 'object', properties: { gap: { type: 'string' }, why_it_matters: { type: 'string' }, who_decides: { type: 'string' } }, required: ['gap', 'why_it_matters', 'who_decides'] } }, contradictions_between_designs: { type: 'array', items: { type: 'string' } } }, required: ['gaps', 'contradictions_between_designs'] }

const CONTEXT = `Product: Futures Daily Word, a devotional and Bible-study PWA at futuresdailyword.com for Futures Church (USA, Australia, Futuros Spanish), repo ${REPO}, React 19 + Vite, localStorage-first with Supabase sync. Ashley Evans (he/him) is the pastor, the owner and the ONLY developer; congregations use it on phones. The app has five saved paths chosen in one bottom sheet ("Where are you today?"): new_to_faith, congregation, deeper_study, pastor_leader, comfort. Read ${RESEARCH} first: it is the sourced research these designs must follow. Read the rulings packet ${RULINGS}: it is what Ashley has already decided and it wins over any research or taste. His locked look is rich, editorial, bright, airy, warm, "Bible-app feel"; a minimalist one-question opener was shipped once and he called it "completely stripped" and reverted it the same night. So the design is richer-and-clearer, never stripped. Any big reshape of the opening screen ships behind a preview link he approves first.`

phase('Understand')
log('Readers mapping the live surfaces and the rulings')
const shared = await parallel([
  () => agentR(`${CONTEXT}\n\nTask: read ${RULINGS} in full and return every product ruling Ashley has made about Daily Word as a checklist a designer can obey without reading the packet. One ruling per row: the rule in one sentence, the source line (which memory section and date), and which path or surface it applies to. Include the traps that constrain design (service worker cache, auth token, cloud-clobber, arrival seed credit-free, comfort no graduation, full-screen surfaces use useSubView alone, one sheet three doors never a gate, sheet fits a phone at 481px, etc). Also state the locked look in one paragraph and the owner-preview gate in one sentence.`, { label: 'read:rulings', phase: 'Understand', model: 'sonnet', schema: RULINGS_SCHEMA, agentType: 'reader' }),
  () => agentR(`${CONTEXT}\n\nTask: map the ONBOARDING and PATH CHOICE flow as it is live. Read src/App.tsx, src/components/Day1Landing.tsx, src/components/ChoosePathSheet.tsx, src/components/PathArrivalStrip.tsx, src/components/PathAskedOnce.tsx, src/components/HomeContextChips.tsx, src/components/NewToFaithButton.tsx, src/components/EmailGate.tsx, src/components/EmailNudgeCard.tsx, src/utils/coldStart.ts, src/utils/persona-config.ts (sectionOrder per persona and the greeting logic), and the tests beside them. Return what a first-time visitor sees in order, what a returning device sees, how the path is saved and stamped (setup.source values), which surfaces are full-screen, the copy keys in src/utils/i18n.ts, every self-serve lever that exists, and every place a change would need a developer today. file:line for every element.`, { label: 'read:onboarding', phase: 'Understand', model: 'sonnet', schema: MAP_SCHEMA, agentType: 'reader' }),
  () => agentR(`${CONTEXT}\n\nTask: map the HABIT MACHINERY as it is live: streaks, reminders, push, weekly review, completion. Read src/utils/streak.ts, src/utils/storage.ts (the dw_* keys that matter), src/utils/analytics.ts, src/components/AnalyticsDashboard.tsx, netlify/functions/analytics-dashboard.js, netlify/functions/push-send.js, netlify/functions/push-cron.js, netlify/functions/push-subscribe.js, netlify.toml, the notifications and reminder-hour section of src/screens/MoreScreen.tsx, src/sections/WeeklyReviewSection.tsx, src/sections/GreetingSection.tsx, and grep HomeScreen.tsx for recordStreakToday, dw_reading_done and dw-reading-completed. Return exactly how completion is stamped per path, how the streak counts and freezes, when and with what words a push goes out, what the weekly review says, what analytics events exist and where they land, and every place a change would need a developer today. file:line for every element.`, { label: 'read:habit', phase: 'Understand', model: 'sonnet', schema: MAP_SCHEMA, agentType: 'reader' }),
])
const rulings = shared[0], onboarding = shared[1], habit = shared[2]
if (!rulings) throw new Error('rulings reader failed')
const RULES_TEXT = JSON.stringify(rulings)
const ONB_TEXT = JSON.stringify(onboarding)
const HABIT_TEXT = JSON.stringify(habit)

const ANGLES = [
  { key: 'habit', who: 'a behavioural scientist who designs daily habits (Fogg, Clear, Duolingo growth): the unit of reading, the trigger, the reward, the grace, the identity language, the return visit' },
  { key: 'shepherd', who: 'a veteran pastor and pastoral counsellor who has sat with thousands of people: what the person actually feels at each moment, the words that land and the words that wound, presence over problem-solving, the human next step' },
  { key: 'apple', who: 'a senior Apple product designer: one thing per screen, the deliverable at the top, nothing greyed, nothing asked that the app can infer, rich and warm not stripped, fits a phone, every state designed (empty, first, returning, missed, done, offline)' },
]

function designPrompt(item, angle, mapText, extra) {
  return `${CONTEXT}\n\nYou are ${angle.who}. Design the experience for: ${item.label} (${item.id}).\n\nInputs:\n- Research: read ${RESEARCH}, the section "${item.section || item.label}" and the cross-cutting section. Every design move must trace to a line of evidence there or to a ruling; say which.\n- Rulings checklist (obey every row): ${RULES_TEXT}\n- Onboarding as live: ${ONB_TEXT}\n- Habit machinery as live: ${HABIT_TEXT}\n- This item as live: ${mapText}\n${extra || ''}\nYou may read the repo files named in the maps to check a detail, but design, do not code.\n\nReturn ONE complete design, not options. Keep what already works and say so (keep lists). Change only what the evidence says to change. Remove anything that fights the persona. Design every screen the person touches in the first two weeks with its order of elements top to bottom, the exact copy (Ashley's register: plain, warm, direct, no churchy jargon, no exclamation marks), and its states. Name the self-serve levers so a campus pastor changes content without a developer. Name the events that prove it works. Name the build steps as files and a check. Open decisions are only the ones the owner must make.`
}

phase('Design')
log('Three designers per path, two per cross-cutting topic, then judge, UX rulings, verify')

async function judgeAndHarden(item, designs, mapText) {
  const cands = designs.filter(Boolean)
  if (!cands.length) return null
  const judged = await agentR(`${CONTEXT}\n\nYou are the judge for: ${item.label} (${item.id}). Rulings checklist: ${RULES_TEXT}\n\nCandidates (independent designs from different angles):\n${cands.map((d, i) => `--- CANDIDATE ${i} (${d.angle}) ---\n${JSON.stringify(d)}`).join('\n')}\n\nScore each 1-10 on: obeys every ruling (a single break is disqualifying), traces to the research evidence, smaller unit and clearer first move for this persona, richer-and-warmer not stripped, no future developer step, fits a phone, every state designed. Pick the winner, graft the best moves from the others, drop anything that breaks a ruling and say why. Return the synthesised design in full (same schema), with evidence and build steps merged. Read ${RESEARCH} and ${RULINGS} if you need to check a claim.`, { label: `judge:${item.id}`, phase: 'Judge', model: 'opus', schema: JUDGE_SCHEMA, agentType: 'judge' })
  if (!judged) return null
  let design = judged.synthesis
  const ux = await agentR(`Review this DESIGN (not code) for Futures Daily Word against Ashley Evans' settled product rulings and taste. Item: ${item.label}. Design: ${JSON.stringify(design)}\n\nAlso apply these Daily Word specific rulings: ${RULES_TEXT}\n\nReturn findings only: the element, the ruling broken, severity (blocker, should, nit), and the change. Empty findings is a valid answer.`, { label: `ux:${item.id}`, phase: 'UX rulings', schema: FINDINGS_SCHEMA, agentType: 'ux-reviewer' })
  const uxFindings = ux ? ux.findings : []
  if (uxFindings.length) {
    const repaired = await agentR(`${CONTEXT}\n\nRepair this design so every finding is resolved without losing what the judge kept. Design: ${JSON.stringify(design)}\n\nFindings: ${JSON.stringify(uxFindings)}\n\nReturn the full repaired design in the same schema. Do not add new features.`, { label: `repair-ux:${item.id}`, phase: 'UX rulings', model: 'opus', schema: DESIGN_SCHEMA })
    if (repaired) design = repaired
  }
  const LENSES = [
    { lens: 'research-fidelity', ask: `Try to REFUTE that this design follows the research in ${RESEARCH}. For each design move, check the cited evidence exists in that document and says what the design claims. Flag invented statistics, moves with no evidence and no ruling, and moves the research argues against (e.g. guilt-framed streaks, a graduation prompt in comfort, commentary open by default for the devout reader, AI as sermon author).` },
    { lens: 'owner-rulings', ask: `Try to REFUTE that this design obeys every ruling in ${RULINGS} (checklist: ${RULES_TEXT}). A stripped or minimalist opener, a gate instead of a sheet, a credit-bearing arrival seed, a graduation prompt in comfort, a magic link, a greyed typeable field, a sixth door on the sheet, a pastor lock, a rebuilt synced dw_* record from React state, anything that needs Ashley to preview but is described as shippable to main: each is a break.` },
    { lens: 'phone-and-no-dev', ask: `Try to REFUTE that this design fits a phone (390 wide, Safari with toolbars, one thing per screen, nothing below the fold that the tap depends on), that every content change a campus pastor might make has a self-serve lever, that the build steps name real files in ${REPO} (check they exist with Glob), and that no step silently needs a future developer edit (hardcoded names, values, dates, campus lists).` },
  ]
  const verdicts = (await parallel(LENSES.map(L => () => agentR(`${CONTEXT}\n\nLens: ${L.lens}. ${L.ask}\n\nDesign under test: ${JSON.stringify(design)}\n\nReturn refuted=true only if you found at least one real issue with evidence; list every issue with the fix. Default to refuted=false if you found nothing concrete.`, { label: `verify:${item.id}:${L.lens}`, phase: 'Verify', model: 'sonnet', schema: VERDICT_SCHEMA, agentType: 'verifier' })))).filter(Boolean)
  const issues = verdicts.flatMap(v => v.issues || [])
  if (issues.length) {
    const fixed = await agentR(`${CONTEXT}\n\nFinal repair. Resolve every issue below in this design without adding features and without breaking a ruling (${RULES_TEXT}). Design: ${JSON.stringify(design)}\n\nIssues: ${JSON.stringify(issues)}\n\nReturn the full design in the same schema.`, { label: `repair-final:${item.id}`, phase: 'Verify', model: 'opus', schema: DESIGN_SCHEMA })
    if (fixed) design = fixed
  }
  return { item: item.id, label: item.label, design, judge: { scores: judged.scores, grafted: judged.grafted, rejected: judged.rejected_with_reason }, ux_findings: uxFindings, verify_issues: issues }
}

function placeholder(m) { return !m || m.summary === 'test' || !Array.isArray(m.renders_in_order) || m.renders_in_order.length < 3 || m.renders_in_order.some(r => r.file_line === 'b') }
async function readMap(p) {
  let m = await agentR(`${CONTEXT}\n\nTask: map exactly what the ${p.id} path renders and does as it is live, in order top to bottom, with the gates. Files: ${p.surfaces}. For HomeScreen.tsx (4,600 lines) grep for '${p.id}' and for the section names in persona-config sectionOrder and read only those ranges. Return the first visit, the return visit, how completion and streak are stamped for this path, audio, AI, copy keys, self-serve levers, and every place a change would need a developer today. file:line for every element.`, { label: `read:${p.id}`, phase: 'Understand', model: 'sonnet', schema: MAP_SCHEMA, agentType: 'reader' })
  if (placeholder(m)) {
    log(`read:${p.id} returned a placeholder map; re-running`)
    m = await agentR(`${CONTEXT}\n\nTask: map exactly what the ${p.id} path renders and does as it is live, in order top to bottom, with the gates. Files: ${p.surfaces}. For HomeScreen.tsx (4,600 lines) grep for '${p.id}' and for the section names in persona-config sectionOrder and read only those ranges. Return the first visit, the return visit, how completion and streak are stamped for this path, audio, AI, copy keys, self-serve levers, and every place a change would need a developer today. file:line for every element.` + ' Your previous attempt returned placeholder values ("test", "a", "b"). Do the reading first, then call StructuredOutput exactly once, at the end, with the real map. A placeholder is a failure.', { label: `read:${p.id}`, phase: 'Understand', model: 'sonnet', schema: MAP_SCHEMA, agentType: 'reader' })
  }
  if (placeholder(m)) throw new Error(`read:${p.id} failed twice`)
  return m
}

const pathResults = await pipeline(PATHS,
  p => readMap(p),
  (map, p) => parallel(ANGLES.map(a => () => agentR(designPrompt(p, a, JSON.stringify(map)), { label: `design:${p.id}:${a.key}`, phase: 'Design', model: 'opus', schema: DESIGN_SCHEMA }))).then(ds => ({ map, ds })),
  (r, p) => judgeAndHarden(p, r.ds, JSON.stringify(r.map)),
)

const TOPIC_ANGLES = [ANGLES[1], ANGLES[2]]
const topicResults = await pipeline(TOPICS,
  t => parallel(TOPIC_ANGLES.map(a => () => agentR(designPrompt(t, a, 'see onboarding and habit maps above', `Brief for this topic: ${t.brief}\n`), { label: `design:${t.id}:${a.key}`, phase: 'Design', model: 'opus', schema: DESIGN_SCHEMA }))),
  (ds, t) => judgeAndHarden(t, ds, 'see onboarding and habit maps'),
)

const all = [...pathResults, ...topicResults].filter(Boolean)
log(`${all.length} of ${PATHS.length + TOPICS.length} designs hardened`)

phase('Synthesise')
const critic = await agentR(`${CONTEXT}\n\nYou are the completeness critic. Here are the final designs for the five paths and four cross-cutting topics: ${JSON.stringify(all.map(r => ({ item: r.item, design: r.design })))}\n\nAgainst ${RESEARCH} and ${RULINGS}: what is missing? A persona need with no design move, a research implication nobody used, a state nobody designed (offline, language switch, dark mode, returning device on a stale service worker, pastor signed in on another path), a contradiction between two designs (e.g. two different reminder rules, two comfort doors, two streak surfaces), a lever that still needs a developer. Return gaps with who decides (Ashley or the next build), and every contradiction between designs.`, { label: 'critic', phase: 'Synthesise', model: 'opus', schema: GAPS_SCHEMA })

const synth = await agentR(`${CONTEXT}\n\nWrite the design specification to ${OUT} (create it) and ALSO write the raw JSON of all final designs to ${OUT_JSON}. Inputs: the final designs ${JSON.stringify(all)} and the critic's gaps ${JSON.stringify(critic)}.\n\nThe document is for Ashley, an expert owner and the only developer. Deliverable first. Structure: (1) a one-paragraph thesis; (2) the ten principles that all nine designs share, each with its evidence; (3) one section per path in this order, new_to_faith, congregation, deeper_study, pastor_leader, comfort: thesis, the journey (day 0, first session, return, week 2, missed day, seasonal), every screen top to bottom with the exact copy and states, keep/change/remove, levers, events, build steps as files and a check; (4) the four cross-cutting sections; (5) contradictions the critic found and how the spec resolves each (pick one, say why); (6) the decisions that are Ashley's, as a numbered list he can answer yes or no to; (7) the build order across everything, smallest-and-safest first, with the owner-preview gate marked on any step that reshapes the opening screen; (8) the judge scores per item and what was grafted, in a table. Plain prose, short sentences, no em dashes, no exclamation marks, tables for lists of parallel items. Do not invent anything not in the inputs; where the inputs disagree, say so and choose.`, { label: 'synthesise', phase: 'Synthesise', schema: { type: 'object', properties: { wrote: { type: 'array', items: { type: 'string' } }, decisions_for_ashley: { type: 'array', items: { type: 'string' } }, build_order: { type: 'array', items: { type: 'string' } }, contradictions_resolved: { type: 'array', items: { type: 'string' } } }, required: ['wrote', 'decisions_for_ashley', 'build_order', 'contradictions_resolved'] }, agentType: 'synthesizer' })

return { designs: all.map(r => ({ item: r.item, thesis: r.design && r.design.thesis, scores: r.judge.scores.map(s => `${s.angle}:${s.score}`), grafted: r.judge.grafted, ux_findings: r.ux_findings.length, verify_issues: r.verify_issues.length })), critic, synth }