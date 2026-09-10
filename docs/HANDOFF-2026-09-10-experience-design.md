# Handoff — experience design run, 10 Sep 2026

## State
- Research brief: `docs/PERSONA-RESEARCH-2026-09-10.md`, on branch `docs/persona-research-2026-09-10`, PR #106 open (docs only).
- Design workflow `dw-experience-design`, run `wf_8b85eee9-12c`, resumed after the first session exited. Script: `~/.claude/projects/-Users-ashleymarkevans-futures-daily-word/f2165489-76e2-473f-94a8-8b0fd9a92fc2/workflows/scripts/dw-experience-design-wf_8b85eee9-12c.js`. Resume with `Workflow({scriptPath, resumeFromRunId: "wf_8b85eee9-12c"})`; completed agents return cached.
- Outputs when it finishes: `docs/DESIGN-EXPERIENCE-2026-09-10.md` (the spec) and the raw designs JSON in the session scratchpad `dw-designs.json`.
- Rulings packet the designers obey: session scratchpad `dw-rulings.md` (concatenation of the eight Daily Word memory files). Regenerate from `~/.claude/projects/-Users-ashleymarkevans/memory/*daily_word*` if the scratchpad is gone.

## Ashley's rulings that shape this
- Student persona: leave it. Pilot behind the FLC sign-in later, not a sixth door.
- Any reshape of the opening screen is owner-preview-gated: deploy preview first, he approves, then main.
- Locked look: rich, editorial, warm. Never stripped.

## Trap found this run
- A sonnet `reader` agent under a schema called StructuredOutput with placeholder values (`summary: "test"`, `file_line: "b"`) and the workflow accepted it as a result. Three designers then ran on the garbage map. The script now guards: a placeholder map re-runs once, then throws. Check any schema'd result for placeholders before trusting a cached run.

## Next
1. Read the spec. Answer the numbered decisions at its end.
2. Build in the spec's order behind a preview branch; `npm run build` before every push; deploy preview link for anything on Home.
