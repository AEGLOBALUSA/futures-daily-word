# Daily Word experience design, 10 Sep 2026

Status: the design workflow (`docs/experience-design/workflow-dw-experience-design.js`, run `wf_8b85eee9-12c`) was stopped by Ashley on the night of 10 Sep 2026 to move to another subscription. This document records what finished, what did not, the decisions that are his, and the build order. The per-path specifications sit beside it in `docs/experience-design/`. The research every design traces to is `docs/PERSONA-RESEARCH-2026-09-10.md`. The rulings every design obeys are `docs/experience-design/rulings-packet-2026-09-10.md` and the distilled checklist `docs/experience-design/raw/rulings--a0c828.json`.

## What finished and what did not

| Item | Designers | Judge | UX rulings | Verified | Repaired | Spec |
|---|---|---|---|---|---|---|
| comfort | 3 | 9.2 / 8.1 / 7.6 | 10 findings | 3 lenses, 1 issue | yes | `experience-design/comfort.md` |
| pastor_leader | 3 (ran twice) | 8.9 / 8.6 / 8.4 | 12 findings | 3 lenses, 1 issue | yes | `experience-design/pastor_leader.md` |
| deeper_study | 3 | 8.4 / 7.9 / 7.4 | 13 findings | 3 lenses, 0 issues | yes | `experience-design/deeper_study.md` |
| new_to_faith | 3 | 8.9 / 8.1 / 6.5 | not run | not run | not run | `experience-design/new_to_faith.md` (judged only) |
| congregation | 0 (designer died) | no | no | no | no | none; the research brief section stands |
| comfort_everywhere | 0 | | | | | folded into the comfort design, which covers the door on every path |
| reminders_and_grace | 0 | | | | | partial: each path design carries its own reminder rules, reconciled below |
| instrumentation | 0 | | | | | partial: each path design names its events, reconciled below |
| seasonal_reads | 0 | | | | | none; the research brief section stands |
| completeness critic | not run | | | | | this document does the reconciliation by hand |

The raw agent results, fifty files, are in `docs/experience-design/raw/` with an index. Nothing in them was edited.

## The thesis the four designs share

The five doors are right and the research does not argue for more. What every finished design found, independently, is that the live app breaks its own promise on the return visit: it shows the chapter twice, counts app opens as reading days, credits a plan day on a tap that was meant to be free, and greets a devout reader with a flame and "You're amazing". The designs are richer and clearer, never stripped. Each one removes a duplicate, names the tools that were hidden, makes the numbers true before it shows one, and keeps the passage as the whole panel. Comfort is one tap from everywhere and never asks for anything.

## Ten moves every finished design makes, and their evidence

| # | Move | Evidence |
|---|---|---|
| 1 | Instrumentation first: every event carries `path` (and `journey_day` on the 40-day path); D1/D7/D30 by path; nothing in the research can be tested without it | research, cross-cutting point 7 |
| 2 | One completion path: remove the plan-day credit from `handleRead` (HomeScreen.tsx:754-755) on every path; completion numbers will drop the week it ships and that is the fix working | deeper_study and pastor designs, verified live |
| 3 | A read day is a genuine reading interaction, never a mount; `dw_read_days` on the local en-CA date axis replaces the streak as the number the greeting prints | pastor and new_to_faith designs; `recordStreakToday` fires on every mount (HomeScreen.tsx:786-795) |
| 4 | Kill the duplicate chapter: the hero is the only chapter surface; the plan section renders only passages not already in `heroChapterRefs` | deeper_study, pastor and comfort designs all found it |
| 5 | Sermon Notes card sits below the reading for the four returning paths and above only on new_to_faith inside the Sunday window | Ashley's demotion ruling; the 9 Sep comment at HomeScreen.tsx:1806 keeps it on top and conflicts |
| 6 | The flame emoji and "You're amazing" go, app-wide, glyph only; milestone words stay | research on guilt-framed streaks; three call sites (GreetingSection.tsx:53, the milestone overlay, DoneCelebration) |
| 7 | A provenance line under every commentary and lexicon result, and the AI paragraph in its own labelled block below the sourced ones, never inside their tab strip | research persona 5, "a name is not evidence"; six public-domain commentaries are already loaded (src/utils/study.ts:105-112) and wired only to the pastor prep sheet |
| 8 | Comfort reachable from every path through one seam door that opens comfort as a sub-view and touches no saved path, plan, or completion record | research persona 6; comfort design screens 2 and 3 |
| 9 | Reminders: one a day, the hour inferred from a local open-time log and offered once after five to seven opens, neutral words, es and pt templates added (push-send.js has en and id only), no Sunday push for pastors | research persona 2; Duolingo timing, secondary |
| 10 | Every new i18n key ships with en, es, pt and id in the same commit, or `t()` prints the raw key to Futuros readers | i18n.ts convention |

