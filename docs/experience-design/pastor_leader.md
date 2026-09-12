# Pastor and leader path, final design (10 Sep 2026)

Status: judged, UX-reviewed, verified through three lenses, repaired. Ready to build behind a preview.

## Thesis

A pastor already knows how to study. What he loses is his own morning, and what the app currently loses for him is everything he files. Four things are wrong and none of them is a missing feature.

First, the order. The first card on his Home is a door out of the app to sermon prep. {sermonNotesRow} renders at HomeScreen.tsx:2106, above the hero, contradicting both the demotion ruling and the file's own spec comment at 1775-1779.

Second, the loop. One-tap "To sermon" capture files into dw_sermon_prep, no mounted surface can open it, and the one tap that leaves the app (window.location.assign(PREP_URL), HomeScreen.tsx:1789) carries nothing with it. On Sunday he lands in Pastors Sermon Prep empty.

Third, the address. The card named "Between You & God" asks him fifteen questions about his staff, his vision and his Sunday (persona-config.ts:473-489), and its second button sends "what's on my heart" into a system prompt that says "not a counselor... vision, strategy, and direction, not feelings."

Fourth, the numbers on the first screenful are not real. recordStreakToday() fires on Home mount with empty deps (HomeScreen.tsx:786-795), so "Day 12" in the greeting, the streak chip and the new grace line would all be counting app-opens. That is exactly the fabrication this app already de-fictionalised once.

The fix: fix the order, give the bag a visible inbox and make the leaving tap carry it, rebalance the questions so two days in five are about him, count days from a real read record, frame the AI as the research assistant it actually is, and put the source and licence where he reads rather than in Settings.

The arrival-open reading is already live and correct (HomeScreen.tsx:1449-1456) and is not touched. Everything else on this path already works and stays.

## Principles

1. His time first, his job second. The top of Home is reading plus one prompt. Every piece of sermon work sits below it. The live greeting already promises this, "This is your time, not ministry, just you and God," and the layout currently contradicts it.
2. The card named for his soul must sometimes ask about his soul. Barna: 65% of pastors report loneliness, up from 42% in 2015. 38% considered quitting in the past year. Fifteen questions about his church under that heading is the app putting him back on duty.
3. The unit is one chapter and one question, and it must be visibly smaller than his study. Busyness is the number one reason reading declines, 40-58%. About 70% of pastors already spend 8+ hours a week on prep.
4. Work accrues, and it leaves with him. Every capture, every focus line, every outline is visible, countable, reusable next week, and the one tap that exits to Pastors Sermon Prep takes the bag to the clipboard first. A bag he cannot see is a trapdoor. A bag he cannot carry out is a second one.
5. The assistant finds and shows sources. He writes the message. 71% cautious, 79% worry AI could replace God's role, 63% pastoral leadership. The research calls this the highest-leverage copy change in the app.
6. Every source names itself where it is read, name and licence, one line, under the text. Nothing the model wrote may sit in the same list as Matthew Henry.
7. Only real numbers, or none, including the day count in the greeting and the chip. This app already de-fictionalised the campus counts because pastors were quoting invented engagement figures back to their teams. A number sourced from app-opens is the same fabrication wearing a streak icon.
8. Grace is named, not just applied. The freeze already bridges one missed day silently. Say it once, plainly, and only when a freeze was actually spent against a real missed reading, because guilt-framed streaks drive opt-out and uninstall.
9. Nothing new gets its own full-screen surface, and nothing above the reading gets added. Every change here is a reordering, a receipt, a line of copy or a fabrication removed.
10. Mobile first at 375px, not 390. Every control on this path is at least 44px tall, every text input at least 16px so iOS Safari never zooms mid-typing, no submit button is greyed out, and every hint lives inside the control it belongs to. Verification widths are 375 (iPhone SE/mini) in both themes.
11. No emoji as UI, on any path. Persona changes the words, never whether there is a fire on the screen.
12. Comfort must reach him without him ever choosing it, and the offer is made once per screen. A friend says it once. Twice reads as the app worrying about him.

## The journey

**Day 0.** Cold device auto-defaults to new_to_faith and shows Day1Landing. He taps the quiet "Not new to faith? Choose your path" line, gets the one sheet, taps "I'm a pastor and I teach and preach." One tap saves (source "onboarding") and opens Home in the same gesture. Home lands with today's chapter already open and readable: the arrival seed at HomeScreen.tsx:1449-1456 is persona-gated, credit-free and bypasses handleRead, and with no plan and no reading slots the PASTOR_CHAPTERS rotation means the hero is never empty. PathArrivalStrip names where he is. The greeting carries no day count on day one because no read day has been recorded yet, "Good morning, Ashley. This is your time, not ministry, just you and God." Nothing asks him to do sermon work, nothing demands a sign-in, and the plan offer sits below the question rather than in front of it. He can finish a first session without making one decision.

**First session.** Three to six minutes. One chapter, already open. Reading it, scrolling the passage, playing the audio, highlighting, or completing it, records today in dw_read_days. Opening the app does not. Directly under the reading, Between You & God asks one question. Today it may be about his church, two days in five it is about him. If a line lands he highlights it and taps "To sermon." The capture appears immediately in the For Sunday strip below the prompt, with a count, and a one-time line tells him where it went. He sees the Preach card below all of that and does not tap it. First session success is that he read something for himself, not that he prepped.

**Return visit (days 2-5).** Same shape, next chapter from the rotation or his plan, same translation, commentary where he left it. The greeting's day count is the number of days he actually read, so it can be lower than the number of days he opened the app. That is the point. The For Sunday strip now shows two to four filed verses and, once he types it, his preaching focus. "Read what I'm preaching" has put Philippians into today's reading, so the chapter he opens is the book he is working on, the single lever that makes the app his. Nothing new is announced. Nothing asks to be set up again.

**Week 2.** The bag has eight or nine pieces, enough to be worth acting on. "Build an outline from these" sends his own captures to Bible AI in the pinned outline shape, and the button says "Built from your 8 filed verses" so the source is never in doubt. This is the week he first taps "Where this comes from" under a commentary, before quoting it on Sunday, and the week a soul question gets a real answer written down, which matters more for whether he stays than the streak does. Monday morning, Your Week shows counted facts from dw_read_days and the behaviour log: mornings in the Word, verses filed, outlines started, and one question that joins the reading to the preaching.

**Missed day.** He buried someone on Thursday and did not open the app. Friday he reads, the existing freeze bridges the missed reading (streak.ts:73-76, one freeze, replenished after 7 days) and the count keeps going. The only change: when a freeze was actually spent against a real missed reading, one plain line under the greeting says so, "You missed yesterday. Your streak's still here." On a real reset, "New start today. Your best run was 34 days." No missed reading is queued, no catch-up card appears, nothing asks where he was. No red, no fire, no exclamation, and no push that mentions a streak at all.

**Seasonal.** His preaching focus is the season for this persona, one editable line that flows into every pastor AI prompt and into today's reading. Sunday is the day the loop closes rather than opens: he taps Preach, the filed verses and the focus go to the clipboard in the same gesture, he pastes them into Pastors Sermon Prep, and the app asks nothing of him, the weekly card moves to Monday and no reminder fires. Church-wide moments reach him as a real campus number in Campus Overview, never a seeded one, and no campaign banner lands above his reading. Turning his own series into a campus-wide plan with a live "reading today" count is the seasonal build the research points at and is an owner decision, not part of this design.

## Screens

### 1. Choose your path, Leader card (ChoosePathSheet)

**Purpose.** Get him onto his path in one tap, from any of the three doors, without a gate, and be honest about what is here and what is at another origin.

**Order top to bottom**
1. Title "Where are you today?"
2. Sub line
3. Five cards (icon, head, promise). Leader is card 4.
4. Pastor note plus "Sign out of pastor account" row when signed in
5. Footer line

**Copy**

| Element | Text |
|---|---|
| Leader card head (path_leader_head), keep verbatim | I'm a pastor and I teach and preach |
| Leader card promise (path_leader_promise), change ONLY if Ashley approves; same line count, must not push the sheet past the 375px height budget | Study tools and commentary here. Preach opens Pastors Sermon Prep. |
| Leader card CTA (path_leader_cta), keep verbatim | Open my study |
| Pastor note (path_pastor_note), keep verbatim | Signed in as pastor. Pick any path; your pastor tools return when you choose Leader again. |

**States**
- Closed, mounted, painting nothing, live open prop (never conditionally mounted)
- Open, Leader not current, tappable card
- Open, Leader is current, ticked; tapping just closes
- First real choice, source "onboarding"; later change, source "settings"
- Pastor signed in, note row plus sign-out row
- Saving, one tap commits and navigates to Home, no second CTA anywhere
- 375px, every card row at least 44px tall, whole sheet fits without scrolling

**Keep**
- One sheet, five cards, three doors, never a gate that blocks first use
- One tap saves AND opens (commit(next)), no CTA below the fold
- No lock glyph for a signed-in pastor; he can pick any path as a real choice, sign-out offered beside it
- dw-cp-* class prefix
- Saving navigates Home after a real change
- saveSetup gates on source!=='default', auto-defaults never stamp as a real choice

**Change**
- The height budget is measured at 375 wide, not 390: the sheet must stay at or under approximately 540px including the pastor sign-out row so it fits inside an iPhone SE's visible viewport (approximately 553px in Safari with browser chrome) with no scroll. At 375 the promise lines wrap one line longer than they do at 390, that extra wrap, not the copy, is what breaks the budget.
- path_leader_promise only, and only on his word, it currently promises sermon prep that lives at another origin. If the approved wording wraps past the budget at 375, the wording shortens; the sheet never scrolls.

**Remove.** Nothing.

### 2. Home, Today (pastor_leader)

**Purpose.** Open on his own reading, give him one question, then let the work accrue below it.

**Order top to bottom**
1. Header row: Bible AI pill, wordmark and date, streak chip (real read days), Pastor path swatch, campus chip, language, theme
2. Greeting (persona, read-day-aware)
3. Grace line, conditional, only when a freeze was spent today against a real missed reading
4. PathArrivalStrip, once, after a path change
5. Hero reading panel, today's chapter already open (live arrival seed), photo, passage title, audio
6. Date navigation
7. Reading text and highlight toolbar (Copy, Listen, Share, Note, To sermon, Gk/Heb, Ask AI)
8. Between You & God, the day's question, directly under the reading
9. "Hard week?" comfort line, one line, rendered here only on a work-question day (on a soul-question day the card carries it instead)
10. For Sunday, the prep-bag receipt
11. Preach card (moved here, below the reading, below Between You & God and below For Sunday)
12. Plan offer, one line, only while no plan exists
13. Today's study: plan chapters, full depth tools
14. Commentary (expanded), source and licence line, "Where this comes from," and assistant-note block
15. For your message, Bible AI entry
16. Campus Overview
17. Your Week, Mondays only for this persona
18. Word of the Day, Daily Quote, For You
19. Book cards

