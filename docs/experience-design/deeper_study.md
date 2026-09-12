# Deeper study path, final design (10 Sep 2026)

Status: judged, UX-reviewed, repaired, verified through three lenses with zero issues. Ready to build behind a preview.

## Item

Deeper study — the devout daily reader (deeper_study)

## Angle

The passage is the product, and the promise on the arrival strip is the spec. Every depth tool is named on the passage and one tap behind it, the plan day is the only number on screen and it is printed exactly once, the app asks this reader exactly one question once and never underneath a chapter, and nothing that is on the screen today leaves it. It is relocated one tap deep and given a name it did not have.

## Thesis

This reader already has the habit. What the app owes them is the text, dated, at the top, in under three seconds, with the depth it already promised them actually reachable. Today it does the opposite in six verified ways.

On day 0 they are asked to choose a plan three times on one screen with no scripture anywhere on it, because heroChapterRefs floors comfort, new_to_faith and pastor_leader but not them (HomeScreen.tsx:1302-1315).

From day 1 the chapter does arrive already open, which is right, is a ruling, and stays, but wrapped in a control deck of chapter pills, Stop/Read, Restart, N translation chips, Compare and N more compare chips, with a pre-expanded commentary card and a second printing of the same chapter below it, because heroChapterRefs and todaysPlanPassages start from the same passage.

The arrival strip promises "Compare and the original languages" (i18n.ts:915) while the only persistent Greek/Hebrew control sits at HomeScreen.tsx:3233-3247 inside a block that returns null when there is no plan. So the persona's headline feature is unreachable for anyone reading on slots.

The commentary they get is an AI paragraph on most days, while six named public-domain commentaries are already fetchable in this repo and wired only into the pastor's prep sheet (src/utils/study.ts:105-112).

Tapping Read silently credits the plan day (HomeScreen.tsx:754-755) against the code's own stated intent four lines above it.

And the number in the greeting is not their reading day at all. getGreeting prints "Day {streak}" from recordStreakToday, which fires on every mount (HomeScreen.tsx:786-795), so it counts app opens, and after two legitimate days off it resets to Day 1 beside a plan sitting on Day 15. A shame cue produced by arithmetic, in the app's own voice, on the path that bans it.

Fix the promise, not the persona. Three things leave the surface: a duplicate printing, a scattered chip deck, and a silent credit. And one number stops being printed twice. Everything they contained comes back named: a Study row that says Commentary · Compare · Greek & Hebrew, a Study sheet holding all four tools with real commentators and provenance under each, a floor chapter so day one is scripture, a Paper mode for the 89% who still prefer print, a catch-up line that names the day still waiting, a Finished card so a completed plan is not a dead end that repeats the last chapter forever, and a done row that is filled and live instead of greyed out.

On day 0 the one question sits within the first screen at 375px, above a capped reading rather than below a full one, because a committing control under a Kindle-style scroll is a control that is never found.

Richer and clearer, never stripped: the passage gets the whole panel, the tools get names they never had, and the only things actually deleted are a second copy of the same chapter, a hardcoded English string, and a counter that was never measuring what it claimed.

## Principles

1. The promise on the arrival strip is the spec. It says commentary, Compare and the original languages, so all three are reachable from the passage on every day, with or without a plan. Today two of the three are not.
2. Text first, tools named and one tap behind. Not a single unlabelled "Study" glyph and not a wall of chips. One row that reads Commentary · Compare · Greek & Hebrew, each chip opening the sheet on its own tab. The tool is called "Greek & Hebrew" in the chip, in the tab and in the sheet, one name, never an abbreviation, and at 375px the row wraps to a second line before any target shrinks below 44px.
3. Nothing is deleted from this screen except a duplicate, a hardcoded string and a number that was measuring the wrong thing. Every control that is on Home today is on Home tomorrow, named, one row lower or one tap deep. The last opening-screen change was reverted as "completely stripped". The defence has to be structural, not rhetorical.
4. A dated plan is the spine and its day is the only progress number on the screen, printed exactly once, on the plan line. The greeting carries no number on this path, because the counter behind it counts app opens rather than readings. No streak count, no flame, no exclamation mark, no "you're amazing".
5. One question, three answers, one tap, and the tap starts the plan AND opens today's chapter in place. The question is reachable without scrolling past a chapter. Never a confirmation screen, never a CTA below the fold.
6. Completion is deliberate, and it means the same thing on every path. Expanding a chapter is not reading it. This is the repo's own settled position at HomeScreen.tsx:713-716, which handleRead at :754-755 still contradicts, for congregation and pastor_leader as much as for this reader, so the fix is not persona-gated.
7. A devout reader never sees a scripture-free screen. Comfort, new_to_faith and pastor_leader all have a floor chapter; this reader gets one too.
8. Say plainly what is a published commentator and what is the app's own AI. This is the reader most likely to check, and a name is not evidence.
9. No shame in any number, ever. A missed day offers two live choices and no apology; a reminder never mentions a gap; and no counter on the screen is allowed to reset while the reading it claims to measure is still running.
10. Nothing greyed, nothing asked twice, nothing hidden. Every control on screen is live, the way out of a full-screen mode stays visible for as long as the mode is open, and anything the app can compute, the day number, the reminder hour, the tab used last, is never a question.
11. A lever is called self-serve only if a campus pastor can use it, see that it worked, and recover from a typo without a developer. Anything short of that is named in the plan as a file edit that deploys on merge, honestly, and in the same sentence.

## The journey

### Day 0

They tap "I want to go deeper in the Word" in the one path sheet, are saved with source "onboarding", and land on Home with a rotating study chapter already open in the white paper panel. Compare and Greek & Hebrew live above it, commentary named below it. Because no plan exists yet, the panel is capped at about twelve lines with "Keep reading" under it, so on a 375px phone the next thing on screen is the single ask: "Where are you reading?" with three dated plans. One tap starts the plan and today's chapter opens in place, uncapped.

Total asks on day 0: one, down from three. Total taps to scripture: zero, down from one-and-a-funnel. Total scrolls to the one control that starts a plan: zero.

### First session

The chapter fills the paper panel under a plan line reading "Through the Bible in a Year · Day 1 of 365", the only number on the screen. The greeting is their name and nothing else. Above the text: Listen · Study row (Commentary · Compare · Greek & Hebrew) · Paper.

They tap Commentary out of curiosity, get Matthew Henry with "public domain" under his name, close it. They tap a word, get the Greek, tap Go deeper, the AI answers with cross-references. They write one line into Reflect, a real question, not the same one they will see on day 14. They tap Mark as read and the button becomes a filled live row: "Day 1 of 365 done."

### Return visit

They open the app; today's chapter is already expanded and fetched before they touch anything, the existing credit-free arrival seed, unchanged and untouchable. "Good morning, Ashley." The plan line reads "Day 34 of 90". Same three controls in the same place. Nothing on the screen has moved since yesterday. That is the feature.

### Week 2

The plan line reads "Day 12 of 365". The done row gains a second line computed from the plan's own completedDays: "Five of the last seven days." The Study sheet opens on whichever tab they used last. The Notes tab is now a study record, fourteen entries, each stamped with the chapter it came from, filterable by the Study chip, because reflections captured from the hero are auto-tagged. Around session seven the Reminders card offers the hour they actually open the app, once, in neutral words.

### Missed day

Two days missed. No red, no badge, no count, no apology copy, and no greeting that has quietly reset to Day 1. One line above the panel: "You're on Day 15. Day 12 is still there." And, on their own row beneath it at full tap height, two live buttons: "Read Day 12" and "Move the plan to today". Whichever they tap, the chapter opens and the tools follow to that day. "Not now" hides the line until another day is skipped. The reminder that evening names the waiting chapter, never the gap.

### Seasonal

Two moments, neither of them a programme. From mid-December the year-long plan card carries a second button, "Start on 1 January", because a plan started on 18 December is a plan abandoned on 2 January. And a dated Futures series plan appears as a fourth row in the plan picker and on the Plans tab during a season, and nowhere else. No interstitial, no takeover of the opening screen, no interruption to a reading in progress.

## Screens

### 1. "Where are you today?" — the Deep study card

**Purpose:** The one door onto this path. Nothing here changes; it is listed so that it is explicitly out of scope and cannot drift during the build.

**Order of elements:**
1. Title "Where are you today?"
2. Sub-line
3. Five cards, unchanged
4. Footer line
5. Sign out of pastor account (only when a pastor is signed in)

**Copy:**

| Element | Text |
|---|---|
| Card head (existing, path_study_head) | I want to go deeper in the Word |
| Card promise (existing, path_study_promise) | Commentary, original languages, cross-references. |
| Card CTA (existing, path_study_cta) | Open the study reading |
| Footer (existing, path_sheet_footer) | Not a test. Not a form. Just where you're starting from. |

**States:**
- Closed, mounted with a live open prop, painting nothing (pinned by ChoosePathSheet.test.tsx).
- Open on the current path, ticked, no second CTA below the fold.
- One tap on Deep study saves (source "onboarding" first time, "settings" on a change) and navigates to Home immediately.
- Tapping the path they already have just closes.
- Pastor signed in: a note plus "Sign out of pastor account", no lock glyph.
- Fits 375px wide without horizontal scroll and 390px at about 481px tall without vertical scrolling (537 with the sign-out row).

**Keep:**
- Every word and every behaviour. Three doors, one sheet, one tap saves and opens, saving navigates, no gate, no lock. Settled by ruling and by test.

**Change:** none.

**Remove:** none.

### 2. Home — day one on this path (no plan yet)

**Purpose:** Hand a devout reader scripture on the first screen, and ask the one question that genuinely cannot be inferred, where are you reading, once, on the same screen as the reading, resolving into an open chapter in one tap.

**Order of elements:**
1. Header: wordmark · path swatch "Study" · campus chip · Search
2. Greeting, name only, no number
3. PathArrivalStrip, the existing one-line, dismissible confirmation
4. Hero photo plate: eyebrow, date, play, chapter caption
5. Study row: Listen · Commentary · Compare · Greek & Hebrew · Paper (wraps to two lines at 375px)
6. Paper panel, the floor chapter, already open, capped at about 12 lines in this state only
7. "Keep reading", un-caps the panel
8. "Where are you reading?", one ask, three plans, attached as one block
9. "See all plans" link
10. Reflect, rotating prompt
11. Mark as read
12. Commentary row, source named, one line, opens the sheet
13. Sermon Notes row (below the reading, per ruling)
14. Comfort line

**Copy:**

| Element | Text |
|---|---|
| Greeting (existing key, no-number branch) | Good morning, Ashley. |
| Path arrival strip (existing, path_arrival_study) | You're in the study reading. Commentary is open below, with Compare and the original languages. |
| Hero caption | John 1 · ESV |
| Study row | Listen   Commentary   Compare   Greek & Hebrew   Paper |
| Panel expander (no-plan state only) | Keep reading |
| Plan ask, head | Where are you reading? |
| Plan ask, sub | Pick a plan and everything here follows it, the chapter, the commentary, the tools. You can change it whenever you want. |
| Plan row 1 | Through the Bible in a Year — 365 days, Genesis to Revelation. |
| Plan row 2 | New Testament in 90 Days — all 27 books in three months, with room to breathe. |
| Plan row 3 | Psalms & Proverbs — 181 days, a chapter a day. |
| Link | See all plans |
| Reflect label + day-1 prompt | Reflect — What did you notice today that you had not noticed before? |
| Mark as read (existing) | Mark as read |
| December variant, year-long card only | Start today · Start on 1 January |
| Comfort line (foot of screen) | Hard day? The comfort readings are here. |