## Where the designs disagreed, and the choice

| Conflict | Designs | Choice |
|---|---|---|
| Emoji removal | pastor: app-wide; deeper_study: this path only, app-wide as a separate decision | App-wide, one commit, as pastor step 4. It is glyph only and the words stay. |
| Comfort access | comfort: a seam door on every screen; deeper_study, pastor, new_to_faith: a comfort line at the foot of their Home | One implementation, the seam door from the comfort design (step 6). The foot lines are the same component mounted once per screen, not three surfaces. |
| Reminder hour | pastor: after 5 to 7 opens via `openTimes.ts`; deeper_study: after seven sessions | 5 to 7, one helper, one migration adding `persona`, `journey_day`, `next_passage`, `next_label`, `last_opened_at` to `push_subscriptions` (additive, nullable, in the repo). |
| The number in the greeting | deeper_study: no number on this path; pastor and new_to_faith: real read days in identity words | Real read days everywhere `dw_read_days` exists; deeper_study keeps its name-only greeting since its plan day is already on screen. |
| Sermon Notes position | pastor: obey the demotion ruling; live code comment keeps it on top | The ruling. Below the reading on four paths, Sunday-gated on top for new_to_faith. Preview-gated. |
| Comfort push | comfort: none, matching the live exclusion; two source designs proposed a one-shot check-in | None. The copy is drafted and held. Decision 8 below. |

## Decisions that are Ashley's

Answer yes or no. Numbers match the per-path specs.

1. Comfort: crisis lines. US 988, AU 13 11 14, NZ 0800 543 354 are drafted. Indonesia (5 campuses) and Brazil (1) have none in the research. Supply them or accept the honest "no number for your country" state.
2. Comfort: who at each campus receives "Talk to a pastor", by name, and the promise the app may print. Until named, the card shows and the button is dark.
3. Comfort: build the staff lever for care contacts and crisis numbers (four pieces of work in intake-core.js), or keep them a repo edit.
4. Comfort: the private pastoral request sends without an email address. Confirm the departure from the prayer-wall pattern.
5. Comfort: the seam door is visible to every persona from day one, or only after comfort has been used once. Day one is the recommendation.
6. Comfort: the futures.church iframe embed hides the seam. Add a door there or accept the gap.
7. Comfort: fourteen new anchor verses are Claude-drafted English and need your sign-off.
8. Comfort: any push at all. Designed as none.
9. Comfort: does `dw_steady_card` (it holds a phone number) sync through misc, or stay device-only.
10. Comfort: Romans 8:28 and Jeremiah 29:11 stay on the comfort surface. Both in as designed.
11. Pastor: what counts as a read day. Proposed: scroll within the passage, play audio, highlight, or complete. Never a mount, never the arrival seed.
12. Pastor: the eight Between You & God soul questions as drafted, and the 8 to 15 ratio.
13. Pastor: a time-saved number is never shown; counted facts only (mornings, captures, outlines). Confirm.
14. Pastor: no Sunday push and Your Week moves to Monday. Both are inferences.
15. Pastor: the prep bag travels to Pastors Sermon Prep by clipboard only, or through `user_data` when signed in with the same email.
16. Pastor: the Leader card promise line on the path sheet may change.
17. Pastor: pricing of the pastor tier, flat or subscription.
18. Deeper study: the thirty floor chapters (Claude drafts, you strike). Nothing ships until seen.
19. Deeper study: the seven reflection questions as drafted.
20. Deeper study: the three day-0 plans and order: Through the Bible in a Year, New Testament in 90 Days, Psalms and Proverbs.
21. Deeper study: AI Insight stays as the last-resort tab beside Calvin, or is dropped on this path.
22. Deeper study: "Move the plan to today" is allowed on the year plan. Recommendation yes, said in the copy.
23. Deeper study: the Bible AI teaser card on Home (it hides after one use) is removed, or watched first.
24. Deeper study: "Read with" one person, day count only. Not designed until you say.
25. New to faith: the Day N button stays "Mark Complete" or becomes "Mark as read".
26. New to faith: Day 40 gets a named ending and one offer of the congregation path through the sheet, source `upgrade`. Not the comfort graduation prompt, but close to it.
27. New to faith: who receives the day-10 "read with me" request at each campus.
28. New to faith: the ten glossary terms and definitions (grace, saved, righteousness, repentance, condemnation, faith, Holy Spirit, baptism, sin, gospel).
29. New to faith: an anonymous `dw_device_id` behind the cookie consent so pre-email readers are visible at all.
30. New to faith: the comfort line also at the foot of the I'm-New Home, or only inside Day N. Kept off Home by your 1 Sep ruling; duty of care argues the other way.
31. All: the preview approval itself. Every step marked PREVIEW below waits for your look on a deploy-preview link.