**Copy**

| Element | Text |
|---|---|
| Greeting, no read day recorded yet, keep verbatim, it is the identity line for this persona | Good morning, Ashley. This is your time, not ministry, just you and God. |
| Greeting, day 2-7 of real read days, keep | Good morning, Ashley. Day 3. Glad you're here. |
| Greeting, day 8-30, keep | Good morning, Ashley. Day 12. This time matters. |
| Greeting, 30+, keep | Good morning, Ashley. 34 days. You're leading from a full cup. |
| Grace line (freeze spent today against a real missed reading) | You missed yesterday. Your streak's still here. |
| Grace line (reset, has a best run) | New start today. Your best run was 34 days. |
| PathArrivalStrip, pastor (path_arrival_pastor, position word changes) | You're in the pastor study. Today's chapter is open with commentary, and Between You & God sits below it. Preach sits under that. |
| Comfort line (work-question days; on soul-question days the same single line renders inside the card instead) | Hard week? Read the comfort verses. |
| Milestone banner, pastor variant, no emoji, no exclamation | Thirty days. This is the part nobody sees. |
| Milestone eyebrow, all personas, emoji removed, words unchanged | Milestone Reached |
| Plan offer line | Want a plan behind this? Three questions. |

**States**
- No plan, no slots, PASTOR_CHAPTERS rotation in the hero, seeded open and credit-free
- Plan active, plan passages; plan offer line never renders
- No read day recorded yet, greeting with no count, no streak chip, no grace line
- Signed in as pastor (code provisioned) vs hand-typed code vs no code
- Freeze spent today / streak reset / normal
- Work-question day, comfort line on Home; soul-question day, comfort line inside the card and NOT on Home
- Monday vs every other day (Your Week)
- Sunday, no weekly card, no reminder, reading unchanged
- Offline, reading from cache with the live ESV-unavailable line, captures queue to localStorage and push on reconnect, Campus Overview not rendered

**Keep**
- The arrival seed exactly as built: persona-gated, credit-free, bypasses handleRead, new_to_faith exempt (HomeScreen.tsx:1449-1456). Do not re-implement it.
- The greeting copy verbatim, it separates the man from the job. getGreeting's signature is unchanged; only the number handed to it changes source.
- PASTOR_CHAPTERS day-one floor (30 chapters, pinned at 28 or more unique)
- Reading and Between You & God as one unit, the prompt directly under the reading
- Commentary expanded by default, the clutter complaint is sourced for the devout reader, not for this persona
- Full depth features: commentary expanded, Greek/Hebrew full, highlighting full, verse selection, word of day full
- PathSwatch in the header as Door 2, it names the path above the fold for every persona
- The locked look: ivory canvas, terracotta accent, white hero panel with upright dark scripture in both themes, Georgia serif stack, no italics
- The email nudge, push and path-ask sequencing that already refuses to stack

**Change**
- Move {sermonNotesRow} from HomeScreen.tsx:2106 (above the hero) to below the reading, below Between You & God and below For Sunday. The ruling names pastor_leader and the file's own comment at 1775-1779 already says this is the spec.
- Point the greeting count, the header streak chip and the grace line at the same dw_read_days record Your Week uses. recordStreakToday() stops firing unconditionally on Home mount (HomeScreen.tsx:786-795); it is called by recordReadDay() on a real reading and keeps doing only the freeze and milestone mechanics. The real-engagement call site at HomeScreen.tsx:541-547 (a completed pathway day) routes through recordReadDay too.
- path_arrival_pastor: "Preach is the card above" becomes "Preach sits under that"
- Add the grace line and the pastor milestone variant (no emoji, no exclamation)
- Render the "Hard week?" line exactly once per screen, Home renders it only when the day's prompt is tagged work; both Home and the card read the same getTodayPrompt() helper so they can never both paint it
- Weekly review moves from Sunday to Monday for this persona only
- Collapse the plan wizard to one line until tapped

**Remove**
- The Preach card's job of "naming the path before any scroll" (HomeScreen.tsx:1806-1807), the PathSwatch in the header already does that for every persona
- The fire emoji at GreetingSection.tsx:53, HomeScreen.tsx:4457 (the 56px milestone glyph) and DoneCelebration.tsx:121, removed app-wide for all five paths, words unchanged
- "Keep the momentum going. You're amazing." for this persona
- A day count or grace line derived from app-opens
- "campus_count" from pastor_leader's sectionOrder (persona-config.ts:447), see Campus Overview; the section file stays
- Any temptation to revive PreachScreen / SermonWorkspace on Home, his 9 Sep ruling sends Preach off-app and two tests pin it

### 3. Between You & God

**Purpose.** The one card addressed to him rather than to his congregation. It is currently named for his soul and asks him fifteen questions about his church. This is where a lonely pastor is fed or is put back to work.

**Order top to bottom**
1. Eyebrow "Between You & God"
2. The day's question
3. Write it down
4. Think it through (work questions only)
5. Privacy line (soul questions only)
6. Comfort line (soul questions only, the single render on a soul day)

**Copy**

| Element | Text |
|---|---|
| Eyebrow, keep | Between You & God |
| Soul question, Claude-drafted, Ashley approves before ship | What are you carrying today that you haven't told anyone? |
| Soul question, draft | What did God say to you last, before you turned it into a sermon? |
| Soul question, draft | Where are you running on empty? Name the one thing that would refill it. |
| Soul question, draft | Who prays for you? When did you last let them? |
| Soul question, draft | What do you need today that you keep giving away? |
| Soul question, draft | If you weren't the pastor here, what would you tell a friend in your position? |
| Soul question, draft | What have you stopped enjoying that you used to love? |
| Soul question, draft | Say the true thing about how you are. No one else reads this. |
| Work question, keep all 15 as written, they are his voice | There's a conversation you've been putting off. Who is it with and what's it about? |
| Primary button (rename from "Journal This"), minHeight 44 | Write it down |
| Secondary button, work questions only (rename from "Talk It Through"), minHeight 44 | Think it through |
| AI prefill behind Think it through, replaces the feelings/strategy collision | I'm thinking through something I'm leading. The prompt was: "{prompt}". Help me find the next step. |
| Privacy line, soul questions only | This stays with you. No one at your church sees your journal. |
| Comfort line, soul questions only | Hard week? Read the comfort verses. |

**States**
- Work question, both buttons, no privacy line, no comfort line (Home carries it that day)
- Soul question, Write it down only, privacy line, comfort line
- Already written today, the card shows what he wrote, collapsed, with "Add to it"
- Journal tab reached via prefill, the question is the entry's title, type pastoral-reflection, date stamped in local en-CA
- Bank unreachable (offline, first run, or the study data path down), falls back to the bundled tagged bank, never an empty card
- 375px, both buttons on one row still clear 44px and do not wrap mid-word; if they would, they stack

**Keep**
- Day-indexed rotation so the question is the same all day and changes overnight
- Journal prefill via dw_journal_prefill to the Journal tab
- Journal entries are tombstoned on delete and never rebuilt from raw cloud data, applyCloudData must not overwrite its jsonFields
- The prep bag and the journal stay separate stores, nothing he writes here can leak into sermon prep
- The gradient charcoal treatment

**Change**
- Rebalance the bank: keep the 15 work questions, add 8 soul questions, tag every entry soul or work. Proposed ratio 8/15, so roughly two days in five are about him.
- Gate the second button on tag, a soul question never offers an AI turn
- Both buttons get minHeight 44, they are approximately 33px today (padding "8px 16px," no minHeight, PastoralReflectionSection.tsx:43-75)
- Fix the AI prefill: it currently sends "I'd like to talk through what's on my heart" (PastoralReflectionSection.tsx:66) into a persona whose system prompt says "not a counselor... engage with vision, strategy, and direction, not feelings" (persona-config.ts:496). He opens up and gets a strategy answer.
- Fix the prefill date: it writes new Date().toISOString().slice(0,10) (PastoralReflectionSection.tsx:49), a UTC date in an app whose axis is toLocaleDateString('en-CA'). An Australian pastor journalling before 10am files it to yesterday.
- Serve the bank from the study data path the app already trusts, the study_* tables read by netlify/functions/study.js (a ?prompts=1 shape beside the existing ?sources=1), network-first with the bundled tagged bank as the offline fallback. Editing a question is a data change: no commit, no deploy, no service-worker bump.
- Expose the day's prompt through one getTodayPrompt() helper returning { text, tag } so Home and this card agree on the tag and the comfort line renders exactly once

**Remove**
- "Talk It Through" as the label, and as the route for personal questions
- The plan to ship the bank as public/books/pastor-prompts.json, a file there still needs a commit, a deploy and a coordinated CACHE_NAME/STATIC_CACHE/SW_VERSION bump, which is Ashley three times, not an edit once

### 4. For Sunday (new strip on Home, below the reflection)

**Purpose.** Give the capture bag an inbox, so filing is a habit loop instead of a trapdoor. A receipt and a door, never a second workspace.

**Order top to bottom**
1. Eyebrow "FOR SUNDAY" plus count
2. Focus line (editable single field, 16px type, 44px tall)
3. Newest three captures: reference plus first line, each with Remove
4. "Show all 8" (expands in place)
5. Cap notice, from 32 items, with Copy all beside it
6. Actions: "Build an outline from these," "Read what I'm preaching," "Copy all," stacked full-width at 375, side by side only above 400px

**Copy**

| Element | Text |
|---|---|
| Eyebrow | FOR SUNDAY |
| Count | 8 filed |
| Focus, empty (keep key ws_prep_focus_ph), placeholder inside the field, not a label above it | What are you preaching through? |
| Focus, set | Philippians, week 2 |
| Empty state | Highlight anything as you read and send it here. It waits until you preach it. |
| Item row | 1 Peter 5:2, Be shepherds of God's flock that is under your care... |
| Primary action | Build an outline from these |
| Self-serve reading lever | Read Philippians here as well |
| Lever confirmation | Philippians 2 is in today's reading. |
| Secondary action | Copy all |
| Copy confirmation | Copied |
| Remove an item | Remove |
| Undo line after a remove (5 seconds) | Removed. Undo |
| Early cap notice, from 32 items, before anything is lost | 32 filed. Only the last 40 are held, copy them out. |
| At the cap | Holding the last 40. The oldest drop off as you file more. |

