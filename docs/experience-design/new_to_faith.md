# New to faith and returning path, judged design (10 Sep 2026)

Status: judged and synthesised. NOT yet UX-reviewed against Ashley's rulings, NOT yet verified. Run the ux-reviewer and the three verifiers before building.

## Judge

Three candidate designs were scored against the `new_to_faith` path (the 40-day journey).

**Candidate 0 — score 6.5 — angle: behavioural design (unit, trigger, reward, grace, identity language, return visit).** This candidate carries a disqualifying rulings break. The two entry chips on Day1Landing call markPathAsked(), suppressing Door 3 for a user who made no real choice. The ruling permits suppression only for comfort or a real choice, so a defaulted church member who taps "I'm coming back" is silently locked onto the journey with source:'default' and loses their ruled exit. A choice before the reading is also the class of gate Ashley removed on 26 Aug. Second break: it lists the Sermon Notes Sunday gate under "keep" as already correct, but this is refuted at HomeScreen.tsx:2106 (no gate, comment says "always visible") and src/index.css:962-963 (dw-new-home hides only .dw-ai-launcher), so it ships leaving a live ruling break standing. Third break: it mounts a glossary term-sheet overlay on Day1Landing without noticing Day1Landing.tsx:41,76 holds useModalA11y(true)+aria-modal, the exact nested-trap class ruled on after the 28-agent review. On the other dimensions it scores well: research 9/10, best evidence table, refuses the seasonal read and the day-reorder with reasons; smaller unit 9/10, verseRange prop, chapter as disclosure, highlight refs preserved, and it is uniquely correct that recordStreakToday() fires on bare mount (verified HomeScreen.tsx:786-793), so "days read" must replace the streak; richer/warmer 8/10, the sage closing card is the best reward design of the three; no future dev step 9/10, best of the three, "welcome" added to CORNER_TYPES plus one intake_questions row is the cheapest real lever in the estate; phone 7/10, adds a control row to the locked landing, unmeasured; states 9/10.

**Candidate 1 — score 8.9 — angle: veteran pastor / pastoral counsellor (what the person feels, words that land and words that wound, presence over problem-solving, the human next step).** Rulings 9/10, no break found, and this is the only candidate that finds and fixes both live gaps: the Sermon Notes row ungated at HomeScreen.tsx:2106 (verified), and handlePathAsked at App.tsx:288-291 calling only markPathAsked() so an explicit Yes never becomes a real choice (verified). Its fix stamps source:'onboarding', which is inside REAL_CHOICE_SOURCES. It puts the research's two doors on Door 3 instead of before the reading, citing the removed-gate ruling by name, and it correctly scopes the comfort graduation ban to comfort while still flagging Day 40 as an owner decision and not building it. Its only soft spot: renaming "Mark Complete" to "Mark as read" touches a string the placement ruling names, and it is not raised as an owner decision. Research 9/10, sharpest on Persona 1's who (Davis & Graham 51 percent, mundane reasons, shame lower than assumed) and on Pew's 24 percent to 13 percent group decline behind the day-10 move. Smaller unit 9/10, plus the unique correct constraint "do not touch the fetch, fetchKJV matches book and chapter only, slice client-side," which matches the repo's KJV raw-JSON gotcha. Richer/warmer 9/10. No future dev step 8/10, good levers but more new tables than candidate 0's one row. Phone 7/10, two Yes buttons on Door 3, unmeasured. States 9/10.

**Candidate 2 — score 8.1 — angle: minimal-change (fix the unit, hold week two, clear the one card that has no business on this screen, instrument it).** Rulings 9/10, no break. Finds the Sermon Notes gap (HomeScreen.tsx:2106) and fixes it. Explicitly overrules the research's two-doors idea on Ashley's 1 Sep "every line relates to that button" ruling and on the sheet rulings, delivering the returning reader as copy not a control. It is the only candidate to flag that Day1Landing itself carries useModalA11y(true)+aria-modal (verified Day1Landing.tsx:41,76) as a pre-ship check for any new overlay there. It refuses the day-reorder with a data-model reason (currentDay is a bare index). Research 7/10, thinnest trace, defers behaviour-timed reminders, defers seasonal, and reduces Persona 1's two doors to one line (defensible, but a subtraction from the evidence). Smaller unit 9/10, and the only one to design the fail-safe: text with no [N] markers falls back to the whole chapter silently rather than rendering an empty panel. Richer/warmer 7/10, weakest on the reward, leaving the existing grey completion note untouched, so the persona with the least momentum keeps the weakest close in the app. No future dev step 9/10, books/glossary.json under /books is the cleanest lever of the three: a content edit that inherits the ruled network-first strategy, no new table, no sw.js bump. Phone 9/10, best of the three, one line of copy added, no new controls. States 8/10.

**Winner: candidate 1 (index 1).**

### Grafted

- From candidate 0: recordStreakToday() fires in a bare useEffect on every HomeScreen mount (verified HomeScreen.tsx:786-793), so the streak counts app opens, not readings. Identity language on this path counts pathwayProgress.completedDays.length instead, and GreetingSection's milestone banner is rewritten off i18n strings with no emoji and no exclamation.
- From candidate 0: collapse the two divergent hardcoded milestone lists (streak.ts:14 and GreetingSection.tsx:6) into one exported constant, pinned by tests for the other four personas.
- From candidate 0: replace the grey inline completion note with a sage closing card: check glyph, "Day {x} done.", one identity line from completedDays.length, the existing tomorrow line, Share moved in. This is the reward the path currently has no version of.
- From candidate 0: point the daily nudge at their day: persona and journey_day on push_subscriptions, a new_to_faith branch in buildPayload, suppressed on a day already completed.
- From candidate 0: PushOptIn's hour select defaults to the current local hour clamped 5-22 instead of a hard 7am, writing dw_push_hour_source='user' the moment they touch it, so a later behaviour-inferred median can never override a hand-set hour.
- From candidate 0: the day-10 campus copy comes from campus_content type 'welcome': one entry added to CORNER_TYPES (netlify/functions/lib/intake-core.js:40) plus one intake_questions row, after which the campus pastor edits it forever with no deploy. Cheapest self-serve lever proposed by any candidate.
- From candidate 0: journey_chapter_open as an explicit revert trigger: high chapter-open rate plus flat completion means the unit was not the problem and the change comes out.
- From candidate 0: refuse the seasonal church-wide read on this path by name. The 40 days already are the time-boxed challenge, and two counters on one screen is the failure the app fixed once.
- From candidate 0: dw_comfort_peek as a session flag, and the explicit statement that the peek never writes dw_setup and never routes through handleRead.
- From candidate 0: Day1Landing.test.tsx counts CTAs by regex. Any change there must update the test deliberately, never loosen the pattern.
- From candidate 2: the fail-safe on verse filtering: text with no [N] markers, or an object-shaped offline KJV chapter, falls back to the whole chapter silently, never an empty panel.
- From candidate 2: add the offline/translation-unavailable notice the Day N surface lacks (the hero already has one).
- From candidate 2: glossary content lives in books/glossary.json (+_es/_pt/_id) so it inherits the ruled /books network-first strategy: a content edit, no new admin table, no sw.js change, no CACHE_NAME/SW_VERSION bump.
- From candidate 2: Day1Landing.tsx:41,76 carries useModalA11y(true) + aria-modal, so anything new on that screen expands INLINE and never mounts as an overlay above it.
- From candidate 2: one inclusive welcome line on the landing as copy, not a control. It names both people without adding a tap target to the Superdesign-locked screen.
- From candidate 2: cap dotted terms at two per day, lesson text only, never inside the white scripture panel.
- From candidate 2: push TEMPLATES carries en and id only, an es/pt reader of a fully translated journey gets English pushes today.
- From candidate 2: the day-10 card says it needs an email before the tap does anything, rather than springing the gate.
- From candidate 2: frame the preview honestly. Ashley approved the 42-verse Day N surface on 1 Sep, so show him day 3 specifically (one verse taught, 42 served) and say the chapter is one tap under the verses.

### Rejected, with reason

- Candidate 0's two entry chips on Day1Landing ("I'm new to this" / "I'm coming back"): DROPPED. Two problems, either fatal. First, tapping a chip calls markPathAsked(), suppressing Door 3 for someone who made no real choice. The ruling allows suppression only for comfort or for users who already made a real choice, and the whole point of Door 3 is catching the silently-defaulted church member. A church member who taps "I'm coming back" (they are coming back to church) is locked onto the 40-day journey with source:'default' and never asked again. Second, it is a choice placed before the reading on the Superdesign-locked screen, the class of gate removed on 26 Aug because "it was the gate where people opened and never read." Replaced by candidate 1's two Yeses on Door 3, where the ask is already ruled to happen, plus candidate 2's one inclusive welcome line as copy.
- Candidate 0's claim that the Sermon Notes Sunday gate is already correct (listed under "keep"): REFUTED. HomeScreen.tsx:2106 renders {sermonNotesRow} with the comment "Sermon notes, just below the greeting, always visible" and no persona or Sunday gate. sermonNotesRow itself (HomeScreen.tsx:1786) gates only pastor_leader's destination. isSundayWindow (src/utils/sunday.ts:9) is never imported into HomeScreen. The only dw-new-home CSS (src/index.css:962-963) hides .dw-ai-launcher and nothing else. The ruling is live-broken today and the synthesis fixes it.
- Candidate 0's glossary term sheet mounted as an overlay on Day1Landing: DROPPED as an overlay. Day1Landing.tsx:41 calls useModalA11y(true) and line 76 sets aria-modal='true'. Adding a second overlay above it is the nested-focus-trap failure the 28-agent review ruled on (finding 1). On the landing the term expands inline; on the Day N surface, which correctly uses useSubView alone, a sheet is permitted.
- Candidate 1's rename of "Mark Complete" to "Mark as read" on the Day N surface: KEPT but demoted to an open decision. The reasoning is good, one verb for one act, no performance word under a grace lesson, and it does not move the questions, so the placement ruling holds. But it changes a shipped string on a surface Ashley approved on 1 Sep, and the placement ruling is phrased against "Mark Complete." It goes on the preview as a question, not as a fait accompli.
- Candidate 1's journey_glossary Supabase table plus a new /staff admin surface as the v1 lever: DROPPED in favour of candidate 2's books/glossary.json. Fewer moving parts, no new admin screen nobody asked for, and it inherits the ruled /books network-first strategy so a wording fix reaches returning readers on their second open with no deploy. Candidate 1's bundled offline default is kept. The admin table is deferred to an open decision.
- Candidate 1's Day 40 named ending offering the congregation path: NOT BUILT, carried as an owner decision, exactly as candidate 1 scoped it. Comfort's "Feeling Stronger?" ban is scoped to comfort, so this is not a break, but it is close enough in shape that it needs Ashley's explicit word first.
- Both candidates' proposal to reorder days 2-7 toward Gospel narrative: NOT BUILT. The research argues for it, but dw_pathway_progress.currentDay is a bare index (candidate 2's finding): reordering silently hands every mid-journey reader a different lesson under the same day number. Escalated as an owner decision needing a migration plan, not a JSON edit.
- Candidate 0's seasonal church-wide read on this path: DROPPED, and the refusal is kept as designed reasoning. The 40 days already are the time-boxed challenge, and two counters on one screen reads as two journeys.