## Build order

Smallest and safest first. Each wave is one branch, one PR, one deploy preview. PREVIEW marks a step that reshapes an opening screen and waits for Ashley's word. Every commit is pushed. Nothing goes to main by momentum.

| Wave | Steps | Gate |
|---|---|---|
| 0. Numbers and hygiene | Event allowlist and `path` on every event; `dw_read_days` and the en-CA date axis; remove the plan-day credit from `handleRead`; gut the seeded campus counter; remove the emoji glyphs; es and pt push templates; i18n rows for every new key | build + tests; no preview needed; PR body states that completion counts will drop |
| 1. Comfort PR A | Comfort content to network-first JSON (one entry per day); kill the duplicate chapter render in comfort | PREVIEW |
| 2. Deeper study Home | Study floor chapter; Study row (Listen · Commentary · Compare · Greek & Hebrew · Paper); Study sheet wired to the six real commentaries with provenance; dedupe the plan section; catch-up line and "Move the plan to today"; Plan finished card; rotating reflection bank; Paper mode | PREVIEW; decisions 18 to 23 |
| 3. Pastor Home | For Sunday strip; AI framed as research assistant below the four buttons; AI fallback out of the commentary tab strip; trust panel inline; Between You & God bank; grace and milestone copy; Your Week on Monday; Campus Overview sign-in first; Sermon Notes card below the reading on four paths | PREVIEW; decisions 11 to 16 |
| 4. New to faith | Run the ux-reviewer and the three verifiers on `new_to_faith.md` first. Then: Sunday gate on Sermon Notes for this path; two Yeses on Door 3 ("I'm new" and "I'm coming back"); verse-range right-sizing of Day N; the sage closing card; days-read greeting; welcome line; glossary; day-10 invitation | PREVIEW; decisions 25 to 30 |
| 5. Comfort PR B | Crisis-lines resolver (campus, IP, timezone allowlist, picker, never a default); care card and who-to-call sheet; seam door, Comfort Now, More row, `?comfort=1`; steady card; safety flow on Bible AI, prayer request and journal; private pastoral request with no email gate; tests that lock the closed doors | decisions 1 to 10; PREVIEW |
| 6. Reminders | Migration on `push_subscriptions`; inferred hour offered once; three-unopened back-off; no Sunday for pastors; a test that the comfort template set contains no streak words | localhost verify, push cannot run on a deploy preview |
| 7. Not yet designed | congregation path; seasonal church-wide reads; the per-persona dashboard cards | re-run the workflow with only these items |

## Judge scores and grafts

| Item | Winner | Scores (angle) | Grafted | Rejected |
|---|---|---|---|---|
| comfort | Apple simplicity (9.2) | shepherd 8.1, habit 7.6 | 12 | 7 |
| pastor_leader (second run) | shepherd (8.9) | apple 8.4, habit 8.1 | 16 | 8 |
| deeper_study | Apple simplicity (8.4) | shepherd 7.9, habit 7.4 | 17 | 10 |
| new_to_faith | shepherd (8.9) | minimal-change 8.1, habit 6.5 | 19 | 8 |

The full score rationale, grafted list and rejected-with-reason list for each are in the `judge--*.json` files.

## Agents and models

Readers and verifiers sonnet; designers, judges and repairs opus; the ux-reviewer on its roster model; drafters that turned the JSON into the per-path specs sonnet. The synthesiser never ran; this document was written by the parent model from the raw results.
