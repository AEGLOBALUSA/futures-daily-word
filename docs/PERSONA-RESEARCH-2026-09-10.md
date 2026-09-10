# Daily Word — six persona journeys, from the data

Date: 10 Sep 2026. Method: seven parallel researcher agents (sonnet), one per persona plus one cross-cutting sweep of Bible-app engagement data, each returning only sourced claims with URLs and dates, gaps flagged rather than filled. Synthesised by the parent model against the live app (main 07580b85). Every number below has a source in the per-persona sections. Where the research found nothing, it says so.

## What the data says across all six

1. **Curiosity is up; conversion is not.** State of the Bible 2026: the Movable Middle is 28% of US adults (+9M since 2024), yet Scripture Engaged fell 20% → 17% and the 2025 spike "did not stick". Weekly reading among Gen Z went 30% → 49% in one year, Gen Z men now out-read Gen Z women (54% vs 46%). The market is people who are open and stall at "occasional". The product problem is the second week, not the first tap.
2. **"Don't know where to start" is the universal barrier**, and three-fifths of those who say it have followed Christ 20+ years (Barna). Every persona, not just the new believer, needs a zero-decision first move.
3. **Busyness is the #1 reason reading declines** (40–58% across ABS/Barna years). 62% of under-readers wish they read more. The felt need is a smaller unit of reading, not more content.
4. **The felt need is comfort, not information.** Isaiah 41:10 was YouVersion's verse of the year in 4 of the last 6 years; Philippians 4:6 in 2024. Comfort language belongs on every path, not only the comfort path.
5. **Calendar moments drive the spikes.** YouVersion: 3M+ one-year-plan starts on 1 Jan 2025, record 19M opens on 2 Nov 2025, 21.6M on Easter 2026. Hallow: 5M concurrent in Pray40, 300% subscription growth in Lent. Time-boxed shared challenges beat steady nudges.
6. **Streaks work until they shame.** Guilt-framed streak reminders drive notification opt-out and uninstall. Best practice is one nudge a day, timed to when the person actually last opened (Duolingo's behaviour-inferred timing), with streak repair rather than a hard reset.
7. **No public data exists** for Bible-app D1/D7/D30 retention, for persona-onboarding lift in faith apps, or for the comfort-to-discipleship transition. Only the app's own instrumentation can answer these. That is the single biggest gap and the first build.

## The live app against the six personas

| # | Ashley's persona | Live path | What already opens | Gap the data exposes |
|---|---|---|---|---|
| 1 | New Christian / back to faith | `new_to_faith` | 40-day journey, Day N full-screen, verses open | No distinct "starting again" door; no glossary layer; no reorder toward narrative |
| 2 | Devotional 2–3×/week, 3 min | `congregation` | Today's reading with Ashley & Jane | Reading is not sized to 3 minutes; no behaviour-timed reminder; no grace on missed days |
| 3 | Devout, 5 days, 10 min | `deeper_study` | Commentary + Compare + original languages | No dated plan; commentary open by default (the clutter complaint); no audio toggle on the passage |
| 4 | College student with assignments | none | — | Whole persona missing; needs an assignment workflow, citation, Strong's, export |
| 5 | Pastor, study + sermon prep | `pastor_leader` | Pastor study, chapter + commentary, Preach card | Trust panel (why this source); AI framed as author not assistant; export as a distinct step |
| 6 | Person in crisis | `comfort` | Just the scriptures, nothing asked | No one-tap comfort from every path; no crisis keyword → region-correct line; no human next step |

The existing five doors are the right five. Persona 4 is new. The research does not argue for more doors; it argues for each door landing on a smaller, better-timed unit and for two things that cut across all doors: a persistent comfort tap and real retention instrumentation.

---

## Persona 1 — New Christian, and back to faith

**Who.** 41% of US adults are Bible Users (SOTB 2025). The Great Dechurching (Davis & Graham 2023): ~40M Americans left church in 25 years, 51% think they may return. Barna's typology of churched-raised 18–29s: 10% resilient, 38% habitual, 30% nomads, 22% prodigals. Most who left did so for mundane reasons (moved, inconvenience), not doctrine or scandal. Practical friction is high; shame is lower than assumed.

**Needs, ranked.** A starting point. A guide through complexity (the "Bible Curious" welcome one). Literacy scaffolding (60% of Americans cannot name five Commandments). A short unit, not a chapter: YouVersion found newcomer plans work as one thought plus a few verses. Ordinary, no-explanation re-entry for the returning.

**Where they quit.** Early, in the hard opening material. YouVersion raised plan completion by reordering to front-load accessible passages. No public day-7 curve exists.

**Journey.**
- Day 0: two doors inside one card, "New to this" and "Coming back". Same 40-day journey, different first line. The returning line says come back, nothing to explain.
- Day 1: 3–7 verses, plain language, one thought, already open. A one-line "what this word means" under any hard word. Complete on the same screen (already true).
- Days 2–7: narrative first (Gospel scenes), doctrine later. Progress ring visible from day one, credit-free seed stays credit-free.
- Week 2 onward: the two journey questions per day stay under the teaching (ruled 2 Sep). Add one relational move by day 10: "someone at Futures would love to read this with you", which is an intake action, not a chat.

**Tests.** Day-1 completion for 3–7 verses vs current day; 7-day retention "coming back" framing vs generic; glossary tap rate.

**Sources.** americanbible.org sotb-2025-release (2025) · barna.com/trends/bible-reading-trends (Nov 2025) · barna.com young-adults-lead-resurgence (2025) · pewresearch.org RLS executive summary (26 Feb 2025) · Davis & Graham, The Great Dechurching (2023) via churchleaders.com and religionnews.com · barna.org three-spiritual-journeys-of-millennials · barna.com state-of-the-bible-2018 and -2021 · nirandfar.com "The App of God" (YouVersion case study, secondary). Gaps: no primary YouVersion retention data; "fear of doing it wrong" is inference.

---

## Persona 2 — The average devotional Christian (2–3×/week, 3 minutes)

**Who.** SOTB 2026: 25% of US adults are active Bible users (weekly+), 13% occasional, 62% non-users; Movable Middle 28%. Pew 2025: about one in five read scripture outside services weekly. No survey defines a "3-minute, 2–3×/week" segment; this persona is a working construct, which is fine, but only the app's own data can size it.

**Needs, ranked.** Low-friction start. Time and habit scaffolding (busyness #1). Closing the "I meant to" gap (62%). Comfort-framed copy (Isaiah 41:10 four years running). Momentum cues: streak, day-count, time-boxed shared events.

**Where they quit.** Early and pre-habit. Notification overload and guilt-framed streaks cause opt-out. Roughly half of app users uninstall within 30 days (general benchmark, not devotional-specific).

**Journey.**
- Day 0: one starter reading, no picker. The congregation path already does this.
- Every visit: a reading sized to three minutes, verse plus Ashley & Jane's one thought, audio on the same card. "Read more" opens the full chapter for the days they have time.
- Reminder: after 5–7 sessions, infer the time they actually open and nudge then, once a day, neutral wording. Never "your streak is about to die".
- Missed days: streak repair, one tap, no shame.
- Seasonal: 21-day and 40-day church-wide reads (Lent, New Year, a Futures series) with a live count of people reading today. This is where the spikes come from.

**Tests.** 60–90s "verse + one line" vs 3-minute full devotional on completion; behaviour-timed vs user-set reminder on 7-day return; comfort-framed vs instructional daily copy.

**Sources.** americanbible.org state-of-the-bible-2026-chapter-1 (Apr 2026) · baptistpress.com SOTB 2026 reversal (Apr 2026) · pewresearch.org prayer-and-other-religious-practices (26 Feb 2025) · barna.com bible-reading-2017-new-years-resolution · centerforbibleengagement.org factors-that-help-and-hinder · youversion.com 2025 verse of the year · appfigures.com Hallow Lent surge; hallow.com series-b · businessofapps.com push statistics (2026) · duolingo.deconstructoroffun.com notifications; digia.tech (secondary) · faith.tools Glorify (secondary). Gaps: Glorify, Lectio 365, First5, Our Daily Bread publish no engagement numbers; Duolingo timing claim is secondary.

---

## Persona 3 — The devout follower (5 days a week, 10 minutes)

**Who.** Scripture Engaged (≥4×/week and central to life) = 17% of US adults, ~47M, in 2026; 20% in 2025. 89% of Bible users still prefer print; 55% use a smartphone, 42% a dedicated app. Lifeway, Feb 2026: fewer than one in three churchgoers read daily. Pew: weekly Bible-study group participation fell 24% → 13% between 2014 and 2025. Accountability structures have eroded even where the personal habit holds.

**Needs, ranked.** A dated plan (3M+ one-year plan starts on 1 Jan 2025, +18% YoY). Audio as a companion, on the passage, not in a separate section (Dwell). Text over commentary and low clutter: the recurring YouVersion complaint is "it keeps adding functionality, it's getting so cluttered". Depth tools when wanted, not by default (Logos "too heavy for mobile, short-session study"; Olive Tree the easier middle; Blue Letter for free Strong's). Notes and highlights that sync reliably.

**Where they quit.** Clutter, subscription cost, learning curve, lost notes. The Bible in a Year podcast passed 1 billion downloads, but no completion rate exists anywhere.

**Journey.**
- Day 0: choose a plan, two or three at most: chronological, whole-Bible-in-a-year, and a Futures series plan. Dated, resumable.
- Every day: the passage first, text-only, 10 minutes. Commentary, Compare and original languages collapse behind one "Study" tap (they are open by default today). Audio toggle on the passage card.
- Habit: a chain counter with identity language ("you read five days most weeks") and a reset without shame.
- Together: "read with" one person, a spouse or a friend. Both see each other's day-count, nothing else. This is the one social feature the Pew decline argues for.
- Print: a "read like paper" mode, larger type, no chrome, given 89% still prefer print.

**Tests.** Study collapsed vs open on session length and 30-day retention; audio toggle usage; "read with" pairing on 30-day retention.

**Sources.** americanbible.org state-of-the-bible-2026-chapter-1 (2026) · americanbible.org sotb-2025-release (Jan 2025) · SOTB 2024 PDF (Dec 2024) print/app figures · pewresearch.org prayer-and-other-religious-practices (26 Feb 2025) · research.lifeway.com fewer-than-1-in-3 (10 Feb 2026) · thewordseattle.com and itbrief.asia on YouVersion 2025 · apps.apple.com Dwell reviews; dwellapp.io · ascensionpress.com Bible in a Year 1B downloads · trustpilot.com bible.com; psalmo.app YouVersion review (2026) · andynaselli.com; biblewonderlife.com; alternativeto.net (comparative reviews). Gaps: no completion rate for any year-long plan; no survey quantifies notes/highlights demand; streak psychology is secondary only.

---

## Persona 4 — The college student with Bible assignments (new path)

**Who.** CCCU: 185+ institutions, 520,000+ students. ABHE Bible colleges are small (Lancaster 2,455; Appalachian 223). Alphacrucis (AU) 4,500–5,000+. Gen Z weekly reading 30% → 49% in 2025, partly credited to mobile access. FLC is the obvious first cohort and the estate already has a college surface and roster.

**Needs, ranked (from real syllabi).** The exegesis paper: 10+ pages, 10+ sources including five commentaries, a concordance and a Bible dictionary, on a passage assigned early. The inductive study as its own deliverable (observation, interpretation, application). Strong's and morphology on tap without Greek or Hebrew. Correct scripture citation (SBL Handbook 2nd ed., Turabian: footnote-only, no bibliography entry, version abbreviation once). Reading logs against the syllabus (inferred). AI-use disclosure: Carolina College of Biblical Studies requires the tool, version, purpose and prompts be disclosed or it is academic dishonesty; Christianity Today (Aug 2026) reports "when in doubt, AI is not allowed" at several colleges while others build Socratic bots.

**Where they quit.** Logos cost ($14.99/month Pro; bundles above $10,000). Citation confusion (four seminaries maintain LibGuides on it). Policy uncertainty about AI. The original-language wall.

**Journey.**
- Day 0: "Student" door. Ask for the passage and the due date. Nothing else.
- Working surface: the passage with the inductive three-column frame (observe, interpret, apply) as the note-taking structure. Strong's and morphology inline on tap, from the study layer already loaded for pastors (11 study_* tables, ~1M rows, public-domain and CC). Cross-references and commentaries listed with their licence line, which is the trust panel the student needs for a bibliography.
- Citation: one-tap SBL or Turabian footnote for any verse.
- AI: the Bible AI runs in "Socratic" mode for this path: questions and pointers to sources, never a paragraph they can paste. Every AI turn is logged into a disclosure sheet they can hand in (tool, date, prompt, purpose), which turns the policy risk into a feature.
- Export: notes and citations to a Word or Google Doc draft. No sourced tool does this well; it is the opening.
- Progress: reading log against the syllabus schedule.

**Tests.** Pilot with one FLC intake: time to first draft vs blank document; citation error rate; disclosure-sheet adoption. Validate reading-log demand by survey before building it.

**Sources.** cccu.org 2025 market research · Wikipedia Lancaster Bible College, South Florida Bible College, Alphacrucis (accessed Sep 2026) · univstats.com Appalachian (2024–25) · firescholars.seu.edu syllabus; cdn.rts.edu hermeneutics syllabus (Spring 2024); andrews.edu RELB245 syllabus · patheos.com STEP Bible (Apr 2025) · blueletterbible.org help; learnofchrist.com · libguides.liberty.edu; libguides.hiu.edu; libraryguides.ambs.edu (SBL/Turabian) · genewhitehead.com and g2.com Logos pricing · ccbs.edu AI policy; cccollege.edu AI policy · christianitytoday.com Socratic bots (Aug 2026) · barna.com bible-reading-trends; religionnews.com (6 Nov 2025). Gaps: no forum-level student sentiment retrievable; Accordance, NET notes, Zotero unverified; ACOM and ACSI numbers not found; memory-verse and reading-log mechanics unsourced.

---

## Persona 5 — The pastor (study and sermon prep)

**Who.** Lifeway: ~70% of SBC pastors spend 8+ hours a week on sermon prep, 21% spend 15+; older average ~14 hours (2008–2016 studies, nothing newer found). Barna: 65% of pastors report loneliness (up from 42% in 2015); 38% considered quitting in the past year. Barna/Gloo, Dec 2025 (n=442): 87% use AI somewhere; 24% write or edit sermons with it (12% in early 2024); top uses are brainstorming 50%, graphics 37%, biblical research 36%. Sentiment: 71% cautious, 79% worry AI could replace God's role, 63% that it could replace pastoral leadership. Lifeway, June 2026 (Brentwood Statement): 10% regular users, 32% experimenters, 18% waiting, 18% avoiding, 20% ignoring.

**Needs, ranked.** Faster research and brainstorming without the scholar's workload. Time relief. Original-language and theological support. Illustrations and repurposing (Sermonary users report 4–8 hours saved a week). Trustworthy sourcing: reviewers document AI tools fabricating cross-references on less-common passages. Affordable access after the Logos subscription backlash (2024–2026).

**What they distrust.** AI as author. Invented references. Forced recurring cost. Anything that looks like it wants the pulpit.

**Journey.** The pastor study already exists: chapter with commentary, Between You & God, Preach card, sermon congregations, notes email. The research changes framing and adds three things.
- Framing: the AI is a research assistant, never the writer. "Study aid" copy, not "AI writer". Test this framing directly against adoption; it is the highest-leverage copy change in the app.
- Trust panel: every commentary, cross-reference and lexicon result shows its source and licence inline, and the scripture text always comes from the verified text tables, never the model. This is already the architecture (`study.js`, public-domain and CC sources) and should be visible, not hidden in Settings.
- Time saved: show it. Minutes from open to outline, per week.
- Export as its own step: outline to slides and to congregation notes, separate from drafting. Unsourced as a need, but it is where the sermon-notes email already points.
- Pricing: whatever the pastor tier costs, make it flat, not a subscription surprise.

**Tests.** "Study aid" vs "AI writer" framing on pastor sign-ups and weekly use; trust-panel visibility on session length; time-saved display on retention.

**Sources.** research.lifeway.com pastors-and-time-in-sermon-preparation (2015, 2012 data); sermon-prep-a-week-in-my-life (2016); how-do-most-pastors-plan (2021) · barna.com pastor-support-systems; pastors-quitting-ministry · barna.com pastors-using-ai-ministry (fielded Dec 2025) · news.lifeway.com Brentwood Statement (8 Jun 2026) · theleadpastor.com; faith.tools Sermonary; aligned.church (vendor-adjacent) · mattdabbs.com; reformedreader.wordpress.com; scribe-bible.app on Logos pricing (Dec 2024–2026) · sbc.net AI resolution (2023). Gaps: prep-hours data is 2008–2016; no numbers for Accordance, Docent, Pulpit AI, Sermon Shaper, YouVersion Events or congregation notes-app uptake; the two AI-adoption surveys measure different things.

---

## Persona 6 — The person in crisis

**Who.** 8 in 10 Americans hospitalised with COVID wished they had used the Bible more (SOTB 2024). YouVersion searches rose 80% in 2020 with "fear" the top term. Isaiah 41:10 and Philippians 4:6 dominate verse of the year. Bible-engaged people name the Bible, family and prayer as comfort; the less engaged name food, streaming and prescription drugs.

**Needs, ranked.** Presence and acknowledgement over problem-solving (Lifeway: avoiding grief is "always harmful"). Positive religious coping (God's presence, benevolent reframing), which predicts better outcomes; negative coping ("punishing God", "have more faith") predicts decline (Pargament & Koenig 2004, longitudinal). Practical help and concrete answers, not platitudes.

**What harms.** Clumsy comfort language. Guilt. And an industry failure: only 35% of mental-health apps show crisis resources in-app, 81% carry liability disclaimers instead, and some show the wrong country's hotline (Crisis journal, 2021).

**Journey.** The comfort path is already right in spirit: just the scriptures, nothing asked, no graduation prompt. The research confirms the no-graduation ruling (there is no published evidence on a comfort-to-discipleship transition at all) and adds safety.
- From every path: a persistent one-tap "I need comfort now" that opens comfort without switching the saved path. Crisis is not a persona someone chooses on a good day.
- Delivery: slow audio first, one passage, low stimulus, dark and calm, no streak, no count, no "complete".
- Safety: if the person types crisis language into Bible AI or a prayer request, confirm gently, then show the region-correct line (988 in the US, 13 11 14 in Australia, 0800 543 354 in NZ), the Woebot and Wysa pattern. Disclose on first use that this is scripture and a church, not counselling.
- Human next step: prayer request to a real campus pastor, and a co-created "when it's bad" card (who to call, what steadies you, a verse you chose), which was Wysa's most-used feature (over 49% of crisis users).
- Next day: one quiet check-in, "still here, same verse or a new one". Plausible, unsourced, worth testing.

**Tests.** Comfort-tap reach from other paths; safety-flow trigger rate and false positives; next-day return after a comfort session.

**Sources.** americanbible.org SOTB 2024 chapter 8 · christianitytoday.com YouVersion 2020 (Dec 2020) · klove.com; blog.youversion.com 2022 and 2023 verse of the year; churchleaders.com 2024 verse · research.lifeway.com grief (May 2023, Jul 2024) · Pargament et al. 2004, J Health Psychol · Koenig 2009, Can J Psychiatry · PMC8641126, Crisis (May 2021) · businesswire.com Wysa (15 Apr 2024) · dwellapp.io; lectio365.com. Gaps: Hallow, Calm and Headspace crisis design unsourced; Psalm 23 was never an official verse of the year; no research on comfort-to-discipleship.

---

## Cross-cutting numbers the design leans on

| Metric | Value | Source |
|---|---|---|
| YouVersion installs | 1B+ (Nov 2025) | youversion.com 2025 verse of the year |
| YouVersion daily-use growth | +18–19% YoY 2025 | same |
| Peak single days | 19M (2 Nov 2025), 21.6M (Easter 2026) | youversion.com news |
| Scripture Engaged (US) | 18% 2024 → 20% 2025 → 17% 2026 | americanbible.org SOTB 2026 ch.1 |
| Movable Middle | 28% (2026), +9M | same |
| Weekly reading, all US adults | 42% (2025), from 30% low in 2024 | barna.com bible-reading-trends |
| Gen Z weekly reading | 30% → 49% (2025) | same |
| Hallow | 25M+ downloads, 26% YoY retention gain, 500K downloads in one Lent day | branch.io Hallow case study |
| Generic app retention | D1 ~25%, D7 ~12%, D30 ~5–7%; wellness D30 3–8% | uxcam.com; businessofapps.com (2026, secondary) |
| Duolingo | 55% next-day retention, ~20,000 A/B tests | relaunch.ai; appcues (secondary) |

Australian data (NCLS 2021/2026, McCrindle 2025) returned methodology pages only, no Bible-reading percentages. Flagged, not filled.

## What to build first, in order

1. **Instrumentation.** D1/D7/D30 by path, session length, completion, reminder opt-out. Nothing above can be tested without it, and no public source will ever supply it. One `dw_events` table, one nightly rollup.
2. **Comfort from everywhere.** One persistent tap, the safety flow with region-correct lines, the human next step. Smallest build, highest duty of care.
3. **Size the unit.** Congregation to three minutes with "read more"; deeper study text-first with Study collapsed; audio on the passage card for both.
4. **Reminders and grace.** Behaviour-inferred time, one a day, streak repair.
5. **Two doors in the new-believer card** ("new" and "coming back") plus the glossary line.
6. **Seasonal church-wide reads** with a live "reading today" count.
7. **Student path** piloted with one FLC intake.
8. **Pastor framing and trust panel.** Copy first, panel second, time-saved third.

## Decisions that are Ashley's

- Whether persona 4 is a sixth door on the sheet (the sheet fits a phone at five) or lives behind the FLC sign-in.
- Whether "read with" (persona 3) shows a day-count only, or nothing at all.
- The crisis lines to show per congregation (US, AU, NZ drafted above) and who at each campus receives the prayer request.
- Whether the pastor tier is priced flat, and at what.
