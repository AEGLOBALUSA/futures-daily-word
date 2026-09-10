# Handoff: Daily Word experience design, 10 Sep 2026

Written at the moment Ashley stopped the run to move to another subscription. Everything a fresh session needs is in this repo on branch `build/experience-1`. The standalone prompt to start with is `docs/NEXT-SESSION-PROMPT-2026-09-10.md`.

## What happened today

1. **Research.** Ashley named six personas (new or returning Christian; the 3-minute devotional reader; the devout 10-minute reader; the college student with Bible assignments; the pastor doing sermon prep; the person in crisis). Seven sonnet researchers returned sourced briefs; the parent synthesised `docs/PERSONA-RESEARCH-2026-09-10.md`. PR #106 (docs only) carries it against main; this branch carries the same file.
2. **Ruling: the student is parked.** Not a sixth door, not the pastor sign-in. Pilot later behind the FLC sign-in with one intake; promote to a door only on evidence. The sheet stays at five.
3. **Design.** One Workflow run (`wf_8b85eee9-12c`, script saved as `docs/experience-design/workflow-dw-experience-design.js`): readers mapped the live surfaces and the rulings; three opus designers per path from different angles (habit scientist, veteran pastor, Apple product designer); an opus judge per path; the ux-reviewer against Ashley's rulings; three sonnet verifiers per design (research fidelity, owner rulings, phone and no-dev); a repair after each. The run was cut once when the desktop process exited, resumed from cache, hit the subscription's session limit, resumed again, and was stopped by Ashley with three paths fully hardened, one judged, one not designed, and the four cross-cutting topics not designed.
4. **Salvage.** All fifty finished agent results were dumped unedited to `docs/experience-design/raw/` (see `INDEX.md` there). Sonnet drafters converted the four designs to readable specs: `comfort.md`, `pastor_leader.md`, `deeper_study.md`, `new_to_faith.md`. The parent wrote `docs/DESIGN-EXPERIENCE-2026-09-10.md` by hand from the raw results: the shared thesis, ten shared moves, the conflicts between designs and the choice, 31 decisions that are Ashley's, and the build order in seven waves.

## State of the repo

| Thing | Where | State |
|---|---|---|
| main | `~/futures-daily-word` | e81b0dc1, untouched |
| build worktree | `~/futures-daily-word-experience`, branch `build/experience-1` from e81b0dc1 | `npm ci` done; docs committed and pushed; no code changed |
| research PR | #106, branch `docs/persona-research-2026-09-10` | open, docs only; superseded by this branch, close it or merge it |
| preview server | `dw-experience-preview`, port 4184, in `~/.claude/launch.json` | registered, not started |
| other worktrees | `dw-wt-audit`, `dw-wt-review`, `futures-daily-word-{audit,claude-token,newpath,path,publish}` | pre-existing, not touched; a stale worktree is not evidence of anything |

## Traps found this week

- **Placeholder structured output.** A sonnet reader under a JSON schema called StructuredOutput with placeholder values (`summary: "test"`, `file_line: "b"`) and the workflow cached it as a result. Three designers then ran on a garbage map. The script now re-runs any placeholder map once, then throws. Check any schema'd result for placeholders before trusting a cached run.
- **A path chain can die on one agent.** Two designers "completed without calling StructuredOutput" and their whole pipeline item dropped to null. The script now wraps every agent call in a one-retry helper (`agentR`).
- **The desktop process restarts.** Long workflows outlive the session. Checkpoint-commit, resume by run id, and keep `caffeinate -dims` running during a long run.
- **Session limits.** The old subscription's limit killed ten agents mid-run. That is why this handoff exists.
- **The scratchpad is wiped between sessions.** The rulings packet and the designs JSON were regenerated into the repo. Never leave a deliverable only in the scratchpad.

## Live defects the designs found (verified against code, not yet fixed)

- `handleRead` credits a plan day on the Read tap (HomeScreen.tsx:754-755) against the stated intent four lines above.
- `recordStreakToday` fires on every mount (HomeScreen.tsx:786-795), so the greeting's "Day N" counts app opens, not reading days, and resets to 1 after two days off beside a plan on day 15.
- The comfort and deeper-study Homes print today's chapter twice (hero plus plan section) with two translation pickers and two Listen buttons.
- The only persistent Greek/Hebrew toggle (HomeScreen.tsx:3233-3247) sits in a block that returns null with no plan, while the arrival strip promises "the original languages" (i18n.ts:915).
- Six public-domain commentaries are loaded (src/utils/study.ts:105-112) and wired only to the pastor prep sheet; Home reads a 20-chapter curated set and falls back to an AI paragraph most days.
- Push templates exist in en and id only (push-send.js); Futuros pastors get English.
- The seeded campus reader counter can return an invented number.
- `behavior.ts` writes UTC dates; every day-count must move to `toLocaleDateString('en-CA')`.
- Sermon Notes sits on top of Home for every path (HomeScreen.tsx:1806 comment) against the demotion ruling, and is ungated on the new-to-faith path outside the Sunday window.

## What the next session does

Read `docs/NEXT-SESSION-PROMPT-2026-09-10.md` and follow it. Wave 0 needs no decision and no preview. Everything after it needs the numbered decisions in the design document answered by Ashley, and every Home reshape needs his look on a deploy-preview link before merge.

## Agents used today and their models

Researchers ×7 sonnet. Workflow: readers ×10 sonnet, designers ×15 opus, judges ×5 opus, ux-reviewer ×3 (roster model), verifiers ×9 sonnet, repairs ×5 opus. Drafters ×4 sonnet. Parent (Fable) scouted, wrote the script, synthesised, and wrote these documents.