**States:**
- Empty (no plan, no slots): the floor chapter is open in the panel, capped, and the one ask sits directly under "Keep reading". At 375x812 the three plan rows are on the first screen without scrolling. Never the "Choose your reading plan" funnel, never a scripture-free screen.
- "Keep reading" tapped: the panel un-caps for the session and the ask moves down with it, once they choose to keep reading, the reading wins. The ask is still there under the text, and the panel opens capped again on the next cold open until a plan exists.
- First tap on a plan row: the ask block is replaced in place by Day 1 of that plan, chapter loading then open and never capped again. No navigation, no success screen, no toast.
- Returning before choosing: identical screen, a different floor chapter (rotates by local day index). No "you haven't picked yet" line, no badge, no second nudge.
- Floor chapter is never served over a real plan or a reading slot, it exists only when refs.length === 0. The cap applies only in that same state.
- Offline: all three rows still tap (starting a plan is a local write); the chapter falls back to the cached text under the existing line, and the caption names the translation actually served.
- Missed / Done: not applicable, no plan exists to miss.

**Keep:**
- The rich hero photo plate and its gradient, the locked look, and the only warm surface on a screen that would otherwise be three grey rows.
- PathArrivalStrip as the arrival confirmation; it already names the path in the reader's own words.
- The five-plan persona filter on the Plans tab (PERSONA_PLAN_IDS.deeper_study, persona-config.ts:17), all five stay reachable behind "See all plans".
- Reflect directly under the reading and before Mark as read, in that order, per ruling.

**Change:**
- Give deeper_study a floor chapter beside the comfort, new_to_faith and pastor_leader branches, so the first screen is scripture.
- In this state only, cap the panel at about twelve lines with a "Keep reading" expander, so the one committing control on the screen is not underneath a full-height Kindle-style scroll. With a plan running the panel is never capped.
- The one ask sits between the capped reading and Reflect in this state only. The ruling positions the reflection under the lesson text and before Mark Complete, and it still is; the exception exists solely because on day 0 the plan ask is the single control that must be found, and it disappears the moment a plan exists.
- The generic "Choose your reading plan / Browse plans" hero funnel becomes the one question plus three named plans.
- The three plans are the first three of this persona's own five, in a fixed order, not the six-plan category filter the wizard currently computes, which does not match the persona's list.
- The greeting drops its number on this path (see the daily-reading screen); on day 0 there was never a number to show anyway, and the branch is now the same one.

**Remove:**
- The two-step deeper_study wizard branches in PastorStudyOnboarding (the !isPastor path only, the pastor wizard stays whole).
- The "No reading plan active / Browse plans" card, a third ask for the same thing.
- Nothing else. The photo plate, the chevrons, the action bar, the campus chip and the Search control all stay.

### 3. Home — the daily reading (a plan running)

**Purpose:** The screen they see roughly 350 times a year. Deliver today's chapter, dated, already open, with every depth tool named on the passage and one tap away. It should be the same shape every morning and should ask them for nothing.

**Order of elements:**
1. Header: wordmark · path swatch "Study" · campus chip · Search
2. Greeting, name only, no number
3. Catch-up line (only when a day was skipped)
4. Hero photo plate: plan + day eyebrow, date, play, chapter caption
5. Chapter slider + pills (only on multi-chapter days)
6. Study row: Listen · Commentary · Compare · Greek & Hebrew · Paper (wraps to two lines at 375px)
7. Paper panel, today's chapter, open, full height, page scrolls as one surface
8. Reflect, rotating prompt, autosaving
9. Mark as read / the filled done row
10. Commentary row, source named, one line, opens the sheet
11. "ALSO TODAY" (only when the plan has passages the hero chain does not already carry)
12. Sermon Notes row (below the reading, per ruling)
13. Comfort line

**Copy:**

| Element | Text |
|---|---|
| Greeting (existing key, no-number branch) | Good morning, Ashley. |
| Plan line / hero eyebrow, the only number on the screen | New Testament in 90 Days · Day 34 of 90 |
| Chapter line | Romans 8 · ESV |
| Chapter counter (existing) | Chapter 1 of 3 |
| Study row | Listen   Commentary   Compare   Greek & Hebrew   Paper |
| Commentary row on Home | Commentary — Matthew Henry › |
| Commentary row, AI day | Commentary — written by this app's AI › |
| Reflect prompt (rotates by day index) | Where does this passage argue with you? |
| Mark as read, after (existing) | ✓ Read today |
| Additional-reading header | ALSO TODAY |
| Offline translation line (existing, keep verbatim) | ESV is unavailable right now — showing the offline text instead. |
| Comfort line | Hard day? The comfort readings are here. |

**States:**
- Arrival: chapter expanded and fetched before any tap, via the existing persona-gated credit-free seed. Never through handleRead.
- Multi-chapter day: slider and pills switch the open chapter; play continues the chain from the current chapter; ALSO TODAY carries only what the hero chain does not.
- One-chapter-a-day plan: ALSO TODAY renders nothing at all and the chapter is printed exactly once.
- Missed: the catch-up line above the panel; the panel opens at whichever day they choose; the greeting is unchanged, because it no longer carries a counter that could reset.
- Read today: the filled live done row, not a greyed disabled button; it does not re-fire.
- Streak reset day: nothing happens on this path. The greeting is the same words as yesterday.
- Audio playing: wave next to the control, floating Stop button.
- Plan finished: the panel is replaced by the Finished card and the hero falls to the floor chapter, never a silent repeat.
- Offline: chapter from cache; Listen reads "Audio needs a connection" rather than spinning; the Study row chips stay visible and the sheet explains what needs a connection; Mark as read still works and syncs later.
- Passage failed to load: the existing error state, with the Study row still rendered so cached commentary is reachable.
- 375px: the Study row wraps to two lines, every chip at least 44px tall, and the body never scrolls horizontally.

**Keep:**
- The credit-free arrival seed. It is a ruling and it is the single best thing on this path.
- The white paper reading panel with dark upright Georgia scripture in both themes, and the full-height Kindle-style scroll with no internal scrollbar.
- The whole hero: photo plate, eyebrow, date, play, chapter slider, pills, action bar, the gold Bible AI button.
- InlineReflection directly under the passage, then Mark as read, in that order.
- "Mark as read" as the only completion control, gated on dw_reading_done for the local date.
- Per-passage Listen on the passage card, not in a separate audio section.
- The terse greeting, no exclamation, no cheerleading.

**Change:**
- The greeting stops printing "Day {streak}". That number comes from recordStreakToday, which fires on every mount, so it counts opens, not readings, and it resets to Day 1 after two days off while the plan line says Day 15. On this path the greeting is the name and the time of day; Day N appears once, on the plan line. The streak is still recorded, it is simply no longer displayed here, and the other four personas' greetings are untouched.
- The scattered control deck becomes one named Study row. The translation chips, the Compare chip, the compare-translation chip row and the Greek/Hebrew toggle all move into the Study sheet, reachable by name from the row rather than by hunting.
- The Greek/Hebrew toggle leaves the plan-card header, where it is unreachable without an active plan, and becomes a named chip on the passage, called "Greek & Hebrew" in full, available on every day and every reading source.
- The pre-expanded commentary card becomes a one-line named row on Home that opens the sheet. The source is named on the surface, so the reader can see at a glance whether today is Matthew Henry or the app's own AI.
- "TODAY'S STUDY" becomes "ALSO TODAY" and renders only passages not already in heroChapterRefs, mirroring the dedupe guard the scripture section already has.
- Commentary is keyed to the chapters actually open, not only to plan passages, so a reader on reading slots gets the curated set instead of falling to AI.
- The Sermon Notes row moves from above the hero to below the reading, a ruling the live build does not currently obey.
- The completed state stops being a disabled, muted button and becomes a filled live row with a real action.

**Remove:**
- The duplicate plan card that reprinted the hero's own chapter behind a second Read button.
- The hardcoded English "Greek/Hebrew ON" / "Tap for Greek/Hebrew" strings, the i18n'd twin (gk_heb / hide_reading) moves to the Study row under the full name.
- The plan-day credit that fires just because a chapter was expanded (removed for every persona, not gated to this one).
- The disabled attribute and the transparent/muted treatment on the completed button.
- The streak number in the greeting on this path, and with it the streak_reset_best line, which prints "Day 1 — your longest run is {best} days" on exactly the morning this reader least needs a counter.
- Any weekly-review card. weeklyReview is already false for this persona and weekly-review-for-all was explicitly rejected, it does not come back under another name.

### 4. Study sheet

**Purpose:** Hold every depth tool in one place, opened by name from the Study row, closed by one tap or the back gesture, and give this reader real commentators instead of an AI paragraph.

**Order of elements:**
1. Header: chapter reference, close control
2. Four tabs, all live: Commentary · Compare · Greek & Hebrew · Cross-references (two rows at 375px, one row from 390 up)
3. Commentary: source list by name, then the selected source's text
4. Provenance line, always present under commentary
5. Campus note, pinned above the public-domain sources when the campus has published one for this chapter
6. Content pane
7. "Ask about this chapter", hands the chapter to Bible AI with this persona's existing scholarly system-prompt addition

**Copy:**

| Element | Text |
|---|---|
| Sheet title | Romans 8 |
| Tabs | Commentary · Compare · Greek & Hebrew · Cross-references |
| Commentary source list header | Six commentaries on this chapter |
| Curated provenance line | Matthew Henry · public domain |
| AI fallback provenance line | Written by this app's AI from the chapter text. Not a published commentary. |
| Campus note header | From Alpharetta · Ryan |
| Compare empty | Pick a second translation. |
| Greek & Hebrew hint | Tap any word to see the original. |
| Greek & Hebrew tab, untagged chapter | Word tagging covers the Greek and Hebrew testaments. This chapter is not tagged yet. |
| Cross-references empty | No cross-references for this chapter yet. |
| Footer action | Ask about this chapter |
| Commentary offline | Commentary needs a connection. The chapter is still here. |
| Licence footer | Public domain and Creative Commons sources. Full list in Settings. |

**States:**
- First open: lands on the tab whose chip was tapped.
- Returning with no chip specified: opens on the tab used last, remembered per device. The app knows this; it should not ask.
- Loaded, multiple commentaries: source list with the first source selected, curated and public-domain sources ordered before any AI entry.
- Empty: no published commentary for the chapter, the AI Insight with its provenance line; if that also fails, "No commentary for this chapter yet. The other three tabs still work." Never a blank pane, never a greyed tab.
- Campus note present: pinned above the public-domain sources with the campus and author named, and visible only to that campus's readers. A note whose chapter reference did not resolve never reaches this sheet; it is refused at the intake form instead, so nothing silently disappears.
- Loading: a skeleton per tab, never a spinner over an empty sheet, because the existing 30-day AI cache and the memoised study client both pre-warm.
- Offline: cached commentary only, under the offline line; Compare falls back to the offline translation; Greek & Hebrew works from the inline dictionary and says so when a word needs the network.
- 375px: the four tabs sit in two rows of two at 44px each rather than shrinking or scrolling sideways; the sheet body never scrolls horizontally.
- The sheet is never part of completion and must never credit a plan day.

