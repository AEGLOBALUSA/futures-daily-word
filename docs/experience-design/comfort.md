# Comfort path, final design (10 Sep 2026)

Status: judged, UX-reviewed, verified through three lenses, repaired. Ready to build behind a preview.

## Thesis

Comfort is not a path anyone picks on a good day. It is a moment they fall into, usually late, usually alone, usually from whatever screen they were already on. So comfort has to be one tap from everywhere without touching the saved path, has to hand over the deliverable, one verse, one chapter, read aloud, before it asks for anything, and has to put the right country's number on the reading screen rather than two taps away in More.

Ashley's instinct here is already right and the research confirms it: just the scriptures, nothing asked, no graduation. What the research adds is duty of care. Only 35% of mental-health apps show crisis resources in-app, and some show the wrong country's number. What the live code adds is more damning than either. This screen shows today's chapter twice, with two translation pickers and two Listen buttons. The verse sitting above the reading is routinely from a different book than the reading. And after two chapters the app tells a person in crisis "You're doing great" and asks them to commit to a daily quota, breaking the path's own printed promise, "Comfort scriptures. Nothing else asked of you."

The biggest win here is subtraction that makes the screen warmer, not thinner: one passage instead of two, one verse that belongs to it, one honest care card that was never there at all. That subtraction ships first and on its own.

The safety plumbing behind it, the region resolver, the private pastoral route, ships second, because it is the part where a wrong answer is worse than no feature. Reusing the app's existing geo helper would show 988 to a reader in Rio. Its existing cache would show no number at all on a cold offline open at 2am. A saved campus of "Non-Futures Church" would silently kill the resolve. And the link a pastor texts to a hospital car park would land on a cookie banner. Each of those is now closed in the design rather than discovered in the build.

Two things this design used to claim and no longer does, because both were checked and neither held. The crisis number and the care contact are not live-editable by a campus pastor. The staff intake form has four hardcoded content types and none of them is a contact or a number, so in this build both are repo assets that need Ashley and a deploy, named as a bottleneck rather than dressed up as a lever. And the exclusion of Romans 8:28 and Jeremiah 29:11 from the comfort rotation is a pastoral judgment, not a research finding. The Pargament line it was resting on files benevolent reframing under positive coping, so the design now ships with nothing excluded and puts the question to the pastor, in the same sign-off that already covers the fourteen new verse pairings.

## Principles

1. The deliverable is at the top and already open. Verse, then Listen, then the chapter, never a Read button hiding the thing they came for.
2. Nothing is asked. Not an amount, not an email, not a notification, not a path change, not a rating, not a two-button question. Anything the app can infer, it infers silently.
3. Nothing counts. No streak shown, no "Reading 2 of 3", no "complete", no grading. The streak keeps recording for Ashley's numbers and stays invisible.
4. One passage. Low stimulus. If two things on the screen are both scripture, one of them is noise, and today, literally, one of them is a duplicate.
5. Nothing is sold. No book cards, no promo row, no "when you're ready there's more here." A crisis screen is not a storefront, and the done line is the last thing on it.
6. Presence before problem-solving, in the prompts and in the tone. Lifeway is direct that avoiding grief is always harmful and that acknowledgement beats fixing, so a quick prompt asks the person where God is, never why this is happening to them. That is the sourced half.
7. Which verses a person in crisis should be handed is the pastor's call, not the designer's and not the researcher's. The content file carries a tone tag on every entry so any exclusion is a one-line data edit Ashley makes. The design ships with the filter empty and excludes nothing on its own authority.
8. The crisis line is on the reading screen, always, offline included, never behind a tab, never behind a network call, never waiting on a fetch to paint.
9. Never show the wrong country's number. Resolve by country, never by a guess wider than a country. A timezone tier is an explicit allowlist of zones, never a continent prefix. When the answer is not certain, show none. A wrong number is worse than no number.
10. A resolve that succeeded once must survive a cold offline open. The resolved region lives in localStorage and paints on mount, before any network call. sessionStorage dies with the tab, and the tab is dead at 2am.
11. No signal terminates the resolve. A campus with no line for it, or no campus at all, falls through to the next tier rather than ending in silence. Only a total absence of signal shows the local-emergency sentence.
12. A control that cannot act does not render. No greyed button, no dead CTA, no "Talk to a pastor" pointing at an inbox nobody watches. The card ships without the button rather than with a broken one.
13. A safety card never blocks, never lectures, never reports. It appears beside the answer and the answer still comes.
14. Comfort never nudges. No push, no "we missed you", no seasonal challenge, no graduation to another path, ever.
15. Calm inside the locked look: fewer elements on the warm ivory canvas, the white paper panel, upright Georgia, flat surfaces with a hairline border and no decorative gradients anywhere. Never dark, never stripped. The research asks for "dark and calm." The ruling wins, and calm is achieved by removing chrome.
16. A door that promises nothing is asked must open onto nothing being asked: no cookie banner, no email gate, no install prompt, no Day 1 landing on the first paint.
17. Nothing the person types is ever stored in an analytics event.
18. Say which lever is real. A capability the code does not have is not a lever, and calling one a lever means the gap it leaves never gets scoped. Where a thing needs a developer, the design says developer.

## The journey

### Day 0

Two arrivals, both one tap, neither a declaration.

(a) The path card already in the sheet, "I'm going through something hard / Comfort scriptures. Nothing else asked of you," which saves with source onboarding and opens the screen immediately, per the one-tap-commits ruling. Unchanged, every word.

(b) New, and the more likely arrival: the word Comfort sitting quietly in the seam strip above every screen, on every path, before it was ever needed. One tap opens Comfort Now full-screen. No saveSetup call at all, so no source is ever stamped, no plan day credited, no dw_setup written, no Door 3 screen, no push ask, no email gate. Close returns them exactly where they were.

A third door for the pastor: futuresdailyword.com/?comfort=1 opens the same surface on a cold device, the link you text to someone in a hospital car park. That link must land on the verse and nothing else, so it suppresses for that session every overlay the sermon deep link already suppresses plus the ones it does not: the cookie banner, the email gate, the install prompt, the email nudge and the Day 1 landing. Unlike the sermon link it writes nothing at all to localStorage, no persona activation, no skip flag. It is an in-memory boolean for the session and the query param is stripped with replaceState.

Research: "Crisis is not a persona someone chooses on a good day."

### First session

Two to four minutes, and nothing is asked in any of them. Greeting with no day count, already date-keyed, verified. Today's anchor verse, large, on the white paper panel, and from today it is the verse that belongs to today's chapter. Listen as the primary control above the text, because reading may be beyond them. The chapter open underneath, once, with no translation pills in front of it. "Pray this with me" if they want it, and it stays open until they close it. "I've finished reading" brings one short thought from that chapter. Then "That's enough for today," and that is the last thing on the screen. Talk to someone is on screen the whole time, not revealed at the end: the region-correct crisis line always, the campus's own contact when one is on file, and the "Talk to a pastor" button only where a named person is actually receiving. One honest sentence on first open: this is scripture and a church, not counselling.

### Return visit

Same shape, next chapter in the rotation, keyed to the local date. No reference to the gap, no count, no welcome-back, a welcome-back implies the absence was noticed. If they made a steady card it now sits under the reading, their own handwriting above ours. From day two, one plain link above the verse: "Read a different passage." Not a question, not two buttons, not "still here." The path's printed promise is that nothing is asked, and a two-button question is an ask. It is a link they can ignore, and it ships behind a flag as an A/B because the research explicitly flags the next-day check-in as plausible but unsourced.

### Week 2

Nothing new, and that is the design: week two is built to look like day two. If they read more than one chapter on two separate days, the app quietly sets dw_comfort_daily to that amount and says so once in the done state, "There'll be two ready for you tomorrow," with a "Change this" link. It never asks the question. No milestone, no "you've been here 14 days," no suggestion the season should be over. No streak, no push, no graduation prompt, no "Feeling Stronger?", removed for good and locked by pathway-upgrades.test.ts. Any behaviour-triggered escalation at week two, surfacing the pastor row harder because someone has been in crisis a while, was considered and rejected: it reads as surveillance and there is no evidence for the timing.

### Missed day

Nothing happens. No catch-up, no "we missed you," no reset message, no gap in a chart, no badge, no streak-repair prompt. recordStreakToday() still runs on mount and still syncs, so the streak survives if they later move to another path, but the UI still suppresses it for comfort. The screen on day nine is identical to the screen on day two, and the greeting rotates on day-of-month so it has no idea they were gone. Research: guilt-framed reminders drive notification opt-out and uninstall, and this is the reader least able to absorb one.

### Seasonal

Comfort opts out of the calendar. No Lent challenge, no 1 January plan start, no church-wide live "reading today" count. The calendar-spike finding is about the movable middle, and a time-boxed challenge aimed at someone in crisis is a demand. The inversion instead: an optional dates block in public/comfort/content.json mapping a local date to a chapter override plus one line, so 24 December can be Psalm 121 with "Christmas is hard for a lot of people. This one is for you," or Mother's Day, Father's Day, Easter Saturday, the anniversary of a local loss. Say plainly what this lever is: content.json is a repo asset, so the hard-dates block is a central edit Ashley makes or approves, not something a campus pastor changes in a hard week. And say the same about the two things a campus most needs to change fast, its care contact and its crisis number, because in this build those are repo assets too, and no self-serve path to them exists yet. No countdown, no participation count, no shared total.

## Screens

### 1. Comfort Home (the saved comfort path)

**Purpose.** Hand over one verse and one chapter, read aloud, with the right country's number and a person in reach, and ask for nothing, sell nothing, count nothing. Today this screen shows the chapter twice; that is the single biggest fix and it ships on its own.

**Order top to bottom**
1. Greeting, rotating comfort line, no day count
2. "Read a different passage," one plain link, day 2+ only, behind the A/B flag
3. Anchor verse strip, today's verse, now paired to today's chapter, with "Pray this with me" folded in
4. Hero reading panel, the only chapter surface: Listen primary above the text, scripture open, "Sit with this" inline reflection
5. "I've finished reading" leading to "A thought from this chapter" (devotion, inline)
6. Talk to someone: region-correct crisis line always, campus contact when one is on file, pastor CTA only when a named recipient exists, one-line disclosure
7. If today gets hard, the steady card (empty invite, or their saved card)
8. Ask a question, Bible AI in comfort framing, with presence-first comfort quick prompts
9. Done line, "That's enough for today" plus what's ready tomorrow. The last thing on the screen.

**Copy**