## Synthesis

Item: New to faith and returning (new_to_faith), the 40-day journey.

Angle: pastoral, evidence-led, minimum-surface. The path already lands in the right place, so nothing here is a rebuild. Two things are actually broken: the daily unit is a whole chapter when the day's teaching is a verse, and the second week has nothing holding it. Two rulings are broken in the live code. Fix those, put one plain sentence under the hard words, make coming back feel ordinary, put a hand out on day 10, and instrument the one persona the dashboard cannot currently see.

### Thesis

Two different people come through one door: someone who has never opened a Bible, and someone who has been gone a while and does not want to be asked why. Day 1 already serves both. Ephesians 2:8-9, three plain paragraphs, two questions, one button, about four minutes. Day 2 breaks the promise: NewBelieverLessonCard.tsx:94 throws away the day's own reading.verses (present on all 40 days in books/faith-pathway.json) and builds the whole chapter from book+chapter while printing the small reference as the label, so day 3 teaches John 19:30 and serves 42 verses, and day 8 opens 31 verses of Romans 3 to someone eight days into faith.

Two rulings are also broken in main today. The Sermon Notes row renders unconditionally at HomeScreen.tsx:2106 (no Sunday gate, no persona gate, and dw-new-home CSS hides only the AI launcher), so a brand-new believer's second-ever screen leads with a black sermon-notes banner on a Tuesday. And handlePathAsked at App.tsx:288-291 calls only markPathAsked(), so a person's explicit "Yes, keep going" never becomes a real choice, never syncs, and a second device treats them as cold.

So: size the day to what day 1 already is, with the chapter one tap under it. Restore the two broken rulings. Put one plain sentence under the hard word. Name the returning person where the ask is already ruled to happen rather than at the door. Replace the grey completion note with a moment that counts what they actually read. Offer one human on day 10. The photo hero, the sage button, the ivory canvas, the white paper reading panel, the Georgia serif and the Superdesign landing are untouched. Everything ships behind one deploy preview Ashley approves.

### Principles

1. One day is one thought and a few verses, never a chapter. The day's own reading.verses is the unit; the whole chapter is one tap under it, never removed. Research P1: newcomer plans work as "one thought plus a few verses"; cross-cutting 3: busyness is the number one reason reading declines and the felt need is a smaller unit, not more content.
2. Never ask why they left. 51 percent of the dechurched think they may return and most left for mundane reasons, moved, inconvenience, not doctrine or scandal. Practical friction is high; shame is lower than assumed. A question about the past is friction the app adds itself.
3. The question goes after the reading, never at the door. The five-choice first-run picker was removed because "it was the gate where people opened and never read." The two doors the research asks for live on the ruled asked-once screen, where the app has already earned the right to ask.
4. No word on this path may imply performance. Day 1's own lesson says grace "doesn't reward performance, it replaces it." Language has to agree with the teaching.
5. Identity language counts what they actually read. Days read comes from pathwayProgress.completedDays, never the streak. recordStreakToday() fires in a bare useEffect on every HomeScreen mount (HomeScreen.tsx:786-793), so the streak counts app opens, and telling a new believer they have a seven-day streak when they read three days is a lie the product tells on their behalf.
6. Grace is silent. The journey is day-numbered, not date-numbered, currentDay only advances on completion, so a missed day cannot leave anyone behind. One line acknowledges the gap without counting it, and nothing ever names a number of days missed.
7. Every visible line on this Home relates to the one sage button (Ashley, 1 Sep 2026). Anything added is part of the day's reading, or it does not go on Home.
8. Richer and clearer, never stripped. One line, one quiet row, one toggle, one closing card, inside the locked editorial look, not a rebuild of it. The 1 Sep "you have completely stripped, go back" revert is the standing warning.
9. Presence beats problem-solving. The person new to faith who is also in crisis is the most exposed reader in the app; comfort is one tap from the reading and never asks them to change who they said they were.
10. Nothing here reaches production before Ashley sees it on a deploy preview and says so. The opening screen is owner-preview-gated, same class as the locked look.

### The journey

**Day 0.** Cold arrival at futuresdailyword.com, or the Sunday QR. App.tsx:68 runs startGraceSeriesIfCold('default') before React mounts: dw_setup={new_to_faith,'default'} and the 40 days enrolled, credit-free, no cloud stamp. Keep exactly. Day1Landing paints full-screen: wordmark, LanguageSwitch, "Day 1 of 40, New & Returning to Faith," "Grace Changes Everything," one new welcome line naming both the first-timer and the returner, one sage Read, and the quiet "Not new to faith? Choose your path" link. No account, no picker, no gate, no second tap target. Works fully offline, the copy and the KJV verse are bundled. What they feel: "I don't know what I'm doing" or "I've been gone a long time." What the screen asks of them: one tap.

**First session.** Read expands the reading in place, no navigation, no second screen. Ephesians 2:8-9 on the white paper card, up to two hard words in the pastoral text carrying a dotted underline that expands inline to one plain sentence, three short pastoral paragraphs, Day 1's two Reflect & Respond questions with answer boxes, "Day 1 of 40," "Mark as read." markDay1Read stamps dw_reading_done on the local en-CA date, advances to Day 2, records the streak, fires dw-reading-completed. Then the ruled gate stack, strictly sequenced and never stacked: PathAskedOnce ("Day 1, done." now with two Yeses, both stamping a real choice), then PushOptIn (hour pre-set to the hour they are actually reading), then later the email card. About four minutes, one decision, nothing asked they cannot answer.

**Return visit.** Day 2 onward the tab shell renders, no landing, no picker. Home is the journey and nothing else: header cluster (PathSwatch, LanguageSwitch, ThemeToggle), greeting that names days read, PathArrivalStrip only if a path was just saved, the five-minute promise line, then the journey hero: photo carousel, "Day 6 of 40, New & Returning to Faith," the day title, sage progress bar, one sage Read. The Sermon Notes row is gone from this path outside the Sunday window. Read opens the full-screen Day N surface: the day's own verses already open (2 Corinthians 5:17, not all of 2 Corinthians 5), "Read the whole chapter" one tap under them, the teaching with its dotted words, the two questions, the completion control, then the closing card. Same four minutes as day 1.

**Week 2.** Days 8-14 are the doctrinal middle: Romans 3 on sin, 1 John 1 on repentance, Acts 2 on the Holy Spirit, and the longest lessons in the whole 40. The verse-sized unit matters most here, so does the word help. Two things arrive. At day 7 the closing card reads "Seven days. This is becoming yours" and the milestone banner shows once, counting days read, in the reader's language, no emoji, no exclamation. At day 10 one quiet card under the questions offers to have someone from their campus read it with them, once, dismissible, an intake action and never a chat. By day 14 they have a 14-day bar, answers saved against ten days, and one human who knows they exist. Glossary terms run through day 14 in v1 and simply do not render on days 15-40.

**Missed day.** Nothing happens and nothing is said about the gap. currentDay only advances on completion, so day 7 is still day 7 and the progress bar is where they left it. On return, one line under the hero and one in the day header: "Day 7 has been waiting for you." Never "you missed 3 days," never a broken flame, never a catch-up offer, never an apology. The streak's one freeze keeps running underneath and is never shown on this path, the greeting already excludes new_to_faith from the streak-reset line, which is the no-shame design half-built. Push resumes at their hour with the same neutral wording.

**Seasonal.** Deliberately not built on this path, and the refusal is the design. The 40 days already are the time-boxed challenge the research credits with the spikes; layering a church-wide season on top of day 6 of 40 gives one person two counters and two obligations, which is the exact failure the app already fixed once. The seasonal read belongs to congregation. The only seasonal touch here is the existing Sunday window, where the Sermon Notes row returns above the reading for QR guests, ruled, and restored by this design because it is not implemented today. Day 40 is the one calendar moment this path owns, and today it ends on "Day 40 complete" and silence; a named ending is an owner decision below, not built.

### Screens

#### 1. Day 1 landing, cold arrival — src/components/Day1Landing.tsx

Purpose: the first thing a person who may never have opened a Bible sees. Ask nothing, explain little, get them reading in one tap, and let the person coming back know the screen is for them too, without making them declare it.

Order of elements, top to bottom:
1. Header: wordmark (left) + LanguageSwitch pill (right)
2. Eyebrow: "Day 1 of 40, New & Returning to Faith"
3. Title: "Grace Changes Everything"
4. NEW: one welcome line directly under the title, naming both people and the cost in time
5. Sage Read button, the only button on the screen
6. Quiet text link: "Not new to faith? Choose your path" (Door 1, verbatim)

Copy:

| Element | Text |
|---|---|
| Eyebrow (day1_eyebrow, unchanged) | Day 1 of 40 · New & Returning to Faith |
| Title (DAY1_TITLE in src/data/day1-landing.ts, unchanged) | Grace Changes Everything |
| NEW welcome line (new key day1_welcome, x4 languages) | New to this, or finding your way back. Day one takes about five minutes, and there is nothing to catch up on. |
| Primary button (read_btn, unchanged) | Read |
| Door 1 line (path_landing_prompt + path_landing_link, unchanged) | Not new to faith? Choose your path |

States: first paint, hero closed, the only state most people ever see. Reading open, Read is replaced in place by the reading section, no navigation, no second screen. Refresh mid-flow, startOpen via needsDay1Reading reopens on the reading. Language switched, the whole screen re-renders in place on dw-lang-changed, Day1Landing holds lang in state, the new key must exist in all four languages or t() prints the raw key. Sunday QR guest (?sunday=1), identical screen, beginDay1 stamps source 'sunday-guest', still not a real choice. Offline, fully functional, the copy and the KJV Ephesians 2:8-9 are bundled, nothing is fetched.

Keep: the entire Superdesign layout, spacing and type scale, treat every pixel as ruled. One button, no chips, no segmented control, no "new / coming back" picker; a question before the reading is precisely the gate Ashley removed on 26 Aug, when 23 of 28 enrolments stuck on day 1. Door 1's quiet text link and its wording, verbatim, a link, never a second button. LanguageSwitch in the header, pinned by language-switch.test.ts. The bundled KJV verse and the real Day 1 title, both pinned by day1-landing.test.ts. No gate: the app is fully usable before any question is answered.

Change: add exactly one paragraph between the title and Read. It is copy, not a control, so the CTA count in Day1Landing.test.tsx (which matches the button regex excluding aria-haspopup) is unaffected, but re-run that test deliberately rather than assuming.

Remove: nothing. The screen is right; it is one sentence short.