**Keep:**
- The existing GreekHebrewPopup and its "Go deeper" into Bible AI.
- Bible AI with the deeper_study system-prompt addition (Greek/Hebrew, cross-references, scholarly perspectives).
- The curated commentary set and its multi-source tab behaviour when a day covers more than one chapter.
- The 30-day AI Insight cache, it is what makes the sheet open instantly rather than on a spinner, which is why commentary:'expanded' stays in the persona config even though the Home card is gated off a separate flag.

**Change:**
- Source the Commentary tab from the study library already shipped in this repo, fetchStudyPassage, fetchStudyCommentary, fetchTaggedChapter, fetchLexiconEntry, so the six named public-domain commentaries reach this reader. Today those are wired only into the pastor's prep sheet and the Greek/Hebrew popup, while Home reads a roughly 20-chapter curated set and falls back to AI on most days of any long plan.
- Commentary source becomes a provenance line, not a bare label. An AI-written insight and Matthew Henry must not carry the same visual weight, this is the reader who will check.
- Compare and Greek & Hebrew stop being page-level modes and become tabs in one place, reachable on every reading source rather than only with an active plan.
- The tool is named "Greek & Hebrew" in the tab and in the chip that opens it, the same words in both places, never an abbreviation.

**Remove:**
- Nothing. This sheet is where the relocated Home controls live, they are not lost, they are one tap deep and named on the surface.

### 5. Campus study note — the existing staff intake row

**Purpose:** Let a campus pastor put a note on a chapter and know, before he closes the tab, whether it will actually show up. Listed because the design claims this as a self-serve lever, and a lever that fails silently is not one.

**Order of elements:**
1. The existing corner_add question on /staff
2. Note title
3. Note body
4. "Which chapter is this note about?", one text field, optional
5. The existing error paragraph (role="alert") directly above the save button
6. The existing save button
7. The existing saved confirmation, extended with where it shows
8. The existing corner_remove list for taking one down

**Copy:**

| Element | Text |
|---|---|
| Chapter field label | Which chapter is this note about? |
| Chapter field helper | Book and chapter, like Genesis 12. Leave it blank for a note that is not about one chapter. |
| Refused (rendered in the existing error paragraph) | We could not find that chapter. Try a book and chapter, like Genesis 12. |
| Saved confirmation, extended | It's on the campus corner. It shows on Genesis 12. |
| Saved confirmation, no chapter given | It's on the campus corner. It is not attached to a chapter. |
| Saved row in the remove list | Genesis 12 · Ryan · 8 Sep |

**States:**
- Blank field: saves exactly as campus notes save today, appears on the campus corner and in no Study sheet, and the confirmation says so in those words.
- Recognised in any ordinary form, "Gen 12", "Genesis12", "1 Cor 3", "Psalm 23", is normalised to the canonical reference and echoed back in the confirmation, so he sees what the readers will see.
- Unrecognised, or a chapter that does not exist (Genesis 51): refused before the save, with the message in the existing error paragraph, scrolled into view, exactly like every other refused save on this form. The typed answers stay in the fields.
- Saved: it appears in that campus's deeper_study Study sheet for that chapter and in no other campus's.
- Removed: the existing corner_remove deletes it by id, scoped to his own campus, with the chapter named on the row so he can tell two notes apart.
- Offline or a failed save: the existing error path, unchanged, a refused save must never look like nothing happened.

**Keep:**
- The whole /staff form: noValidate with the form's own required check, the fail() path that sets formError, the role="alert" paragraph above the save button and the scroll-into-view. This is the pattern; the chapter field just uses it.
- corner_add and corner_remove as the only authoring path, campus-content still refuses direct POSTs and points at /staff.

**Change:**
- The chapter reference is normalised on the server through the parser this repo already has (netlify/functions/lib/study-ref.js, canonicalBook, parseRef, formatRef) before anything is written, so what is stored is canonical and what is displayed is what was stored.
- The same check runs client-side before submit so the refusal is instant and lands in the existing error paragraph rather than as a 400 the pastor has to interpret.
- The saved confirmation and the remove list both name the chapter, so the lever reports its own result.

**Remove:**
- Nothing. No new form, no new page, no new permission, one optional field on a question that already exists.

### 6. Paper mode

**Purpose:** The chapter and nothing else, at the size the reader chose, for the 89% who still prefer print. Opt-in, reachable only from an open chapter, and never the default.

**Order of elements:**
1. Chapter text, full bleed, on the ivory canvas
2. A pinned bar, always visible: chapter reference on the left, Close on the right
3. A− and A+, shown with the bar and fading after three seconds; any tap brings them back

**Copy:**

| Element | Text |
|---|---|
| Bar reference | Romans 8 |
| Smaller | A− |
| Larger | A+ |
| Close | Close |

**States:**
- First: the chapter reference and Close are visible from the moment the mode opens and stay visible the whole time. Only the A−/A+ pair fades, after three seconds; a tap anywhere brings it back.
- Why: an iOS home-screen PWA has no back gesture, so a fading Close is a reader stranded on a full-bleed chapter with no visible way out. Close is never the thing that fades.
- Returning: opens at the size set last (scriptureFontSize, already persisted and shared with the panel).
- Offline: identical, the text is already loaded before this mode can be entered.
- Missed / Done / Empty: not applicable, reachable only from an open chapter.
- Back gesture, where the platform has one, also closes it and returns to the same scroll position on Home.

**Keep:**
- scriptureFontSize as the single type-size source, shared with the panel so the two never disagree.
- The ivory canvas and the Georgia upright serif, this is the locked paper look at full size, not a new theme.

**Change:**
- Nothing existing changes. This is additive and reachable only by name from the Study row.

**Remove:**
- No other chrome inside this mode: no tab bar, no greeting, no plan line, no completion button. Completion happens back on the panel.

### 7. The catch-up line

**Purpose:** Name the day still waiting without making it a failure, and give it back in one tap. This is the grace mechanic, and it replaces streak repair entirely on this path.

**Order of elements:**
1. One line under the hero date strip
2. Beneath it, on its own row, two buttons at full tap height
3. "Not now" at the end of that row

**Copy:**

| Element | Text |
|---|---|
| Line | You're on Day 15. Day 12 is still there. |
| Button A | Read Day 12 |
| Button B | Move the plan to today |
| Rebase confirmation | This makes today Day 12. Everything you have read stays read. |
| After rebase toast | Moved. Today is Day 12. |
| Dismiss | Not now |

**States:**
- Hidden when the plan's calendar day equals the next uncompleted day.
- Shown when one or more days were skipped, it names only the earliest one, never a list, never a count, never a badge, never a red dot.
- The two choices and "Not now" sit on their own row below the line, each at least 44px tall, never crammed into the sentence, at 375px they wrap to two rows rather than shrink.
- Tapping "Read Day 12" sets the existing planDayOffset; the hero, the commentary row and the Study sheet all follow to that day.
- Tapping "Move the plan to today" asks once, then rebases startedAt so today is the next uncompleted day. Completed days are untouched. Calling it twice is idempotent.
- "Not now" hides it for the rest of the day; it does not return until another day is skipped.
- Never shown on the day the plan started, and never on a finished plan.
- Rebase disallowed for a given plan (owner decision): button B is absent and only "Read Day 12" shows.

**Keep:**
- The existing day-back and day-forward chevrons on the hero. This line does not add a second day axis; it tells the reader why they would use the one that already exists.

**Change:**
- daysBehind becomes a value the screen can see: calcPlanDay(startedAt) minus completedDays.length, floored at 0. Today completedDays is written and never compared to the calendar day, which is why falling behind is invisible.
- The rebase reads dw_activeplans fresh from localStorage and touches only that plan's startedAt, never rebuilt from React state, or a second device's completed days are overwritten by stale mount-time state.
- The dismiss is a named button, not a bare x: a glyph under 44px with no word on it is a control only a developer recognises.

**Remove:**
- Nothing, and resist any temptation to add a badge, a count of missed days, a red dot, or a single word of apology copy.

### 8. Done, in place

**Purpose:** Confirm the reading without a modal wall and without a dead greyed button, and report the rhythm rather than performing a celebration.

**Order of elements:**
1. The Mark as read button becomes a filled, live done row
2. Second line: the honest weekly count, computed from the plan
3. One live action
4. DoneCelebration overlay, first completion of the day only, quiet, existing component

**Copy:**

| Element | Text |
|---|---|
| Done row, line 1 | Day 12 of 365 done. |
| Done row, line 2 (from the second read day) | Five of the last seven days. |
| Done row, after catch-up | Caught up. Day 12 of 365 done. |
| Live action | Open your journal |
| Day 1 | Day 1 of 365 done. |

**States:**
- First completion of the day: filled row plus the quiet overlay once.
- Repeat tap the same day: the row is already there, nothing fires again (dw_reading_done gate, unchanged).
- Next day: the row resets to "Mark as read".
- First read day: no weekly count line, a 1 is a worse cue than nothing.
- Missed: the row reports the day actually completed, not today's calendar date.
- Offline: completion writes locally and syncs later. No error, no spinner, no "try again".
- Plan finished: the finish celebration fires once and hands over to the Finished card.
- Milestone: suppressed on this path. The weekly count line carries the reward.

**Keep:**
- dw_reading_done as the once-a-day gate on the local date axis, and DoneCelebration as the calm confirmation with its existing length.
- The one-shot plan-finish celebration on the day itself.

**Change:**
- The completed state stops being a disabled button with muted text and becomes a filled row with a real action. Nothing greyed.
- "Five of the last seven days" is computed from the plan's own completedDays mapped through calcPlanDay's local-date axis, no new stored history, no new synced key, no UTC anywhere near a day boundary.
- The milestone banner does not fire for this persona. "Milestone Reached", "You've got a {n}-day streak!" and "Keep the momentum going. You're amazing." are three exclamation-marked lines and a flame in the wrong register for this reader, and the milestone lists in streak.ts and GreetingSection.tsx disagree with each other anyway. Because this PR already touches four other home screens for the Sermon Notes move, the preview will show that copy still live beside this path; it is named in the PR body as a pending cross-persona removal so the decision is made knowingly rather than by omission.

**Remove:**
- The disabled attribute and the muted foreground on the completed button.
- The milestone banner on this path only. It stays exactly as it is for every other persona in this build, and it is flagged in the PR body for a separate decision.

### 9. Plan finished

**Purpose:** The moment a long-haul reader crosses a line. Today it is a dead end that silently repeats the last chapter every morning forever.

**Order of elements:**
1. Eyebrow "Finished"
2. Head
3. One line
4. Three next steps
5. Browse all plans

**Copy:**

| Element | Text |
|---|---|
| Eyebrow | Finished |
| Head | You finished the New Testament in 90 Days. |
| Body | Ninety days, start to finish. Where do you want to go next? |
| Option 1 | Read it again |
| Option 2 | Through the Bible in a Year |
| Option 3 | Psalms & Proverbs |
| Link | Browse all plans |