| Element | Text |
|---|---|
| Greeting (keep as live, date-keyed) | God is with you today, {first}. |
| Anchor verse eyebrow (keep key comfort_word_for_you) | A WORD FOR YOU TODAY |
| Anchor verse + ref (now from the same entry as today's chapter) | Even though I walk through the darkest valley, I will fear no evil, for you are with me. — Psalm 23:4 |
| Reading card right-hand line, always this, never a count | Take your time |
| Listen button (primary, above the text) | Listen · 4 min |
| Prayer toggle (replaces bare "Pray") | Pray this with me |
| Inline reflection label / prompt (keep as live) | Sit with this — Which words brought you the most peace today? |
| Finish CTA (keep as live) | I've finished reading |
| Devotion header (keep as live) | A THOUGHT FROM THIS CHAPTER |
| Done line | That's enough for today. God is with you. Come back whenever you need Him. |
| Tomorrow line, inferred, one chapter | There'll be one ready for you tomorrow. |
| Tomorrow line, inferred, more than one | There'll be {n} ready for you tomorrow. |
| Tomorrow line, change link | Change this |
| Different-passage link (day 2+, flagged) | Read a different passage |
| Bible AI entry line | Ask a question |
| Bible AI comfort quick prompts (presence, never problem-solving) | Say the thing you can't say out loud / Where is God in this / Read me something for tonight |

**States**
- First open: everything above; the disclosure line under the care card shown once.
- Loaded and unread: verse, Listen, chapter open, no devotion yet, no done line.
- Read: devotion inline, done line replaces the finish CTA, and the done line is the last element, nothing follows it.
- Chapter has no devotion: the thought control is never shown at all, rather than shown and then silently skipped. Today advanceAfterDevotion() is called during render when a devotion is missing, which is a setState-during-render bug.
- Returning (day 2+): identical, new chapter, plus the "Read a different passage" link above the verse when the flag is on.
- Missed days: identical to returning. No gap language anywhere.
- Care card, named recipient on file for this campus: crisis line, campus contact, "Talk to a pastor" button.
- Care card, no named recipient yet: crisis line, campus contact if one is on file, and the honest sentence. The button does not render at all, not greyed, not disabled, absent.
- Offline: "You're offline. This is saved on your phone." Verse, cached chapter text, prayer, care card and crisis number all render from local data, the number from the dw_crisis_region cache, painted on mount with no network call. Listen is not shown; in its place one plain line, "Audio comes back when you're online." Nothing greyed.
- Chapter failed to load: "We couldn't load the chapter. Here's the verse, that's enough for now." plus "Try again." Verse, prayer, care card and crisis line all still render.
- Audio unavailable (ESV endpoint down): Listen hidden, same plain honest line, text unaffected. A hidden failure in crisis is worse than an honest one.
- Signed out / no campus set: Talk to someone shows a one-row campus picker inline, not a trip to Settings, and the crisis line still resolves by IP or timezone in the meantime rather than waiting for the picker.

**Keep**
- The rotating date-keyed comfort greeting with no streak and no day count (persona-config.ts:144-153 es, :181-190 pt, :218-227 id, and the en equivalent), plain, warm, on register.
- Streak UI suppressed for comfort (HomeScreen.tsx ~2004) while recordStreakToday() keeps running.
- No "Choose Your Plan" funnel, the "scripture" section correctly returns null for comfort with no plan or slots (HomeScreen.tsx:3434-3442).
- The guided prayer that stays open until the reader closes it (ComfortVerseBannerSection.tsx:40-43), Ashley's own merge ruling.
- localDayIndex() local-date rotation (ComfortSection.tsx:20-23), the DATE-AXIS ruling.
- The 30-chapter rotation, the devotions, the four guided prayers and the es/pt/id translations already approved.
- All 16 verses currently in COMFORT_VERSES, including Romans 8:28 and Jeremiah 29:11. The earlier draft of this design excluded those two on a misread citation; nothing is removed from the rotation on a designer's authority.
- The white paper hero panel with upright Georgia scripture in both themes, no italics, no dark override.
- comfortMode toolbar equals Note + Close only (HighlightToolbar.tsx:164-185).
- No graduation prompt and no comfort row in UPGRADE_CONDITIONS, locked by its test.
- Sermon Notes absent entirely (features.sermonNotes: false), already stricter than the demote-below-the-reading ruling requires.
- Comfort excluded from the full-screen PushOptIn (App.tsx:311-312) and from the asked-once Door 3 screen.
- Auto-served content stays credit-free, no handleRead, no plan-day credit.

**Change**
- Kill the duplicate. The hero becomes the only chapter surface: keep the heroChapterRefs comfort fallback (HomeScreen.tsx:1302-1305) and strip ComfortSection's own chapter render, its second translation picker and its second Listen button (ComfortSection.tsx:104-175). ComfortSection becomes the after-reading frame only: devotion, done line, inferred tomorrow line.
- Pair the anchor verse to today's chapter. COMFORT_VERSES (16 entries, ComfortVerseBannerSection.tsx:13-30) and COMFORT_CHAPTERS (30) are day-indexed independently, so Psalm 34:18 routinely sits above Psalm 23. One data entry per day: chapter plus its own anchor verse plus its devotion.
- Give every content entry a tone tag ("presence," "reframe," "promise") and let the comfort surface filter on an exclusion list that ships empty. This is the mechanism for a pastoral call, not the call itself: if Ashley wants Romans 8:28 or Jeremiah 29:11 held back from the crisis surface he adds two tags and nothing else changes. The design excludes nothing, because the research line it was leaning on (persona-research.md:139) files benevolent reframing under positive coping, not negative.
- Promote Listen above the passage text as the primary control; demote the translation control to small text under the passage. Zero decisions before the first word.
- Repaint to the locked palette and flatten it. ComfortSection and ComfortVerseBannerSection hardcode pre-relook indigo, rgba(92,107,192,…), #5C6BC0, #4A6070, #37474F, making comfort the only path not wearing the ivory/clay look. Do not port the gradients across to clay: comfort surfaces become flat --dw-surface panels on --dw-canvas with a 1px --dw-border, no linear-gradient anywhere (ComfortSection.tsx:181, :219; ComfortVerseBannerSection.tsx:52). Low stimulus is the whole point of this screen.
- Move Talk to someone out of More onto the reading screen, always visible, and keep a copy in More.
- Infer dw_comfort_daily from behaviour instead of asking, and state it once in the done state with a "Change this" link.
- Comfort quick prompts in the AI row replace the generic six, and every one of them asks where God is rather than why this is happening, presence over problem-solving, which is the sourced half of persona-research.md:139.
- sectionOrder for comfort becomes: greeting, comfort_verse_banner, comfort_after_reading, comfort_care, comfort_steady, ai_prompt, comfort_done. The live list is greeting, comfort_verse_banner, hero_audio, scripture, comfort_scripture, ai_prompt, comfort_card, book_cards (persona-config.ts:510-519). "comfort_scripture" is renamed to "comfort_after_reading" and hero_audio, scripture, comfort_card and book_cards all go.

**Remove**
- The duplicate chapter, today's passage renders twice on one screen (hero fallback at HomeScreen.tsx:1302-1305 plus ComfortSection at HomeScreen.tsx:2892), each with its own translation pills and Listen button.
- The ask_lock step, "You're doing great." plus "Would you like to set a daily reading amount so we can have something ready for you each day?" (ComfortSection.tsx:300-303). A commitment question put to someone in crisis, and a direct contradiction of the path's printed promise.
- The ask_more step (ComfortSection.tsx:261-295), replaced by a plain "Read another" link that asks nothing.
- The "Reading {x} of {y}" counter (comfort_reading_x_of_y, ComfortSection.tsx:96), a count is a count.
- "You're doing great." (comfort_doing_great), grading someone whose life is coming apart, and it reads as praise for using the app.
- The dead sectionOrder keys: "hero_audio" (declared at persona-config.ts:513, never checked anywhere in HomeScreen), "comfort_card" (:517, retired into the verse banner by Ashley's merge) and "scripture" (:514, renders null for comfort by design).
- UpgradePromptCard mounting at all for comfort, it currently mounts and returns null via checkForUpgrade; gating it out at the mount site removes the standing risk of a future comfort condition, and the stale comment still naming "Feeling Stronger?" goes with it.
- Book cards, entirely. "book_cards" comes out of the comfort sectionOrder and does not reappear in the done state. The line between "when you're ready, there's more here" and selling a book to someone in crisis is too thin to walk, and the done line should be the last thing on the screen.
- The decorative gradients on every comfort surface, not recoloured to clay, removed.
- Any gold AI aurora treatment on this path, the HighlightToolbar already excludes it under comfortMode; the AI row should match.
- Not removed, and named here so it is not quietly reintroduced: no verse is dropped from the rotation by this design. Any exclusion is Ashley's, made as a tone tag.

### 2. The comfort door (seam chrome, every screen, every path)

**Purpose.** One persistent tap to comfort from anywhere, without switching the saved path. The smallest build for the highest duty of care, the research's own build item 2.

**Order top to bottom**
1. Existing: Futures wordmark plus "Daily Word" (left; the word "Daily Word" hides below 390px so three items fit)
2. New: heart outline glyph plus the word Comfort (centre-right, quiet weight, --dw-text-muted, 44px hit area)
3. Existing: "Futures Church ↗" link (right)

**Copy**

| Element | Text |
|---|---|
| Seam link label | Comfort |
| aria-label | Open comfort now |

**States**
- Default, quiet, muted, same visual weight as the church link. On a good day it reads as a section name, not an alarm.
- Pressed, opens Comfort Now full-screen (useSubView alone).
- Already on the comfort path, the door is absent, they are already there.
- Narrow phone (below 390px), the "Daily Word" word is hidden so wordmark, Comfort and "Futures Church ↗" sit on one line without wrapping; the mark and both links stay.
- Embedded (IS_EMBEDDED), the seam is hidden today (App.tsx:458 `{!IS_EMBEDDED && <SeamBar />}`), so the futures.church iframe embed would have no comfort door. Named as an owner decision, not silently accepted.
- After use, unchanged. It never remembers, never says "again," never counts.

**Keep**
- The seam itself, its brand lockup and the "Futures Church ↗" link, untouched.
- Its position above every screen, so the door is on Journal, Plans, Campus and Settings too, not only Home.

**Change**
- Add one element to Seam.tsx. This is chrome rather than an IA reshape, but it is visible on the opening screen, so it still ships behind the deploy preview Ashley approves.
- Render it as `<button class="dw-cmf-seam">`, not as an `<a class="dw-seam-link">`. Two reasons, both live in index.css: `.dw-seam-link` is 11px (index.css:824-836) inside a 34px strip, which is not a tap target for the one tap that must never miss; and `:root .dw-seam-bar a.dw-seam-link { color: var(--dw-gold) !important }` (index.css:876-881) would repaint it gold, putting two accents in the chrome instead of the muted weight this door needs.
- Give it a 44px minimum hit area that overflows the 34px strip vertically (padding plus negative margin, or an expanded ::before), so the touch target is full-size without making the strip taller.

**Remove**
- No sixth tab. The tab bar is five and a permanent Crisis tab labels the person every day of their life.
- No sixth card on the path sheet, it is five cards and must fit a phone at ~481px.
- No header icon competing with the PathSwatch. No interstitial, no badge, no banner.

### 3. Comfort Now (full-screen, from the seam, the deep link, or More)

**Purpose.** Give a reader on any other path the same word in one tap on a bad day, without touching their saved path, their plan, their streak or their progress, and without a single thing being asked on the way in.

**Order top to bottom**
1. Close (top-left, the only chrome)
2. One line: nothing is asked of you here
3. Anchor verse, large, on the white paper panel
4. Listen · N min, primary
5. Today's chapter, open, no translation pills above it
6. Pray this with me
7. Talk to someone, crisis line always, campus contact when one is on file, pastor CTA only when a named recipient exists, disclosure

**Copy**

| Element | Text |
|---|---|
| Eyebrow | A WORD FOR YOU TODAY |
| Opening line | Nothing is asked of you here. |
| Listen sub-line | Read to you, slowly. |
| Care card title | You don't have to carry this on your own. |
| Offline / passage failed | The chapter didn't load. The verse above is yours, it works offline. |
| Close (aria-label) | Close |

**States**
- First open from another path: verse, Listen, chapter, prayer, care card, disclosure. No greeting, no steady card, no AI, no done state, no book cards, one thing.
- Second and later opens: identical. It never offers to change their path, on any visit, ever, and says nothing about paths, introducing "your path hasn't changed" introduces a worry they did not have.
- Opened from ?comfort=1 on a cold device: identical, and the first paint is the verse and nothing else. It does not run the cold-start path stamp or the Day 1 landing, and it suppresses the cookie banner, the email gate, the install prompt and the email nudge for that session, otherwise the screen that promises "nothing is asked of you here" opens with a consent banner over it.
- Opened from ?comfort=1 with no cookie consent on file: the banner stays suppressed and no analytics fire at all for that session. Consent absent means no events, which is the privacy-preserving read and is stated here so the deep-link count is understood to be an undercount rather than treated as one.
- Loading: the verse paints immediately from local data and never waits on a network; the chapter shows a skeleton on the paper panel; the crisis line paints from the dw_crisis_region cache, never from a pending fetch.
- Offline: cached chapter, static care card and crisis number all render; Listen hidden.
- Closed: returns to exactly the screen and scroll position they came from.

**Keep**
- The comfort content itself, same data, same rotation, same local day index as the comfort path.

**Change**
- Host it with useSubView(open, onClose) alone, no useModalA11y, no aria-modal, or the nested focus trap breaks keyboard and the Android back button.
- Mount it always with a live `open` prop rather than conditionally mounting, or every close orphans a history entry.
- Add COMFORT_DEEP_LINK as an in-memory const beside SERMON_DEEP_LINK (App.tsx:35) and gate CookieConsent (App.tsx:498), EmailGate (:480), PWAInstall, EmailNudge and Day1Landing (:236-239) off it exactly as the sermon deep link already does, with one deliberate difference: SERMON_DEEP_LINK calls activateSundayGuest() and writes dw_email_gate_skipped to localStorage, and the comfort link writes nothing. It parses the param, strips it with history.replaceState, and lives as a boolean for that session only.

**Remove**
- Any call to saveSetup, syncSetup, handleRead or the persona sheet from this surface. Opening comfort on a hard day must never stamp a real choice and must never credit a plan day.
- No streak. No day count. No "x of y." No Mark as read. No completion. No book cards.

### 4. Talk to someone (the care card, the region resolver, and the private pastoral request)

**Purpose.** Put the right country's crisis line in front of them on the reading screen, working offline, with a real person beside it wherever a real person is actually receiving, and route the message privately, never onto the public prayer wall.

**Order top to bottom**
1. Title
2. One sentence about who reads it and where it does not go
3. Region-correct crisis line, always visible, never behind a tap, painted from cache on mount
4. The campus's own contact, when one is on file
5. "Talk to a pastor" button, only when a named recipient exists for that campus
6. One-line disclosure (first open only)
7. Inside the form: text area, name toggle, Send, the message line directly under Send, and the crisis line again beneath that

**Copy**

| Element | Text |
|---|---|
| Title | You don't have to carry this on your own. |
| Body | Someone from {campus} will read this. It doesn't go on the prayer wall. |
| Body, no named recipient yet | Here's who to call right now. |
| CTA (renders only where a named recipient exists) | Talk to a pastor |
| Placeholder | You don't have to explain it well. |
| Name toggle, off | Send it without my name, we won't be able to reply |
| Send | Send it |
| Empty field on Send, directly under the button | Write a line or two first. |
| Sent confirmation | It's sent. Someone from {campus} will see it. |
| Offline | You're offline. We'll send it the moment you're back. |
| Failed, directly under the button, crisis line beneath it | That didn't send. Try again, or call one of these. |
| Crisis line, US | If you're in danger right now, call or text 988. Someone answers any time, day or night. |
| Crisis line, Australia | If you're in danger right now, call Lifeline on 13 11 14. Someone answers any time, day or night. |
| Crisis line, New Zealand | If you're in danger right now, call or text 0800 543 354. Someone answers any time, day or night. |
| Crisis line, country known, no line on file | If you're in danger right now, call your local emergency number. |
| Crisis line, region unknown | If you're in danger right now, call your local emergency number. |
| Crisis line, no number, link | Find a crisis line near you |
| Disclosure (shown once) | This is scripture and a church, not counselling. If you need a professional, ask us and we'll help you find one. |

**States**
- Resolution order, and no tier may terminate it early: (1) saved campus whose country has a line on file, that line; (2) saved campus whose country is known but has no line (id, br today), the honest no-number state, not a fall-through and never a guess; (3) saved campus of "other," no campus, or a campus whose country cannot be mapped, fall through to IP; (4) IP country from /api/geo, its line, or the honest no-number state for a valid code with no line; (5) no IP answer, the timezone allowlist; (6) nothing, unknown.
- Campus tier resolves on the campus id's country prefix (au-, us-, br-, id-), never on the free-text region label, CAMPUSES carries region "North America," which is a continent, not a country, and "Other" for Non-Futures Church (tokens.ts:79).
- Saved campus "Non-Futures Church": treated as no signal, falls straight through to IP, so a reader in Atlanta who picked it still gets 988. Today that value would end the resolve in silence.
- Timezone tier: an explicit allowlist of zones per supported line only, Australia/* for AU; Pacific/Auckland and Pacific/Chatham for NZ; the named US zones (America/New_York, America/Chicago, America/Denver, America/Los_Angeles, America/Phoenix, America/Anchorage, America/Detroit, America/Indiana/*, America/Kentucky/*, Pacific/Honolulu) for US. Anything unlisted is unknown. America/Sao_Paulo, America/Bogota and America/Mexico_City resolve to unknown, never to US.
- Region known, no line on file (Indonesia, Brazil today): the honest line, the campus contact, and the picker. Do not invent a number.
- Region unknown: no number at all, the local-emergency sentence plus the directory link plus the picker. Never a guessed number, never a US default.
- Cached: every successful resolve, including the honest no-number states, writes {region, source, line, resolvedAt} to localStorage under dw_crisis_region. The card paints from that on mount, synchronously, before any network call. Switching campus clears it and re-resolves.
- Offline, cold open (the 2am case): the card renders from dw_crisis_region; the tel: link still dials; the message queues and the copy says so, and it must actually queue, the copy must not lie.
- Named recipient on file for this campus: the pastor CTA renders and the form works. "On file" in this build means an entry in the bundled public/comfort/care-contacts.json, a repo asset, so adding a campus is a commit and a deploy by Ashley, not a form a pastor fills in. That is a real limitation and it is stated in the levers and the risks rather than papered over.
- No named recipient yet: the CTA does not render at all. The card is the crisis line, the campus contact if one is on file, and the honest sentence. No greyed button, no "coming soon," no control that cannot act. Every campus starts in this state and leaves it one at a time as Ashley adds entries.
- No campus set: a one-row inline picker, not a trip to Settings, and the line still resolves by IP or timezone meanwhile.
- No email on file: the message still sends. The existing prayer form calls requireEmail() and blocks; an email gate in front of a cry for help is indefensible. A deliberate departure from the prayer-wall pattern.
- Anonymous: sends, and the copy has already said no reply is possible.
- Empty textarea on Send: one line directly under the Send button, no native validation (the form is noValidate, iOS native validation is silent and a crisis message that fails silently is the worst version of this bug).
- Send failed: the same spot under the button, with the crisis number repeated beneath it.
- Already sent today: the button becomes the confirmation line; the crisis line stays.

**Keep**
- The plain register already in the MoreScreen card: "Our pastoral care team is here for you. You don't have to walk through this alone."
- The campus picker data (CAMPUSES) and the existing per-campus concept.
- The public prayer wall, untouched, on the Messages tab for the personas it suits.

**Change**
- Move it from More (MoreScreen.tsx:784-841) onto the comfort reading screen and into Comfort Now; keep a copy in More.
- Render the More block for every persona, not only comfort (it is gated on setup?.persona === 'comfort' at MoreScreen.tsx:785), crisis is not a persona someone chose on a good day, and someone who used the door once should not have to change persona to find it again.
- Run every string through t(). The whole block is hardcoded English today, which means the Futuros, Brazilian and Indonesian congregations get an English crisis message.
- Write the resolver fresh in src/utils/crisis-lines.ts and never call campusFromTimezone (geo.ts:26-33) from it, that helper maps every America/* zone to "US," which would put 988 in front of a reader in Rio the moment IP fails or they are offline, and Futures has a Brazilian campus. It may reuse detectCountry()'s endpoint but not its cache.
- Cache to localStorage under dw_crisis_region, not sessionStorage. detectCountry() caches in sessionStorage (geo.ts:47-57), which dies with the tab, so a cold offline open, the exact case this feature exists for, would resolve to unknown and show nothing. This key is a derived cache, not authored content: it is device-local, it is not added to the misc sync list, and it is safe to lose.
- Source the per-region crisis line from a bundled repo asset, public/comfort/lines.json, and the per-campus care contact from public/comfort/care-contacts.json. An earlier draft of this design said these were rows in campus_content written through the /staff form; that was checked and it is false. intake-core.js:40 hardcodes CORNER_TYPES to announcement/note/prayer_point/essay and silently coerces anything else to "announcement" at :301, the staff campus flow (StaffApp.tsx:367) asks only for free text, and campus-content.js:22-45 returns a generic {id,type,title,content,author,date} note with nowhere to put a number, a tel: href, an hours sentence or a named recipient. So in this build both are Ashley-plus-a-deploy, and the design says so.
- Read both through one function, resolveCareSources(), so a live source can be added later without touching the card, the resolver or a single test, but ship no network path for it now. A stub that fetches nothing is honest; a stub that pretends to fetch is the thing that hid this gap the first time.
- Write to a new pastoral_requests table, not public.prayers, the prayer-wall function has no private flag and everything inserted there is readable on the wall. Its migration goes in the repo, which is also the moment to note that campus_content itself has no migration in supabase/migrations at all today, only an index at supabase-indexes.sql:56-61.

**Remove**
- The hardcoded "Crisis support: 988 Suicide & Crisis Lifeline (call or text 988)" line (MoreScreen.tsx:838) as the only safety surface, and its assumption that every reader is American, Futures has 8 Australian, 5 Indonesian and 1 Brazilian campus.
- mailto:care@futures.church (MoreScreen.tsx:810) as the primary human route: one Atlanta address for a church in four countries, and a mailto that fails silently on a phone with no mail client, so the person never learns their message did not go. It stays only as the error fallback.
- The requireEmail() gate, for this form only.
- Any fallback path that returns a number the resolver is not certain of, in particular any "default to US" branch, and any use of a continent-wide timezone prefix.
- The claim that a campus pastor can change any of this without a developer. Removed from the design, not just softened.

### 5. If today gets hard (the steady card)

**Purpose.** Let them write down, while they can still think, the three things they will not be able to think of later. Wysa's most-used feature, over 49% of crisis users.

**Order top to bottom**
1. Title
2. One line of why
3. Slot 1, who you'll call
4. Slot 2, what steadies you
5. Slot 3, a verse you want to come back to
6. Save

**Copy**

| Element | Text |
|---|---|
| Title | If today gets hard |
| Body | Write these down now, while you can think straight. They'll be here when you can't. |
| Field 1 | Who you'll call, a name and a number |
| Field 2 | What steadies you, a walk, music, sitting outside |
| Field 3 | A verse you want to come back to |
| Verse field helper | Tap a verse while you're reading and it lands here. |
| Save | Save it |
| Filled state, slot 1 action | Call {name} |
| Filled state footer | Change this |

**States**
- Empty (never made): the invite, three fields, Save. Not a modal, a card below the reading, never a nag.
- Partially filled: saves what's there. No validation, no required fields, no error states. One field is a card.
- Filled: the three lines shown plainly with "Change this," sitting directly under the reading from then on, and at the top on a return visit, so the first thing on screen is their own handwriting, not ours.
- Editing one slot: inline, no full-screen form.
- Slot 3 auto-filled by the most recent kept verse; the person can change it.
- Offline: writes to localStorage and syncs later.
- Second device: fill-only merge, a cloud copy never overwrites a newer local card.

**Keep**
- The journal's existing prayer entry type and prompts as the longer-form place to write.

**Change**
- New key dw_steady_card in storage.ts, added to MISC_KEYS and to the AUTHORED_MISC set in cloudSync.ts (cloudSync.ts:35, :69) so applyMisc treats it as fill-only and every write calls pushNow(), the same rule as dw_user_story / dw_sermon_notes / dw_prayed_for. Merge into what is currently in localStorage; never rebuild the record from React state. Deletes are tombstones.

**Remove**
- No reminder to complete it, ever. An unfinished safety card is not a task.
- No prompts, no suggested answers, no AI help writing it. Our words in this card would defeat its purpose.

### 6. Ask a question (Bible AI, comfort framing, and the safety card on every path)

**Purpose.** Let them say the thing out loud, and make sure that when what they say is dark, the right number, and a human option where one really exists, appears beside the answer. There is zero crisis handling in the AI path today.

**Order top to bottom**
1. Disclosure line above the input, first open for comfort, dismissible once
2. The conversation as it is today
3. On a flagged turn: the safety card, above the streaming answer
4. The answer, unchanged

**Copy**

| Element | Text |
|---|---|
| Entry body | No question is too small, and nothing you say here goes anywhere else. |
| Disclosure | This helps you read the Bible. It isn't a counsellor. |
| Disclosure link | Who to call |
| Safety card line 1 | That sounds heavy, and I don't want to leave you with words on a screen. |
| Safety card CTA (renders only where a named recipient exists) | Talk to a pastor |
| Safety card line 2 | [region-correct crisis line, same copy and same resolver as Talk to someone] |
| Dismiss | Close |
| Prayer-request variant (on submit) | Your request is with the team. While you wait, here's who to call. |

**States**
- No flag: nothing changes; the softer comfort system prompt does its work.
- Flagged: the message still sends and the answer still comes. Never block it, blocking someone who just typed the hardest sentence of their life is abandonment.
- Flagged, no named recipient for that campus: the card shows the crisis line and the campus contact only. The pastor CTA is absent rather than dead.
- False positive: dismissible with one tap, never re-fires in the same conversation. Nothing is sent anywhere; the text itself is never logged, only that the card fired.
- Shown after a journal or prayer save on any path, not only comfort.
- Flag list has no approved entry for the current language: nothing fires. Better silent than a mistranslated safety prompt.
- Offline: AI unavailable; the entry line says "Ask a question when you're back online" and the care card is still on screen above it.

**Keep**
- The comfort systemPromptAddition (persona-config.ts:550-553), "Lead with comfort before teaching... gently encourage them to talk to their pastor or a trusted friend." It is well written.
- BibleAI's existing useSubView(isOpen, onClose) host pattern.

**Change**
- Add a client-side phrase check in src/data/crisis-terms.ts, per language, run before send. Add the same check to the prayer-request textarea in MessagesScreen before submit.
- Extend the comfort systemPromptAddition with two sentences: never diagnose, and never tell the person they need more faith or that God is punishing them. This is the one place the Pargament finding applies exactly as written, "punishing God" and "have more faith" are its own two examples of negative coping (persona-research.md:139), and an AI is exactly where both slip in.
- On a flagged turn, one extra system instruction so the model leads with presence and names the line.
- The quick prompts on the comfort AI row are presence prompts only, "Say the thing you can't say out loud," "Where is God in this," "Read me something for tonight." Presence and acknowledgement over problem-solving, per the Lifeway half of :139.

**Remove**
- Nothing from the AI itself. No hard block, no keyword refusal, no auto-escalation to a human without their tap.
- The unstated assumption that a softer tone is a safety feature. It is not; it is a tone.

### 7. Read a different passage (day 2 onward, behind a flag)

**Purpose.** Give them the one choice that is actually theirs, as a link they can ignore rather than a question they have to answer. The only element here with no evidence behind it, so it ships as an experiment.

**Order top to bottom**
1. One plain link above the anchor verse

**Copy**

| Element | Text |
|---|---|
| Link | Read a different passage |

**States**
- Day 2+ with a previous read: the link sits above the verse, quiet, one line, no question mark and no buttons.
- Never read before: absent.
- After tapping: the link disappears for the day; the next chapter loads in place. No confirmation, no toast.
- Missed several days: identical, it never says how many, and it never says "still here," which is a comment on the gap by another route.
- Offline: the link picks the next chapter whose text is cached; if none is cached it says "This one's saved on your phone" and stays put.

**Keep**
- The 30-chapter local-date rotation as the default when they tap nothing.

**Change**
- Ship behind a flag and A/B it. The research is explicit that the next-day check-in is "plausible, unsourced, worth testing."
- Make it a link, not a two-button question. "Still here. Want the same passage, or a new one?" is an ask, and the path's printed promise, unchangeable, and correct, is that nothing is asked. The default is already the same passage rotation, so the only thing worth surfacing is the departure from it.

**Remove**
- Any version of this that references the gap ("It's been 4 days"), a count, or a streak.
- The "The same one" button, the same one is what happens if they do nothing, and a button for the default is a question in disguise.

### 8. More → Comfort (and Talk to someone, for every persona)

**Purpose.** Hold the levers the reader owns, out of the way of the reading, and keep the safety resources findable when they are calm enough to look.

**Order top to bottom**
1. COMFORT header
2. How much to have ready each day
3. Talk to someone (second copy)
4. Who to call
5. If today gets hard
6. Change path
7. Foot disclosure

**Copy**

| Element | Text |
|---|---|
| Header | COMFORT |
| Daily amount label | How much to have ready each day |
| Options | One chapter / Two chapters / Three chapters |
| Change path row | Where are you today? |
| Foot | Daily Word is scripture and a church, not counselling. |

**States**
- Comfort persona: the full block.
- Not comfort, but has used Comfort Now: show Who to call and If today gets hard. Someone who used the door once should not have to find it again through a persona change.
- Any persona: Talk to someone renders, it is no longer gated on persona === 'comfort'.
- Amount never set: shows "One chapter" selected, with no "not set" or "default" language.
- Amount inferred from behaviour: shows the inferred value, selected, with no explanation of how it got there.
- Region unresolved: Who to call opens straight to the country picker; picking a country writes dw_crisis_region with source "picker" and it persists.
- Signed-in pastor on the comfort path: allowed, with the sign-out row beside it and no lock glyph.

**Keep**
- The path swatch and the one "Where are you today?" sheet with five cards as the only way to change path.
- The pastor lock staying removed.

**Change**
- This is where the daily-amount question went. It is a setting now, not an interruption.
- Every string through t().

**Remove**
- Nothing.

### 9. Choose-your-path sheet, the comfort card

**Purpose.** Door into the path. Already correct; listed to say explicitly that it does not change.

**Order top to bottom**
1. Heart icon
2. "I'm going through something hard"
3. "Comfort scriptures. Nothing else asked of you."
4. Tap saves and opens

**Copy**

| Element | Text |
|---|---|
| Head (keep, unchanged) | I'm going through something hard |
| Promise (keep, unchanged) | Comfort scriptures. Nothing else asked of you. |

**States**
- Not current path, tappable, saves with source onboarding or settings and opens Home immediately.
- Current path, a tick; tapping just closes.
- Pastor signed in, still selectable as a real choice, with the sign-out row beside it.

**Keep**
- Every word. The sheet is height-budgeted at ~481px on a 390-wide phone (537 with the pastor row) and the ruling permits typographic compaction only, no copy changes.
- One tap saves and opens; no second CTA below the fold.
- Comfort is never shown the asked-once Door 3 screen.

**Change**
- Nothing.

**Remove**
- Nothing. In particular, no sixth card, the comfort door lives in the seam, not in this sheet.

## Comfort access

Four doors, none of them a gate, none of them touching the saved path.

1. The path card in the one "Where are you today?" sheet, "I'm going through something hard," which saves comfort as a real choice and opens it. Unchanged, every word.
2. New and primary: the word Comfort with a heart outline in the seam strip that already sits above every screen on every path (Seam.tsx, mounted at App.tsx:458). Rendered as a `<button class="dw-cmf-seam">` rather than an `<a class="dw-seam-link">`, because the existing seam-link rule is 11px in a 34px strip (index.css:824-836) and `:root .dw-seam-bar a.dw-seam-link { color: var(--dw-gold) !important }` (index.css:876-881) would repaint it gold. It gets a 44px hit area that overflows the strip and the muted weight the design asks for, and the word "Daily Word" hides below 390px so three items sit on one line. aria-label "Open comfort now." Because it is in the seam rather than on Home, the door is also on Journal, Plans, Campus and Settings. It opens Comfort Now full-screen via useSubView alone, never useSubView plus useModalA11y, mounted with a live `open` prop rather than conditionally mounted, so it neither breaks the nested focus trap nor orphans a history entry per close. It writes nothing: no saveSetup, no dw_setup stamp, no dw_path_asked, no plan-day credit, no handleRead.
3. A row at the top of More, "I need comfort today," plus the all-persona Talk to someone block.
4. futuresdailyword.com/?comfort=1, a shareable link that opens the overlay on a cold device without running the cold-start path stamp or the Day 1 landing, and which also suppresses the cookie banner (App.tsx:498), the email gate (:480), the install prompt and the email nudge for that session, because a screen that says "nothing is asked of you here" cannot open underneath a consent dialog. It is parsed as COMFORT_DEEP_LINK beside SERMON_DEEP_LINK (App.tsx:35) but, unlike the sermon link, writes nothing to localStorage at all, no activateSundayGuest, no dw_email_gate_skipped. It strips its param with replaceState and lives as a session boolean.

The prayer-request flow in Messages is a fifth, incidental route via the safety card.

Two things deliberately rejected: a sixth tab (the shell is five, and a permanent Crisis tab labels the person every day of their life) and a sixth card on the path sheet (five cards, ~481px, must not scroll).

One gap named rather than hidden: the seam is suppressed when IS_EMBEDDED, so the futures.church iframe embed would have no comfort door, an owner decision.

And one honest limit on what the doors lead to: the crisis line behind them is a repo asset in this build, so it changes on Ashley's deploy, not a pastor's form.

## Reminders

None, by default and by design. Comfort gets no push notification: App.tsx:311-312 already excludes the comfort persona from the push opt-in, and that stays. The research is direct about why, guilt-framed streak reminders drive notification opt-out and uninstall, and the harm list for this persona names guilt outright. So there is no daily comfort reminder, no missed-day catch-up, no streak-repair prompt, no "we missed you," and no re-engagement push about a gap.

The streak is recorded silently on mount and never displayed, so it survives if the person later moves to another path. The only "return" mechanic is the in-app link on the next visit, "Read a different passage," which they have to open the app to see, and which is a link rather than a question.

Two consequences stated plainly rather than discovered later in a dashboard review. First, comfort will look worse than every other path on any retention metric that depends on a nudge, that is expected, it is the point, and it must not be read as failure, because the fix a dashboard would suggest is the one thing this persona must never get. Second, if someone arrives at comfort through the seam door while their saved path is congregation or deeper_study, their own path's reminder keeps running unchanged; the door must not touch push state in either direction.

Two candidate designs proposed a small opt-in comfort reminder, one-shot, offered in context, no streak language. It is not built here. It crosses a live standing exclusion, and it is a notification to someone in crisis, which is Ashley's call and not a designer's. It is carried as an open decision with the copy already drafted, so it is one small PR away if he says yes.

## Instrumentation

- comfort_opened {source: seam|path|more|deeplink|prayer, persona_at_open, first_time}, the reachability number: what fraction of comfort sessions arrive from a path other than comfort. This is the research's own named test and the number that says whether the seam door was worth building. Honest caveat: a ?comfort=1 arrival with no cookie consent on file fires nothing at all, because the deep link suppresses the consent banner and no consent means no events, the deeplink source is a floor, not a count.
- comfort_listen_started / comfort_listen_completed {ref, seconds}, proves the audio-first ordering. If listens are near zero, Listen is in the wrong place, not the wrong feature.
- comfort_passage_read {ref, source}, fires on "I've finished reading." Must not credit a plan day and must not route through handleRead; the arrival seed for comfort is credit-free by ruling.
- comfort_prayer_opened {ref}, the guided prayer is the retained crisis-facing feature; this is the only evidence it earns its place.
- comfort_care_tapped {channel: pastor|line|campus_contact, region, region_source}, the duty-of-care number. If pastor taps happen and nobody at that campus answers, that is a failure with a name on it. The pastor channel can only fire where a named recipient exists, because that is the only case where the button renders.
- comfort_line_shown {region, region_source: campus|ip|timezone|cache|picker|unknown, had_number: bool}, watch the unknown rate and the had_number:false rate. A high unknown rate means people in crisis are seeing no number, which is the exact industry failure the research names; region_source "cache" is what proves the localStorage cache is actually carrying the cold offline open.
- comfort_care_recipient_missing {campus}, how often the card renders with no pastor button because that campus has no entry in care-contacts.json. Since adding one is a deploy, not a form, this is the queue length on Ashley's desk and the number that says whether the unbuilt staff lever is actually costing anything.
- comfort_safety_shown {surface: ai|prayer|journal, lang} and comfort_safety_dismissed {surface, seconds_to_dismiss}, trigger rate and the false-positive proxy. Fast dismissals clustering, or a dismissal rate above roughly 80%, means the word list is too loose and should be narrowed, not celebrated.
- comfort_steady_saved {fields_filled: 1-3} and comfort_steady_opened, opened-per-saved is the number that says whether the card is an artifact or a form. Wysa's equivalent reached over 49% of crisis users; if ours is under 10%, the card is in the wrong place on the screen.
- comfort_return_next_day {entry_source, days_since_last}, D1/D7/D30 for this path specifically, via the nightly per-path rollup. No public source exists for Bible-app retention or for the comfort-to-discipleship transition; only our own instrumentation can ever answer it.
- comfort_daily_inferred {n}, proves the inference actually fires now that the question is gone. If this never fires, dw_comfort_daily silently stays 0 and the tomorrow line never appears.
- comfort_offline_render {had_text: bool, had_line: bool}, proves the crisis number and the chapter really do render with no network, from localStorage and not from a fetch. The one event that must never be zero-truthy.
- app_open gains a `path` detail, the only way to get D1/D7/D30 by path at all.
- Trap: TRACKED_EVENTS in src/utils/analytics.ts:31-38 is an allowlist and trackActivity returns silently at line 45 for any name not on it. Every name above must be added in the same PR or the dashboard shows a clean zero and the feature looks unused.
- Privacy: none of these carry the text of what the person wrote or typed. comfort_safety_shown records that it fired and which surface, never the phrase. comfort_steady_saved records which slots, never their contents. The phone number on the steady card is the most sensitive thing this app will ever hold and it never reaches an event. The matcher runs entirely client-side; its input never reaches fetch, localStorage or an analytics detail field, only the boolean result. dw_crisis_region holds a country and a source, never a location finer than that, and it never leaves the device except as the region field on these events.

## Self-serve levers

Correction first, because an earlier draft of this design got it wrong and a wrong lever is worse than a missing one. That draft said the per-campus care contact and the per-region crisis line were rows in campus_content "written through the /staff intake form that already publishes to that table." That lever does not exist. netlify/functions/lib/intake-core.js:40 hardcodes CORNER_TYPES = ["announcement","note","prayer_point","essay"] and coerces any unrecognised type to "announcement" at :301, so a care_contact or crisis_line submission would silently become an announcement on the campus corner. The staff campus flow (src/staff/StaffApp.tsx:367) asks one free-text question, what's on this week, a prayer point, or take something down, with no field for a name, an inbox, a number, a tel: href, an hours sentence or a response promise. netlify/functions/campus-content.js:22-45 returns only {id, type, title, content, author, date}, a generic note shape with nowhere to put any of that, and its POST returns 403 by design. And campus_content has no migration in supabase/migrations at all, only an index in supabase-indexes.sql:56-61. Nothing in this design's build steps touches any of those files, so the plan would not have built the lever it claimed already existed.

- public/comfort/lines.json, a bundled repo asset holding the crisis line per region: label, number, tel: href, hours sentence, plus the directory URL used when the region is unknown. This is the source of truth in this build, not a fallback for something live. Editing it is a commit, a build and a deploy: Ashley, not a pastor. Say the consequence out loud, if a national line changes overnight, phones do not get the new number until he ships, and until then the card either shows the old number or, if the old one is removed, the honest no-number state.
- public/comfort/care-contacts.json, a bundled repo asset holding, per campus, the named recipient, the destination inbox, the campus's own contact and the response promise the card is allowed to print. Same terms: a commit and a deploy. Every campus starts absent, which is the state where the pastor button does not render at all, so the design degrades correctly while the file fills up one campus at a time. comfort_care_recipient_missing counts how long that queue is.
- Both files are read through one function, resolveCareSources(), and the card never awaits anything. That is architecture, not a lever: it means a live source can be added later in one file without touching the card, the resolver, the copy or a test. No network path for it is built now, and no stub pretends to fetch one.
- public/comfort/content.json, 30 entries of {chapter, anchorVerseRef, anchorVerseText, devotion, prayer, tone} in en/es/pt/id, plus an optional dates block mapping a local date to a chapter override and one line of copy (the whole seasonal design for this path). A repo asset, edited centrally, deployed, say that plainly rather than calling it a pastor lever; the win is that a devotion change is a JSON edit instead of a TSX edit, not that it skips a deploy. The tone tag on each entry plus an exclusion list that ships empty is how a pastoral call about which verses belong on a crisis surface becomes a one-line data edit rather than a code change or a designer's decision. Non-negotiable condition: this is a new asset class under the /books service-worker trap, so it must be network-first with cache as offline fallback only, and CACHE_NAME, STATIC_CACHE and SW_VERSION bump together, or every returning user reads last month's devotion forever, invisibly, because the failure never shows on a fresh browser. That same condition is what makes lines.json and care-contacts.json reach phones at all on a redeploy, which is the only reason a repo asset is tolerable for a crisis number.
- public/comfort/flags.json, the crisis-language phrase list, per language, with an explicit false-positive exclusion list. A repo asset on purpose: it decides when a card about self-harm appears on someone's screen, so it goes through review and a deploy, never a form. Needs a named owner per language (see open decisions), and must never be machine-translated from English.
- The comfort push template set, if Ashley ever rules yes on a reminder, read from content.json at send time with a hardcoded fallback, rather than joining the seven-variant arrays in push-send.js that need a function redeploy.
- dw_comfort_daily, the reader's own lever, already synced through syncMisc, now a setting in More instead of an interruption mid-flow.
- dw_steady_card, the reader's own artifact, fill-only, tombstoned deletes.
- dw_crisis_region, device-local, derived, safe to lose, never synced: a cache so the right number survives a cold offline open, plus the country the reader picked for themselves if they used the picker.
- The campus chip, already user-owned, and now load-bearing, because it is what resolves the crisis line to the right country first.
- The ?comfort=1 link, a campus pastor's own distribution lever, and in this build the only genuinely self-serve thing in the whole design, because it needs nothing from anyone.
- Honest total, so the gap is scoped rather than discovered: for this build there is no pastor-editable anything in comfort. The comfort sectionOrder, the featured plan categories, the phrase-check threshold, the timezone allowlist, the analytics allowlist, the devotions, the crisis numbers and the care contacts are all developer or Ashley edits behind a deploy. Making the two that most deserve to move fast, a campus's care contact and its crisis number, actually self-serve is real, named, unbuilt work: extend CORNER_TYPES in intake-core.js, add a structured question set to StaffApp.tsx's campus job, widen the campus-content.js read shape past the generic note, and write the campus_content migration that does not exist in the repo. It is carried as an open decision with those four files named, not as a lever this design already has.

## Evidence

| Move | Source |
|---|---|
| Comfort reachable in one tap from every path, without changing the saved path | PERSONA-RESEARCH persona-research.md:144, "From every path: a persistent one-tap I need comfort now that opens comfort without switching the saved path. Crisis is not a persona someone chooses on a good day." Plus :176 build item 2, "Comfort from everywhere. One persistent tap... Smallest build, highest duty of care." |
| The door lives in the seam, which is already mounted above every screen on every path | Code: App.tsx:458 `{!IS_EMBEDDED && <SeamBar />}`, src/components/Seam.tsx. Verified, this is why the door works on Journal, Plans and Settings, not only Home, and why the embed gap is real and named. |
| The seam door is a button with a 44px hit area, not an anchor styled as a seam link | Code, verified: index.css:824-836 sets .dw-seam-bar to height: calc(34px + var(--safe-top)) and .dw-seam-link to 11px; index.css:876-881 forces color: var(--dw-gold) !important on :root .dw-seam-bar a.dw-seam-link. An 11px anchor in a 34px strip is not a tap target for the one tap that must never miss, and the gold rule would give the chrome two accents. |
| Kill the duplicate chapter, today's passage renders twice on one comfort screen | Code, verified: HomeScreen.tsx:1302-1305 pushes COMFORT_CHAPTERS[localDayIndex()] into heroChapterRefs when a comfort user has no plan and no slots, and HomeScreen.tsx:2892 then mounts <ComfortSection>, which renders the same chapter again at ComfortSection.tsx:81-175 with its own translation picker (:104-122) and its own Listen button (:129-146). Two copies of one passage fails "one passage, low stimulus" (research :145). |
| Pair the anchor verse to today's chapter | Code, verified: COMFORT_VERSES has 16 entries (ComfortVerseBannerSection.tsx:13-30) indexed by localDayIndex() % 16 at :46, while COMFORT_CHAPTERS has 30 indexed independently at ComfortSection.tsx:50, so the verse above the reading is routinely from a different book than the reading. |
| Audio first, one passage, low stimulus, no streak, no count, no "complete" | persona-research.md:145, "Delivery: slow audio first, one passage, low stimulus, dark and calm, no streak, no count, no complete." |
| Remove "Reading {x} of {y}" and "You're doing great" | Research :145 ("no streak, no count, no complete") and cross-cutting finding 6 at :12 ("Streaks work until they shame"). Verified live: comfort_reading_x_of_y at ComfortSection.tsx:96, comfort_doing_great at :300. |
| Remove the ask_lock daily-amount question and infer it instead | The path's own printed promise, i18n path_comfort_promise: "Comfort scriptures. Nothing else asked of you." Verified live at ComfortSection.tsx:297-356, after two chapters the app grades the reader and asks them to commit to a quota. Research :139: presence and acknowledgement over problem-solving. |
| The return-day element is a link, not a two-button question | Same printed promise, applied consistently: a two-button question ("same passage, or a new one?") is an ask, and the default, the same local-date rotation, already happens if the reader does nothing. Research :148 authorises testing a check-in, not asking a question; it stays behind the A/B flag either way. |
| Presence-first quick prompts, "Where is God in this," never "why is this happening" | persona-research.md:139, first clause, "Presence and acknowledgement over problem-solving (Lifeway: avoiding grief is 'always harmful')." This is the sourced half, and it governs prompts and tone. |
| No verse is excluded from the comfort rotation by this design; the tone tag exists so Ashley can exclude one if he wants to | Correction. An earlier draft excluded Romans 8:28 and Jeremiah 29:11 from the crisis surface and cited persona-research.md:139 for it. That line reads: "Positive religious coping (God's presence, benevolent reframing), which predicts better outcomes; negative coping ('punishing God', 'have more faith') predicts decline (Pargament & Koenig 2004, longitudinal)." "God works all things together for good" is benevolent reframing, which the research places in the positive bucket; the negative bucket is a punishing God and demands for more faith, and neither verse is either. The exclusion was a pastoral judgment wearing a citation that pointed the other way, so the citation is withdrawn and the exclusion with it. Both verses stay in, the tone tag makes any future exclusion a data edit, and the question goes to Ashley in the same sign-off as the 14 new pairings, his call as the pastor, on pastoral grounds, recorded as such. |
| The AI prompt gains "never diagnose, never tell them they need more faith, never suggest God is punishing them" | persona-research.md:139, and this is the one move the Pargament finding supports word for word, because "punishing God" and "have more faith" are its own two named examples of negative coping. An AI is exactly where both slip in. |
| Region-correct crisis line on the reading screen, and no number at all when the region is unknown | persona-research.md:141, "only 35% of mental-health apps show crisis resources in-app, 81% carry liability disclaimers instead, and some show the wrong country's hotline (Crisis journal, 2021)." Lines at :146, 988 US, 13 11 14 AU, 0800 543 354 NZ. |
| The resolver never reuses campusFromTimezone, and the timezone tier is an explicit zone allowlist | Code, verified: src/utils/geo.ts:26-33 returns "US" for any tz starting "America/." That is correct for a college house-ad and catastrophic for a crisis line, America/Sao_Paulo, America/Bogota and America/Mexico_City would all be told to call 988, and Futures has a Brazilian campus (tokens.ts, br-rio). |
| The resolved region is cached in localStorage, not sessionStorage, and paints on mount | Code, verified: src/utils/geo.ts:47-57 caches the IP country in sessionStorage, which does not survive a closed tab. The 2am cold offline open is the exact case this feature exists for, and it would resolve to unknown and show no number. |
| A campus we have no line for never terminates the resolve | Code, verified: src/data/tokens.ts:79, {id: 'other', name: 'Non-Futures Church', region: 'Other'}. A reader in Atlanta who chose that campus would see no number, when IP would have given 988. Also verified: CAMPUSES regions are "Australia," "North America," "Indonesia," "Brazil," "Other," continent labels, not countries, which is why the resolver keys on the campus id's country prefix (au-, us-, br-, id-) instead. |
| The ?comfort=1 door suppresses every first-paint overlay, not just the persona stamp | Code, verified: App.tsx:35 SERMON_DEEP_LINK is the existing pattern; App.tsx:480 gates EmailGate on it, :498 gates CookieConsent on !needsPushOnboarding && !showPathAsk, and :236-239 gates Day1Landing on it. Without an equivalent COMFORT_DEEP_LINK, the link a pastor texts to a hospital car park opens under a cookie banner and can pick up the install prompt and the Day 1 landing, making "Nothing is asked of you here" false on the first paint. |
| The care contact and the crisis number are bundled repo assets in this build, not a self-serve staff lever | Correction, verified in code. An earlier draft claimed they were campus_content rows written through the existing /staff form. They are not, and no such lever exists: netlify/functions/lib/intake-core.js:40 hardcodes CORNER_TYPES to announcement/note/prayer_point/essay and silently coerces anything else to "announcement" at :301; src/staff/StaffApp.tsx:367 is a single free-text campus-corner question with no structured fields; netlify/functions/campus-content.js:22-45 returns a generic {id,type,title,content,author,date} note and its POST returns 403 pointing at /staff; and grep finds no crisis_line or care_contact anywhere in the repo, with campus_content itself having no migration in supabase/migrations, only an index at supabase-indexes.sql:56-61. So both live in public/comfort/*.json, both need a deploy, and the four files it would take to make them self-serve are named in the open decisions instead of assumed. |
| One short honest disclosure beside the resource, not a liability wall | persona-research.md:146, "Disclose on first use that this is scripture and a church, not counselling," read against the 81%-carry-disclaimers-instead-of-resources finding, which is why it is one sentence next to the number rather than a paragraph in front of it. |
| A safety card that appears beside the answer and never blocks it | persona-research.md:146, "if the person types crisis language into Bible AI or a prayer request, confirm gently, then show the region-correct line... the Woebot and Wysa pattern." Live gap: there is no crisis handling anywhere in the AI path today; the softer comfort tone at persona-config.ts:550-553 is the only safety-adjacent behaviour that exists, and a tone is not a safety feature. |
| Private prayer request to a real campus pastor, off the public wall, with no email gate | persona-research.md:147, "prayer request to a real campus pastor." Live gap: MoreScreen.tsx:810 sends every campus in four countries to one hardcoded mailto:care@futures.church, and MoreScreen.tsx:785 gates the whole block on persona === 'comfort' so nobody else can find it. |
| The "Talk to a pastor" button does not render until a named person is receiving | The design's own top risk, duty of care created and not met, plus the standing rule never to point a person at a control that cannot act. A dead or greyed CTA on a crisis screen is a second disappointment to the reader least able to absorb one, so the card ships as crisis line plus the campus's contact plus one honest sentence, and the button arrives with the recipient. This matters more now that adding a recipient is a deploy: most campuses will sit in the no-button state for a while, and the card has to be right in that state. |
| Errors render under the button that was pressed, with noValidate on the form | Standing form rule: iOS native validation is silent, so a required-field block with no visible message reads as a broken Send, and a crisis message that silently fails validation is the worst version of that bug. |
| The steady card, who you'll call, what steadies you, a verse you chose | persona-research.md:147, "a co-created when it's bad card (who to call, what steadies you, a verse you chose), which was Wysa's most-used feature (over 49% of crisis users)." |
| No push notification for comfort | persona-research.md:12, "Guilt-framed streak reminders drive notification opt-out and uninstall." Already live at App.tsx:311-312; this design keeps it rather than carving an exception. |
| No graduation prompt, no "Feeling Stronger?," on any surface old or new | Ruling: feedback_daily_word_today_rebuild_rejected, PHASE 2, PR #82, removed for good, never re-add. Locked by pathway-upgrades.test.ts. The research independently confirms it at :143, "there is no published evidence on a comfort-to-discipleship transition at all." |
| No book cards anywhere on the comfort path, including the done state | The path promises nothing is asked; a promo row is an ask with a price attached, and the done line should be the last thing a person in crisis reads. Live: "book_cards" is the last key in the comfort sectionOrder at persona-config.ts:510-519 and comes out. |
| The comfort door and Comfort Now never stamp a path choice | Ruling: saveSetup gates on source !== 'default'; only onboarding/settings/upgrade count as a real choice. A crisis tap is not a considered choice, so this surface never calls saveSetup at all. |
| Comfort Now hosted with useSubView alone, mounted always with a live open prop | Rulings: 28-agent review findings 1 and 2, useSubView plus useModalA11y/aria-modal breaks keyboard and back-button navigation through nested focus traps; a conditionally-mounted useSubView card orphans a history entry per close and breaks Android back. |
| The arrival-open comfort seed stays credit-free | Ruling: the arrival-open seed for congregation/deeper_study/pastor_leader/comfort must be persona-gated and credit-free, it must bypass handleRead and never route through it. |
| comfortMode toolbar stays Note + Close only | Ruling: comfortMode toolbar is Note+Close only, verified live at HighlightToolbar.tsx:164-185, unchanged by this design. |
| Comfort is never shown the asked-once Door 3 screen; the sheet stays five cards at ~481px with no copy changes | Rulings: project_daily_word_choose_your_path, Door 3 never shown for comfort; the sheet must fit a phone without scrolling, typographic compaction only. Hence the door is in the seam, not a sixth card. |
| Repaint comfort onto the locked palette, flat, with no gradients | Locked look: light default, deep terracotta clay #A8552F on ivory #FAF6EF, dark-mode override rejected, paper-mode reading panel, quiet and generous with one accent and no decorative gradients. Verified live: comfort is the only path still wearing pre-relook indigo, rgba(92,107,192,...) at ComfortSection.tsx:167/181/219 and ComfortVerseBannerSection.tsx:52, #5C6BC0 at :85, #4A6070 at ComfortSection.tsx:133, #37474F at ComfortVerseBannerSection.tsx:110, and three of those are linear-gradient fills, which is why the repaint flattens rather than re-tints them. |
| Low stimulus achieved by fewer elements on the ivory canvas, not by a dark surface | The research asks for "dark and calm" (:145); the locked look rejects any dark-mode override and keeps light as default with the white paper reading panel. Ruling beats research, stated plainly rather than quietly ignored. |
| Comfort content moved to network-first JSON | Ruling: reference_daily_word_sw_books_cache_trap, any content edit is invisible to returning users unless that asset class is network-first with cache as offline fallback only; bump CACHE_NAME/STATIC_CACHE and SW_VERSION together. This now also carries the crisis number, which is why the condition is non-negotiable rather than hygiene. |
| The steady card is a fill-only synced misc field that pushes on write | Ruling: project_daily_word_platform_polish, applyMisc is fill-only, cloud must never clobber newer local content, authored keys call pushNow(); deletes are tombstones; never rebuild a synced dw_* record from React state (PR #64). Verified live: MISC_KEYS at cloudSync.ts:35, AUTHORED_MISC at :69. |
| Plan/day logic uses the local date | Ruling: DATE-AXIS, toLocaleDateString('en-CA') matching calcPlanDay's local midnight, never UTC. Verified correct and preserved at ComfortSection.tsx:20-23. |
| The 14 new anchor verses need Ashley's sign-off before ship, and the two-verse question rides in the same sign-off | Ruling: translated/new content is Claude-drafted and Ashley approves before ship, except where explicitly delegated, he waived review on the comfort translations, not on new English. Pairing verse to chapter takes the list from 16 to 30, so 14 pairings are new English; whether Romans 8:28 and Jeremiah 29:11 belong on a crisis surface is a pastoral question that goes to him on the same sheet, with the misapplied citation withdrawn and no default exclusion in the code. |
| Instrumentation named and built before anything else | persona-research.md:175, build item 1, "Instrumentation. D1/D7/D30 by path, session length, completion, reminder opt-out. Nothing above can be tested without it, and no public source will ever supply it." Plus cross-cutting 7 at :13, which names it the single biggest gap. Verified trap: TRACKED_EVENTS is an allowlist at analytics.ts:31-38 and trackActivity returns silently at :45. |
| Every reshape of the opening screen behind a deploy preview Ashley approves | Ruling: feedback_daily_word_today_rebuild_rejected, 1 Sep 2026, line 11, never merge a big IA/visual rebuild of the opening screen without his preview and explicit approval; a PR can sit open awaiting his look. |

## Open decisions

1. The crisis lines per country. US 988, AU 13 11 14 and NZ 0800 543 354 are drafted. Futures has 5 campuses in Indonesia and 1 in Brazil and the research supplies no line for either, so an id or br reader lands in the honest "we know your country and have no number for it" state and sees the local-emergency sentence plus the directory link. Ashley supplies those two lines, or rules that those regions stay in that state. Until he rules, the fallback is structural rather than a TODO, no code path can produce 988 for them, by test.
2. Who receives "Talk to a pastor" at each campus, by name, and what response promise the app is allowed to print. "Someone from {campus} will read this" is the safe default; "someone will get back to you" is a promise the app cannot keep at 2am on its own. This gates the button, not the card: until a named recipient exists for a campus, that campus's card renders the crisis line, the campus's contact and the honest sentence, with no button at all, so the rest of the design ships whole and the button appears campus by campus. Note the cost of the correction below: each campus added is a commit and a deploy by Ashley, so this list is a queue on his desk, and comfort_care_recipient_missing measures it.
3. Whether to build the staff lever for care contacts and crisis numbers at all, the thing an earlier draft of this design wrongly said already existed. Making it real is four named pieces of work: extend CORNER_TYPES in netlify/functions/lib/intake-core.js:40 (and stop the silent coercion to "announcement" at :301 for unknown types); add a structured question set to the campus job in src/staff/StaffApp.tsx (name, inbox, response promise, number, tel: href, hours sentence) instead of one free-text box; widen the read shape in netlify/functions/campus-content.js:22-45 past the generic note; and write the campus_content migration that does not exist in supabase/migrations today, only an index at supabase-indexes.sql:56-61. It is real dev work and it is out of scope for this build. Three answers are all legitimate, build it as its own PR after comfort ships, accept the deploy bottleneck permanently, or build it only for the crisis number and leave care contacts with Ashley. What is not legitimate is shipping the design while calling it a lever it already has.
4. If that lever is ever built, who at each campus may write those rows, because a wrong number entered there reaches phones within a session with no deploy and no review. That is a genuine access-control question rather than a convenience one, and it does not need answering unless and until the previous decision is yes.
5. Whether the pastoral request sends without an email address. Designed here to send, an email gate in front of a cry for help is indefensible, and it is a deliberate departure from the prayer-wall pattern, which blocks on requireEmail(). Confirm.
6. Whether comfort gets any push at all. Designed here as none, matching the live exclusion. Two of the three source designs proposed a single opt-in, one-shot, in-context check-in with no streak language, offered at the done state. The copy is drafted and it is one small PR away. It crosses a standing line, so it is his call.
7. Whether the comfort door in the seam is visible to every persona from day one, or only after someone has used comfort once. Day one is the recommendation, the whole point is that it is already there before it is needed, but it puts a word about crisis on a pastor's and a new believer's screen every day.
8. The seam is hidden when IS_EMBEDDED (App.tsx:458), so the futures.church iframe embed of Daily Word would have no comfort door. Add one there, or accept the gap.
9. The 14 new anchor verses. Pairing verse to chapter takes the list from 16 to 30, so 14 pairings are Claude-drafted new English and need his sign-off; his waiver covered the comfort translations, not new English.
10. Do Romans 8:28 and Jeremiah 29:11 belong on the comfort surface? This design ships with both in, and says plainly why the question is here at all: an earlier draft excluded them and cited persona-research.md:139 (Pargament) for it, but that line files benevolent reframing under positive coping and defines negative coping as a punishing God and demands for more faith, neither of which these verses are. The citation was withdrawn. The pastoral argument stands on its own feet and is worth his ruling, in acute grief, "God works all things for good" and "plans to prosper you" are among the verses most often heard as dismissal, but it is a pastor's judgment, not a research finding, and it should be recorded as his. Either answer is a tone tag on two entries in content.json, so the code does not care.
11. Who may edit flags.json, the crisis-language word list, per language. It stays a repo asset behind review and a deploy precisely because it decides when a card about self-harm appears on someone's screen, but it needs a named reviewer who speaks each language, or the id and pt lists cannot ship at all and the card simply never fires in those languages.
12. Whether dw_steady_card syncs to the cloud at all. It will hold a phone number, the most sensitive record this app has ever held. Default here: yes, through misc, fill-only, tombstoned deletes. Say if it should be device-only.
13. Whether a person who uses the comfort door three times in one week gets any human follow-up, and from whom. If yes, it comes from a pastor, not from the app.
14. Whether the seasonal hard-dates block in content.json is his alone. As designed it is a repo edit and therefore centrally authored; a campus-local version would depend on the staff-lever decision above.

## Risks

- Duty of care created and not met. A private "Talk to a pastor" at 2am with nobody reading until Tuesday is worse than not offering it, to the people least able to absorb a second disappointment. Closed structurally rather than by intent: the button does not render for a campus with no named recipient, the copy promises a reader and never a time, and the crisis line sits on the card whether or not a pastor is behind it.
- Showing the wrong country's number, the worst failure in the design and the exact one the research names. Three live code paths would have produced it and all three are now closed by design: campusFromTimezone (geo.ts:26-33) maps every America/* zone to US and is never called by the resolver; the resolver keys on the campus id's country prefix rather than the continent label in CAMPUSES; and no branch anywhere may return a number the resolver is not certain of. comfort_line_shown's unknown rate is watched from day one, and a test asserts no input path returns 988 unless the country is US.
- The number missing at exactly the moment it is needed. detectCountry() caches in sessionStorage (geo.ts:47-57), which is gone on a cold open. Closed by painting from bundled data plus dw_crisis_region in localStorage on mount, and never awaiting anything before the card renders. comfort_offline_render {had_line} is the event that must never be zero-truthy.
- A stale crisis number, and no way for anyone but Ashley to fix it. This is the honest replacement for a risk an earlier draft got backwards: it warned that a live-editable number was a fast lever pointed at a sensitive target, when in fact no such lever exists. The real exposure is the opposite one, lines.json and care-contacts.json are repo assets, so a number that changes overnight is wrong on every phone until Ashley ships, a pastor who leaves is still the named recipient until Ashley ships, and every new campus sits in the no-button state until Ashley ships. Two mitigations and one acceptance: the service-worker rule makes a redeploy actually reach phones, comfort_care_recipient_missing measures the queue, and the deploy bottleneck is accepted for this build with the staff lever scoped as its own decision.
- A silent resolve failure caused by a data value. A saved campus of "Non-Futures Church" (tokens.ts:79) or any campus whose country has no mapping now falls through to IP and timezone instead of ending the resolve; only a total absence of signal reaches the no-number state.
- The comfort deep link landing on a consent dialog. ?comfort=1 opens on a cold device where CookieConsent, EmailGate, PWAInstall, EmailNudge and Day1Landing are all live; without COMFORT_DEEP_LINK gating them, the screen that says "nothing is asked of you here" opens with three things asked. Consequence accepted and stated: with consent suppressed, that session fires no analytics at all, so the deeplink count is a floor.
- Citing research for a decision the research does not support. It already happened once in this design, a Pargament line about negative religious coping was used to justify removing two verses that the same line's taxonomy would file under positive coping, and it survived several passes because a real citation was attached to it. The correction here is not just the two verses: any move in this design whose only support is a citation should be readable back to the quoted line, and where it is a judgment it now says so. A misapplied citation is worse than an unsupported opinion, because nobody argues with it.
- A missed true positive in the safety check, which is far worse than a false one. The word list must be per-language and reviewed by a speaker, never machine-translated from English, "aku ingin mengakhiri semuanya" is not reachable from an English list. The confirm does not fire at all for a language whose list is unapproved.
- A false-positive safety card reading as surveillance, "I'm dying of embarrassment" triggering a suicide line is patronising and drives people off the feature. It never blocks, never sends, never stores the text, one tap dismisses it for that conversation, and the dismissal rate is the tuning signal rather than the success metric.
- Anything from this leaking to the public prayer wall. Separate table, separate function, migration in the repo, and a check that specifically confirms nothing appears on the wall, the existing prayer-wall function has no private flag and everything inserted there is readable. Worth noting while writing that migration that campus_content has none in the repo at all, only an index in supabase-indexes.sql.
- Comfort Now leaking into another persona's progress. It is reachable from four paths; if it stamps dw_reading_done, advances a plan day or writes dw_setup, it corrupts the exact records the arrival-seed and never-rebuild-from-React-state rulings exist to protect. This needs a byte-identical assertion test, not a code review.
- Removing the ask_lock step removes the only place dw_comfort_daily was ever set (ComfortSection.tsx:315). If the inference never fires, the value silently stays 0 and the tomorrow line never appears, which is why comfort_daily_inferred is on the event list.
- The service-worker content trap, now load-bearing for safety rather than just for devotions. Moving devotions, verses, crisis lines and care contacts to JSON without making that class network-first means every returning user reads stale content indefinitely, including a stale phone number, and the failure is invisible from a fresh browser, which is exactly how it was missed the first time.
- The Comfort Home reshape is an IA change to an opening screen, and the last one was reverted the same night for being "completely stripped." This one removes a literal duplicate and adds warmth, care and a person, it is richer and clearer, not thinner, but it still ships behind a preview link and does not merge without his word.
- Comfort Now opening as a full-screen host over Home is precisely the pattern that produced the two back-button findings. useSubView alone, always mounted with a live open prop, and an Android back pass in the preview before he looks at it.
- The comfort path will under-perform every other path on retention charts because it deliberately has no reminder, no streak and no graduation. If that is read as failure in a dashboard review, the fix suggested will be to add a nudge, which is the one thing this persona must never get. Write the expectation down before the first rollup runs.
- Reminder copy drift, if a comfort push is ever approved. Comfort's templates would be one PR away from picking up "don't break your streak." A test asserting the comfort set contains none of day, streak, missed, catch up, or back is cheap insurance.
- The steady card riding in the misc JSONB column with a phone number in it. applyMisc is fill-only and deletes are tombstones per the rulings, but this is the first genuinely sensitive record the app has held.

## Build steps

| Step | Files | Check |
|---|---|---|
| PR A, the subtraction. Steps 1 to 3 ship as one branch and one deploy preview, on their own, and do not wait on any safety decision. This is the biggest user win in the design and the part with no open questions left in it. | One branch, one PR; the three steps below | Ashley opens the preview and sees the comfort screen with one chapter on it instead of two. |
| 1. Instrumentation first, as the research orders it. Add every comfort_* event to the allowlist, add a path detail to app_open, add a typed helper, and add a per-path nightly rollup to the dashboard. | src/utils/analytics.ts (TRACKED_EVENTS, lines 31-38); src/utils/comfort-events.ts (new); netlify/functions/analytics-dashboard.js; src/components/AnalyticsDashboard.tsx | npx vitest run with a spec asserting every name in comfort-events.ts is present in TRACKED_EVENTS. A name missing from the allowlist is dropped silently at analytics.ts:45 and the dashboard shows a clean zero, so assert presence, never the absence of an error. Then drive one scripted comfort session on localhost and confirm the sequence in the Supabase activity table. |
| 2. Reshape comfort content into one entry per day and move it to network-first JSON: 30 entries of {chapter, anchorVerseRef, anchorVerseText, devotion, prayer, tone} in en/es/pt/id plus the optional dates block, so verse and chapter always come from the same entry. Every entry gets a tone tag and the crisis surface reads an exclusion list that ships empty, no verse is excluded by this build, and Romans 8:28 and Jeremiah 29:11 stay in. Keep the bundled TS export as the offline fallback. | public/comfort/content.json (new); src/data/comfort.ts (becomes a typed loader with the bundled array as offline fallback, plus an EXCLUDED_TONES constant initialised to an empty array with a comment naming it as Ashley's lever); src/sections/ComfortVerseBannerSection.tsx (COMFORT_VERSES + GUIDED_PRAYERS move out of the render file, lines 13-37); public/sw.js (network-first for /comfort/*, bump CACHE_NAME + STATIC_CACHE + SW_VERSION together) | npx vitest run src/data/comfort.test.ts, 30 entries, every entry has an anchor verse, a devotion and a tone in all four languages, localDayIndex() returns verse and chapter from the same entry, a missing JSON falls back to the bundled data, and the chosen verse and chapter for a fixed local date are unchanged by the move (the localDayIndex invariant must not shift by a day). Assert explicitly that EXCLUDED_TONES is empty and that all 16 existing verses including Romans 8:28 and Jeremiah 29:11 survive the reshape, a regression test against this design's own earlier draft, which cut them on a citation that pointed the other way. Then the real check: edit one devotion, deploy, and confirm the new text appears on a browser that already has the app cached, the /books trap only shows itself on a warm cache. |
| 3. Kill the duplicate. Make the hero the only chapter surface: keep the heroChapterRefs comfort fallback and strip ComfortSection's own chapter render, its translation picker and its Listen button. ComfortSection becomes the after-reading frame, devotion, done line, inferred tomorrow line, with the counter, the grading line and the ask_lock quota question removed, and the thought control never shown when a chapter has no devotion (which also fixes the setState-during-render at ComfortSection.tsx:212). Repaint both files onto the locked tokens as flat panels, and drop book_cards from the comfort sectionOrder entirely. | src/components/ComfortSection.tsx; src/sections/ComfortVerseBannerSection.tsx; src/screens/HomeScreen.tsx (comfort render block ~2887-2917); src/utils/persona-config.ts (comfort sectionOrder lines 510-519: drop 'hero_audio', 'scripture', 'comfort_card', 'book_cards'; rename 'comfort_scripture' to 'comfort_after_reading'; add 'comfort_care', 'comfort_steady', 'comfort_done'); HomeScreen UpgradePromptCard mount (gate out for comfort) | npx vitest run src/components/ComfortSection.test.tsx, "renders today's chapter exactly once on the comfort home," "asks no question after reading," "shows no count," "never renders comfort_reading_x_of_y or comfort_doing_great," "renders no book cards in any state," "the done line is the last child of the comfort column," "infers dw_comfort_daily from chapters read on two separate days," "no thought control when the chapter has no devotion." Then grep -rn '92,107,192\|5C6BC0\|4A6070\|37474F\|linear-gradient' src/components/ComfortSection.tsx src/sections/ComfortVerseBannerSection.tsx returns nothing, npm run build is clean, the existing pathway-upgrades test still passes, and a live persona pass in the dw-dev preview at 390px with dw_setup={persona:'comfort',source:'settings'}. |
| GATE, PR B does not open until two things are true: the named-recipient decision is answered for at least one campus (or accepted as button-dark everywhere), and the crisis lines Ashley is supplying for id/br are either given or ruled to stay in the no-number state. Note what this gate is not waiting on: the staff self-serve lever for those two values does not exist and is not built here, so both arrive as entries Ashley writes into two bundled JSON files and ships. Steps 4 to 11 are the safety plumbing, where a wrong answer is worse than no feature, and none of it is needed to ship PR A. | None, this is a decision gate, recorded so the sequencing is deliberate rather than accidental | Written answers to open decisions 1 and 2, and an explicit yes/no/later on the staff-lever decision so it is not silently assumed again. PR A can be live in production while this gate is still closed. |
| 4. Crisis lines data and the region resolver, campus with a line first, IP second, timezone allowlist third, picker fourth, no default ever, and no tier allowed to terminate the chain early. Both data files are bundled repo assets read through one resolveCareSources() seam; no live/network source is built, and no stub pretends to fetch one. | src/utils/crisis-lines.ts (new resolver, writes its own tz allowlist, never imports campusFromTimezone from geo.ts); src/utils/care-sources.ts (new, resolveCareSources() reading the two bundled files, the single seam a live source would later replace); public/comfort/lines.json (new); public/comfort/care-contacts.json (new, seeded with whatever campuses have named recipients, likely one); src/utils/storage.ts (dw_crisis_region key constant, device-local, not added to the misc sync list); src/data/tokens.ts (resolve on the campus id country prefix, not the region label) | npx vitest run src/utils/crisis-lines.test.ts, table-driven over all 22 campuses plus no-campus: "a campus with a line on file beats IP," "a campus of other falls through to IP," "an Indonesian or Brazilian campus reaches known-no-line and never falls through to a guess," "IP beats timezone," "America/Sao_Paulo returns unknown," "America/Bogota returns unknown," "America/Mexico_City returns unknown," "Australia/Adelaide returns the AU line," "Pacific/Auckland returns the NZ line," "an unrecognised country code never falls back to US," "an unknown region returns no number at all." Assert explicitly that no input path returns 988 unless the country is US; add an import-graph assertion that crisis-lines.ts does not import geo.ts's campusFromTimezone; and add one asserting resolveCareSources() makes no network call in this build, so the seam cannot quietly grow a fetch the card then waits on. Then a persistence test: resolve once, clear sessionStorage, simulate offline, remount, and assert the card still paints the same number from dw_crisis_region with zero fetches. |
| 5. The care card and the Who-to-call sheet, on the reading screen and in More for every persona, fully i18n-keyed, with the pastor CTA rendered only where a named recipient exists. New CSS prefix dw-cmf-* (dw-cp-* is ChoosePathSheet, dw-path-* is the Plans chooser). | src/components/ComfortCareCard.tsx (new); src/components/CrisisLinesSheet.tsx (new); src/screens/MoreScreen.tsx (replace the hardcoded English block at 784-841 and ungate it from persona === 'comfort'); src/utils/i18n.ts; src/index.css | npx vitest run, "renders the crisis line synchronously on mount with no pending promise," "renders no pastor button when the campus has no entry in care-contacts.json," "never renders a disabled or greyed pastor button," "renders the campus contact only when one is on file and the honest sentence when not." Because most campuses will have no recipient at first, make the no-button state the default fixture in these tests, not the exception. Then npm run build, open the preview with a US campus and again with an AU campus and read the numbers off the screen, throttle to offline and confirm the number and the tel: link still render from local data. |
| 6. The seam comfort door, the Comfort Now surface, the More row and the ?comfort=1 deep link. useSubView alone, always mounted with a live open prop, and the deep link gates every first-paint overlay. | src/components/Seam.tsx (a <button class="dw-cmf-seam">, 44px hit area, muted, not an a.dw-seam-link, which index.css:876-881 forces gold); src/components/ComfortNow.tsx (new); src/App.tsx (COMFORT_DEEP_LINK beside SERMON_DEEP_LINK at :35, writing nothing to localStorage; gate CookieConsent at :498, EmailGate at :480, PWAInstall, EmailNudge and Day1Landing at :236-239 off it; mount ComfortNow always); src/screens/MoreScreen.tsx (top row); src/index.css (dw-cmf-seam, and the <390px rule hiding .dw-seam-name) | npx vitest run src/components/ComfortNow.test.tsx, "opens without writing dw_setup," "stays mounted while closed and paints nothing," "adds exactly one history entry per open," "ten open/close cycles leave history.length unchanged," "never calls saveSetup or handleRead," and for the link: "COMFORT_DEEP_LINK writes nothing to localStorage," "CookieConsent, EmailGate, PWAInstall, EmailNudge and Day1Landing all render null under it." Then the important manual ones: snapshot dw_setup, dw_reading_done and dw_pathway_progress, open Comfort Now from the congregation path, read, close, and assert all three are byte-identical; open ?comfort=1 in a clean private window and confirm the verse is the only thing on the first paint; measure the seam button's hit box at 375px and confirm it is at least 44px and not gold; an Android back pass on each of the four paths. |
| 7. The steady card, synced correctly. | src/components/SteadyCard.tsx (new); src/utils/storage.ts (dw_steady_card key constant); src/utils/cloudSync.ts (add to MISC_KEYS at :35 and to the AUTHORED_MISC set at :69; writes call pushNow()) | npx vitest run src/utils/cloudSync.test.ts, a new case asserting a cloud dw_steady_card never overwrites a newer local one, matching the existing dw_user_story behaviour, and that every write calls pushNow(). Then fill a slot on device A, flush, and confirm it appears on device B; edit on B while A holds a newer value and confirm fill-only holds. Merge into what is in localStorage; never rebuild the record from React state. |
| 8. The safety flow: the client-side language check plus the card, on Bible AI, the prayer-request submit and the journal save. Never blocks, never logs the text. Harden the comfort AI prompt and swap the quick prompts to presence-only. | src/utils/crisis-language.ts (new); public/comfort/flags.json (new, per-language list + exclusions, repo asset by design); src/components/BibleAI.tsx (render above the streaming answer; the once-only first-use disclosure; the three comfort quick prompts); netlify/functions/claude.js (flagged-turn system instruction); src/utils/persona-config.ts (systemPromptAddition, lines 550-553, add "never diagnose" and "never tell them they need more faith or that God is punishing them," which is the one place the Pargament negative-coping examples apply verbatim); src/screens/MessagesScreen.tsx; src/screens/JournalScreen.tsx | npx vitest run src/utils/crisis-language.test.ts against a 40-phrase fixture including at least 15 false-positive traps ("I'm dying to know," "this deadline is killing me," "killer worship set," "dead tired," "I could murder a coffee") alongside true positives in en/es/pt/id. Assert the detector returns a reason code and never the input text, and that its input never reaches fetch, localStorage or an analytics detail field. Assert the comfort quick prompts ask where God is and never why this is happening. Then in preview: a flagged phrase still sends, the card appears once, dismiss does not re-fire in the same conversation, the card shows no pastor button for a campus with no recipient, and a language with no approved list fires nothing. |
| 9. The private pastoral request, a route that is not the prayer wall, with no email gate, and a form that fails visibly. | src/components/ReachPastor.tsx (new; form is noValidate, the empty-field line and the failure line both render directly under Send with the crisis number beneath); netlify/functions/pastoral-request.js (new; resolves the destination inbox from public/comfort/care-contacts.json, and refuses to send rather than falling back to a wrong inbox when the campus has no entry); supabase/migrations/<ts>_pastoral_requests.sql (new, in the repo per the standing rule); src/screens/HomeScreen.tsx and ComfortNow (mount) | netlify dev, POST a test request, assert a 200 and that the row lands in pastoral_requests addressed to the inbox that campus's care-contacts.json entry names, then load the public prayer wall and confirm it is not there. POST for a campus with no entry and assert it refuses cleanly rather than routing to care@futures.church silently. Send with no email on file and confirm it still sends. Press Send with an empty textarea and confirm one visible line appears under the button (and that no silent native validation fires). Record the shared mail account in the subscriptions register before the first send. |
| 10. The "Read a different passage" link, behind a flag, as an A/B, the one element with no evidence behind it. | src/components/ComfortSection.tsx (the link above the verse); the existing flag mechanism | npx vitest run, the link never renders on a first-ever session, is a single control and not a two-button question, never references a gap or a count, never renders the words "still here," and resolves from cache when offline. |
| 11. Lock the closed doors with tests so no future card re-opens one. | src/utils/pathway-upgrades.test.ts (extend); src/components/ComfortNow.test.tsx; src/components/HighlightToolbar.test.tsx (new or extend); src/utils/crisis-lines.test.ts; src/data/comfort.test.ts | npx vitest run: no comfort entry in UPGRADE_CONDITIONS, no graduation copy on any comfort surface including the new ones, no book-card or promo component on any comfort surface, comfortMode renders Note and Close and nothing else, Comfort Now never calls saveSetup or handleRead, the crisis-line resolver never returns a number for a region that has none and never returns 988 outside the US, no comfort surface contains a linear-gradient, and the verse rotation still contains every verse it contained before this work, including the two an earlier draft cut. |
| 12. One deploy preview per PR, and wait. PR A reshapes an opening screen and PR B adds a door to the seam on five paths, the same class as the rebuild reverted on 1 September, so neither merges on anyone else's judgment. | Two branches, two PRs, no merge to main; plus a two-minute walkthrough note per PR: for A, comfort home before/after (the duplicate gone, the done line last) and the one-line note that no verse was removed and why the question is his; for B, the seam door from congregation, the care card in US and AU and with no recipient named, ?comfort=1 in a clean private window, the safety card firing and being dismissed, and the offline state | Ashley opens the preview on his phone, walks the comfort path and the comfort-from-congregation path, and says yes in writing. Each PR sits open until he does. Two things to put in front of him in the same message because they are his calls and the code is neutral on both: whether Romans 8:28 and Jeremiah 29:11 belong on a crisis surface (both currently in), and whether the staff self-serve lever for crisis numbers and care contacts is worth building as its own PR. Note that push cannot be verified on a preview at all, pushSupported() allowlists futuresdailyword.com, www and localhost only, which is moot here because no comfort push is built, and must stay moot unless he rules otherwise. |
</content>