**States**
- Empty, no focus, the strip still renders with the one-line invitation, no greyed button
- Focus set, no items, focus as the title plus the invitation line
- 1-3 items (no "Show all") / 4+ collapsed / expanded
- Just filed, the newest item animates in and the count increments: the receipt for the tap he just made
- 32-39 items, the early cap notice with Copy all beside it
- At the 40-item cap (MAX_ITEMS, sermonPrep.ts:24, which keeps the JSON under the server's 20KB misc per-key cap)
- Item removed, the row leaves, "Removed. Undo" holds for 5 seconds, and Undo re-merges from localStorage rather than from React state
- Editing the focus (saving / saved)
- Offline, fully working; writes go to localStorage and ride the misc bag on next sync
- After handoff, unchanged on return; the bag is not cleared by leaving or by copying

**Keep**
- dw_sermon_prep and dw_sermon_prep_focus exactly as they are, misc-synced, whole-value replace, 40 items, 400 chars, pushNow on write
- The outline prompt's pinned message format and the pinned four button labels in Bible AI
- The deep-link out to Pastors Sermon Prep as the only preach workspace; PreachScreen and SermonWorkspace stay unmounted
- The expandable list stays mounted with a live open prop, never conditionally mounted, or it orphans a history entry per close

**Change**
- The bag becomes visible in Daily Word for the first time
- The preaching focus stops being a dead end in wizard step 13 and becomes editable here, one field, 16px type minimum so iOS Safari never zooms Home mid-typing, 44px tall, placeholder inside the field
- "Read what I'm preaching" writes a reading slot (dw_reading_slots), no new plan id, so no four-place rewiring
- The three actions stack as full-width rows below 400px, "Build an outline from these" alone is most of a 375px line
- The cap is warned about at 32, while he can still act on it, not at 40 once captures are already gone. One shared clipboard builder (buildPrepClipboardText in sermonPrep.ts) serves Copy all here and the Preach hand-off, so there is one format, not two.

**Remove**
- The dead end where the only surfaces that render prep items (SermonWorkspace "My Preparation," PreachScreen OutlineBuilder) are not mounted anywhere live
- A cap notice that only appears once work is already dropped

### 5. For your message (Bible AI, pastor block)

**Purpose.** Four things he actually asks for, framed so it is obvious the model is not writing his sermon. The research names this framing as the highest-leverage copy change in the app.

**Order top to bottom**
1. Section header "For your message"
2. Four prompt buttons in their pinned order
3. Source line directly under the outline button when the bag has items
4. Framing line (a paragraph under the button block, NOT a fifth button)
5. The generic quick prompts underneath
6. Answer
7. Answer footer (pastor mode only)

**Copy**

| Element | Text |
|---|---|
| Section header (ai_pastor_section), keep, pinned | For your message |
| Button 1 (ai_pastor_angles), keep verbatim, pinned | Give me three teaching angles on this passage |
| Button 2 (ai_pastor_illustration), keep verbatim, pinned | Find an illustration for this idea |
| Button 3 (ai_pastor_greek_passage), keep verbatim, pinned | Break down the key Greek or Hebrew words in this passage |
| Button 4 (ai_pastor_outline), keep verbatim, pinned | Turn my highlights into an outline |
| Source line under button 4 | Built from your 8 filed verses. |
| Source line when the bag is empty | Nothing filed yet, it will build from today's chapter. |
| Framing line, new paragraph, below the four buttons | A study assistant, not a ghostwriter. It finds the sources and shows you where they came from. You write the message. |
| Answer footer, pastor mode only | Scripture and commentary come from the study library. The rest is the assistant's own words, check any reference before you preach it. |
| ai_pastor_no_highlights, keep | I have not filed any highlights yet, so build it from {ref}. |

**States**
- Pastor, nothing selected, the Greek label swaps to the chapter form (already live)
- Pastor, text selected, the quoted line anchors the prompt
- Prep bag empty, the outline prompt falls back to the current chapter
- Answering, the footer appears with the answer, not before it
- Offline or error, one plain line, no retry loop
- Non-pastor persona, block absent, footer absent
- 375px, the four buttons are the first thing under the header, all four reachable without scrolling past a paragraph

**Keep**
- The exact four labels, their order, and the string "For your message," pinned by BibleAI.pastor.test.tsx:54-65
- The pinned outline message format built from dw_sermon_prep plus dw_sermon_prep_focus (BibleAI.pastor.test.tsx:77-96)
- The pastor systemPromptAddition, ministry partner not counselor is the right register for work questions
- useSubView alone for this full-screen surface, never useSubView plus useModalA11y/aria-modal

**Change**
- Add the framing line as a paragraph below the four buttons and above the generic quick prompts, he still reads it before he sends anything, and three sentences of framing never push the only actions in the block four lines down at 375
- Add the "Built from your N filed verses" source line, attached directly under button 4 inside the button block
- Add the one-line answer footer in pastor mode

**Remove**
- Any placement that puts prose above the four pinned buttons

### 6. Commentary and "Where this comes from"

**Purpose.** Let him check a source before he quotes it from a pulpit, without leaving the passage, and never let something the model wrote sit in the same list as Matthew Henry.

**Order top to bottom**
1. Section heading "Commentary"
2. Source tab strip, sourced commentary only
3. Selected commentary text
4. Source and licence footer line
5. "Where this comes from"
6. Assistant note block, its own labelled block, below the sourced commentary

**Copy**

| Element | Text |
|---|---|
| Heading, keep | Commentary |
| Source footer, public-domain source | Matthew Henry, public domain |
| Source footer, share-alike source | Tyndale Open Study Notes, CC BY-SA 4.0, anything built from it stays under the same licence |
| Trigger link, under commentary and in the Gk/Heb popup, 44px tap target | Where this comes from |
| Assistant note eyebrow | Assistant note |
| Assistant note body line | No commentary in the library covers this chapter yet. This is the assistant, not a source. |
| Sheet first line | Scripture text always comes from the Bible text itself. The AI never writes it. |
| Sheet intro (study_sources_intro), keep | Every study source loaded into Daily Word, with the attribution its licence requires. |
| Loading | Loading sources |
| Unavailable | Couldn't load the source list. It'll be here next time. |

**States**
- Curated commentary present, tabs, text, source and licence footer
- Curated plus assistant fallback, sourced tabs on top, assistant note in its own block below
- Assistant only, the block stands alone, labelled as the assistant
- Nothing at all, card hidden
- Sources sheet: loading / loaded / empty / failed
- Opened from commentary vs from the Greek/Hebrew popup
- 375px, the source tab strip scrolls horizontally inside its own container; the page never scrolls sideways

**Keep**
- Commentary arrives expanded for this persona
- StudySourcesCard's content and its data-driven list from study.js?sources=1, adding a source to the study_* tables updates it with no code change and no deploy
- The full sources card in More as well, this is a second door to the same data, not a move
- Tapping commentary text selects it for highlight and "To sermon"

**Change**
- Add the source and licence footer under the selected commentary
- Add "Where this comes from" opening the sources list as a subview from the reading screen, useSubView alone, mounted with a live open prop, so one Android back press closes it and leaves no orphaned history entry
- Pull the AI fallback out of the source tab strip: it currently enters allCommentaries as source "AI Insight" (HomeScreen.tsx:924) and renders as a peer tab beside Matthew Henry and Calvin

**Remove**
- "AI Insight" as a tab label anywhere in the source strip

### 7. Preach hand-off card

**Purpose.** The door to Pastors Sermon Prep, in the right place and carrying the right thing: after his own reading, not before it, and loaded with his week's captures rather than leaving them behind.

**Order top to bottom**
1. Eyebrow "Pastor study"
2. Title "Preach"
3. Week line, counted facts plus what the tap will carry, a separate element above the sub
4. Sub: congregation and destination (pinned copy, unchanged)
5. Chevron

**Copy**

| Element | Text |
|---|---|
| Eyebrow (pastor_study_eyebrow), keep | Pastor study |
| Title (preach_card_title), keep | Preach |
| Sub (preach_card_sub), keep byte-identical, pinned twice | Opens Pastors Sermon Prep |
| Week line, new separate element, nothing filed, no focus | (empty) |
| Week line, items filed, before the tap | 3 filed since Sunday, Preach copies them for you. |
| Week line, at and after the tap | Copied. Paste into Prep. |
| Week line, focus set, nothing filed | Philippians |
| Week line, the copy failed (permission denied, insecure context) | Couldn't copy. Tap Copy all above, then Preach again. |
| Offline | You're offline. Prep needs a connection. |

**States**
- pastor_leader, builds the clipboard text synchronously from localStorage, calls navigator.clipboard.writeText inside the click gesture, then assigns PREP_URL and returns before openCongregationChooser
- Copy succeeded, the week line flips to "Copied. Paste into Prep." and navigation follows in the same tap
- Copy failed, the first tap does NOT navigate; it shows the failure line so he does not land in Prep empty. A second tap navigates regardless.
- Nothing filed and no focus, no week line, no copy step, straight through
- Every other persona, opens the congregation notes chooser, unchanged
- Offline, the card explains instead of failing silently
- 375px, the card is at least 52px tall and the week line wraps to at most two lines

**Keep**
- The off-app deep link to pastors-sermon-prep.netlify.app and the exact preach_card_sub string, his 9 Sep ruling, pinned by home-pastor-floor.test.ts:68-69 and by the i18n row at HomeScreen.tsx:302
- Congregation notes staying on the sermon-notes tab and the Sunday QR for everyone
- The dark treatment
- The bag itself, copying does not clear dw_sermon_prep; he can leave and come back to the same eight verses

**Change**
- Position only for the card itself: below the reading, below the reflection, below For Sunday, which also puts "Copy all" directly above it as the manual fallback
- The tap now carries the work: the filed verses and the preaching focus go to the clipboard first, in the same format Copy all produces (one shared builder), then the app navigates
- Add the counted-facts week line as a new element, the pinned sub string is not rewritten

**Remove**
- The exit that leaves the bag behind, a tap that lands him in Pastors Sermon Prep with nothing, and no export on the card that leaves

### 8. Campus Overview

**Purpose.** Real campus numbers, or an honest offer to get them. Never a number the app made up, and never a control that refuses to be pressed.

**Order top to bottom**
1. Eyebrow "Campus Overview"
2. Four tiles: reading today, active this week, prayer requests, campus name
3. Or: the sign-in line, with the code field behind a link
4. Required-field line and error line beside the button, and retry

**Copy**

| Element | Text |
|---|---|
| Eyebrow, keep | Campus Overview |
| Tile labels, keep | reading today / active this week / prayer requests / {campus name} |
| Not signed in, primary | Sign in with your Futures email to see your campus. |
| Primary button | Sign in |
| Fallback link (keeps key campus_stats_prompt behind it) | I have a campus code |
| Code field placeholder, inside the control, not a paragraph above it | 8-character campus code |
| Empty press, beside the button | Enter your campus code. |
| Error, keep | Couldn't load live stats, check your campus code. |
| Retry | Try again |

**States**
- Signed in, code provisioned, four real tiles, zeros shown as zeros
- Loading, the existing spinner and label
- No code, the sign-in row, code field behind the link
- Code field empty and pressed, the required-field line appears beside a live, pressable button
- Code pasted from a text message, the button is pressable whether or not the change event fired
- Code entered, wrong scope, error and retry, never numbers
- Code provisioned by staff sign-in mid-session, tiles appear without a remount (pinned, home-pastor-floor.test.ts:50-53)
- Offline, the card is not rendered at all

**Keep**
- Only render numbers the API actually returned for this campus, scope "campus," no seeded counts, ever
- Not persisting a hand-typed code as if it were a real sign-in
- autoCapitalize='characters', autoCorrect off, spellCheck off, Enter submits

**Change**
- Lead with sign-in rather than an 8-hex field; the field stays as the fallback for a pastor who was given a code
- Remove the disabled attribute and the opacity 0.5 gate on the submit button (HomeScreen.tsx:4296-4306), iOS paste does not always fire change, so the button can sit grey over a filled field with nothing saying why. On an empty press, show "Enter your campus code." beside the button.
- The field gets the hint inside it as a placeholder, fontSize 16 (it is 13 today at HomeScreen.tsx:4293, which makes iOS Safari zoom Home on focus), inputMode='text' and maxLength 8; the button gets minHeight 44
- Hide the card entirely when offline instead of showing a network error for something he did not ask for

**Remove**
- "campus_count" from pastor_leader's sectionOrder (persona-config.ts:447), and the fabrication inside getCampusReaderCount, which computes a reader count from a hash of the campus id plus the date and prints "N people at your campus are in the Word today." Keep the file src/sections/CampusCountSection.tsx and its src/sections/index.ts export: the ten src/sections/* files must survive any future HomeScreen re-extraction. Gut the arithmetic, leave the shell.
- The "what goes here" paragraph above the control, once it lives inside the field

### 9. Your Week (Monday review card)

**Purpose.** A weekly reward made of facts he can check, on the day he can act on it.

**Order top to bottom**
1. Eyebrow "YOUR WEEK" plus dismiss
2. Counted facts
3. One question
4. Dismiss

**Copy**

| Element | Text |
|---|---|
| Eyebrow | YOUR WEEK |
| Facts line | 5 mornings in the Word. 11 verses filed. 2 outlines started. |
| Question (rotating) | Where did the reading and the preaching meet this week? |
| Question (rotating) | Who did God put in front of you that you haven't prayed for yet? |
| Question (rotating) | What did you read this week that your church needs to hear? |
| Question (rotating) | What are you carrying into this week that you haven't said out loud? |
| Dismiss, keep, 44px tap target | Dismiss |

**States**
- Monday only for this persona (Sunday for everyone else), with at least three real read days
- Monday, zero days read, not rendered at all, no zero, no guilt
- Fewer than 3 real read days, not rendered
- Dismissed for this week (dw_week_review_dismissed = weekKey)
- Counts of zero, the line names only what is non-zero
- Offline, renders fully; both numbers are local

**Keep**
- The dismiss-per-week mechanism and the three-day floor
- Two stat tiles for the other personas, unchanged
- The card staying persona-gated, weekly-review-for-all was explicitly rejected

**Change**
- Monday instead of Sunday for pastor_leader, his Sunday is a workday (inference, flagged as an owner decision)
- Counts come from the same dw_read_days record the greeting and the chip now use, plus the behaviour log, one record, one number, everywhere on the screen

**Remove**
- The streak-derived days-read number, here and in the greeting and the chip. Math.min(streak,7) reports 7 for a 40-day streak and 1 for a Mon/Wed/Fri reader, and the streak itself counts app-opens.

### 10. Plan offer (PastorStudyOnboarding, demoted)

**Purpose.** He is already reading. The plan is an addition, not a setup task, and it must never stand between him and today's chapter.

**Order top to bottom**
1. One line with two controls
2. On tap: the existing wizard steps 0, 1, 10-13, unchanged

**Copy**

| Element | Text |
|---|---|
| Home line | Want a plan behind this? Three questions. |
| Primary | Pick a plan |
| Secondary (keep key later_label) | Not now |
| Step 0 intro (wiz_pastor_intro, trimmed) | You're already reading today. If you want a dated plan running underneath it, I'll ask three questions. |
| Step 13 field placeholder (ws_prep_focus_ph), keep | What are you preaching through? |
| Step 13 helper, new | You can change this any time from For Sunday. |

**States**
- Before the first recorded read day, not rendered
- After the first reading, no plan, the one line
- Tapped, the existing wizard, unchanged
- Any plan exists in dw_activeplans (from anywhere, including cloud sync), renders null, re-checked every render
- Dismissed, the gentle re-entry line
- Completed, never shows again

**Keep**
- "I know what I want" to Plans tab, wizard permanently done
- The self-dismiss on any existing plan, re-checked on every render not just at mount
- The four priority answers and their plan sets
- Step 13 capturing the preaching focus into dw_sermon_prep_focus

**Change**
- Collapse to one line until tapped, and gate it behind the first real read day rather than a mount
- Trim the step-0 intro so it leads with brevity, not a feature list
- The step-13 focus answer stops being a dead end, it becomes the editable focus line on For Sunday
- The wizard's own text inputs go to 16px on the way past, same rule as everywhere else on this path

**Remove**
- The wizard as a full card on day one

### 11. Reminders (More, Notifications)

**Purpose.** One nudge a day, at the hour he actually opens, that never mentions a streak.

**Order top to bottom**
1. "Notifications" header
2. Push toggle (or the calendar fallback)
3. Reminder-hour picker
4. Inferred-hour proposal, shown once
5. One line about Sundays

**Copy**

| Element | Text |
|---|---|
| Toggle on (turn_on_push), keep | Turn on the daily reminder |
| Hour picker label | Remind me at |
| Inferred-hour proposal, after 5-7 recorded opens | You usually open around 6:20 am. Move your reminder there? |
| Accept | Move it |
| Decline | Leave it at 7:00 |
| Sunday line, pastor only | No reminder on Sundays. You're already at church. |
| Push body template, pastor, keep the neutral shared set | {passage}, "{verse}" |

**States**
- Push supported, toggle plus hour; push unsupported, calendar hand-off with the same hour
- Subscribed / unsubscribed
- Proposal pending, shown once, never re-asked
- Proposal answered, the choice sticks either way; never auto-applied without a tap
- 375px, the hour picker and both proposal buttons are at least 44px tall

**Keep**
- The hourly cron, the 2-hour catch-up window and the once-per-local-day ledger
- The neutral scripture-snippet templates, no streak language anywhere in push
- The streak freeze bridging one missed day silently

**Change**
- Offer the inferred hour once, after 5-7 recorded opens, instead of leaving the default at 7am. Store the last N open hours locally and take the median on device, do not build a new synced record, and never rebuild a dw_* record from mount-time React state.
- Skip Sunday for pastor_leader (needs a persona column on push_subscriptions), gated on his word, since it is an inference

**Remove**
- Any future temptation to write a streak-loss or guilt reminder, guilt-framed streak reminders drive notification opt-out and uninstall

### 12. Hard week (comfort read from the pastor path)

**Purpose.** One tap to the comfort scriptures without giving up his path or being asked anything, offered once, where he is.

**Order top to bottom**
1. Passage, already open, slow audio available
2. Toolbar: Note, Close
3. One line at the foot

**Copy**

| Element | Text |
|---|---|
| Entry line, ONE render per screen: on Home under Between You & God on work-question days | Hard week? Read the comfort verses. |
| Entry line, the same single line, inside the card, on soul-question days | Hard week? Read the comfort verses. |
| Foot line | Your path hasn't changed. |

**States**
- Opened from the pastor path, path untouched
- Read / listened
- Closed, returns exactly where he was, pastor persona intact
- Work-question day, the line is on Home only; soul-question day, the line is in the card only. Never both.

**Keep**
- Comfort's own rules: just the scriptures, nothing asked, no count, no complete, no graduation prompt ever
- comfortMode toolbar is Note plus Close ONLY
- Opened as a subview with useSubView alone, mounted with a live open prop

**Change**
- One render per screen, decided by the day's prompt tag from the shared getTodayPrompt() helper, two identical offers 40px apart read as the app worrying about him, on the one card that must read as a friend

**Remove**
- Any "Feeling Stronger?" style prompt, removed for good, never re-added, here or anywhere
- Any next-day check-in or follow-up attached to a comfort tap on this path
- The duplicate line, the same sentence twice within about 40px on a soul-question day

## Comfort access

One quiet line, rendered exactly once per screen: on Home directly under Between You & God on work-question days, and inside the card under the question on soul-question days, "Hard week? Read the comfort verses." Home and the card both read the same getTodayPrompt() helper, which returns the day's prompt and its soul or work tag, so the two can never both paint it; a second identical offer 40px below the first reads as the app worrying about him, on the one card that has to read as a friend rather than a diagnostic.

The line also appears once in More. It opens the day's comfort chapter (COMFORT_CHAPTERS rotation) as an overlay over his own path, slow audio available, low stimulus, the comfort toolbar of Note and Close ONLY, and a foot line that says "Your path hasn't changed." It must never write dw_setup, never call saveSetup, never stamp a source, never route through handleRead, never credit a plan day, never record a read day, a streak or a completion, and never show a graduation prompt.

It is delivered as an overlay rather than an in-place swap of the hero panel precisely so the comfort toolbar rule holds by construction, swapping the reading panel in place would leave the full highlight toolbar on comfort scripture.

This persona is where the cross-path comfort tap matters most: 65% of pastors report loneliness (up from 42% in 2015), 38% considered quitting in the past year, and a pastor will not choose the comfort card on a good day or go looking for it on a bad one. The global persistent tap across all five paths is the research's own build number 2 and belongs to that build; this design only guarantees the line exists on his screen, once. If the crisis-line safety flow is built for the comfort path, it applies here identically, with the region-correct number for the campus on his profile.

## Reminders

One a day, never two, at the hour he actually opens, in neutral scripture language, never mentioning a streak. The machinery already exists, hourly cron, per-subscriber preferred_hour, a 2-hour catch-up window, a once-per-local-day ledger. The default stays 7am until the local open-time log has 5-7 sessions, then the app offers the inferred hour once, "You usually open around 6:20 am. Move your reminder there?" Accepted by tap only (a 44px control), never auto-applied, never asked again either way, and the open hours stay on device rather than becoming a new synced record.

The open-time log is the one place an app-open is still the right unit, it is inferring when he shows up, not claiming he read. No reminder on Sunday for pastor_leader (his working day; inference, not sourced, flagged as an owner decision, and it needs a persona column on push_subscriptions with the migration in the repo).

Opt-out is one tap in More and is remembered; if he turns notifications off, nothing in the app nags him about it. The freeze already covers a single missed reading; the app says so once in plain words under the greeting instead of sending a rescue push, and only when a freeze was actually spent against a missed reading, not a missed open.

Push copy stays in the existing EN/ID templates; ES/PT have no push templates at all today, which is a live gap for Futuros pastors. Note that push cannot be verified on a deploy preview, pushSupported() allowlists futuresdailyword.com, www and localhost only, so any reminder change is verified on localhost or on prod after merge, never on the preview link he approves.

## Instrumentation

- Persona on every existing event. daily_reading, app_open, chat_message, plan_start and push_subscribe must all carry persona in detail, or D1/D7/D30 cannot be cut by path, and no public source will ever supply those numbers (research build #1).
- read_day (detail: persona|trigger, scroll|audio|highlight|complete|pathway), the write to dw_read_days. It is the number the greeting, the streak chip, the grace line and Your Week all show, so it is the one event that must be trustworthy. Watch the gap between app_open and read_day: it is the size of the fabrication this change removes.
- pastor_capture (detail: persona|ref|surface, hero|plan|commentary), a "To sermon" tap. Today this write is completely uninstrumented, and it is the leading indicator for week-2 return.
- pastor_prep_open (detail: persona|item_count), the For Sunday strip expanded or an item opened. Answers whether the inbox was the missing half of the loop.
- pastor_outline (detail: persona|item_count), the outline prompt sent. The conversion metric for capture to use.
- preach_handoff (detail: persona|has_focus|item_count|copied), the Preach card tap, including whether the clipboard write succeeded. A full exit from the app currently records nothing at all; the copied flag is the only way a silent clipboard failure on someone's phone ever becomes visible, and read against pastor_outline it settles whether prep should ever come back in-app.
- pastor_prompt (detail: angles|illustration|greek|outline), the four pastor prompts fire trackBehavior at BibleAI.tsx:321 today but are not in the server allowlist, so they never reach the dashboard. Promote them.
- pastor_focus_set (detail: persona), the preaching focus edited outside the wizard. Proves the self-serve lever is used, not just shipped.
- reading_slot_added:from_focus, "Read what I'm preaching" used. The clearest signal the app has become his rather than the app's.
- trust_panel_open (detail: persona|source, from_commentary|from_greek|from_settings), the research's own test: trust-panel visibility against session length.
- reflection_written (detail: soul|work), the one event that proves or kills the prompt rebalance. If soul entries are written at a materially different rate from work entries, that is the answer.
- comfort_tap (detail: persona|surface, home|reflection), the "Hard week?" line, cut by originating persona and by which of the two single-render positions it was tapped from. A duty-of-care metric, not a growth metric; watch it, never optimise it upward. Watch for zero: if pastors never tap it, the door is in the wrong place, not the wrong idea.
- reminder_opt_out (detail: persona|days_active), the shame check. If it rises after any streak or reminder copy change, revert that change. Plus reminder_time_proposed and reminder_time_accepted for the inferred-hour acceptance rate.
- streak_repair_shown (detail: persona), the grace line rendered against a real missed reading. Pair with next-day return to test whether naming grace beats leaving it silent.
- Framing test: pastor AI prompt use and 30-day pastor retention for the fortnight before and after the framing line and answer footer ship. The research names this as the highest-leverage copy change and asks for it to be tested directly rather than assumed.
- One nightly rollup: reads per path per day (from read_day, not app_open), D1/D7/D30 by path, median session length, completion rate, reminder opt-out rate. Descriptive only; nothing on screen is driven by it without a further decision.
- Every new event string must be added to TRACKED_EVENTS in src/utils/analytics.ts:24-31 or it is silently dropped.

## Self-serve levers

- Preaching focus, one editable field on the For Sunday strip (dw_sermon_prep_focus), 16px type, 44px tall. Changes what every pastor AI prompt is anchored to. Today it is asked once in wizard step 13 and then unreachable, because the only editor is the unmounted SermonWorkspace.
- "Read what I'm preaching," turns that focus into a reading slot (dw_reading_slots) so Daily Word reads the book he is preaching. The single most valuable lever for a campus pastor: it changes what he sees every morning, with no developer and no new plan id (which would need rewiring in personalization.ts, SetupPromptModal.tsx, PlansScreen.tsx and PastorStudyOnboarding.tsx, or the wizard starts a dead plan).
- The Between You & God question bank, served from the study_* tables through the existing study function (a ?prompts=1 shape beside ?sources=1), the same data path that already lets a source be added with no code change and no deploy. Editing a question is a data edit that reaches every device on the next load: no commit, no build, no service-worker version dance. Be exact about who that is, though, Ashley or a staff editor with data access, not a campus pastor. The bundled tagged bank stays in persona-config.ts as the offline fallback and must be kept in step with the data.
- The prep bag itself, file with "To sermon" while reading, remove per item (with a 5-second undo), copy all out, carried to the clipboard automatically by the Preach tap, cap 40 with the warning at 32, works offline.
- Reading plan, the full catalogue on the Plans tab, any plan, any time; the wizard's "I know what I want" goes straight there.
- Sunday's congregation notes, published and removed through the existing staff intake. This is how a campus pastor puts a message in front of his congregation with no developer, and it already works.
- Campus code and campus assignment, provisioned from the staff roster at sign-in, picked up live via PASTOR_CODE_EVENT without a remount; hand-entry is the fallback, is deliberately not persisted as a sign-in, and after this change is a field he can actually submit from. The campus chip on Home applies on tap, no Settings trip.
- Congregation chooser, which church's sermon notes the notes surfaces use.
- Reminder hour and push on/off, More, Notifications.
- Path, PathSwatch in the Home header, any time, no lock for a signed-in pastor. Language, LanguageSwitch in the header.
- Study sources, the trust sheet and the new commentary footers are entirely data-driven from the study_* tables via study.js?sources=1, so adding or removing a source updates what he sees with no code change and no deploy.
- NOT self-serve today, and worth saying so plainly: the 30-chapter PASTOR_CHAPTERS rotation (src/data/pastor.ts, pinned at 28 or more unique refs), the wizard's recommended plan ids, push wording (netlify/functions/push-send.js), the Preach destination URL, the two milestone lists, and adding a new campus (CAMPUSES in src/data/tokens.ts) are all hardcoded. Nothing in public/books is self-serve either, a file there still needs a commit, a deploy and a coordinated CACHE_NAME/STATIC_CACHE/SW_VERSION bump, which is why the question bank does not live there. The sermon frameworks are 4D and H.E.A.T. only, both defined on record, and a third must never be invented.

## Evidence

| Move | Source |
|---|---|
| Move the Preach card below the reading, the reflection and For Sunday | Ruling: "Sermon Notes row is demoted below the reading for congregation/deeper_study/pastor_leader/comfort; I'm New keeps it above only in the Sunday window" (feedback_daily_word_today_rebuild_rejected, line 16). VERIFIED live violation: {sermonNotesRow} renders at HomeScreen.tsx:2106 with the comment "just below the greeting, always visible," while the card's own spec comment at HomeScreen.tsx:1775-1779 already says it should render below for the four returning personas. |
| The Preach tap copies the filed verses and the focus to the clipboard before it navigates | VERIFIED: the pastor branch at HomeScreen.tsx:1786-1793 calls window.location.assign(PREP_URL) and returns, it carries nothing, and the only export ("Copy all") is in a different card. The whole loop this design builds ends at a card that lands him in Pastors Sermon Prep empty on a Sunday. The clipboard text is built synchronously from getPrepItems()/getPreachingFocus() (both synchronous localStorage reads) and navigator.clipboard.writeText is called inside the click gesture, the Safari rule that a clipboard write must start in the user gesture, not after an unrelated await. Repositioning also puts "Copy all" directly above the card as the manual fallback, which was the judge's alternative. |
| Do NOT rebuild the arrival-open reading, it is already live and already correct | VERIFIED at HomeScreen.tsx:1449-1456: the effect returns early for isNewChristianPersona, seeds expandedPassages from heroChapterRefs and calls loadPassage directly, with the comment "The seed must NOT go through handleRead, that credits the plan day, fires analytics, and can trigger the plan-finish celebration." Matches the ruling that the seed be persona-gated and credit-free. The empty useState at HomeScreen.tsx:222 is the initialiser, not the post-mount state. |
| Count days from a real dw_read_days record everywhere a number is shown, the greeting, the header streak chip, the grace line and Your Week | VERIFIED: recordStreakToday() fires in an effect with empty deps on Home mount (HomeScreen.tsx:786-795), so the streak counts app-opens; streakCount is seeded from getStreak().count at HomeScreen.tsx:444 and feeds both getGreeting (persona-config.ts:101) and the header chip at HomeScreen.tsx:2006-2029. A design that refuses the streak as a source for Your Week and then prints "Day 12" from it on the first screenful is telling him a number it just refused to trust. Precedent for recording on real engagement already exists at HomeScreen.tsx:541-547, where a completed pathway day records the streak. Same no-invented-numbers principle as HomeScreen.tsx:1080-1085, where seeded campus counts were removed because pastors were quoting invented engagement numbers. |
| Never back-fill dw_read_days from the existing streak | Same principle. Back-filling would manufacture read days that never happened, which is the exact fabrication being removed. The honest cost is that a pastor mid-streak sees the count start again from his next real reading; bestCount is preserved through the Math.max at streak.ts:82, and the greeting's no-count variant covers the gap. |
| Keep the reading and Between You & God as the top unit, and keep the greeting copy verbatim | Research Persona 5: Barna, 65% of pastors report loneliness (up from 42% in 2015), 38% considered quitting in the past year. The live greeting already says "This is your time, not ministry, just you and God." getGreeting's signature is unchanged, so every persona's wording survives; only the number handed in changes source. |
| Rebalance the Between You & God bank so roughly two days in five ask about him, not his church | VERIFIED: all 15 live prompts at persona-config.ts:473-489 are ministry-directed, the big decision, who needs prayer, this Sunday, what God is building through your church, your staff, the vision, the area of ministry needing direction, under a card named for his own soul. Research Persona 5 on loneliness and the 38% quitting figure is what makes this the highest-value change in the path. |
| A soul question never offers an AI turn; the work-question prefill is rewritten to strategy | VERIFIED collision: PastoralReflectionSection.tsx:66 sends "I'm a pastor reflecting on my day... I'd like to talk through what's on my heart" into a persona whose system prompt at persona-config.ts:496 says "not a counselor... When they share what's on their mind, engage with vision, strategy, and direction, not feelings." He opens up and gets a strategy answer. Research Persona 5 frames this AI as a research assistant, never a counsellor. |
| Serve the question bank from the study data path, not from public/books | Ruling: self-serve over developer levers. A file in public/books needs a commit, a deploy and a coordinated CACHE_NAME/STATIC_CACHE/SW_VERSION bump, three passes by the only developer, which is not self-serve however it is labelled, and the /books SW trap has already bitten once (fixed in PR #84). The study_* tables read by study.js are the precedent the design already praises for StudySourcesCard: add a row, no code change, no deploy. Claim only what is true, this is owner/staff-editable, not campus-pastor-editable. |
| Give the capture bag a visible inbox on Home instead of reviving a workspace | Live code: HighlightToolbar.tsx:45 files into dw_sermon_prep, but the only renderers (SermonWorkspace "My Preparation," PreachScreen OutlineBuilder) are unmounted, PreachScreen.tsx:1-5 records "Not mounted from App or Home as of 9 Sep 2026" and home-pastor-floor.test.ts:72-76 pins that App.tsx never imports it. Research Persona 5 ranks illustrations and repurposing, and names "Export as its own step." |
| Warn about the 40-item cap from 32, and give Remove a 5-second undo | VERIFIED: sermonPrep.ts:24 sets MAX_ITEMS = 40 and save() slices silently at line 46. The strip promises "It waits until you preach it" and then drops the oldest captures with a notice that can only appear once they are already gone, a pastor filing through a long series loses work he was told was held. The undo re-merges from localStorage rather than from React state, the same rule that governs every other write to the misc bag. |
| Add the research-assistant framing line and the answer footer to the pastor AI block, as paragraphs below the four buttons | Research Persona 5: "the AI is a research assistant, never the writer... Test this framing directly against adoption; it is the highest-leverage copy change in the app." Barna/Gloo Dec 2025 (n=442): 71% cautious, 79% worry AI could replace God's role, 63% pastoral leadership. Paragraphs, not a fifth button, because BibleAI.pastor.test.tsx:54-65 pins the four labels and their order, and below them, not above, because the deliverable sits at the top and three sentences of framing would push the only four actions in the block roughly four lines down at 375px. |
| Pull the AI fallback out of the commentary source tab strip into a labelled assistant block | Research Persona 5, what they distrust: "Invented references"; "reviewers document AI tools fabricating cross-references on less-common passages"; and "the scripture text always comes from the verified text tables, never the model." Live, the fallback enters allCommentaries as source "AI Insight" (HomeScreen.tsx:924, and the guard at HomeScreen.tsx:1463 confirms the label) and renders as a peer tab beside Matthew Henry. |
| Show source and licence inline under commentary and in the Gk/Heb popup, with a "Where this comes from" sheet | Research Persona 5: "Trust panel: every commentary, cross-reference and lexicon result shows its source and licence inline... This is already the architecture (study.js, public-domain and CC sources) and should be visible, not hidden in Settings." Live it is only in MoreScreen (StudySourcesCard). |
| Neutralise the fabricated campus counter without deleting the file, and drop campus_count from the pastor sectionOrder | VERIFIED: src/sections/CampusCountSection.tsx:4-13 computes a reader count from a character-sum seed on the campus id plus the date and prints "{count} people at {campus} are in the Word today." VERIFIED: "campus_count" is still in pastor_leader's sectionOrder at persona-config.ts:447 (and congregation's at :341). It is exported but not mounted, so this is disarming a loaded gun. The file must survive: "If HomeScreen is ever re-extracted/retired, the ten src/sections/* files and their tests must come back with it." |
| Ungate the campus-code submit button and move the hint inside the field | VERIFIED: HomeScreen.tsx:4296-4306 sets disabled={!pastorCodeInput.trim()} with opacity 0.5, and the input at 4281-4295 has no placeholder, the "what goes here" text is the campus_stats_prompt paragraph above the control. iOS paste does not reliably fire change, so a pastor pasting a code from a text message can face a grey button over a filled field with nothing explaining why. A live button plus a required-field line beside it fails loudly instead of silently. |
| Every text input on this path at 16px minimum | VERIFIED: the campus code field is fontSize 13 at HomeScreen.tsx:4293. iOS Safari zooms the page on focus for any input under 16px, so Home jumps and re-lays out mid-typing, and the design adds a second such field (the For Sunday preaching focus) with no type size specified. Mobile first: congregations use this on phones. |
| 44px on every control this design renames, adds or moves | VERIFIED: the two Between You & God buttons are padding "8px 16px" with no minHeight (PastoralReflectionSection.tsx:43-75), about 33px tall; the design renamed them without resizing them and then added a three-action row to For Sunday whose longest label ("Build an outline from these") is most of a 375px line. Renaming a control is the moment to size it. |
| Verify at 375px, not 390 | The ChoosePathSheet's no-scroll budget and the new For Sunday action row are exactly what breaks in the 15px between an iPhone SE/mini and a 390 device, and an acceptance check written at 390 would never catch it. The sheet budget is restated against the SE's visible viewport (approximately 553px in Safari with browser chrome), not against the screen height. |
| Weekly review as counted facts, not an hours-saved estimate | Research Persona 5 asks for time saved (Sermonary users report 4-8 hours a week), but the app's own precedent forbids invented numbers, HomeScreen.tsx:1080-1085 replaced seeded campus counts because "pastors were quoting invented engagement numbers." |
| Name the streak freeze in one plain line; no emoji anywhere, for any persona | Research cross-cutting #6: "Streaks work until they shame. Guilt-framed streak reminders drive notification opt-out and uninstall... streak repair rather than a hard reset." VERIFIED live: streak.ts:73-76 spends one freeze for a single missed day, replenished after 7 days, and streak.ts:82 preserves bestCount through a reset via Math.max. VERIFIED emoji-as-UI: GreetingSection.tsx:53 "fire emoji Milestone Reached," HomeScreen.tsx:4457 a 56px fire emoji, DoneCelebration.tsx:121, removing it for pastor_leader alone would leave the same build shipping a fire emoji as the milestone screen for the other four paths. |
| One nudge a day at the hour he actually opens, offered once and never auto-applied | Research Persona 2 and cross-cutting #6: "infer the time they actually open and nudge then, once a day, neutral wording. Never 'your streak is about to die'." Duolingo behaviour-inferred timing. The open-time log is the one place an app-open is the right unit, it infers when he shows up, not that he read. |
| Keep the daily unit at one chapter plus one question | Research cross-cutting #3: busyness is the number one reason reading declines (40-58%). Persona 5: approximately 70% of SBC pastors already spend 8+ hours a week on prep, 21% spend 15+. |
| Keep commentary expanded by default for this persona | Research Persona 3 sources the clutter complaint for the devout reader and asks for Study collapsed there; Persona 5 asks for the opposite, "original-language and theological support," depth tools on tap. persona-config.ts sets commentary "expanded" for pastor_leader and no evidence asks to change it. |
| Add the "Hard week?" comfort line to this path, once per screen, as an overlay with the comfort toolbar | Research Persona 6: "From every path: a persistent one-tap 'I need comfort now' that opens comfort without switching the saved path. Crisis is not a persona someone chooses on a good day." Rulings: "Comfort's Feeling Stronger? graduation prompt is removed for good" and "comfortMode toolbar is Note+Close ONLY," which an in-place hero swap could not guarantee. One render, because on a soul-question day the Home line and the card line would otherwise be the same sentence about 40px apart. |
| Keep the Preach deep-link and its exact sub copy, change only its position, add a separate week line, and carry the bag out on the tap | Ashley 9 Sep 2026, HomeScreen.tsx:1783-1785. VERIFIED double pin: home-pastor-floor.test.ts:68-69 asserts both t('preach_card_sub') in the row AND the exact i18n row "'preach_card_sub': { en: 'Opens Pastors Sermon Prep'" which lives at HomeScreen.tsx:302. The copy step and the week line are new elements around that string, never a rewrite of it. |
| Fix both UTC date stamps before counting days from them | Ruling: plan/reading day logic must use toLocaleDateString('en-CA'), never UTC toISOString. VERIFIED violations: PastoralReflectionSection.tsx:49 writes new Date().toISOString().slice(0,10) into dw_journal_prefill, and behavior.ts:54 stamps the same way. An Australian pastor journalling before 10am files it to yesterday, and dw_read_days is the record the greeting now depends on, so its axis has to be right first. |
| "Read what I'm preaching" writes a reading slot, not a new plan | Ruling: "A plan id is referenced in four places (personalization.ts, SetupPromptModal.tsx, PlansScreen.tsx, PastorStudyOnboarding.tsx) and all four must be rewired or the wizard starts a dead plan." A reading slot avoids that surface entirely, and the hero already reads dw_reading_slots (HomeScreen.tsx:310, synced at :603). |
| Campus Overview leads with sign-in and hides when offline | docs/PASTOR-STUDY-PREACH-PLAN.md section 4.1, provision campus at sign-in, which shipped as staffIdentity.provisionPastorCode; the 8-hex code prompt is now the fallback, not the first offer. Hiding offline follows from the principle that an error for something he did not ask for is noise. |
| Instrumentation before anything else, with persona on every event | Research "What to build first, in order" #1: "D1/D7/D30 by path, session length, completion, reminder opt-out. Nothing above can be tested without it, and no public source will ever supply it." |
| Ship the whole thing behind a deploy preview he approves | Ruling: never re-merge or ship a big IA reshape of the opening screen without his preview and explicit approval (feedback_daily_word_today_rebuild_rejected, lines 10-11); and a PR may sit open awaiting his deploy-preview look and must not be merged without his word (PR #81 note, line 20). |

## Open decisions

1. The Preach card's position is a live conflict in the code itself: the demotion ruling names pastor_leader, but the 9 Sep comment at HomeScreen.tsx:1806-1807 deliberately keeps it at the top so "the top of Home names the path before any scroll." This design has obeyed the ruling and handed that job to the PathSwatch. Confirm, or say the pastor is the exception to the rule.
2. The day count visibly resets. Once the greeting, the chip and Your Week count real read days instead of app-opens, a pastor mid-streak starts again from his next reading, bestCount survives, the days do not, and nothing is back-filled because back-filling would invent the very days this change removes. Confirm that an honest reset is worth the drop, or say the count stays hidden until three real read days accrue.
3. What counts as a read day. Proposed: a genuine reading interaction, scrolling within the passage, playing audio, highlighting, or completing, never a mount, and never the credit-free arrival seed on its own. Confirm the trigger list before it becomes the number on the first screenful.
4. The Between You & God bank: approve the 8 soul questions as drafted, or rewrite them, and set the ratio, 8 soul to 15 work means roughly two days in five are about him. Claude drafts, Ashley approves before ship, per the standing rule.
5. Where the question bank lives: the study_* data path (a ?prompts=1 shape on the existing study function, editable as data with no deploy, needs one small migration) or simply in the repo with the self-serve claim dropped. It does not go in public/books either way, that is a commit, a deploy and an SW bump.
6. Time saved: the research says show it; the app's own precedent says never show a number that cannot be proven. This design has shipped counted facts (mornings, captures, outlines) and no hours claim. Say whether an hours estimate is ever allowed here.
7. Sunday: no push for pastor_leader, and Your Week moves from Sunday to Monday. Both are inferences about a pastor's working week, not sourced. The push half also needs a schema change. Confirm or reject.
8. Does the prep bag travel to Pastors Sermon Prep beyond the clipboard? The tap now carries the verses and the focus to the clipboard, which needs no shared identity and puts nothing in a URL. A real hand-off, Prep reading dw_sermon_prep from user_data when signed in with the same email, needs a decision on what Prep may read.
9. May the Leader card's promise line change on the path sheet? It currently promises "sermon prep" that lives at another origin. It is opening-screen-adjacent copy and the sheet's no-scroll budget is now measured at 375 wide (approximately 540px including the sign-out row).
10. Once "Read what I'm preaching" exists, what should a pastor with no plan see by default, the PASTOR_CHAPTERS rotation, or his preaching book from the first day he names it?
11. Whether the pastor tier is priced flat rather than as a subscription, the research flags the Logos backlash and names this as Ashley's call.
12. Whether a pastor's own preaching series can become a campus-wide plan with a live "reading today" count. Calendar moments drive every engagement spike in the data, and this is the pastor-shaped version of that. It is a much bigger build than anything above.
13. Push templates exist in EN and ID only, so Futuros pastors get English. Whether ES/PT push copy is drafted now or later.
14. Who at each campus receives a prayer request, and whether a pastor sees the actual requests behind the prayer-requests tile or only the count.

## Risks

- This reshapes the opening screen for one persona, so it is preview-gated: deploy preview, Ashley's look, Ashley's word, never straight to main. A PR can sit open waiting. The Preach move touches all five paths, so the Sunday-window gate that keeps the card above the reading for I'm New QR guests must land in the same PR or Sunday visitors lose their route to notes.
- Do not re-implement the arrival seed. It is live at HomeScreen.tsx:1449-1456 and is already credit-free. A second seeding path that routes through handleRead would credit a plan day and fire daily_reading on every Home mount for four personas, silently inflating completion and advancing plans nobody read. The same rule applies to the new read-day record: the seed alone must never stamp dw_read_days, or the number goes straight back to counting opens.
- Changing where the day count comes from changes what every persona sees, not just the pastor's. getGreeting keeps its signature and its copy, but the number drops for anyone whose streak was inflated by opens. Ship it with the reset acknowledged, never with a back-fill.
- Clipboard on the way out: navigator.clipboard.writeText must be called inside the click gesture, before any unrelated await, or Safari rejects it; the payload is built synchronously from localStorage. If the write fails, the first tap must NOT navigate, landing him in Pastors Sermon Prep empty is the exact failure this repair exists to remove. Record the copied flag on preach_handoff so a silent failure is visible.
- Test pins break easily here. BibleAI.pastor.test.tsx:54-65 pins the four labels, their order and the string "For your message," the framing line must be a paragraph below the buttons, not a fifth button. home-pastor-floor.test.ts:68-69 pins both the t('preach_card_sub') call in the row and the exact i18n row at HomeScreen.tsx:302, position may move, copy may not. The same file pins the PASTOR_CHAPTERS floor at 28 or more unique refs, the deep-link returning before openCongregationChooser, and that App.tsx never imports PreachScreen.
- Overlay mechanics: the trust sheet, the expanded prep list and the comfort overlay must use useSubView alone, never useSubView plus useModalA11y/aria-modal, or nested focus traps break the keyboard and the Android back button. Each must stay mounted with a live open prop, not be conditionally mounted, or it orphans a history entry per close.
- Sync: dw_sermon_prep, dw_sermon_prep_focus and the new dw_read_days ride the misc bag (whole-value replace, 40 items, 400 chars, under the server's 20KB per-key cap). Every write, including the 5-second Remove undo, must merge from what is currently in localStorage and never rebuild from mount-time React state, and must call pushNow via syncMisc, or a second device's captures get overwritten. applyMisc stays fill-only and applyCloudData must not overwrite the journal's jsonFields.
- Date axis: counting days from behavior.ts requires moving it off UTC toISOString to toLocaleDateString('en-CA') first, and dw_read_days must be written on that axis from its first row. Existing records stay comparable (both YYYY-MM-DD) but events near midnight shift by a day once.
- The question bank moving to the study data path means a fetch can fail. The bundled tagged bank in persona-config.ts is the offline fallback and must never be allowed to drift out of step with the data, if the two disagree, an offline pastor gets a different question from an online one on the same day. Do not put the bank in public/books, that reintroduces the CACHE_NAME/STATIC_CACHE/SW_VERSION trap that already bit /books once, and it is not self-serve anyway.
- A soul question can land on a pastor in a hard week. Every one must read as a friend asking, not a diagnostic. If any of the eight cannot be read aloud to a pastor who is thinking about quitting, it does not ship. Equally, the AI answer footer must stay one warm line, 81% of mental-health apps carry liability disclaimers instead of real help, and a legal wall under every answer would do more damage to trust than no footer at all.
- Removing the emoji touches three shared components used by all five paths (GreetingSection, HomeScreen's milestone overlay, DoneCelebration). Check nothing pins the glyph before deleting it, and change only the glyph, the milestone words for the other four personas stay exactly as they are.
- Removing campus_count from the sectionOrder is safe today because the section is unmounted, but the same key still sits in congregation's sectionOrder at persona-config.ts:341. Gut the arithmetic now; leaving it live means a future sectionOrder wiring lights up a fabricated number on the very screen that was deliberately cleaned of one. Keep the file itself.
- Adding persona to push_subscriptions is a schema change, migration in the repo, and push cannot be verified on a deploy preview at all (pushSupported only allowlists futuresdailyword.com, www and localhost). Verify on localhost or prod.
- Do not let "give the bag an inbox" turn into reviving PreachScreen/SermonWorkspace. That reverses the 9 Sep decision and two tests will say so.
- This adds cards to a screen already called "completely stripped" once when it lost richness. Everything added sits below the reading and nothing above it is removed, but check it at 375px (iPhone SE/mini, not 390) in both themes before it merges, confirm no input is under 16px and no control under 44px, and confirm the hero panel is still white with upright Georgia scripture in both.

## Build steps

| Step | Files | Check |
|---|---|---|
| 1. Instrumentation and the date axis first. Add the pastor and cross-path events to the allowlist, carry persona in detail on every existing event, promote the already-firing pastor prompt events, and fix both UTC date stamps to local en-CA. | src/utils/analytics.ts (TRACKED_EVENTS, lines 24-31), src/utils/behavior.ts (new event types; line 54 toISOString to toLocaleDateString('en-CA')), src/components/PastoralReflectionSection.tsx (line 49, the dw_journal_prefill date), call sites in src/components/BibleAI.tsx (sendPastorPrompt, approximately line 321), src/utils/sermonPrep.ts (addPrepItem), src/screens/HomeScreen.tsx (Preach card onClick, commentary sources link), netlify/functions/track-activity.js, netlify/functions/analytics-dashboard.js | npx tsc -b && npx vitest run, including a unit test that an event outside TRACKED_EVENTS is dropped and each new type is accepted. grep -rn "toISOString().slice(0, 10)" src/ returns no date-of-record uses. Then in preview as pastor_leader, file one capture and confirm a pastor_capture row lands with persona in detail and today's local date. |
| 2. Make the numbers real before anything shows one. New readDays.ts records a day in dw_read_days on a genuine reading interaction (scroll within the passage, audio play, highlight, complete, completed pathway day) and delegates the freeze and milestone mechanics to recordStreakToday. Remove the unconditional mount call, route the existing real-engagement call site through recordReadDay, and point streakCount, and therefore the greeting and the header chip, at the read record. No back-fill. | new src/utils/readDays.ts (dw_read_days, rolling 14 local en-CA dates, misc-synced, merged from localStorage on every write, returns { count, isNew, usedFreeze, bestCount }), src/screens/HomeScreen.tsx (delete the empty-deps effect at 786-795; seed streakCount at 444 from the read record; route 541-547 through recordReadDay; add the read triggers on the passage panel), src/utils/streak.ts (unchanged mechanics; called only from recordReadDay), src/utils/analytics.ts (read_day) | New readDays test: opening Home records nothing; a scroll/audio/highlight/complete records exactly one day and is idempotent within a local day; a Mon/Wed/Fri reader reports 3; no row is ever back-filled from getStreak(). npx vitest run src/utils/ && npx tsc -b. In preview, open Home and close it, the chip and the day count must not move. |
| 3. Disarm the fabricated campus counter. Gut getCampusReaderCount so it can never return a seeded number, and drop "campus_count" from pastor_leader's sectionOrder. Keep the file and its export, the ten src/sections/* files must survive any future HomeScreen re-extraction. | src/sections/CampusCountSection.tsx (the seed arithmetic at lines 4-13), src/utils/persona-config.ts (line 447) | npx tsc -b && npm run build. grep -rn "charCodeAt" src/sections/CampusCountSection.tsx returns nothing; the file and its src/sections/index.ts export still exist; grep -rn "campus_count" src/ returns only the congregation key at persona-config.ts:341, which is a separate persona's decision. |
| 4. Remove the emoji as UI, app-wide. Three call sites, glyph only, the milestone words for every persona are untouched. | src/sections/GreetingSection.tsx (line 53, remove the fire emoji from "Milestone Reached"), src/screens/HomeScreen.tsx (line 4457, the 56px fire emoji div), src/components/DoneCelebration.tsx (line 121) | grep -rn for the fire emoji in src/ returns nothing outside src/data/bible-sections.ts (content data, not UI). npx vitest run, no snapshot or copy assertion depended on the glyph; the milestone still renders with its words for all five personas. |
| 5. Build the For Sunday strip and mount it on Home directly under Between You & God, above the Preach card. Editable 16px focus field at 44px tall, newest three with Remove and a 5-second undo, expand in place, cap notice from 32, actions stacked full-width at 375. | new src/components/ForSundayStrip.tsx, src/utils/sermonPrep.ts (count, since-Sunday, and one shared buildPrepClipboardText() used by Copy all and by the Preach hand-off, leave the save/merge semantics alone), src/screens/HomeScreen.tsx (mount after PastoralReflectionSection; addReadingSlot passed as a prop), src/utils/i18n.ts | New ForSundayStrip.test.tsx: renders the invitation line with no items and no greyed button; empty / focus-only / items / 32-item warning / at-cap / just-filed states; stays mounted with a live open prop while collapsed; removing an item rewrites from localStorage and Undo restores it from localStorage, not from React state; editing the focus calls setPreachingFocus once; "Read what I'm preaching" writes dw_reading_slots and never touches dw_activeplans; the focus input's fontSize is 16 or more and every action is 44px or more tall. Then at 375px the three actions are stacked, not side by side. npx vitest run src/components/ForSundayStrip.test.tsx |
| 6. PREVIEW-GATED: move the Preach card below the reading, the reflection and For Sunday for congregation/deeper_study/pastor_leader/comfort, keeping the I'm-New Sunday-window exception the file already describes. Make the pastor tap carry the bag: build the clipboard text synchronously, writeText inside the gesture, then assign PREP_URL, and on a copy failure show the failure line instead of navigating on that first tap. Add the counted-facts week line as a new element; the pinned sub string is not rewritten. Update the pastor arrival copy that points at it. | src/screens/HomeScreen.tsx (move the {sermonNotesRow} render from line 2106 to after the For Sunday strip; the row definition at 1786-1830 gains the week line and the copy-then-navigate handler), src/utils/sermonPrep.ts (buildPrepClipboardText), src/utils/i18n.ts (path_arrival_pastor, week-line keys), src/screens/home-pastor-floor.test.ts (add a source-order assertion) | npx vitest run src/screens/home-pastor-floor.test.ts src/components/PathArrivalStrip.test.tsx, the deep-link branch, the PASTOR_CHAPTERS floor, and both preach_card_sub assertions (lines 68-69) must pass unchanged. Note the PathArrivalStrip spec lives at src/components/PathArrivalStrip.test.tsx, beside its component, there is no src/screens/ copy. New assertions: the sermonNotesRow render index is greater than the hero index for the four returning personas and less for new_to_faith inside the Sunday window; with items filed, the tap calls writeText with the same string Copy all produces AND then assigns PREP_URL; with writeText rejected, the first tap does not assign and the failure line renders; preach_handoff carries copied. Then all five personas at 375px in the deploy preview, and one real phone paste into Pastors Sermon Prep. |
| 7. Frame the AI. Add the "Built from your N filed verses" source line under button 4, the research-assistant framing line as a paragraph below the four buttons, and the pastor-mode answer footer. | src/components/BibleAI.tsx (inside the data-testid="pastor-prompts" block, approximately line 792, and under the answer render), src/utils/i18n.ts (new keys, en/es/pt/id) | npx vitest run src/components/BibleAI.pastor.test.tsx, the four labels and their order byte-identical, "For your message" still present, and the pinned outline message format unchanged. New tests: the framing paragraph's DOM index is greater than all four button indices; the footer renders for pastor_leader and for no other persona. |
| 8. Pull the AI fallback out of the commentary source tab strip into its own labelled assistant block below the sourced commentary. | src/screens/HomeScreen.tsx (line 924, stop pushing the fallback into allCommentaries; the guard at line 1463; the commentary render approximately 3355-3420) | npx vitest run, new assertion that "AI Insight" never appears in the source tab strip, that a sourced commentary still renders its tabs, and that the assistant note renders in its own block when the library has nothing for the chapter. |
| 9. Trust panel inline. Source and licence line under commentary and in the Greek/Hebrew popup, opening a sources sheet that reuses the StudySourcesCard body. | src/screens/HomeScreen.tsx (commentary card, approximately 3396), src/components/GreekHebrewPopup.tsx, new src/components/StudySourcesSheet.tsx (useSubView alone, no useModalA11y, no aria-modal), src/components/StudySourcesCard.tsx (accept an open prop so one component serves both the sheet and the Settings card) | npx tsc -b; npx vitest run src/components/StudySourcesCard.test.tsx plus a new StudySourcesSheet test that the sheet paints nothing while closed and stays mounted with a live open prop, and that the trigger is at least 44px tall. In preview, open it from commentary and press the Android back gesture, it closes the sheet and does not leave the screen; the source and licence strings match /api/study?sources=1; the tab strip scrolls inside itself at 375 with no horizontal page scroll. |
| 10. Between You & God: tag the bank, add the 8 approved soul questions, gate the second button on tag, size both buttons, fix the prefill, and serve the bank from the study data path with the bundled tagged bank as the offline fallback. One getTodayPrompt() helper returns { text, tag } for both this card and Home. | src/utils/persona-config.ts (lines 473-489 become the bundled tagged fallback), src/components/PastoralReflectionSection.tsx (getTodayPrompt, tag-aware rendering, renamed buttons at minHeight 44, privacy line, comfort line on soul days only, the new strategy prefill replacing line 66), netlify/functions/study.js (a ?prompts=1 shape beside the existing ?sources=1), new migration IN THE REPO for the prompt rows in the study_* tables | npx vitest run, a soul question renders Write it down with no AI button and shows the privacy and comfort lines; a work question renders both buttons and the strategy prefill and no comfort line; both buttons measure 44px or more; the bank falls back to the bundled tagged set when the fetch fails, and the fallback's tags match. Then edit one prompt row in the data and hard-reload a device that already visited, the edited question appears with no deploy and no SW bump. Ashley approves the 8 drafts before this ships. Nothing is added under public/books. |
| 11. Grace and milestone copy for this persona. Return usedFreeze from the read-day record, render the grace line under the greeting only when a freeze was spent against a real missed reading, and give pastor_leader a plain milestone line. | src/utils/streak.ts (add usedFreeze to the return, additive only, alongside the existing freeze branch at lines 73-76), src/utils/readDays.ts (pass it through), src/sections/GreetingSection.tsx, src/utils/i18n.ts | New tests: a two-day gap in dw_read_days with a freeze available returns usedFreeze true and count+1; a three-day gap returns count 1 with usedFreeze false and bestCount preserved through the Math.max at streak.ts:82; an app-open with no reading returns isNew false and renders no grace line. npx vitest run src/utils/ |
| 12. Your Week on Monday for pastor_leader, counted from dw_read_days and the behaviour log, the same record the greeting and the chip now use. | src/sections/WeeklyReviewSection.tsx (persona-gated day, four leadership questions, 44px dismiss), src/utils/behavior.ts (week-window counters), src/utils/readDays.ts (week window helper) | New test: pastor_leader renders on a Monday and not on a Sunday; every other persona is unchanged on Sunday; a Mon/Wed/Fri reader reports 3, not the streak; zero read days renders nothing at all rather than a zero; the number matches the greeting's. |
| 13. Campus Overview: lead with sign-in, repair the code field, hide the card offline. | src/screens/HomeScreen.tsx (the block at approximately 4270-4315: sign-in row first, code behind the link; input gains placeholder "8-character campus code," fontSize 16, inputMode='text', maxLength 8; the button loses disabled and the opacity gate and gains minHeight 44; an empty press renders the required-field line beside it; the whole card returns null when offline), src/utils/i18n.ts | New test: the submit button has no disabled attribute in any state; pressing it empty renders "Enter your campus code." and calls nothing; a value set programmatically without a change event still submits on press (the iOS paste case); the input's fontSize is 16 or more; offline renders nothing. The mid-session PASTOR_CODE_EVENT pin at home-pastor-floor.test.ts:50-53 still passes. |
| 14. Reminders. Offer the inferred hour once after 5-7 recorded opens, from a local open-time log; add persona to the subscription and skip Sunday for pastor_leader, this half only if Ashley confirms the Sunday inference. | new src/utils/openTimes.ts (last N open hours on device, median, no new synced record), src/screens/MoreScreen.tsx, src/utils/push.ts (updatePushTime only on an accepted tap), netlify/functions/push-subscribe.js, netlify/functions/push-send.js, new migration IN THE REPO adding push_subscriptions.persona | npx vitest run on the median helper and the once-only gate; both proposal buttons 44px or more. npm run build. Verify the send path on localhost or prod only, pushSupported() will not allow a deploy preview to prove it. Confirm one send per local day and none on Sunday for a persona='pastor_leader' row. |
| 15. Comfort line on the pastor path, as an overlay with the comfort toolbar, rendered exactly once per screen. | src/screens/HomeScreen.tsx (the line under PastoralReflectionSection, gated on the day's prompt tag being work), src/components/PastoralReflectionSection.tsx (the same line under a soul question only), src/components/ComfortSection.tsx, src/utils/i18n.ts | New test: on a soul-question day the comfort line appears exactly once in the rendered tree and it is inside the card; on a work-question day exactly once and it is on Home. Tapping it opens the comfort reading, imports no saveSetup, writes nothing to dw_setup, does not stamp dw_reading_done or dw_read_days, records no streak and no completion, shows only Note and Close, and shows no graduation prompt or follow-up anywhere in the component; the pastor persona is intact on close. |
| 16. Path sheet promise line, ONLY if Ashley approves it. | src/utils/i18n.ts (path_leader_promise, all four languages) | npx vitest run src/components/ChoosePathSheet.test.tsx; measure the sheet at 375 wide, it must fit an iPhone SE's visible viewport (approximately 553px in Safari with browser chrome) without scrolling, budget approximately 540px including the pastor sign-out row, every card row 44px or more. If the approved wording wraps past the budget, shorten the wording; the sheet does not scroll. |
| 17. Preview and hand it over. One branch, one PR, deploy preview link, Ashley's look and explicit approval before merge. | PR against main; no direct push to main. PR body names the ruled items: preview gate, credit-free seed untouched, sermon row below the reading, Preach carries the bag out and keeps its exact sub string, no invented numbers on any screen (day count from real read days, no seeded campus count, no hours claim), comfort Note+Close with no graduation prompt and one line per screen, no emoji as UI, no leaders featured row, no weekly-review-for-all, no invented sermon framework. | npm run build && npx vitest run clean; deploy-preview green; the preview link driven as pastor_leader end to end at 375px (arrival, read, reflect, file two captures, outline, trust sheet, Preach with a real paste), plus a 375px pass in light and dark confirming the hero panel is still white with upright Georgia scripture, no input under 16px, no control under 44px, and no horizontal page scroll. Merge only on Ashley's word; then poll the prod deploy to ready and verify the live artifact, including push and the clipboard hand-off, neither of which can be proven on the preview. |