#### 2. Day 1 reading, expanded in place — src/components/Day1Landing.tsx

Purpose: their first four minutes in scripture. It has to feel finishable before they start it, and no single word may be the reason they stop.

Order of elements, top to bottom:
1. White paper verse card: gold rule, Ephesians 2:8-9 in quotes, reference
2. Three short pastoral paragraphs. NEW: up to two hard words carry a dotted underline that expands inline to one plain sentence
3. Reflect & Respond: Day 1's two questions with answer boxes (ruled 2 Sep, part of the lesson, above the completion control)
4. "Day 1 of 40"
5. "Mark as read" (sage, full width)

Copy:

| Element | Text |
|---|---|
| Reflect heading (PathwayQuestions, unchanged) | Reflect & Respond |
| Answer placeholder (pathway_answer_placeholder, unchanged) | Write here… |
| Inline word help, example (books/glossary.json) | Grace, a gift from God you did not earn and cannot pay back. |
| Completion note (day1_of_40, unchanged) | Day 1 of 40 |
| Primary button (mark_as_read, unchanged) | Mark as read |

States: questions blank (default), never validated, never required, never blocks Mark as read. Answered, persists to dw_pathway_qa_1, the same store the Day N surface reads (verified 2 Sep). Keyboard open on an answer box, Mark as read stays reachable below the fold, never fixed over the field. Word expanded inline, one sentence, pushes content down, tap again to collapse, never an overlay on this screen. Language switched mid-read, copy re-translates, answers persist. Offline, unchanged, nothing is fetched, and the word help still works because the glossary is cached. Marked read, markDay1Read stamps dw_reading_done (local en-CA), advances to Day 2, records the streak, fires dw-reading-completed, leaves the gate.

Keep: question placement under the pastoral text before Mark as read, ruled 2 Sep, do not move. The 3-7 verse unit; this screen is already the size the research asks for, it is the model the Day N surface must copy. The white paper card with dark upright Georgia scripture in both themes, the locked "paper mode." markDay1Read's single-unit behaviour, one action completes the day.

Change: dotted words in the pastoral text only, never inside the scripture card, the locked paper panel keeps its typography untouched. Cap at two per screen. Muted sans, upright; italics are banned except for special purposes. The expansion is inline, not a sheet. Day1Landing.tsx:41 calls useModalA11y(true) and line 76 sets aria-modal='true'; mounting a second overlay above it is the nested-focus-trap failure ruled on after the 28-agent review.

Remove: nothing.

#### 3. Asked once, Door 3 — src/components/PathAskedOnce.tsx

Purpose: the only safe place to ask who they are, after the reading, never before it. This is where the research's two doors live, as two ways of saying yes, not as a question at the front door. It is also where an explicit yes must finally start counting.

Order of elements, top to bottom:
1. Sage check glyph
2. Title: "Day 1, done."
3. Body question (unchanged, it already names both people)
4. Sage button 1: "Yes, I'm new to this"
5. Sage-outline button 2: "Yes, I'm coming back"
6. Text link: "I'm here for something else" (opens ChoosePathSheet door='asked')
7. Eyebrow: "Asked once, Never again"

Copy:

| Element | Text |
|---|---|
| Title (path_ask_title, unchanged) | Day 1, done. |
| Body (path_ask_body, unchanged) | The 40-day journey is built for someone new to faith or coming back to it. Is that you? |
| Button 1 (new key path_ask_yes_new) | Yes, I'm new to this |
| Button 2 (new key path_ask_yes_back) | Yes, I'm coming back |
| Link (path_ask_other, unchanged) | I'm here for something else |
| Eyebrow (path_ask_eyebrow, unchanged) | Asked once, Never again |

States: shown once only: onboardingActive && !pathAsked && hasReadOnce && needsPathAsk(setup) (App.tsx:287); never for comfort, never after a real choice, never stacked with the push ask. Either Yes calls markPathAsked() AND saveSetup({persona:'new_to_faith', source:'onboarding'}) AND writes dw_journey_entry='new'|'returning'; screen closes, the push ask follows. "Something else" opens the five-card sheet at door='asked'; tapping a card saves and opens that screen (commit(next)), no CTA below the fold. Second device, dw_path_asked and dw_setup both ride the misc bag, so it never returns. Offline, the writes are local, the misc push flushes when connectivity returns.

Keep: its exact position in the gate stack, after the first Mark as read, before the push ask, never stacked. The body copy verbatim; it already names both people, the buttons now let them say which. The "something else" link and its sheet door. No focus trap here, the sheet opens above it at document level.

Change: split the single Yes into two Yeses. Same commitment, same persona, one extra bit of truth the app currently throws away, and it is the split the research asks to test (returning framing vs generic on 7-day retention). Ruling repair: both Yeses must stamp a real choice. handlePathAsked at App.tsx:288-291 today calls only markPathAsked() and setPathAsked(true), so the person stays source:'default', their explicit yes never reaches the cloud, and a second device treats them as cold. An explicit yes is an onboarding choice under REAL_CHOICE_SOURCES. dw_journey_entry rides the misc bag with a dw_misc_meta stamp so it is newest-wins rather than fill-only, and it is merged into what is currently in localStorage, never rebuilt from React state.

Remove: the single generic Yes button. path_ask_yes becomes unused, keep the key, the same way the path_*_cta keys were kept.

#### 4. Push opt-in — src/components/PushOptIn.tsx

Purpose: set the daily trigger at the one honest moment, straight after they have actually finished a reading.

Order of elements, top to bottom:
1. Bell glyph
2. "One gentle nudge a day"
3. Body (push variant or calendar fallback)
4. NEW: one line, "Day 2 lands tomorrow."
5. "Remind me at" + hour select
6. Primary: "Turn on daily reminders" (sage on this path)
7. "Maybe later"

Copy:

| Element | Text |
|---|---|
| Added line (new key push_tomorrow_day) | Day 2 lands tomorrow. |
| Title, body, buttons | Unchanged. |

States: shown once: onboardingActive && !pushOnboarded && hasReadOnce && persona!=='comfort' && !showPathAsk. Push supported, prod, www or localhost only (pushSupported allowlist). Push unsupported, the calendar fallback, which is what a deploy preview and the futures.church proxy will always show. Busy, permission denied, or timed out, every await bounded by withTimeout/fetchWithTimeout, finish() guaranteed once with the 12s outer backstop; this screen once trapped the whole app, do not loosen a single timeout. Skipped via "Maybe later," works even while busy.

Keep: the evidence-timed gate, only after a real finished reading, never for comfort, never stacked with Door 3. Every timeout backstop in the enable path. useModalA11y here is correct, this gate opens no sibling overlays.

Change: the hour select defaults to the current local hour clamped to 5-22 instead of a hard 7am, and writes dw_push_hour_source='user' the moment the person touches it, so any later behaviour-inferred hour can never override a hand-set one. One added line naming tomorrow's day. The primary button uses var(--dw-new) on this persona so the sage hierarchy holds.

Remove: nothing.

#### 5. Home, the journey home — src/screens/HomeScreen.tsx, isNewPath branch

Purpose: one object on the screen, today's day of the 40, and the button that opens it. Say what they have actually done, and stop showing them a card that was ruled off this screen and never removed.

Order of elements, top to bottom:
1. Header cluster: PathSwatch, LanguageSwitch, ThemeToggle (no chips, no search, no AI launcher)
2. Greeting, now naming days read, or the waiting line after a gap
3. GreetingSection milestone banner, when a journey milestone lands
4. PathArrivalStrip, only after a path was just saved, dismissible
5. Sermon Notes row, only inside the Sunday window (restored ruling)
6. Five-minute promise line (while fewer than seven days are complete)
7. Journey hero: photo carousel, "Day N of 40, New & Returning to Faith," day title, sage progress bar, one sage Read
8. NEW: one line under the progress bar after a 2+ day gap
9. EmailNudgeCard, persona copy
10. Nothing else

Copy:

| Element | Text |
|---|---|
| Greeting, 0 days (unchanged) | Welcome, {first}. We're glad you're here. |
| Greeting, 1 day | Good {tod}, {first}. One day in. |
| Greeting, 2-6 days | Good {tod}, {first}. {n} days in. |
| Greeting, 7-13 days | Good {tod}, {first}. A week in. This is yours now. |
| Greeting, 30-39 days | Good {tod}, {first}. {n} days in. Nearly there. |
| Greeting, 40 days | Good {tod}, {first}. You finished the forty. |
| Greeting, entry 'returning', first days | Good to have you back, {first}. Pick it up where you are. |
| Greeting, after a gap of 2+ days | Day {n} is still here, {first}. |
| Line under the progress bar after a gap | Day {n} has been waiting for you. |
| Promise line (pathway_how_it_works, unchanged) | Each day: one scripture, one short teaching, one step. About five minutes. |
| Hero eyebrow (unchanged) | Day {n} of 40 · New & Returning to Faith |
| Hero button (read_btn / read_today, unchanged) | Read / Read today |
| Milestone banner eyebrow (replaces "Milestone Reached") | {n} days read |
| Milestone banner line (replaces "You've got a {n}-day streak!" / "Keep the momentum going. You're amazing.") | You've read on {n} days. That's the whole thing, showing up. |
| EmailNudgeCard body, this path | Your 40 days live on this phone only. Add an email and they follow you to any device. |
| EmailNudgeCard CTA / dismiss (unchanged) | Add email / Not now |