**States:**
- Appears the morning after the last day is completed, in place of the plan reading.
- Stays until they start something; it is not dismissible by accident.
- While it is up, the hero serves the floor chapter, never a silent repeat of the last day, never an empty hero.
- Starting a plan from here replaces the card with that plan's Day 1 immediately.
- Multiple plans: the card names only the one that finished; other running plans are untouched.
- December: the year-long option carries the "Start on 1 January" second button.

**Keep:**
- The one-shot finish celebration on the day itself, behind its existing finishedCelebrated flag.

**Change:**
- Finished scripture plans stop producing a reading, so the last day cannot repeat. The finished flag is merged into the stored dw_activeplans record, never rebuilt from React state.

**Remove:**
- The clamped, endlessly-repeating final day.

### 10. Plans — Going deeper

**Purpose:** Let them change plan, resume, or add a second one without a developer and without a support message.

**Order of elements:**
1. Header and one line of context
2. Active plan pinned at top with its day count
3. The same three plans as day 0, in the same order
4. The rest of this persona's five
5. "All plans"

**Copy:**

| Element | Text |
|---|---|
| Header | Going deeper |
| Sub | Dated plans. Pick one and today's chapter opens on Home. |
| Active plan line | Day 12 of 365 |
| Behind line | You're on Day 15. Day 12 is still there. |
| Finished line | Finished 9 Sep |

**States:**
- Empty: no active plan, the three sit at the top under the sub line.
- First: tapping starts the plan and returns to Home with the chapter open.
- Returning: the active plan is pinned with its day count.
- Behind: the same two live choices as Home, read the waiting day, or move the plan to today, on their own row at full tap height.
- Done: a finished plan moves to a Finished line with its date; it never disappears silently.
- Offline: starting and switching plans works, dw_activeplans is a local write.

**Keep:**
- The whole catalogue as ruled: the "Foundations of Faith" rename and the merged comfort verse cards are the only catalogue changes that exist.
- The persona filter, five plans for this path, full catalogue reachable behind "All plans".

**Change:**
- The first three rows match the day-0 ask exactly, in the same order, so the two surfaces never disagree about what this app recommends. Both read from one shared constant in this build, so they cannot drift, and that constant is a file edit, not an owner-editable field, which is said plainly in the levers below.

**Remove:**
- No leaders featured row. No weekly-review-for-all. Both were explicitly rejected and neither belongs here or anywhere.

### 11. Notes — the study record

**Purpose:** By week two this is why they stay. It should read as a record of what they have been in, with no analytics laid over the top.

**Order of elements:**
1. Header "Notes"
2. Filter chips: All · Study · Prayer · Saved
3. Entries, newest first: chapter reference · date · text
4. New entry

**Copy:**

| Element | Text |
|---|---|
| Filter chip | Study |
| Empty state | Anything you write under a reading lands here, with the chapter it came from. |

**States:**
- Entries written from the hero carry the chapter reference automatically.
- Deletes are tombstones, never hard deletes; a second device cannot resurrect them, and applyCloudData must not overwrite the journal's jsonFields.
- Filter chips come from this persona's existing tag list.
- Offline: entries write locally and sync later.

**Keep:**
- The whole screen. The record is the reward; do not decorate it.

**Change:**
- Reflections captured from the hero on this path are auto-tagged "study", so the existing chip becomes useful with no new UI at all.

**Remove:**
- No weekly review card, no days-read tile, no "your week in the Word".

### 12. Reminders (More → Notifications)

**Purpose:** One nudge a day, at the hour they actually read, naming their own next chapter, in words that never trade on guilt.

**Order of elements:**
1. Title
2. The inferred-time offer, only after seven sessions
3. Manual hour picker
4. The contract line
5. Off switch

**Copy:**

| Element | Text |
|---|---|
| Title (existing key notifications) | Reminders |
| Inferred line | You mostly open this around 6:20 in the morning. |
| Primary | Remind me at 6:20am |
| Secondary | Pick a different time |
| On state | Reminding you at 6:20am. |
| On state actions | Change · Turn off |
| The contract line | One a day, at the time you pick. Never about a streak. |
| Notification, on schedule | Romans 8 |
| Notification body, on schedule | Day 34 of New Testament in 90 Days. |
| Notification, behind | Romans 5 is still waiting. |
| Notification, no plan | Your reading is ready. |
| Notification, after three ignored days (once, then back off) | Still here when you are. |
| Offline | This will apply when you're back online. |

**States:**
- First (under seven sessions): manual picker only, no inferred offer, no nudge to turn anything on.
- Returning: the on state with the hour named in plain words.
- Subscribed with a plan: names the reader's own chapter and day.
- Subscribed without a plan: the generic line, never a chapter the reader is not on.
- Behind: names the waiting chapter instead of today's. Never the gap, never a count.
- Backed off: three unopened sends leads to one "Still here when you are", then weekly until they open, then daily resumes.
- Push unsupported: the existing calendar-reminder fallback at the same hour, same copy.
- Missed / Done: the reminder surface never mentions a missed day.

**Keep:**
- The hourly cron, the per-subscriber preferred_hour, the two-hour catch-up window and the once-per-local-day ledger.
- The reminder hour picker and the calendar fallback branch, both already self-serve.

**Change:**
- push_subscriptions gains next_passage, next_label and last_opened_at, written by the client whenever the plan day advances. push-send uses them when present and falls back to the existing rotation when absent, today the body always names a global day-of-year passage unrelated to the reader's plan.
- The default offered hour is inferred from when they actually open, offered once after seven sessions, accepted in one tap.
- Spanish and Portuguese templates are added, today TEMPLATES defines en and id only and everything else falls back to English, so Futuros readers get English. Claude-drafted, Ashley signs off before a single phone gets one.

**Remove:**
- Nothing. No streak language exists in the templates today; the change is to put in writing that none is ever added.

## Comfort access

One quiet line at the foot of Home on this path, present every day, below everything else, never a badge, never a modal, never an interstitial: "Hard day? The comfort readings are here." It opens today's comfort reading as a sub-view over Home using useSubView alone and closes back to the same scroll position. It must not call saveSetup, must not write dw_setup, must not stamp a source, must not credit dw_reading_done and must not touch the streak. A bad day is not a path change, and only onboarding/settings/upgrade count as a real choice.

Inside it, the toolbar is Note and Close only. There is no graduation prompt, no "Feeling Stronger?", no return-path suggestion and nothing that asks a devout reader whether they are struggling. That prompt was removed for good and is never re-added in any form, in either direction. The existing route also stays: the path swatch is in the Home header for every persona and the sheet's comfort card is one tap from it, which is three doors and never a gate.

One limit worth naming to Ashley rather than designing around: a devout reader in grief usually will not re-declare himself, he will just stop opening the app, so the second door matters more than the first, and the Ask surface has to be able to hold a hard question without flinching. It can: the selection toolbar's Ask AI and the gold button both carry the chapter he is in as context.

## Reminders

One notification a day, at an hour they set or accept, naming their own next chapter, "Romans 8 · Day 34 of New Testament in 90 Days", because a generic day-of-year verse is an interruption to someone who knows exactly where they are. Today the server sends from a fixed forty-passage rotation with no plan field on the subscription, so it cannot name the right chapter; the client already persists today's plan passages, so carrying next_passage and next_label with the subscription is a small additive migration and two function edits.

When they are behind, the push names the waiting chapter instead of today's. When the server does not know the plan, it falls back to "Your reading is ready" rather than naming the wrong book. Nothing ever mentions a streak, a loss, a number at risk or a missed day, guilt-framed streak reminders drive notification opt-out and uninstall, and this is the persona most likely to have a legitimate reason for their two days off. That rule and the greeting change are the same rule: the app does not print a counter at this reader, on the phone or on the home screen.

Back-off is explicit: three unopened sends in a row triggers one "Still here when you are", then weekly until they open the app, at which point daily resumes. After seven sessions the Reminders card offers the hour they actually open, once, in one tap, with the manual picker still there for anyone who wants a different time. One line under the switch states the contract: "One a day, at the time you pick. Never about a streak." Spanish and Portuguese templates are missing entirely and are added in this work, Claude-drafted and Ashley-approved before they send.

Operational constraint, and it goes in the PR body: pushSupported() allowlists only futuresdailyword.com, www and localhost, so none of this can be proven on the deploy preview Ashley is looking at. It is verified on localhost before the PR and re-checked on prod after merge, and the preview is judged on layout and copy only.

## Instrumentation (events)

- path on every event: add it alongside campus in gaEvent's params and to the Supabase activity detail. Without this none of the below can be cut by persona, which is the entire point.
- reading_done, detail "<planId>|<dayNum>": fires only from Mark as read. Today daily_reading fires on expand, so nothing in the data distinguishes opening from reading. This becomes the only honest completion signal once handleRead stops crediting, and because that fix is cross-persona, the signal means the same thing on all five paths from the day it ships.
- daily_reading: keep, but assert in a test that it never fires from the arrival seed; the seed calls loadPassage directly and must never route through handleRead.
- study_open, detail "<chapterRef>|<firstTab>": how often the collapsed depth layer is actually wanted, and which chip opened it. The named test for this persona is session length and 30-day retention with the tools one tap deep versus open by default.
- study_tab, detail "commentary|compare|greek|xref": which tool earns its tab.
- commentary_source, detail "<sourceId>|curated|study-library|ai": the number that says whether the six named commentaries changed what this reader actually reads, and whether the curated twenty chapters are worth extending. The Home commentary card is untracked today.
- greek_hebrew: already fires on word tap but not on the mode toggle. Fire on toggle too, so reachability can be measured before and after the chip moves out of the plan-card header.
- paper_mode, detail "<chapterRef>": validates or kills the print-preference move.
- catchup_shown / catchup_read / catchup_rebase: the funnel for the grace mechanic. The number that matters is 30-day retention for readers who rebase versus readers who see the line and do nothing.
- plan_start, detail "<planId>|day0-card" vs "|plans-tab": proves the single day-0 ask converts better than today's three. plan_complete gains days_elapsed, so we finally learn the completion rate for a year-long plan.
- plan_finished / plan_started_after_finish: the pair that proves the Finished card ends a dead end rather than ending a habit.
- comfort_peek, detail "deeper_study": reach of the comfort line from this path, and confirmation it never changed the saved persona.
- reminder_set, detail "<hour>|inferred" or "<hour>|manual", plus push_unsubscribe: acceptance of the inferred hour, and opt-out rate as the tripwire on every word of reminder copy.
- offline_read, detail "<chapterRef>|<servedTranslation>": how often the offline fallback is doing the work, which decides whether caching the default translation is worth building.
- journal_save (exists): entries per reader per week is the honest week-two retention measure for this persona, better than any streak length, and now the only rhythm measure this path shows a reader at all.
- ai_prompt (exists): watch the rate if the Bible AI teaser is ever removed. If it holds or rises, the teaser was an ad; if it falls, a quieter entry goes back.
- One nightly rollup over the existing activity table: D1/D7/D30 by path, session length, completion rate, drawer-open rate, median seconds on passage with the sheet opened versus not, catch-up rebase rate and its retention delta. Every one of these is a persona-segmented cut of events that already have a pipeline, the work is the allowlist, the segment and the rollup, not new infrastructure.
- Caveat to record and never design around: behavior.ts stamps events with a UTC date, so an Australian reading at 8am local is filed to the previous day. dw_behavior_v1 dates must never carry a day-boundary claim; the plan and reading-day axis is local and stays local. A second caveat now that the greeting no longer prints it: recordStreakToday still runs and the streak record is unchanged, so nothing downstream of it breaks, the number simply stops being shown on this path, and any future decision about it can still be made from the data.

## Self-serve levers

- Campus study notes, no developer, no deploy, and no silent failure: a campus pastor publishes through the existing staff intake form. corner_add already accepts a typed item and CORNER_TYPES already includes "note", publishing to campus_content, and campus-content refuses direct POSTs and points at /staff, so the intake form is already the sanctioned authoring path. One additive change makes it land in the Study sheet: a nullable ref column on campus_content and an optional ref on the corner_add item. The ref is normalised through the parser this repo already ships (netlify/functions/lib/study-ref.js, canonicalBook, parseRef, formatRef) on the server, checked client-side before submit so a bad reference is refused instantly in the form's existing role="alert" paragraph above the save button, and echoed back on success, "It's on the campus corner. It shows on Genesis 12." A blank field is allowed and says so. Without that loop the lever is a defect: he types "Gen12" on a Sunday, it saves clean, no reader ever sees it, and his only recovery is messaging Ashley. Removing one is equally self-serve, corner_remove already deletes by id, scoped to the pastor's own campus, with the chapter named on the row.
- The intake form itself is data, not code: question_save, question_delete and question_reorder mean the questions a campus pastor answers can be added or reworded without a release. If Ashley wants campuses supplying weekly study notes, that is a new question row, not a build.
- Reader-level, no developer at all: reminder on/off and the reminder hour, translation, Compare translation, type size (shared between the panel and Paper mode), the Study sheet's remembered tab, path change through the sheet from three doors, campus through the header chip, and Restart on any plan from the Plans tab.
- Named honestly, not dressed up: the three day-0 plan ids and their one-line descriptions are NOT self-serve in this build. They ship as one shared constant plus i18n strings, a file edit that deploys on merge, read by both the day-0 ask and the Plans tab so the two surfaces cannot drift. Reordering or rewording the app's top three recommendations is therefore a PR, and that is stated rather than implied. Making it a per-campus row through the existing user-sync/Supabase layer with the trio as fallback is a small, separate build; it is in open decisions for Ashley to ask for, and it is not claimed here.
- File edits that deploy on merge, named honestly as such: src/data/commentary.ts (add a chapter key under any named source, the highest-value content lever, and it is a bundled module so the /books/* service-worker trap does not apply); the new src/data/study-chapters.ts floor-chapter rotation; the day-0 plan trio constant and its descriptions; persona-config's deeper_study block (sectionOrder, feature flags, featuredCategories, the AI system-prompt addition, the journal prompt bank and tag list, all plain data); src/utils/i18n.ts for every string above, with es/pt/id alongside; the inline Strong's dictionary in the strongs function; and src/data/plans.ts passages inside an existing plan id.
- Named honestly as NOT self-serve and not made to look otherwise: plan ids themselves (a new id is referenced in four places, personalization.ts, SetupPromptModal.tsx, PlansScreen.tsx, PastorStudyOnboarding.tsx, and all four must be rewired or the wizard starts a dead plan), the day-0 trio and its copy, persona sectionOrder, the milestone day lists (duplicated in two files with different values), push cadence, and adding a campus.

## Evidence

| Move | Source |
|---|---|
| Restoring the research document to the repo before the build, so every citation below can be checked | The judge verified docs/ holds only CHURCH-HOMEPAGE-CTA.md, PASTOR-LOGIN-HANDOFF.md, PASTOR-STUDY-PREACH-PLAN.md, PASTORS-SERMON-PREP-APP.md, audit-2026-08-25/, two session handoffs and comfort-translations-draft-2026-08-26.md, no PERSONA-RESEARCH file. The document itself is present in this session's scratchpad (RESEARCH.md, 23,128 bytes, 10 Sep 2026, identical twin persona-research.md), and its Persona 3 section at line 71 and cross-cutting section at line 156 carry the exact lines cited below, e.g. line 73, "89% of Bible users still prefer print; 55% use a smartphone, 42% a dedicated app", and line 84, "a 'read like paper' mode, larger type, no chrome." Build step 1 copies it to docs/PERSONA-RESEARCH-2026-09-10.md as the first commit on the branch, so the next reviewer and Ashley can check every research line at the preview rather than taking it on trust. |
| Collapse Commentary, Compare and Greek & Hebrew behind one named Study row on the passage | Research, Persona 3 journey: "Commentary, Compare and original languages collapse behind one Study tap (they are open by default today)." Needs section: "Text over commentary and low clutter: the recurring YouVersion complaint is it keeps adding functionality, it's getting so cluttered." Live: persona-config.ts:396 commentary "expanded". |
| Name the chips rather than hiding them behind one word, Commentary · Compare · Greek & Hebrew | Ashley's locked look is rich and editorial, and the last opening-screen change was reverted as "completely stripped". Naming each tool makes the depth MORE visible than today, where two of the three tools are in chrome and one is force-expanded. |
| One name for the tool, and a row that wraps rather than shrinks at 375px | Ruling: works at 375px with real tap targets, the SE and mini, not the 390px iPhone 14. Five chips plus a four-tab strip cannot hold 44px on one line at 375. The repo's own convention is explicit: minHeight: 44 on LibraryScreen.tsx:144, PlansScreen.tsx:385 and six controls in MoreScreen.tsx. "Gk/Heb" and "Greek & Hebrew" were two names for one thing in the earlier draft; the chip, the tab and the sheet now all say "Greek & Hebrew". |
| Put Greek & Hebrew where it can actually be reached | Verified: setGreekHebrewMode has exactly one persistent call site, HomeScreen.tsx:3235, inside a block that returns null at 3223-3225 when todaysPlanPassages.length === 0, so the persona's headline feature is unreachable without an active plan, while persona-config.ts:397 sets greekHebrew: 'full'. |
| Make the Study row true to the arrival promise | Verified: i18n.ts:915 path_arrival_study reads "You're in the study reading. Commentary is open below, with Compare and the original languages." The strip promises three things; the screen delivers one reliably. |
| Delete the hardcoded English Greek/Hebrew toggle | Verified: HomeScreen.tsx:3245 renders the literal strings "Greek/Hebrew ON" / "Tap for Greek/Hebrew" while the i18n'd twin already exists as gk_heb (i18n.ts:687) and hide_reading, and is already used in HighlightToolbar.tsx:179. |
| Give deeper_study a day-one floor chapter | Verified: heroChapterRefs falls back for comfort (HomeScreen.tsx:1303), new_to_faith (1306) and pastor_leader (1309) only, deeper_study has no branch, so with no plan and no slots this reader hits the "Choose your reading plan" funnel with no scripture on the screen. src/data/pastor.ts is the exact precedent and its own comment says it exists "the same way COMFORT_CHAPTERS does, so the home always opens on a reading." |
| Cap the floor panel on day 0 so the one plan ask is not under a chapter | Design principle 5 and the ChoosePathSheet ruling that a committing control must never sit under a scrolling list. Measured: at 375x812, header, greeting, arrival strip and hero plate consume roughly 400px, so a full-height Kindle-style panel plus Reflect and Mark as read puts the only control that starts a plan well past the first screen. Capping to about 12 lines with "Keep reading", and placing the ask directly under it in this state only, is the smallest change that keeps scripture first and the question findable. The cap exists only when refs.length === 0 and disappears the moment a plan starts. |
| One day-0 question with three dated plans, resolved in one tap | Research, Persona 3: "Day 0: choose a plan, two or three at most: chronological, whole-Bible-in-a-year, and a Futures series plan. Dated, resumable." Cross-cutting 2: "Don't know where to start is the universal barrier, and three-fifths of those who say it have followed Christ 20+ years." Ruling, project_daily_word_choose_your_path line 87: tapping a card must save AND open immediately, no separate CTA below the fold. Live: persona-config.ts:17 lists five ids and the wizard computes a six-plan category filter that does not match them. |
| Delete two of the three day-0 plan asks | Live: the hero funnel, the PastorStudyOnboarding !isPastor branch and the "No reading plan active" card all ask for a plan on the same screen. Only the !isPastor branches may be removed, PastorStudyOnboarding is shared with pastor_leader and that wizard stays whole. |
| Stop printing the same chapter twice | Verified: heroChapterRefs is built from todaysPlanPassages first (HomeScreen.tsx:1291-1297), the arrival seed expands it (1449-1456), and the plan_scripture block prints the same passage again behind a Read button (3221-3350), while isReadingOpen (1319-1328) collapses chapter and verse-range refs to the same chapter, so both render expanded. The scripture section already has a dedupe guard; the plan section does not. The hero's own slider and pills already carry every chapter of a multi-chapter day, so nothing is lost. |
| Wire the Study sheet to the real commentary library instead of an AI paragraph | Verified: src/utils/study.ts exists and exports fetchStudyPassage, fetchStudyCommentary, fetchTaggedChapter and fetchLexiconEntry, with six named public-domain commentaries in COMMENTARY_NAMES at lines 105-112 (Matthew Henry, Jamieson Fausset & Brown, Gill, Clarke, Calvin, Keil & Delitzsch). A repo-wide grep shows it is imported only by PrepSheet.tsx, GreekHebrewPopup.tsx, StudySourcesCard.tsx and api.ts, Home reads the roughly 20-chapter curated set in src/data/commentary.ts and falls back to a 30-day-cached AI Insight on most days of any long plan. |
| Keep commentary:'expanded' in persona-config and gate the Home card off a separate flag | Verified: HomeScreen.tsx:1462 reads `if (pf.commentary !== 'expanded') return;`, the AI prefetch that makes the sheet open instantly is gated on that exact value. Changing it to "preview" or "hidden" would silently kill the prefetch and open the sheet on a spinner. |
| Provenance under every commentary and an explicit label on the AI fallback | Research, Persona 5: "reviewers document AI tools fabricating cross-references on less-common passages" and "every commentary, cross-reference and lexicon result shows its source and licence inline." Applied here because this is the reader who checks. Ashley's standing rule: a name is not evidence. |
| Expanding a chapter stops crediting the plan day, on every path, not just this one | Verified: handleRead calls markPlanDayComplete at HomeScreen.tsx:754-755, while the comment at 713-716 four lines above states the settled intent, "Deliberate completion... Replaces auto-marking on open (focus-group: completion needs intent)", and handleMarkRead at 717-731 is the deliberate path. That comment is not persona-scoped, and handleRead is shared: congregation and pastor_leader are credited a day for expanding a passage too. Gating the fix would make "read" mean two different things inside one reading_done series, so it is removed for all personas in its own commit with its own test. |
| The arrival seed stays, and stays off handleRead | Ruling: the arrival-open seed for congregation/deeper_study/pastor_leader/comfort must be persona-gated and CREDIT-FREE, bypassing handleRead. Verified live and correct at HomeScreen.tsx:1441-1456, with the code comment naming the exact reason. This design does not touch it. |
| The greeting stops printing a number, because the number is not the reading day | Verified: GreetingSection.tsx:9-10 passes streakCount into getGreeting, and persona-config.ts:242-245 returns `Good ${tod}, ${first}. Day ${streak}.` when streak > 1 (the same branch in es at :132-135, pt at :169-172, id at :206-209). streakCount comes from recordStreakToday, called unconditionally on every mount at HomeScreen.tsx:786-795, so it counts app opens. Two legitimate days off reset it to 1 while the plan line reads Day 15, and the streak === 1 branch at persona-config.ts:114-120 then prints streak_reset_best, "Day 1 — your longest run is {best} days" (i18n.ts:425), on precisely that morning. Three different day numbers on one screen, one of them a reset, that is the shame cue this path bans, produced by arithmetic. The fix is four one-line branch edits plus adding deeper_study to the :114 exclusion beside new_to_faith and comfort; the streak is still recorded, and the other four personas' greetings are byte-identical. |
| The catch-up line, driven by the existing day offset | Research, Persona 3: "a reset without shame"; cross-cutting 3: "Busyness is the #1 reason reading declines (40-58%)." Verified: calcPlanDay is calendar-elapsed and clamped, so a missed day's passage leaves Home permanently; completedDays is written but never compared to the calendar day, so nothing anywhere knows the reader is behind; planDayOffset and its chevrons already exist and reset nightly. |
| The catch-up choices get their own row, and the dismiss gets a name | Ruling: mobile tap targets and no hidden affordances. Two inline text buttons plus a bare x in one text line at 375px puts three targets under 44px in a sentence; the repo's own minHeight: 44 convention (LibraryScreen.tsx:144, PlansScreen.tsx:385, MoreScreen.tsx:374 and five more) is the standard being met, and "Not now" says what x only implies. |
| "Move the plan to today" merges into localStorage and touches only startedAt | Ruling: never rebuild a synced dw_* record from React state, merge into what is currently in localStorage and touch only your own fields, or a second device's cloud progress gets overwritten by stale mount-time state. |
| The plan-finished card, and stopping the endless repeat | Verified: the plan day clamps at plan.totalDays (HomeScreen.tsx:885) so the last chapter is served every morning forever, while the finish celebration is one-shot behind finishedCelebrated (704-708, 726). |
| Rotate the reflection question from a per-persona bank | Verified: persona-config.ts:418 sets deeper_study journal.prompts to an empty array while congregation, pastor_leader and comfort have banks; the day-indexed rotation mechanism already exists in PastoralReflectionSection; the hero currently passes the same reflect_prompt_default every day. |
| Reflect & Respond stays under the lesson text, before Mark Complete | Ruling, project_daily_word_journey_questions: questions are part of the lesson, positioned directly under the lesson text, before Mark Complete, not at the foot below the chapter. The hero already places InlineReflection there and it stays there on every day a plan is running. The single exception is the no-plan day-0 screen, where the plan ask sits between the capped reading and Reflect; Reflect still precedes Mark as read, and the exception dies the moment a plan exists. |
| Paper mode, larger type, no chrome, opt-in only, and Close never fades | Research, Persona 3: "Print: a read like paper mode, larger type, no chrome, given 89% still prefer print"; "Who" (RESEARCH.md:73): "89% of Bible users still prefer print; 55% use a smartphone, 42% a dedicated app." It reaches the locked white paper panel at full size; it is never the default and never the opening screen. The pinned Close is the ruling on hidden affordances: this app is installed to the iOS home screen, where there is no browser chrome and no back gesture, so a faded Close is a reader with no visible way out of a full-bleed page. |
| No guilt copy, no flame, no exclamation marks on this path, and the rest named in the PR | Research, cross-cutting 6: "Streaks work until they shame. Guilt-framed streak reminders drive notification opt-out and uninstall." Verified live copy that fails this: GreetingSection.tsx:53 "Milestone Reached", :62 "You've got a {streakCount}-day streak!", :70 "Keep the momentum going. You're amazing." The persona gate is the scope of this build, but the same PR already edits four other home screens for the Sermon Notes move, so the preview shows that copy still live, it goes in the PR body as a pending cross-persona removal, decided knowingly rather than settled by silence. |
| Count only readings, not app opens | Verified: HomeScreen.tsx:786-795 calls recordStreakToday() unconditionally on every mount, so the number in the greeting counts opens, not readings. For a persona whose identity is "I read", a counter that measures opens is not their number, which is why the done row reports plan days completed and the greeting on this path prints no number at all. |
| "Five of the last seven days" computed from existing data, with no new synced key | Ruling, DATE-AXIS: plan/reading day logic must use local date (toLocaleDateString('en-CA')) matching calcPlanDay's local midnight, never UTC toISOString. Computing from the plan's own completedDays through that axis adds no synced storage and so cannot resurrect, clobber or overwrite anything. |
| Campus notes validate, refuse and echo through machinery this repo already has | Verified: netlify/functions/lib/study-ref.js exports canonicalBook, parseRef and formatRef with an ALIASES map (so "Gen 12", "1 Cor 3" and "Psalm 23" all resolve) and chapterCount for range checks; src/data/bible-books.ts carries BIBLE_BOOKS and BOOK_CHAPTERS for the client-side check. The form is already built for refusals: src/staff/StaffApp.tsx:591 is noValidate, :541 comments that the browser bubble "is silent on iOS and easy to miss on a long page", fail() sets formError, and :685 renders it with role="alert" directly above the save button, scrolled into view by errorRef (:447, :451). corner_add's sanitiser is at intake-core.js:295-304 with CORNER_TYPES at :40. Nothing new is invented; the ref field uses the path a refused save already takes. |
| The day-0 trio is a file edit, and is called one | Ruling: self-serve over developer levers, but the honest version of that rule is that a lever is named for what it is. A per-campus editable row is a real build (a served-and-cached config row, a fallback, an admin field and a cache-invalidation path); claiming it while shipping a constant would be worse than shipping the constant. Both surfaces read one shared constant so they cannot disagree, the limitation is written into the levers, and the owner-editable version sits in open decisions for Ashley to call. |
| The reminder names the reader's own chapter | Live: push-send.js picks from a global day-of-year rotation, and push_subscriptions carries only endpoint, timezone, preferred_hour, active and lang, there is no plan field, so the body cannot name the reader's chapter. The client already persists today's plan passages. Research, cross-cutting 6: one nudge a day, timed to the person. |
| Reminder at the inferred hour, offered once after seven sessions, never guilt-framed | Research, Persona 2 journey: "after 5-7 sessions, infer the time they actually open and nudge then, once a day, neutral wording. Never your streak is about to die." |
| Spanish and Portuguese notification templates | Live: push-send.js defines TEMPLATES for en and id only and getTemplate falls back to en, Futuros readers get English. Ruling: translated content is Claude-drafted and Ashley approves before ship. |
| A persistent comfort tap on this path that does not change the saved persona | Research, Persona 6 journey: "From every path: a persistent one-tap I need comfort now that opens comfort without switching the saved path. Crisis is not a persona someone chooses on a good day." Build order 2: "Comfort from everywhere... smallest build, highest duty of care." Rulings: comfortMode toolbar is Note+Close ONLY; the "Feeling Stronger?" graduation prompt is removed for good; saveSetup gates on source!=='default'. |
| Sermon Notes row moves below the reading | Ruling: Sermon Notes is demoted below the reading for congregation/deeper_study/pastor_leader/comfort; I'm New keeps it above only in the Sunday window. Verified live-broken: HomeScreen.tsx:2105-2106 renders {sermonNotesRow} with the comment "just below the greeting, always visible" for every persona. isSundayWindow() already exists. choose-path.test.ts:70-72 only requires the row to come after PathArrivalStrip, so moving it further down keeps that test green. |
| The Study sheet and Paper mode use useSubView alone, mounted with a live open prop | Rulings, 28-agent review findings 1 and 2: a full-screen host that opens overlays must use useSubView ALONE, not with useModalA11y/aria-modal, or nested focus traps break keyboard and back-button navigation; and a subview-driven card must stay MOUNTED with a live open prop, not be conditionally mounted, or it orphans a history entry per close and breaks Android back. useSubView exists at src/utils/useSubView.ts and ChoosePathSheet.test.tsx already pins the mounted-while-closed pattern to copy. |
| New CSS uses the dw-study-* prefix | Ruling: use unused CSS class prefixes for new components, dw-path-* was already taken by the Plans-tab Superdesign chooser and the path sheet uses dw-cp-*. |
| If HomeScreen is ever re-extracted as part of this, the ten src/sections/* files and their tests come back with it | Ruling, feedback_daily_word_today_rebuild_rejected line 12. This is the trap that bit last time; src/sections/GreetingSection.tsx and its siblings are live today. |
| No weekly-review card, no leaders featured row, no new catalogue entries | Ruling, owner decision 8: weekly-review-for-all and a leaders featured row were explicitly rejected; the only catalogue changes are the Foundations of Faith rename and the merged comfort verse cards. Verified: persona-config.ts:402 already sets weeklyReview: false for this persona. |
| No plan id is created, renamed or rewired in this work | Ruling: a plan id is referenced in four places (personalization.ts, SetupPromptModal.tsx, PlansScreen.tsx, PastorStudyOnboarding.tsx) and all four must be rewired or the wizard starts a dead plan. All three day-0 plans are already in this persona's five. |
| Sermon frameworks and translations are not touched, and NLT is not reintroduced | Rulings: frameworks are 4D and H.E.A.T. only, never invent others; NLT is removed everywhere for want of an API key and never returns as a default. |
| The whole reshape ships behind a deploy preview Ashley approves first | Ruling, feedback_daily_word_today_rebuild_rejected lines 10-11 and the PR #81 note: never re-merge or ship a big IA/visual rebuild of the opening screen without his preview and explicit approval; a PR may sit open awaiting his deploy-preview look and must not be merged without his word. |

## Open decisions

- The floor-chapter list, roughly thirty chapters for a reader who wants depth, in the shape of PASTOR_CHAPTERS. Ashley's pick, or Claude drafts a list and he strikes what he does not want. Nothing ships until he has seen it, because it becomes the first screen a plan-less study reader ever sees.
- The seven reflection questions. Drafted plain and direct, no jargon. Approve the wording, replace the bank, or say he would rather keep one fixed question, the rotation mechanism costs nothing either way.
- The three day-0 plans and their order. Proposed: Through the Bible in a Year, New Testament in 90 Days, Psalms & Proverbs, all three already in this persona's five, so nothing new enters the catalogue. Confirm or reorder. Chronological is the plan the research names first and the catalogue does not have one; adding it means a new plan id and four rewires, so it is deliberately out of this build unless Ashley wants it.
- Whether those three plans and their descriptions become a per-campus row editable from the admin dashboard, rather than a file edit. It is a small separate build, a served-and-cached config row with the constant as fallback, and it is deliberately not claimed as self-serve in this one. Say the word and it gets scoped on its own.
- Once the six named commentaries are wired in, does AI Insight stay as the last-resort tab for chapters with no published note, or is it dropped on this path? It is labelled honestly either way; the question is whether Ashley wants an AI paragraph next to Calvin.
- Whether the provenance line shows the licence ("public domain") to readers, or only the source name.
- Is "Move the plan to today" allowed on Through the Bible in a Year, or must a year plan stay calendar-true? Rebasing is the grace mechanic, but it means the reader finishes the Bible in 365 reading days rather than 365 calendar days. The recommendation is yes, allow it, and say so in the copy, but it is a plan-integrity call, not a design one.
- The flame and "You're amazing" stay live on the other four paths in this build. This PR already touches those four home screens for the Sermon Notes move, so the preview will show that copy beside a path that has none of it. Removing it everywhere is a one-line list change in its own commit, say yes on the preview and it goes in, or leave it and it stays exactly as it is.
- The same duplicate-chapter redundancy exists for pastor_leader, which also renders plan_scripture over the same hero chapters. Fix it there in this pass, or leave the pastor home alone until Ashley has seen this one?
- The Bible AI teaser card on Home. It self-hides after one AI use, so it is effectively an ad, remove it, or leave it and watch the ai_prompt rate first? Held out of the build until Ashley says, because it is a removal from the opening screen.
- "Read with" one person, a single reading partner, both seeing a day count and nothing else. The research names it as the one social feature the Pew decline argues for and lists the decision as Ashley's. It is not in this build either way; it needs his word before it is designed.
- The preview approval itself. One branch, one deploy-preview link, Ashley's eyes on the deeper_study home AND on all five personas for the Sermon Notes move and the greeting change, before anything merges.

## Risks

- This is a big IA reshape of the opening screen for one persona, which is the exact class of change reverted on 1 September as "completely stripped". It must not merge without Ashley's word on a deploy preview. The countermeasure is structural, not rhetorical: three things leave the surface, a duplicate printing of a chapter already open, a scattered chip deck, and a hardcoded English string, and everything they contained comes back named. Commentary keeps a visible named row on Home. Compare and Greek & Hebrew go from chrome and an unreachable header to labelled chips on the passage. The photo plate, the paper panel, the Georgia serif, the chevrons and the editorial chrome all stay. Say that out loud on the preview, and if it still reads thin, the fix is more warmth on the panel, not putting the chip deck back on top.
- The day-0 cap is the one place this design shortens a reading, and "shorter" is the word that got the last version reverted. Guard it three ways: it exists only when there is no plan and no reading slot, "Keep reading" is directly under it and un-caps in one tap, and it disappears permanently the moment a plan starts. Look at that screen specifically on the preview at 375px, if the capped panel reads mean rather than considered, take more off the ask block, not off the chapter.
- Dropping the number from the greeting will look like a removal on the preview, because it is one. It is also the difference between three day numbers on one screen and one. Check it on a seeded reader who is two days behind: greeting with no number, plan line on Day 15, catch-up line naming Day 12, and confirm the other four personas' greetings are byte-identical to main, since getGreeting is shared and one careless edit changes everyone's.
- The Sermon Notes demotion touches all five paths from one line of code. It is Ashley's own ruling, but it will be the most visible difference on four home screens, so it needs its own look on the preview rather than being folded in silently.
- Removing the plan-day credit from handleRead is now cross-persona by decision, so completion numbers drop on every path the week it ships. That drop is the fix working, not a regression, but it must be written into the PR description or it will be read as a bug in a fortnight. It belongs in its own commit with its own test, covering all five personas, so it can be reverted alone.
- The Study sheet and Paper mode are nested overlays over a screen that already hosts BibleAI and the note drawer. useSubView alone, no useModalA11y, no aria-modal, and mounted with a live open prop rather than conditionally, or Android back and the keyboard path break in ways that only show up on a phone. Paper mode carries the extra rule that Close is pinned, because on an installed iOS PWA the back gesture is not there to save anyone.
- Leaving 'plan_scripture' in sectionOrder is load-bearing in two places: the generic "Choose Your Plan" button gates on its absence, and PastorStudyOnboarding mounts on its presence. Remove the key and both regress.
- PastorStudyOnboarding is shared with pastor_leader. Only the !isPastor branches may be removed; the pastor wizard stays whole and is walked end to end before merge.
- The finished-plan change alters todaysPlanPassages, which is also written to dw_todays_plan_passages for the Study Notes tab and drives heroChapterRefs, the commentary list and the audio chain. Every one of those needs a live check, not just a green build.
- Never rebuild dw_activeplans or any dw_* record from React state when writing the finished flag or rebasing startedAt, merge into what is in localStorage and touch only that field, or a second device's progress is overwritten by stale mount-time state. Deletes stay tombstones; applyCloudData must not overwrite the journal; applyMisc stays fill-only.
- The campus-note ref check must refuse the unrecognisable without refusing the legitimate. canonicalBook's alias map covers the ordinary forms, but test the awkward ones before merge, "Psalm 23" singular, "1 Cor 3", "Song of Songs", "Revelations", and if one of those refuses a real pastor's real note, widen the alias map rather than dropping the check. A refusal he cannot decode is the same defect as a silent save, wearing a different face.
- Push cannot be verified on the deploy preview, pushSupported allowlists futuresdailyword.com, www and localhost only. Verify on localhost before the PR and on prod after merge, say so in the PR so the preview is not judged on it, and never report it as tested from the preview.
- Adding i18n keys without the Spanish, Portuguese and Indonesian rows leaves t() returning the raw key on screen for Futuros readers. Every new key ships with all four languages in the same commit, and that includes the four greeting branches, which are edited in all four languages or the number survives in three of them.
- Extending commentary coverage is the highest-value content lever but it is real writing work: eight sources over the same twenty chapters today. Wiring the six public-domain commentaries closes most of that gap, but where they have nothing the honesty line will be on screen, that is still better than an unlabelled AI paragraph, and Ashley should decide it knowingly.
- No /books/* or /bible/* content change is needed for this work. If any lands alongside it, /books/* stays network-first with cache as offline fallback only, and CACHE_NAME, STATIC_CACHE and SW_VERSION are bumped together. Never reuse a bundled image filename for new content, rename and update the preload link.
- Home already carries hardcoded English beyond the toggle being removed ("ADDITIONAL READING", "TODAY'S CHAPTERS", "Share", "Add"). Fixing them is a separate small pass; do not let it expand this one.
- The research document is restored to docs/ as the first commit on the branch from the copy held in this session's scratchpad. If that commit is skipped, every research citation in this design becomes uncheckable again and the next reviewer is back to trusting a name, which is the one thing this app's owner has ruled out.

## Build steps

| Step | Files | Check |
|---|---|---|
| Open the preview branch and the gate first, and restore the research document as the first commit, so nothing can merge by momentum and every citation can be checked. | branch study/home-2026-09 off main; docs/PERSONA-RESEARCH-2026-09-10.md restored from the session scratchpad copy (/private/tmp/claude-501/-Users-ashleymarkevans/f2165489-76e2-473f-94a8-8b0fd9a92fc2/scratchpad/RESEARCH.md) as commit 1; PR opened, not merged; PR body lists the persona-gated blast radius, the CROSS-PERSONA handleRead change, the expected completion-rate drop on all five paths, the greeting-number removal, the five personas to look at, the flame and "You're amazing" still live on four paths as a pending decision, and the note that push cannot be verified on a preview | docs/PERSONA-RESEARCH-2026-09-10.md is on the branch and its Persona 3 and cross-cutting sections match the lines cited in the design. PR exists with a passing deploy-preview build; no squash-merge until he replies. npm run build and npx vitest run clean at every step below. |
| Day-one floor: a rotating study chapter so a plan-less reader never lands on a funnel. | NEW src/data/study-chapters.ts (~30 refs, shaped exactly like src/data/pastor.ts:8); src/screens/HomeScreen.tsx heroChapterRefs memo (1302-1315), add the deeper_study branch beside the pastor one; NEW src/screens/home-study-floor.test.ts mirroring home-pastor-floor.test.ts | npx vitest run src/screens/home-study-floor.test.ts, the floor never serves over a real plan passage or reading slot. Preview with dw_setup={persona:'deeper_study',source:'settings'}, no dw_activeplans, no dw_reading_slots: the hero shows a chapter open in the paper panel, not "Choose your reading plan". |
| Sermon Notes demotion, per ruling: render below the reading for the four returning personas, above only for new_to_faith inside the Sunday window. | src/screens/HomeScreen.tsx:2106 (render position; the definition at 1786-1831 is unchanged); src/utils/sunday.ts (isSundayWindow, existing); assert the order in home-study-floor.test.ts | npx vitest run, choose-path.test.ts stays green (it only requires the row after PathArrivalStrip). In the rendered DOM the sermon-notes banner appears after the hero reading panel for deeper_study, congregation, pastor_leader and comfort, and before it for new_to_faith on a Sunday. Walk all five personas on the preview. |
| Add a studySheet feature flag and gate the Home commentary card to a one-line named row, leaving commentary:'expanded' in place so the 30-day AI prefetch keeps running. | src/utils/persona-config.ts:395-410 (deeper_study features, add studySheet); src/screens/HomeScreen.tsx commentary block (~3355-3415), the named row; leave the prefetch effect at 1461-1472 untouched | npx tsc -b clean. Preview: Home shows a one-line "Commentary — Matthew Henry ›" row for deeper_study, pastor_leader still shows its full card, and the AI prefetch still fires (network tab shows the claude function call on a chapter outside the curated twenty). |
| Build the Study sheet: four live tabs named in full and sourced from the real study library, provenance under every entry, campus notes pinned above public-domain sources, and an "Ask about this chapter" footer into BibleAI with this persona's scholarly prompt addition. useSubView alone; mounted always with a live open prop; dw-study-* prefix. | NEW src/components/StudySheet.tsx; NEW src/components/StudySheet.test.tsx; src/utils/study.ts (consume fetchStudyPassage, fetchStudyCommentary, fetchTaggedChapter, fetchLexiconEntry, COMMENTARY_NAMES); src/screens/HomeScreen.tsx (mount beside the other overlays); src/utils/i18n.ts (new keys, en/es/pt/id); src/index.css (dw-study-* only) | npx vitest run StudySheet.test.tsx, it paints nothing while closed, mirroring ChoosePathSheet.test.tsx. At 375px the four tabs sit in two rows of two, each 44px or taller, with no horizontal scroll; at 390px and above they are one row. The third tab reads "Greek & Hebrew" in full. On a phone, the Android back gesture closes the sheet once and leaves no orphan history entry; a second back leaves Home. On a chapter outside the curated twenty (Genesis 12), the Commentary tab shows named public-domain commentators, not an AI paragraph. grep the new component for useModalA11y and aria-modal: zero hits. |
| Reduce the control deck to one named Study row: Listen · Commentary · Compare · Greek & Hebrew · Paper. Move the translation chips, the Compare chip and the compare-translation chip row into the sheet, move the Greek & Hebrew toggle out of the plan-card header, and delete the hardcoded English strings. | src/screens/HomeScreen.tsx: footer control row and translation chips (~2488-2600), Compare (~2603-2624), compare chips (~2727-2757), Greek/Hebrew toggle (3233-3247, deleted); src/utils/i18n.ts (gk_heb and hide_reading already exist; the row label uses the full name in all four languages) | npm run build clean; grep -R 'Tap for Greek/Hebrew' src/ returns nothing, and grep -R 'Gk/Heb' src/ returns nothing. At 375px the row wraps to two lines with every chip 44px or taller and the body never scrolls horizontally; at 390px check it again. With NO active plan, tap Greek & Hebrew and then a word, the Greek popup opens and Go deeper reaches the AI. That path is impossible on main today. |
| Dedupe the plan section against the hero: render only passages not already in heroChapterRefs, render nothing when the filter empties, retitle the survivor "ALSO TODAY". | src/screens/HomeScreen.tsx plan_scripture gate (3222-3350), mirroring the existing dedupe at ~3443-3450; src/utils/i18n.ts (also_today, four languages); NEW src/screens/home-duplicate.test.tsx | npx vitest run, with an active plan, exactly one ScripturePassage renders for the day's chapter. Preview a one-chapter-a-day plan: the chapter appears once. Preview a three-chapter day: hero pills show all three, the counter reads "Chapter 1 of 3", ALSO TODAY carries only the remainder. |
| One completion path, on every path: remove the plan-day credit from handleRead for all five personas. Own commit, own test, own line in the PR body. | src/screens/HomeScreen.tsx:733-756 (remove the markPlanDayComplete call at 754-755 and its plan-finish branch; keep trackBehavior/track); handleMarkRead at 717-731 unchanged; NEW src/screens/home-completion.test.ts pinning the call sites for deeper_study, congregation AND pastor_leader, and pinning that the arrival seed does not route through handleRead | npx vitest run home-completion.test.ts, expanding a plan passage leaves completedDays unchanged on every persona tested; Mark as read adds exactly one day; a second Mark as read the same day is a no-op. Preview as deeper_study and again as congregation: expand a chapter, reload, the Plans tab day is unchanged; Mark as read advances it by exactly one. |
| Take the number out of the greeting on this path, rebuild the completed state as a filled live row, and suppress the milestone banner here only. | src/utils/persona-config.ts:242-245 (en), :132-135 (es), :169-172 (pt), :206-209 (id), deeper_study returns the name-only greeting; :114-120, add deeper_study to the streak-reset exclusion beside new_to_faith and comfort; src/screens/HomeScreen.tsx (the done button, ~2701-2716; calcPlanDay at 124-140 reused as-is); src/sections/GreetingSection.tsx (suppress the milestone banner for deeper_study only); src/utils/i18n.ts; NEW assertion in home-study-floor.test.ts | npx vitest run, getGreeting('deeper_study', 'Ashley', 34) returns no digits in any of the four languages, and getGreeting for congregation, pastor_leader, new_to_faith and comfort is byte-identical to main at streak 1, 2, 8 and 34. On the preview, a reader seeded two days behind shows: greeting with no number, plan line "Day 15 of 365", catch-up line naming Day 12, three lines, one number. After Mark as read, no element in the panel carries disabled or a muted foreground; with 5 of the last 7 plan days complete the second line reads "Five of the last seven days."; crossing local midnight resets the row. No flame and no exclamation mark renders for this persona. |
| Catch-up: compute daysBehind, render the line under the hero date strip with its two choices on their own full-height row, and add "Move the plan to today" as a merge-into-localStorage rebase. | NEW src/utils/planCatchUp.ts; NEW src/utils/planCatchUp.test.ts; src/screens/HomeScreen.tsx (the line, wired to the existing planDayOffset); src/utils/i18n.ts (four languages, including "Not now") | npx vitest run planCatchUp.test.ts, a plan started 12 days ago with 9 completed days reports 3 behind and names the earliest; rebase sets startedAt so calcPlanDay returns the next uncompleted day and completedDays is untouched; rebase twice is idempotent; the rebase reads dw_activeplans fresh and touches only startedAt. Preview at 375px: seed startedAt five days back with completedDays [1,2], the line reads "You're on Day 5. Day 3 is still there.", the two buttons and "Not now" sit on their own row at 44px or taller with no x anywhere, the button opens Day 3 with the tools following, and "Not now" hides it for the day. |
| Replace the day-0 triple ask with one question and three plans, sitting under a capped floor reading. Delete the deeper_study wizard branches and suppress the "No reading plan active" card. | src/screens/HomeScreen.tsx (no-plan hero ~2208-2240; the no-plan panel cap and "Keep reading" expander; empty-card gate ~3512-3531); NEW shared day-0 trio constant read by both HomeScreen and PlansScreen; src/components/PastorStudyOnboarding.tsx (remove the !isPastor path only); src/utils/i18n.ts. Leave "plan_scripture" in persona-config sectionOrder and leave the "Choose Your Plan" gate alone | A cold device at 375x812 with dw_setup={persona:'deeper_study',source:'settings'} and no dw_activeplans shows a chapter open, capped, AND all three plan rows without scrolling, measure it, do not eyeball it at 390. "Keep reading" un-caps the panel and the ask is still below it. Tapping a row writes dw_activeplans, expands Day 1 uncapped, and never caps again. The Plans tab's first three rows are the same ids in the same order, read from the same constant. The pastor wizard still runs end to end for pastor_leader. From 10 December the year-long row carries the second "Start on 1 January" button. |
| Plan finished: drop finished scripture plans out of todaysPlanPassages so the last day cannot repeat, and render the Finished card in its place. | src/screens/HomeScreen.tsx (todaysPlanPassages ~866-904; the clamp at 885; the Finished card); src/utils/i18n.ts (four languages) | Seed a completed plan, the Finished card appears, the hero serves the floor chapter rather than the last chapter again, and starting a plan from the card replaces it with that plan's Day 1. dw_activeplans is merged, never rebuilt from state. Live-check the Study Notes tab, the commentary list and the audio chain, all of which read todaysPlanPassages. |
| Rotating reflection bank, auto-tagged to the study record. | src/utils/persona-config.ts:415-419 (journal.prompts, a list of i18n keys); src/utils/i18n.ts (study_reflect_1..7 in en/es/pt/id); src/screens/HomeScreen.tsx (hero InlineReflection prompt picks by day index, falling back to reflect_prompt_default; tag hero captures 'study') | npx vitest run persona-config tests. Preview two consecutive day offsets: two different questions, and a saved entry lands in Notes with its chapter reference and shows under the Study filter chip. Confirm Reflect still renders under the reading and before Mark as read on a plan day, and under the ask on the no-plan day. |
| Paper mode, chapter text full bleed on the ivory canvas, chapter reference and Close pinned for the whole session, A−/A+ fading after three seconds, sharing scriptureFontSize. useSubView alone, mounted with a live open prop. | NEW src/components/PaperMode.tsx; src/screens/HomeScreen.tsx (mount with the overlays; pass readRef, readText, scriptureFontSize) | Open it on an installed iOS home-screen PWA, wait ten seconds without touching the screen: the chapter reference and Close are still visible; A− and A+ have faded and a tap brings them back. Close returns to the same scroll position on Home, and so does the Android back gesture. The size chosen persists across a reload and matches the panel. No greeting, plan line, tab bar or completion button renders inside it. |
| Comfort line at the foot of Home for this path, opening the comfort reading as a sub-view that touches nothing. | src/screens/HomeScreen.tsx (foot of the persona render); reuse src/components/ComfortSection.tsx; src/utils/i18n.ts | After opening and closing it, dw_setup is byte-identical, dw_reading_done is unwritten, the streak record is unchanged, and no dw_path_asked write occurred. The toolbar inside is Note and Close only. No graduation prompt exists anywhere in the flow. |
| Campus study notes, the pastor's self-serve lever, with the refusal and the echo that make it one. Nullable ref on campus_content, optional validated ref on the corner_add item, and the Study sheet reads campus notes for the open chapter. | NEW supabase migration, additive and nullable, kept IN THE REPO (campus_content.ref); netlify/functions/lib/intake-core.js (corner_add item ref at :295-304, normalised through lib/study-ref.js canonicalBook/parseRef/formatRef, rejected with a message when it does not resolve); netlify/functions/campus-content.js (return ref); src/staff/StaffApp.tsx (the chapter field, the pre-submit check against src/data/bible-books.ts BIBLE_BOOKS/BOOK_CHAPTERS routed through the existing fail() to formError to role="alert" paragraph at :685, and the extended success line); src/components/StudySheet.tsx | Publish a note on Genesis 12 through /staff as a campus user; the confirmation reads "It's on the campus corner. It shows on Genesis 12.", it appears in that campus's deeper_study Study sheet and in no other campus. Type "Gen 12", "Genesis12" and "1 Cor 3", all three save and echo the canonical reference. Type "Genesis 51" and "sermon on grace", both are refused before the save, the message appears in the existing alert paragraph above the button and is scrolled into view, and the typed answers are still in the fields. Leave the field blank, it saves and the confirmation says it is not attached to a chapter. corner_remove still deletes it, scoped to that campus, with the chapter on the row. npx vitest run intake-core tests stays green. |
| Instrumentation: extend the tracked-event allowlist, add path to every GA4 event, fire at the new call sites, and segment the dashboard by persona. | src/utils/analytics.ts (params ~22-28, TRACKED_EVENTS ~30-37); call sites in HomeScreen.tsx, StudySheet.tsx, PaperMode.tsx, MoreScreen.tsx; netlify/functions/analytics-dashboard.js; src/components/AnalyticsDashboard.tsx | In preview, walk one full loop, arrival, Study row, each tab, Paper, Reflect, Mark as read, catch-up, and confirm one POST to track-activity per action with the expected type and detail, one gtag event carrying path='deeper_study', and reading_done firing once and only from Mark as read. The dashboard shows D7 and D30 split by persona. |
| Reminders: carry the reader's plan with the subscription, add the back-off, add es and pt templates, and offer the inferred hour once after seven sessions. | NEW supabase migration IN THE REPO adding push_subscriptions.next_passage, next_label, last_opened_at (additive, nullable); src/utils/push.ts; netlify/functions/push-subscribe.js; netlify/functions/push-send.js (prefer the stored ref over the global rotation; add es/pt TEMPLATES and verse snippets); src/screens/MoreScreen.tsx (~643-720); src/utils/i18n.ts | On localhost ONLY, pushSupported allowlists prod, www and localhost, never a deploy preview. Subscribe with a plan active, force a send: the body reads "Romans 8 — Day 34 of New Testament in 90 Days." With no plan it reads "Your reading is ready", never a wrong chapter. Send one test per language and read every body before it goes near a congregation; Ashley signs off the es and pt copy first. Re-verify once on prod after merge. |
| Adversarial pre-deploy review on data loss and sync, then hand over the preview link and stop. | the branch; the PR body; no docs written to the repo beyond the restored research document | Deploy preview loads at 375px and 390px with dw_setup={persona:'deeper_study',source:'settings'}, dw_profile, dw_cookie_consent='accepted', dw_v7_pathway_done='true', with and without an active plan: chapter renders once, the day-0 ask is fully on the first screen, the Study row is present at 44px or taller and every chip reaches its tab, the greeting carries no number and the plan line carries one, the catch-up line is correct when behind with its own button row, Paper mode's Close never disappears, and Sermon Notes sits below the reading on all four returning personas. Merged only after Ashley says yes to the preview; then poll the prod deploy to ready and verify the live artifact. |