States: Day 1 not yet begun, Day1Landing renders instead of this screen. Journey data still loading, the existing pathway-loading hero (HomeScreen.tsx:2131), never the "Choose your reading plan" funnel and never the shared audio hero, even for a slot-holding new believer. Day N not read today, sage "Read." Read today, "Read today" checked, and it still re-opens the same day. Gap of 2+ days since lastCompletedDate, the greeting swaps and the waiting line appears under the bar, computed with toLocaleDateString('en-CA') only, never toISOString (DATE-AXIS RULE). Milestone day (7, 14, 21, 30, 40), banner once per session, dismissible, counting days read. No email yet and push resolved, EmailNudgeCard shows. Sunday, inside the service window, the Sermon Notes row returns above the hero for QR guests. Day 40 complete, the hero holds Day 40 with a finished bar (see open decisions). Offline, the journey JSON serves from cache (network-first with cache fallback, PR #84).

Keep: the photo carousel, the sage progress bar and the single sage button, the whole hero, untouched. Ashley, 1 Sep: "the person needs to see the green button for the 40 day journey and any text on the screen must be related to that button... and the picture and graphics still stay." Everything already hidden on this path stays hidden: the gold Bible AI button and floating launcher (dw-new-home body class), HomeContextChips, search, the date strip, Active Plans, Daily Quote, ai_prompt and the PromoAds Home mount. PathSwatch and LanguageSwitch in the header, the ruled third door out, visible for every persona, and the only exit from a defaulted path. The header streak chip already excludes new_to_faith (HomeScreen.tsx:2006), leave it excluded. The five-minute promise line.

Change: ruling repair, gate the Sermon Notes row on this path to the Sunday window. It renders unconditionally at HomeScreen.tsx:2106 under a comment that says "always visible"; sermonNotesRow itself (HomeScreen.tsx:1786) gates only pastor_leader's destination; isSundayWindow (src/utils/sunday.ts:9) is not imported into HomeScreen at all; and the only dw-new-home CSS (src/index.css:962-963) hides .dw-ai-launcher and nothing else. Today a brand-new believer's second-ever screen leads with a black sermon-notes banner on a Tuesday, the exact thing Ashley banned on 1 Sep. getGreeting takes daysRead and entry for this persona and uses the ladder above; HomeContextValue gains daysRead. Four language blocks; getGreeting once had English and Indonesian only and the front page stayed "Welcome, friend..." after a switch, pinned since by greeting-languages.test.ts. GreetingSection's milestone banner counts days read from completedDays.length, not the streak, renders from i18n strings, and drops the emoji, the exclamation and "You're amazing." recordStreakToday() fires in a bare useEffect on every mount (HomeScreen.tsx:786-793), so the streak counts app opens: a reader who opened seven days and read three would be congratulated for seven. Collapse the two divergent hardcoded milestone lists (streak.ts:14 and GreetingSection.tsx:6) into one exported constant; they disagree today, so a no-shame change to one leaves the other celebrating a milestone the engine does not recognise. Extend the promise line from completedDays < 3 to < 7; the habit is not formed inside week one and busyness is the number one reason reading declines. One waiting line under the progress bar, only after a 2+ day gap. EmailNudgeCard copy for this path names the 40 days, not "your progress" and not a journal they do not have.

Remove: the Sermon Notes row on this path outside the Sunday window. Named as a deliberate loss: a QR guest arriving on a Monday loses that route. That is what the ruling says to do, and the row still returns in the window.

#### 6. Day N, the full-screen reading (days 2-40) — src/components/NewBelieverLessonCard.tsx

Purpose: the screen they meet every day for six weeks. Today it is where a 3-7 verse journey turns into a whole chapter of Paul. Make every day the same size and the same shape as day 1, with the chapter always one tap away.

Order of elements, top to bottom:
1. Back
2. Day header card: "Day N of 40" + series, progress bar, day title, theme
3. (conditional) Waiting line after a 2+ day gap
4. White paper reading panel, the day's own verses, already open; label "Romans 8:1-2 · ESV" now matching what is rendered
5. NEW: one quiet control directly under the verses, "Read the whole chapter"
6. (conditional) Offline / translation-unavailable notice
7. The lesson, with up to two dotted words on days 1-14
8. Reflect & Respond: the day's two questions with answer boxes (ruled placement, directly under the lesson, before the completion control)
9. Completion control
10. The closing card (see next screen)
11. Share, on its own row below
12. (day 10 only, once) The invitation card
13. Foot line: "Going through something hard right now? Open comfort"

Copy:

| Element | Text |
|---|---|
| Reading panel eyebrow (unchanged shape, now truthful) | John 19:30 · ESV |
| Expand control (new key journey_read_chapter) | Read the whole chapter |
| Collapse control (new key journey_read_verses) | Show just today's verses |
| Waiting line (new key journey_waiting) | Day {n} has been waiting for you. |
| Offline notice (new key offline_text_notice, wording reused from the hero) | {translation} is unavailable right now, showing the offline text instead. |
| Inline word help, example | Righteousness, being right with God. Not something you achieve. Something you are given. |
| Primary button (mark_complete today; see open decisions) | Mark Complete |
| Primary, already done (completed_check, unchanged) | Completed |
| Comfort foot line (new keys journey_comfort_line + journey_comfort_link) | Going through something hard right now? Open comfort |
| Loading (unchanged) | Loading scripture |

States: loading, the existing spinner and "Loading scripture," keep the pathwayDisplayDay dependency, without it an overnight resume spun forever for slot-holders. Verses only (default), the day's range from reading.verses, for example Romans 3:23-24 out of Romans 3. Whole chapter expanded, same panel, no refetch, control flips to "Show just today's verses." Range unresolvable, no [N] markers in the returned text, or an object-shaped offline KJV chapter, falls back to the whole chapter silently, never an empty panel; this is the fail-safe, not an edge case, fetchKJV's raw-JSON shape makes it a live path. Offline / ESV unavailable, the notice renders above the verses and the reading still works, the served-translation label shows what actually arrived. Verse tapped, highlight plus the simple study sheet, "What this means" into Bible AI; refs stay passageRef:verseNum so a highlight made in either view resolves in the other. Word expanded, inline, one sentence, on this surface it may also open as a sheet because this surface uses useSubView alone. Question answered, saved to dw_pathway_qa_{day}. Completed today, the completed chip, the closing card, "Show me now." Peeking tomorrow (isPeek), title, theme and lesson only, no verses panel, unchanged, it is what stops a reader walking all 40 days in an evening. Gap of 2+ days, the waiting line renders in the day header, never at 0-1 days, never with a count of days missed. Day 10, not yet acted on, the invitation card renders once under the questions. Comfort peek open, the comfort chapter in comfortMode, Note + Close only, Close returns here.

Keep: the ruled order, questions directly under the lesson text, before the completion control (PR #84, 2 Sep), pinned by pathway-questions.test.ts, do not move them back to the foot. useSubView(open, onClose) alone, no useModalA11y, no aria-modal; this surface opens the study sheet, the note drawer and Bible AI as DOM siblings; a document-level trap made them keyboard-unreachable and let Escape close the surface underneath them (28-agent finding 1); pinned by home-journey.test.ts. The card stays mounted with a live open prop, a conditional mount orphans one history entry per close and kills Android back (finding 2). The white paper panel with dark upright Georgia scripture in both themes and the forced light ink vars. The shared pathwayDisplayDay so the hero, the lesson card and the Read tab can never disagree. savePathwayProgressFromLesson's single-unit completion and its dw-reading-completed event, the gate stack's timing depends on it. Verse-tap highlighting and the simple study sheet; commentary, Greek/Hebrew and word studies stay hidden on this path. The sage token family (var(--dw-new)), no raw greens.

Change: serve the day's assigned verses by default and put the whole chapter behind one control directly under them, this is the single highest-value change on the path. NewBelieverLessonCard.tsx:94 builds chapterRef as book+chapter and line 179 prints the day's ref or chapterRef as the label, so the label already promises the small reference the panel does not deliver. Every one of the 40 days carries reading.verses in books/faith-pathway.json (day 1 '8-9', day 2 '17', day 3 '30', day 8 '23-24', day 10 '28-30') and the app throws it away. Do not change the fetch. fetchKJV (src/utils/api.ts) matches book and chapter only and cannot resolve a verse range; a well-meaning "just fetch the verses" change silently kills the offline KJV fallback and every reader without ESV gets an empty card. Fetch the chapter, slice client-side over the parseVerses result. Add the offline / translation-unavailable notice this surface lacks, the hero already has one. Add up to two dotted words per day in the lesson text only, never inside the scripture panel. Add the waiting line, the day-10 card and the comfort foot line. Demote Share to its own row below the closing card so nothing sits level with the primary action.

Remove: the whole chapter as the default reading unit; nothing is deleted, the chapter is relocated one tap down, and that distinction is the whole design. Share from the primary action row.

#### 7. The day closes — inside Day N, replacing the grey completion note

Purpose: the reward. One calm moment that says the day is done and names what they have actually read. This path currently has the weakest close in the app: DoneCelebration is deliberately suppressed here, so the persona with the least momentum gets a grey inline line.

Order of elements, top to bottom:
1. Check glyph in sage
2. "Day 6 done."
3. One identity line by days read
4. "Day 7 will be here tomorrow."
5. Share
6. "Show me now" (peek tomorrow)
7. Day 10 only: the invitation card

Copy:

| Element | Text |
|---|---|
| Title (new key j_day_done) | Day {x} done. |
| Identity, 1 day | That's day one. You've started. |
| Identity, 2-6 days | {n} days in the Word. |
| Identity, 7 days | Seven days. This is becoming yours. |
| Identity, 14 days | Fourteen days. You're past the hard part. |
| Identity, 30 days | Thirty days. Ten to go. |
| Identity, 40 days | Forty days. You read the whole journey. |
| Tomorrow line (pathway_day_complete, kept) | Day {y} will be here tomorrow. |
| Final day (pathway_day_complete_final, kept) | Day 40 complete. |
| Peek link (pathway_show_now, kept) | Show me now |

States: completed today, a next day exists, full card. Completed today, day 40, no tomorrow line, no peek link (see open decisions on what follows). Day 10 and not asked before, the invitation card renders below. Peek opened, the card collapses, tomorrow's title and lesson show, verses hidden. Reload after completion, the same day is held; a reload must never hand out the next lesson.

Keep: no DoneCelebration on this path, the closing card is the moment, and the two post-reading prompts must never stack. The existing pathway_day_complete / pathway_day_complete_final / pathway_show_now strings and the one-tap peek.

Change: the grey inline note becomes a sage closing card with the check, the identity line and Share. The identity line counts pathwayProgress.completedDays.length, never the streak. The card reads dw_pathway_progress; it must never rewrite it. Any write merges into what is currently in localStorage and touches only its own fields; rebuilding a synced dw_* record from mount-time React state is what destroyed nine completed days in PR #64.

Remove: nothing. The grey note is replaced, not deleted.

#### 8. Word help — inline on the landing, sheet-capable on Day N

Purpose: one hard word, one plain sentence, no theology lesson, so nobody stops reading because of a word. 60 percent of Americans cannot name five of the Ten Commandments.

Order of elements, top to bottom:
1. The word, as the heading
2. One plain sentence
3. Optional second line: where it comes up
4. Text link: "Ask more about this" (Day N only)
5. Close / collapse

Copy:

| Element | Text |
|---|---|
| Example, grace | Grace, a gift from God you did not earn and cannot pay back. |
| Example, repentance | Repentance, turning back. Changing your mind and coming home. |
| Example, condemnation | Condemnation, being found guilty and sentenced. The verse says that is over. |
| AI link (new key word_ask_more) | Ask more about this |
| Close (existing key) | Close |

States: underlined, only ever for a term that exists in books/glossary.json for the reader's language, so there is no empty state. Expanded inline (Day 1 landing), pushes content down, tap to collapse. Open as a sheet (Day N surface only), permitted because that surface uses useSubView alone. Offline, serves from cache, and "Ask more" hides because the AI endpoint is unreachable. "Ask more" tapped, opens Bible AI with the word pre-asked via the existing default-off initialQuestion prop; note the known trap, a call made while a prior ask is in flight is treated as an abort. Back gesture / Android back, closes the sheet, not the reading beneath it. Days 15-40, no terms defined, no row renders, nothing changes.

Keep: Bible AI stays reachable only from the reading action bar, never from this path's Home.

Change: terms live in books/glossary.json plus _es/_pt/_id, so a wording fix is a content edit that reaches returning readers on their second open with no code change, no sw.js edit and no CACHE_NAME/SW_VERSION bump, it inherits the ruled /books network-first strategy. A bundled default in src/data/journey-glossary.ts ships with the app so the file is optional and the feature works cold and offline. New CSS uses an unused prefix; check that `git show origin/main:src/index.css | rg -o '\.dw-wh-'` is empty first, dw-path-* was already taken by the Plans-tab chooser and cost a rebuild. On the Day N surface the sheet mounts as a DOM sibling using useSubView alone, with no useModalA11y and no aria-modal. On the Day 1 landing it must not be a sheet: Day1Landing.tsx:41 holds useModalA11y(true) and line 76 sets aria-modal='true'; a second overlay above it is the nested-trap failure ruled on.

Remove: nothing.

#### 9. Day 10, one invitation

Purpose: one human move, once, at the point the research says the habit is either forming or dying. An intake action, not a chat.

Order of elements, top to bottom:
1. Eyebrow: "Day 10"
2. One sentence
3. Sage button: "Ask someone to read with me"
4. Text link: "Not now"

Copy:

| Element | Text |
|---|---|
| Eyebrow (new key journey_connect_eyebrow) | Day 10 |
| Body (new key journey_connect_body; overridden per campus) | You don't have to do this on your own. Someone from your campus will read these with you, at your pace. |
| Primary (new key journey_connect_cta) | Ask someone to read with me |
| Dismiss (new key journey_connect_later) | Not now |
| Email needed, shown before the tap does anything | We'll need an email address so they can reach you. |
| After sending (new key journey_connect_sent) | Sent. Someone from {campus} will be in touch this week. |

States: shown, day 10 only, once per device, dismissible, below the questions in the closing card. Dismissed, dw_journey_connect stamped, never returns. Sent, the confirmation replaces the card, never re-offered. No email on file, the card says so before the tap; the tap opens the existing EmailGate first, which keeps its "Skip for now." No campus set, a one-tap campus pick inside the card, because HomeContextChips is hidden on this path so a defaulted new believer cannot otherwise set one. Offline, the button is disabled with "This needs a connection. It will be here tomorrow." No campus welcome item published, the card falls back to the shipped default copy.

Keep: it routes through the existing intake pipeline (netlify/functions/intake.js action 'submit'), resolved against staff_roster.campus_id, not a new inbox and not a chat.

Change: new card, day 10 only. "Not now" must be as prominent as "Yes," this asks a ten-day-old believer for contact with a stranger. The sentence and the name of who reaches out come from campus_content type 'welcome', published by the campus pastor at /staff. One-time developer cost: add 'welcome' to CORNER_TYPES (netlify/functions/lib/intake-core.js:40) and insert one intake_questions row; after that the pastor edits it forever with no deploy.

Remove: nothing.

#### 10. Comfort from the journey — reachable from the foot of the Day N surface

Purpose: the person new to faith who is also in trouble is the most exposed reader in the app. They must reach comfort without giving up who they said they were.

Order of elements, top to bottom:
1. Comfort chapter, opened directly, low chrome
2. comfortMode toolbar: Note + Close only
3. Close returns to the Day N surface, same day, same scroll position

Copy:

| Element | Text |
|---|---|
| Entry line on Day N | Going through something hard right now? |
| Entry link | Open comfort |
| On close | No copy. It simply returns. |

States: open, session flag dw_comfort_peek, the comfort chapter renders read-only, nothing asked, nothing counted, no streak, no "complete." Closed, back on Day N, the journey untouched. Back gesture, closes the peek, not the app. Never, it must not write dw_setup, must not call saveSetup, and must not route through handleRead (which credits the plan day at :730).

Keep: comfortMode toolbar is Note + Close only (ruled). No "Feeling Stronger?" graduation prompt anywhere near this, ever (ruled, removed for good). No count, no completion, no streak inside comfort.

Change: reachable from this path without switching the saved path; dw_setup is untouched, so saveSetup's source!=='default' gate is never involved and switching back is not even necessary. Uses useSubView alone, no aria-modal, because the note drawer mounts above it. Deliberately not on this path's Home: Ashley ruled every line on that screen relates to the sage button, and the PathSwatch already reaches "I'm going through something hard" from the header in two taps; his call whether it also belongs on Home (open decision).

Remove: nothing about the comfort path itself. This is a doorway into it, not a change to it.

#### 11. The daily nudge — netlify/functions/push-send.js

Purpose: the trigger. Point it at their day, at the hour they actually read, once, with no guilt.

Order of elements, top to bottom:
1. Title
2. Body
3. Tap opens the app on Home, hero on today's day

Copy:

| Element | Text |
|---|---|
| Title | Daily Word |
| Body A | Day {n} of 40 is ready. About five minutes. |
| Body B, after a gap of 2+ days | Day {n} is still here. |
| Body C | Day {n} is ready when you are. |

States: subscribed, day not read today, sends at preferred_hour with the existing 2-hour catch-up window and the once-per-local-day ledger. Subscribed, already read today, no send. Subscribed, journey finished, falls back to the existing global rotation. Not subscribed, nothing, the calendar fallback covers unsupported browsers. Language es or pt, today falls back to English templates, which is the gap this fixes. Deploy preview or the futures.church proxy, the push path does not exist at all.

Keep: the hourly cron, per-subscriber timezone and preferred_hour, the once-per-local-day ledger, the 2-hour catch-up window. The existing global passage rotation for every other persona.

Change: push_subscriptions gains persona and journey_day, written on subscribe and refreshed by the client on dw-reading-completed; a new_to_faith branch in buildPayload uses the bodies above. Today push-send.js sends a global day-of-year passage from a fixed 40-item list, so a reader on Day 6 (Romans 8:1-2) is told to open Psalms 119, the nudge points away from their own journey. TEMPLATES gains es and pt; it carries en and id only today, so a Spanish reader of a fully translated 40-day journey gets English pushes. Claude drafts, Ashley approves before ship. Behaviour-inferred hour, later and only where dw_push_hour_source is not 'user': the client keeps dw_read_hours (last five local completion hours) and calls updatePushTime with the median once five exist.

Remove: any wording on this path that mentions a streak, a loss, a gap or a count of missed days. There is none today, this is a standing rule for the new templates.

### Comfort access

One tap, from the reading, without changing who they said they were. The line sits at the foot of the Day N surface, "Going through something hard right now? Open comfort," and opens today's comfort chapter as a sub-view above the journey. It sets a session flag (dw_comfort_peek) and does not call saveSetup, so the saved path stays new_to_faith (research persona 6: "crisis is not a persona someone chooses on a good day"). It does not route through handleRead, so it credits nothing, the same rule class as the ruled credit-free arrival seed, which must bypass handleRead because handleRead credits the plan day at :730. The toolbar is Note + Close only (ruled) and there is no graduation prompt of any kind (ruled, "Feeling Stronger?" removed for good). It uses useSubView alone with no aria-modal, because the note drawer mounts above it. Closing returns them to the same day with the journey, the progress bar and dw_setup untouched.

It is deliberately not on this path's Home. Ashley's 1 Sep ruling is that every line on the I'm-New home relates to the sage journey button, and the PathSwatch already reaches "I'm going through something hard" from the header in two taps, and per the sheet ruling that tap saves and opens, with dw_pathway_progress untouched so switching back returns them to the exact day. Whether the line also belongs at the foot of Home is his call, listed in open decisions; duty of care argues for it, his ruling argues against.

The crisis-keyword safety flow (gentle confirm, region-correct line: 988 US, 13 11 14 AU, 0800 543 354 NZ) and the first-use disclosure that this is scripture and a church, not counselling, are the cross-cutting comfort build and must land there rather than be forked here. The research's finding that only 35 percent of mental-health apps show crisis resources in-app and some show the wrong country's hotline is why it cannot wait. This path only names where the door is.

### Reminders

One a day, named by their day, never by a streak. The ask itself stays exactly where it is, after the first finished reading, keyed to dw_reading_done and the dw-reading-completed event, never before, never stacked with Door 3 (ruled decision 1). Four changes downstream of it.

1. Content: the push says "Day 7 of 40 is ready. About five minutes." instead of a global day-of-year passage from the fixed 40-item rotation, which today tells a reader on Day 6 to open Psalms 119. This needs persona and journey_day on push_subscriptions, written on subscribe and refreshed on dw-reading-completed; no lesson content is duplicated into the function, only the day number.
2. Timing: the PushOptIn hour select is pre-set to the hour they are reading at that moment rather than a hard 7am, and writes dw_push_hour_source='user' the instant they touch it; behaviour-inferred timing (the median of the last five local completion hours) comes later and may never override a hand-set hour. Research cross-cutting 6: one nudge a day, timed to when the person actually opens; guilt-framed reminders drive opt-out and uninstall.
3. Grace: suppressed entirely on a day already completed, using the same once-per-local-day ledger and the local en-CA date axis as everything else, and after a gap the body is "Day {n} is still here," never a count of missed days, never a flame, never "don't lose your streak." The streak engine's single freeze, replenished after 7 days, is the streak-repair mechanic the research asks for and it already exists, leave it alone, and note that the milestone list is duplicated in streak.ts:14 and GreetingSection.tsx:6 and the two disagree, so any no-shame change must touch both.
4. Languages: TEMPLATES carries en and id only, so an es/pt reader of a fully translated journey gets English pushes; Claude drafts es/pt, Ashley approves before ship.

Verification limit: pushSupported() allowlists only futuresdailyword.com, www and localhost, so none of this is testable on the deploy preview Ashley is looking at or on the futures.church proxy, prod or localhost only, and the UI will correctly show the calendar fallback on the preview.

### Instrumentation

First, fix the pipe. Nothing else on this list is trustworthy until it lands. track() (src/utils/analytics.ts:69-82) only posts to Supabase when dw_profile.email exists (the check is at line 76), and this persona has no email until after the first read, the push ask and the email card. The one persona whose D1/D7 we most need is the one the activity table cannot see. gaEvent (analytics.ts:22-28) adds only campus, so there is no persona dimension in GA4 either. Add an anonymous dw_device_id behind the existing dw_cookie_consent gate, add persona and journey_day to every event, and let netlify/functions/track-activity.js accept the id when there is no email.

Every new event name must be added to TRACKED_EVENTS (src/utils/analytics.ts:31-38). trackActivity returns early at line 45 for anything not in that hardcoded array, so a new event with no allowlist entry looks like zero usage rather than an error.

Events:
- journey_entry — detail 'new' | 'returning', fired from the two Yeses on PathAskedOnce. The split the research names as a test: 7-day retention, returning framing vs generic.
- journey_day_open — detail: day number. Opens of the Day N surface, per day.
- journey_day_complete — detail: day number. The completion curve. Day-1 completion versus day-2 completion is the whole thesis of this design, and no public source will ever supply it.
- journey_chapter_expanded — detail: day number. The guard on the smaller unit and an explicit revert trigger: if this runs high and completion is flat, the chapter was not the problem and the change comes out; if it runs near zero and completion is up, the chapter was pure friction.
- word_help_open — detail: the term. The glossary tap rate the research names as the literacy-scaffold test, and it tells us which words actually stop people.
- journey_question_answered — detail: day:index. Whether Reflect & Respond is used or scrolled past under the teaching.
- journey_return — detail: days since last completion. The return curve and the waiting-line trigger rate in one event.
- journey_connect_tap / journey_connect_dismiss — the day-10 relational move, accept rate.
- comfort_tap_from_journey — how many people on this path reach for comfort, which nobody currently knows.
- push_opt_out — detail: persona. The guilt canary: if opt-out on this path runs above the others, the reminder copy is wounding.
- day1_abandon — Read tapped, Mark as read never fired, session ended. The single number that says whether the Day 1 landing is the right size.
- Rollup: one nightly job producing D1 / D7 / D14 / D30 and completion-by-day, split by persona and by journey_entry. Report new_to_faith separately or the journey's curve disappears into congregation's. Research build item 1: "Instrumentation. D1/D7/D30 by path, session length, completion, reminder opt-out. Nothing above can be tested without it."

### Self-serve levers

- Live today, no developer: PathSwatch in the Home header opens the one "Where are you today?" sheet, one tap saves and opens, visible on every persona including this one, and the only exit from a defaulted path. LanguageSwitch on both the Day 1 landing and Home changes language live with no reload, and the whole 40-day journey plus its questions exist in en/es/pt/id. Reminder hour and push on/off in Settings. The Sunday QR guest flow (?sunday=1). That is the whole existing list.
- Live today and under-documented: books/faith-pathway.json (+ _es/_pt/_id) is the real content lever on this path. Lesson text, day titles, themes, the two questions per day in four languages and the reading reference are all in one file, and /books/* is network-first with cache as offline fallback only (PR #84), so an edit reaches returning readers on their second open after deploy with no code change, no sw.js edit and no cache bump. Because the reading unit now comes from reading.verses in that same file, shortening or lengthening any day is a content edit too, set a day's verses to the whole chapter's range and that day serves the whole chapter. This is Ashley's lever, not a campus pastor's, the teaching is his voice.
- New, same mechanism, zero new infrastructure: books/glossary.json (+ _es/_pt/_id). Terms and their one-sentence definitions are content, edited in one file, live on the second open, inheriting the same network-first rule precisely because they sit under /books. A bundled default in src/data/journey-glossary.ts ships with the app so the file is optional and the feature works cold and offline. Chosen over a Supabase table plus a /staff admin screen: fewer moving parts, nothing new to secure, and no admin surface nobody asked for.
- New, one row and one array entry: the day-10 campus welcome item. Add 'welcome' to CORNER_TYPES (netlify/functions/lib/intake-core.js:40) and insert one intake_questions row with config.publish='campus_corner', config.itemType='welcome'. After that the campus pastor writes, edits, re-words and removes the day-10 sentence at /staff themselves, forever, with no deploy. If no campus item exists the card falls back to the shipped copy.
- Already self-serve: who receives the day-10 request. The receiving pastor resolves from staff_roster.campus_id, which admin maintains through intake.js roster_save, so changing the person is a roster edit, not a code change. Ashley must still rule who that is per campus (open decision).
- Small build, worth it later: move push templates out of push-send.js into a table keyed by lang and persona, so reminder wording is edited without a function deploy. Today every word of every push is a hardcoded array. Deliberately deferred: a campus pastor should not be editing notification copy that goes to every congregation, so this is admin-only if it is built at all.
- Not self-serve, and said plainly: adding or removing a path (PATHS + the Persona type + the ChoosePathSheet icon map + i18n + PERSONA_CONFIGS), sectionOrder per persona (persona-config.ts), the Day 1 landing copy (src/data/day1-landing.ts, whose questions block is generated from the JSON between markers and pinned by a test), the gating logic for when the landing and the asked-once screen fire (coldStart.ts needsPathAsk, App.tsx wiring), REAL_CHOICE_SOURCES, and adding a campus (CAMPUSES in src/data/tokens.ts).

### Evidence

| Move | Source |
|---|---|
| The day's assigned verses open by default; the whole chapter behind one control directly under them. | Research P1: "Day 1: 3-7 verses, plain language, one thought, already open" and "YouVersion found newcomer plans work as one thought plus a few verses"; Where they quit: "Early, in the hard opening material. YouVersion raised plan completion by reordering to front-load accessible passages." Cross-cutting 3: busyness is the number one reason reading declines (40-58%) and "the felt need is a smaller unit of reading, not more content." Live, verified: books/faith-pathway.json carries reading.verses on every day (day 1 '8-9', day 2 '17', day 3 '30', day 8 '23-24', day 10 '28-30'), and NewBelieverLessonCard.tsx:94 builds chapterRef as book+chapter while line 179 prints the day's ref or chapterRef as the label, so the label already promises the small reference the panel does not serve. Day 3 teaches John 19:30 and serves 42 verses. |
| Slice client-side; never change the fetch to a verse range; unresolvable range falls back to the whole chapter silently. | src/utils/api.ts fetchKJV matches book and chapter only, so a verse-range fetch loses the offline KJV fallback entirely. ScripturePassage already parses [N] markers via parseVerses, so filtering is free and keeps highlight refs on real verse numbers. The repo's own CLAUDE.md records that fetchKJV dumps raw JSON for object-shaped chapter files, which makes "no [N] markers" a live path rather than a theoretical one, hence the mandatory whole-chapter fallback instead of an empty panel. |
| Restore the ruled Sermon Notes gate on this path: Sunday window only. | Ruling (feedback_daily_word_today_rebuild_rejected, line 16): "Sermon Notes row is demoted below the reading for congregation/deeper_study/pastor_leader/comfort; I'm New keeps it above only in the Sunday window (QR guests)." Live, verified broken: HomeScreen.tsx:2106 renders {sermonNotesRow} under the comment "Sermon notes, just below the greeting, always visible" with no persona or Sunday gate; sermonNotesRow (HomeScreen.tsx:1786) branches only on pastor_leader's destination; isSundayWindow (src/utils/sunday.ts:9) is never imported into HomeScreen; and the only dw-new-home CSS (src/index.css:962-963) hides .dw-ai-launcher and nothing else. Also breaks Ashley's 1 Sep ruling that every line on this Home relates to the sage button. |
| Both Yeses on the asked-once screen stamp a real choice (source 'onboarding'). | Ruling (project_daily_word_choose_your_path, line 69): saveSetup gates on source!=='default'; REAL_CHOICE_SOURCES = onboarding/settings/upgrade. Live, verified broken: App.tsx:288-291 handlePathAsked calls only markPathAsked() and setPathAsked(true), an explicit yes never becomes a real choice, so it never syncs, a second device treats the reader as cold, and the pastor boot re-stamp (which respects real sources but overrides auto-sourced ones) can overwrite them. |
| The two doors ('new to this' / 'coming back') live on the asked-once screen, never at the front door. | Research P1 journey Day 0: "two doors inside one card, New to this and Coming back. Same 40-day journey, different first line. The returning line says come back, nothing to explain." Ruling (project_daily_word_choose_your_path, line 65): the five-choice first-run picker was removed because "it was the gate where people opened and never read." Ashley, 1 Sep: "any text on the screen must be related to that button." So the question goes after the reading, where the ruled Door 3 already sits and where the body copy already names both people, and the landing gets one inclusive line of copy with no new tap target. |
| One welcome line under the Day 1 title naming both people, as copy not a control. | Research P1 who: Davis & Graham, The Great Dechurching (2023), roughly 40M Americans left in 25 years, 51% think they may return, most left for mundane reasons (moved, inconvenience), "practical friction is high; shame is lower than assumed." Delivered as a paragraph, so the Superdesign-locked layout holds and Day1Landing.test.tsx's CTA regex is unaffected. |
| Plain-language word help, in the lesson and pastoral text only, never inside the scripture panel. | Research P1 needs, ranked: "Literacy scaffolding (60% of Americans cannot name five Commandments)"; journey Day 1: "A one-line what this word means under any hard word"; Tests: "glossary tap rate." The scripture panel is excluded because the white paper panel with upright Georgia scripture is part of the locked look (project_daily_word_platform_polish, lines 121-126). Live: the mechanism exists for verses (verse tap, study sheet, "What this means," BibleAI initialQuestion, PR #81) but not for words inside the teaching. |
| Glossary content lives under /books. | Ruling (reference_daily_word_sw_books_cache_trap): "/books/* must be network-first with cache as offline fallback only (fixed in PR #84); bump CACHE_NAME/STATIC_CACHE and SW_VERSION together for any sw.js change." Putting the glossary there means content edits reach returning readers on the second open with no sw.js change and therefore no cache bump at all. |
| Nothing new mounts as an overlay on the Day 1 landing. | Ruling (28-agent review finding 1): "A full-screen host surface that opens overlays must use useSubView alone, not useSubView plus useModalA11y/aria-modal, or nested focus traps break keyboard/back-button navigation." Live, verified: Day1Landing.tsx:17 imports useModalA11y, line 41 calls useModalA11y(true), line 76 sets aria-modal='true'. It currently hosts only ChoosePathSheet, whose trap is document-level; a second sheet above it is the exact ruled failure. Word help expands inline there. The Day N surface, which correctly uses useSubView alone (pinned by home-journey.test.ts), may open a sheet. |
| Identity language counts days read, never the streak; the milestone banner is rewritten. | Research cross-cutting 6: "Streaks work until they shame." Live, verified: recordStreakToday() runs in a bare useEffect on every HomeScreen mount (HomeScreen.tsx:786-793), so the streak counts app opens, not readings, a new believer who opened seven days and read three would be told they have a seven-day streak. GreetingSection.tsx's banner is untranslated English with an emoji, an exclamation and "You're amazing," against Ashley's register, and its milestone list disagrees with streak.ts:14. |
| One closing card with an identity line, replacing the grey completion note. | Research P1 needs: "A starting point... Ordinary, no-explanation re-entry." Cross-cutting 6: the reward must not be guilt-framed. Live: the Day N surface deliberately suppresses DoneCelebration, so the only reward on this path is a grey inline note, the persona with the least momentum has the weakest close in the app. |
| Silent grace on a missed day, plus one waiting line. | Research cross-cutting 6: guilt-framed reminders drive opt-out and uninstall; "streak repair rather than a hard reset." Live: the journey is day-numbered, not date-numbered, markDay1Read and savePathwayProgressFromLesson advance currentDay only on completion, so the grace already exists structurally and the UI merely has to never mention the gap. persona-config.ts already excludes new_to_faith from the streak-reset greeting, and streak.ts gives one freeze replenished after 7 days. |
| Push names the day, not the streak; add es/pt templates. | Research cross-cutting 6: "one nudge a day, timed to when the person actually last opened (Duolingo's behaviour-inferred timing)"; P2 journey: "once a day, neutral wording. Never your streak is about to die." Live: push-send.js sends a global day-of-year passage from a fixed 40-item rotation, so a reader on Day 6 (Romans 8:1-2) is told to open Psalms 119, and TEMPLATES carries en and id only. |
| One relational invitation on day 10, routed through intake. | Research P1 journey week 2: "Add one relational move by day 10: someone at Futures would love to read this with you, which is an intake action, not a chat." Plus "Dechurched are reached by relational invitation into a stable community, not persuasion," and Pew's finding that weekly Bible-study group participation fell 24% to 13% between 2014 and 2025. Live: campus_content + intake_questions already carry campus-authored typed items; CORNER_TYPES (intake-core.js:40) needs one entry. |
| Questions stay directly under the lesson, above the completion control. | Ruling (project_daily_word_journey_questions, 2 Sep): "questions are part of the lesson, on the Day N surface they sit directly under the lesson text, before Mark Complete." Pinned by pathway-questions.test.ts. Not moved by anything here. |
| useSubView alone on the Day N surface; the card stays mounted with a live open prop. | Ruling (28-agent review findings 1 and 2). Pinned by home-journey.test.ts, which asserts useSubView(open, onClose) and the absence of useModalA11y and aria-modal. |
| Comfort reachable without switching the saved path, credit-free. | Research P6 journey: "From every path: a persistent one-tap I need comfort now that opens comfort without switching the saved path. Crisis is not a persona someone chooses on a good day." Build order 2: "Comfort from everywhere, smallest build, highest duty of care." Credit-free rule from the ruled arrival seed: it must bypass handleRead, which credits the plan day at :730. |
| Instrumentation before anything else. | Research "What to build first" item 1: "Instrumentation. D1/D7/D30 by path, session length, completion, reminder opt-out. Nothing above can be tested without it, and no public source will ever supply it." Cross-cutting 7 names it the single biggest gap. Live, verified: analytics.ts:76 gates the Supabase write on profile.email, so every cold new believer is invisible server-side, and trackActivity returns early at line 45 for any event not in the hardcoded TRACKED_EVENTS array at :31-38. |
| No seasonal church-wide read on this path. | Research cross-cutting 5 credits calendar moments with the spikes, but P1's own journey is already a time-boxed 40-day challenge. Two counters on one screen is the exact failure the app fixed once, "two progress readouts on one screen read as two journeys." The seasonal read belongs to congregation (P2 journey, "Seasonal"). The only seasonal touch here is the existing Sunday window, restored above. |
| Do not reorder days 2-7 toward narrative-first. | The research argues for it (P1 journey: "narrative first (Gospel scenes), doctrine later"; "YouVersion raised plan completion by reordering to front-load accessible passages"), and it is refused here on two grounds: dw_pathway_progress.currentDay is a bare index, so reordering silently hands every mid-journey reader a different lesson under the same day number and the lessons interlock; and the forty days are Ashley's own teaching sequence. The verse-range unit delivers most of the accessibility gain without touching it. Escalated as an owner decision needing a migration plan, not a JSON edit. |
| Keep PathAskedOnce's position, the push timing, the email nudge and their strict sequencing exactly as they are. | Ruled (project_daily_word_choose_your_path Door 3; deep-dive owner decision 1: "the two post-reading prompts never stack"). Nothing in the research argues against any of it. Only the content of Door 3's Yes changes, not its timing. |
| Keep the arrival pattern: this path is exempt from open-reading-on-arrival. | Ruling: "I'm New / new_to_faith path is exempt from the open-reading-on-arrival pattern, it uses the journey hero to full-screen Day N instead." |

### Open decisions

1. Approve the deploy preview before anything merges. Everything here lands on one branch and one preview link; the Day 1 landing and the Day N reading are both owner-preview-gated and the 1 Sep "you have completely stripped, go back" revert is the reason. Three things to look at: the Day 1 landing, day 3's reading, and Home on a Tuesday. Frame the reading honestly, Ashley approved the 42-verse Day N surface on 1 Sep, and this puts the chapter one tap under the verses rather than taking it away; day 3 is the case (one verse taught, 42 served). Verify translations on prod, not the preview: a DW deploy preview's own /api returns 403 and scripture silently falls back to offline KJV.
2. Does the Day N primary button stay "Mark Complete," or become "Mark as read" to match the landing and the hero? The argument for changing it: one verb for one act, and Day 1's own lesson says grace "doesn't reward performance, it replaces it," so a button that says Complete sits oddly under it. The argument against: it is a shipped string on a surface you already approved. It is copy only, the completion path, the store and the question placement are untouched either way. Not changed without your word.
3. Day 40. Does the fortieth day get a named ending and one offer of the congregation path (a real choice, source 'upgrade', through the existing sheet)? This is not comfort's banned "Feeling Stronger?" prompt, that ruling is scoped to comfort, where nothing may ever be asked, but it is close enough in shape that it needs your explicit word. Related and separate: what Home shows a reader who has finished all 40 days. The Day N surface has a final-day line; the journey hero does not, and would sit on "Read today" for day 40 indefinitely.
4. Who at each campus receives the day-10 "read with me" request, and what they are expected to do with it. The plumbing works either way (campus pastor or one hub inbox) and the recipient is a roster edit, not code. But without a named person the card is a promise the app cannot keep, and it should not ship, a new believer asking for help on day 10 and hearing nothing is worse than not offering.
5. Approve the glossary terms and their one-line definitions in English before translation. Proposed set for days 1-14: grace, saved, righteousness, repentance, condemnation, faith, Holy Spirit, baptism, sin, gospel. Claude drafts, you approve, the standing rule for translated content, and these are doctrine in miniature sitting inside your lesson text. Same question for the other new copy (welcome line, waiting line, chapter toggle, day-10 card, comfort line, push templates) in es/pt/id: do you want to read them, or delegate them the way you waived review on the comfort devotions?
6. Does the comfort line also belong at the foot of the I'm-New Home, or only inside the Day N reading? Your 1 Sep ruling says every line on that Home relates to the sage button, and a comfort line does not. It is kept off Home here. Duty of care argues the other way.
7. Anonymous analytics. A dw_device_id for pre-email readers is the only way to see this persona's retention at all, and it will sit behind the existing dw_cookie_consent gate and never be joined to a person before they give an email. Your call whether an anonymous id is acceptable, or whether the events wait for the consent accept, if they wait, the day-1 population stays invisible.
8. Reorder days 2-7 toward Gospel narrative before doctrine? The research says front-loading accessible passages raised plan completion, and days 1-14 are currently almost all epistles. Refused here because currentDay is a bare index and reordering rewrites what day 7 means for everyone already on day 7, if yes, it needs a migration plan. Your teaching sequence, your call.
9. Keep the "Show me now" next-day peek? It is one tap per day, and the peek already hides the verses so a reader cannot binge the readings, but a determined reader can still walk the lessons. Currently kept.
10. Later, not now: does the glossary eventually move from books/glossary.json to an admin-editable table? The file is the right v1 (no new surface, inherits the ruled network-first). The table only earns its keep if the wording changes often.

### Risks

- This touches the two most owner-preview-gated surfaces in the app. PR #80 deleted HomeScreen and ten sections and was reverted the same night. Nothing here merges without you on a deploy preview saying so. Operationally: the repo does not allow auto-merge (gh pr merge --auto errors) and a rebase plus force-push needs about 20 seconds before GitHub reports MERGEABLE, poll gh pr view --json mergeable.
- Verse filtering could break highlights. ScripturePassage builds highlight refs as passageRef:verseNum, the filter must keep the real verse numbers, or a highlight made on the sliced view will not match one made on the whole chapter and the two views will disagree about the same verse.
- Do not touch the fetch. fetchKJV cannot resolve a verse range; a "just fetch the verses" change silently kills the offline KJV fallback and every reader without ESV gets an empty card. And if a translation or the offline KJV returns text with no [N] markers, a naive filter renders an empty panel, the whole-chapter fallback is mandatory, not defensive polish.
- The smaller unit could mean less scripture read overall. Mitigated by keeping the chapter one tap away and by measuring journey_chapter_expanded: high expansion with flat completion means the unit was not the problem and the change should be reverted.
- dw_journey_entry and any write near dw_pathway_progress are synced dw_* records. They must be merged into what is currently in localStorage and touch only their own fields, rebuilding a synced record from mount-time React state is what destroyed nine completed days in PR #64, because applyCloudData restores that key straight to localStorage without telling React. dw_journey_entry also needs a dw_misc_meta stamp to be newest-wins, or it behaves as fill-only and a later correction never propagates.
- GreetingSection and getGreeting are shared by all five personas. The milestone rewrite and the greeting ladder must be pinned by tests for congregation, deeper_study, pastor_leader and comfort so a fix aimed at one path does not silently change four, and greeting-languages.test.ts exists precisely because getGreeting once shipped with English and Indonesian only.
- The i18n-keys regression test fails on any key missing a language. This adds roughly ten keys across four languages, and existing entries use \uXXXX escapes.
- Removing the Sermon Notes row from this path outside the Sunday window removes a route for a QR guest who arrives on a Monday. That is what the ruling says to do and the row still returns in the window, but it is a deliberate loss worth naming out loud rather than discovering later.
- Dotted underlines are new visual texture on a page whose look is locked. Cap at two per day, lesson text only, no colour change, no icon. If it reads busy on the preview, drop the underline and keep the meaning reachable from a long-press.
- The day-10 invitation is the one place on this path that touches an email, and it asks a ten-day-old believer for contact with a stranger. One ask, one dismissal, never repeated, "Not now" as prominent as "Yes," and the email need stated before the tap, if it lands as a wall it will read as the gate you removed in August.
- push_subscriptions needs two new columns. The migration goes in the repo, a stale out-of-repo migration is what once deleted a live database three days before a flight.
- Push cannot be verified on the deploy preview or the futures.church proxy: pushSupported() allowlists only futuresdailyword.com, www and localhost. Verify the day-aware payload and the es/pt templates on prod or localhost, never on the preview you are reviewing.
- dw_device_id is a new identifier. It sits behind the existing dw_cookie_consent gate, is never joined to a person before they give an email, never carries anything identifying, and never appears in a URL.
- Any edit to books/faith-pathway.json or the new glossary.json is invisible to returning devices until their second open after deploy. Do not judge either from a prod bundle grep, check the service-worker strategy for the asset class first. No sw.js change is proposed anywhere here, so no CACHE_NAME/STATIC_CACHE/SW_VERSION bump is needed; if sw.js is touched for any reason, bump all three together.
- Day1Landing.test.tsx counts CTAs by regex and pins the real Day 1 title and the generated questions block. Run it deliberately rather than loosening the pattern, a failure there is the test doing its job.
- The glossary is 14 days across four languages. If it slips, ship everything else: the renderer degrades to plain text when no term matches, so no day breaks.
- node_modules is not installed locally (Netlify builds it), a fresh worktree needs its own npm ci. And the main tree regularly carries another session's uncommitted work, so do this in an isolated worktree.

### Build steps

| Step | Files | Check |
|---|---|---|
| 1. Instrumentation first, make this persona visible at all. Add an anonymous dw_device_id behind dw_cookie_consent, add persona and journey_day to every event, let track() reach Supabase when there is no email, extend track-activity to accept the id, and add every new event name to the allowlist. | src/utils/analytics.ts (gaEvent params :22-28; the email gate at :69-82, specifically line 76; TRACKED_EVENTS :31-38, add journey_entry, journey_day_open, journey_day_complete, journey_chapter_expanded, word_help_open, journey_question_answered, journey_connect_tap, journey_connect_dismiss, journey_return, comfort_tap_from_journey, push_opt_out, day1_abandon), src/utils/storage.ts, netlify/functions/track-activity.js, a migration in the repo under supabase/migrations/ adding device_id + persona | npx tsc -b && npx vitest run, including a new spec asserting track() posts with no dw_profile.email. Then on prod in a fresh private window with no profile: complete Day 1 and confirm one row per event with a device_id and no email, and that GA4 carries persona as a dimension. |
| 2. Ruling repair, restore the Sermon Notes Sunday gate on this path. Render the row only when !isNewPath or isSundayWindow(), and fix the stale "always visible" comment. | src/screens/HomeScreen.tsx (render site :2106; import isSundayWindow from ../utils/sunday), src/screens/home-journey.test.ts | npx vitest run src/screens/home-journey.test.ts with a new case pinning the row absent for new_to_faith on a Tuesday and present inside the Sunday window, plus a case pinning it unchanged for the other four personas. Then walk the preview as new_to_faith on a weekday: no black banner above the hero. |
| 3. Ruling repair, both Yeses on Door 3 stamp a real choice. Split the single Yes into "Yes, I'm new to this" and "Yes, I'm coming back"; handlePathAsked calls markPathAsked() and saveSetup({persona:'new_to_faith', source:'onboarding'}) and writes dw_journey_entry, merged into current localStorage with a dw_misc_meta stamp. | src/components/PathAskedOnce.tsx (split the Yes at :34-48), src/App.tsx (handlePathAsked :288-291), src/utils/coldStart.ts (export JOURNEY_ENTRY_KEY), src/utils/cloudSync.ts (MISC_KEYS + the meta stamp), src/utils/i18n.ts (path_ask_yes_new, path_ask_yes_back x4) | npx vitest run src/utils/coldStart.test.ts src/__tests__/i18n-keys.test.ts. On the preview: either Yes closes the screen, the push ask follows and is never stacked, dw_setup.source reads 'onboarding', dw_journey_entry is set, reloading never re-asks, and comfort still never sees this screen. |
| 4. Right-size the Day N reading. Add a verseRange prop to ScripturePassage that filters the parsed verses without changing their numbers, pass dayData.reading.verses, add the "Read the whole chapter" control under the verses, and add the missing offline/translation notice. Do not touch the fetch. | src/components/ScripturePassage.tsx (verseRange over the parseVerses result), src/utils/parseVerses.ts (range helper), src/components/NewBelieverLessonCard.tsx (:94 chapterRef, the reading panel ~:163-205), src/utils/i18n.ts (journey_read_chapter, journey_read_verses, offline_text_notice x4) | npx vitest run with cases for: day 3 renders John 19:30 alone; the control expands the full chapter with no refetch; text with no [N] markers falls back to the whole chapter silently rather than rendering empty. On the preview with currentDay=8: Romans 3:23-24 renders alone, the label matches the body, a highlight made in either view shows in the other, and with ESV blocked the KJV fallback still fills the card. Then npm run build. |
| 5. Rebuild the closing moment and demote Share. Replace the grey completion note with the sage closing card, check glyph, "Day {x} done.", the identity line from completedDays.length, the existing tomorrow line, Share moved to its own row, the peek link kept. | src/components/NewBelieverLessonCard.tsx (:262-292 and the actions row ~:212-260), src/utils/i18n.ts (j_day_done, j_identity_* x4) | npx vitest run src/screens/home-journey.test.ts. Complete a day on the preview and confirm exactly one moment appears, the closing card, no DoneCelebration behind it, that dw_reading_done is still stamped and dw-reading-completed still fires, that the hero and the Read tab agree, and that reloading holds the same day rather than handing out tomorrow. |
| 6. Days read replaces the streak in identity language. Add daysRead and entry to HomeContextValue and getGreeting for this persona, rewrite GreetingSection's milestone banner to i18n strings with no emoji and no exclamation, and collapse the two hardcoded milestone lists into one exported constant. | src/sections/HomeContext.tsx, src/sections/GreetingSection.tsx (:6 list, the banner :31-70), src/utils/persona-config.ts (getGreeting, all four language blocks), src/utils/streak.ts (:14 MILESTONES, now exported), src/utils/i18n.ts | npx vitest run including greeting-languages.test.ts. Set completedDays to 7 with a streak of 12 and confirm Home says seven days, not twelve; confirm congregation, deeper_study and pastor_leader greetings are byte-identical to before; confirm all four languages. |
| 7. The welcome line on the Day 1 landing. One paragraph between the title and Read, four languages. | src/components/Day1Landing.tsx (:92-121), src/utils/i18n.ts (day1_welcome x4), src/components/Day1Landing.test.tsx | npx vitest run src/components/Day1Landing.test.tsx src/__tests__/i18n-keys.test.ts, the closed hero still has exactly one button, the line is present, and the language switch still re-renders it in place. Then stop and post the preview: this is the owner-preview-gated screen. Do not merge without Ashley's word. |
| 8. The waiting line and the gap-aware greeting. One helper computing days since pathwayProgress.lastCompletedDate on the local axis. | src/utils/journeyGap.ts (toLocaleDateString('en-CA') only, never toISOString, per the DATE-AXIS rule), src/components/NewBelieverLessonCard.tsx (day header card), src/screens/HomeScreen.tsx (greeting + the line under the progress bar), src/utils/i18n.ts (journey_waiting x4) | npx vitest run. Set lastCompletedDate three days back, both lines appear; at 0 and 1 days neither appears; the day number never changes because of a gap; no line anywhere counts days missed. |
| 9. Word help, bundled default plus the /books content lever, inline on the landing and sheet-capable on Day N. | books/glossary.json (+ _es/_pt/_id), src/data/journey-glossary.ts (bundled offline default), src/utils/glossary.ts, src/components/WordHelp.tsx, mounted in src/components/NewBelieverLessonCard.tsx (lesson text) and src/components/Day1Landing.tsx (pastoral text, inline expansion only), src/index.css (new dw-wh-* prefix, confirm the origin/main grep for .dw-wh- is empty first) | npx vitest run, including a spec asserting the Day N sheet uses useSubView and contains neither useModalA11y nor aria-modal (mirroring the trap pin in home-journey.test.ts), a spec asserting the landing renders no overlay, and a spec that no term outside the glossary is ever underlined. Live: Day 1 offers 'grace' and expands with no network call; a day with no matching term renders nothing; confirm /books/* is still network-first before shipping content. |
| 10. Day 10 invitation, with the campus lever behind it. | src/components/JourneyConnectCard.tsx, mounted once in src/components/NewBelieverLessonCard.tsx gated on day 10 && !dismissed && !sent, submitting through netlify/functions/intake.js action 'submit' resolved against staff_roster.campus_id; netlify/functions/lib/intake-core.js (:40 CORNER_TYPES, add 'welcome'); one intake_questions row (DB, no deploy); src/utils/storage.ts (dw_journey_connect); a migration in the repo for connect_requested_at/connect_campus; src/utils/i18n.ts (journey_connect_* x4) | npx vitest run, renders on day 10 only, once, never again after sent or dismissed; offline disables the button; no email on file opens EmailGate first. Publish a welcome item at /staff for one campus and confirm it appears on the card without a deploy. Do not enable in production until Ashley names the receiving person per campus. |
| 11. Comfort from the journey. The foot line opens today's comfort chapter as a sub-view via useSubView alone, Note + Close only, returning to the same day without writing dw_setup and without routing through handleRead. | src/components/NewBelieverLessonCard.tsx (foot line), src/screens/HomeScreen.tsx (comfortMode wiring, reusing ComfortSection's chapter render), src/utils/i18n.ts (journey_comfort_line, journey_comfort_link x4) | npx vitest run. Open the peek from Day 6 on the preview: dw_setup.persona stays new_to_faith, dw_reading_done and dw_pathway_progress are untouched, the toolbar shows Note and Close only, no graduation prompt exists anywhere, the Android back gesture closes the peek rather than the app, and Close lands back on Day 6 at the same scroll position. |
| 12. The daily nudge points at their day, in four languages. Add persona and journey_day to push_subscriptions, write them on subscribe and refresh on dw-reading-completed, branch buildPayload for new_to_faith, suppress the send on a day already completed, add es/pt TEMPLATES, and default the PushOptIn hour to the current local hour with dw_push_hour_source. | a migration in the repo, netlify/functions/push-subscribe.js, netlify/functions/push-send.js (TEMPLATES, buildPayload, the send window), src/utils/push.ts, src/components/PushOptIn.tsx (hour default + the added line), src/utils/i18n.ts | npx tsc -b && npm run build, plus a unit harness over getTemplate/buildPayload for four languages and both branches. Live on prod only (pushSupported allowlists prod and localhost): subscribe, set the hour to the next hour, complete Day 2 and confirm no notification arrives that day; skip the next day and confirm the body names Day 3 and mentions no streak. |
| 13. Ship it the way this repo ships. One branch in an isolated worktree with its own npm ci, gated adversarial pre-deploy review on the dimensions actually at risk (data loss on the pathway/push/misc writes, regressions on the other four personas, the two ruling repairs), full gate green, PR, deploy preview, Ashley's look, squash-merge, poll the prod deploy to ready, verify the live artifact on prod. | the whole branch; a docs/ note recording the two live ruling gaps this closes (Sermon Notes ungated at HomeScreen.tsx:2106; the explicit Yes never stamping a real choice at App.tsx:288-291); the PR description carries the preview link and the five-persona walk-through | Run the gate bare, never through a pipe, cmd | tail once masked a TS syntax error into a green exit. npx tsc -b && npm run build && npx vitest run all green; the deploy preview walked as all five personas with the other four visually unchanged; gh pr view --json mergeable polled before merging; after merge, poll the prod deploy to ready and verify the live bundle serves the new Day N surface on prod, not the preview, and re-check translations there, because a preview's own /api returns 403 and falls back to offline KJV. |
