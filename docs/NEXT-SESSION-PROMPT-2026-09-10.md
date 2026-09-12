# Next-session prompt: Daily Word experience build

Paste everything below the line into a fresh Claude Code session. It assumes nothing from the previous subscription except what is in the repo and, if present on this Mac, `~/.claude` (memory, skills, agents, launch.json).

---

You are working on Futures Daily Word, a devotional and Bible-study PWA at https://futuresdailyword.com for Futures Church. Repo `~/futures-daily-word` (GitHub AEGLOBALUSA/futures-daily-word). React 19, Vite, Netlify Functions, Supabase project `uamavjnjvmsopjzxirsd`. Git-driven deploy: a merge to `main` is production. Ashley Evans (he/him) is the pastor, the owner and the only developer. Congregations use it on phones in the USA, Australia and Futuros (Spanish), with campuses in Indonesia and Brazil.

Start by reading, in this order, and do not skip any:

1. `CLAUDE.md` in the repo (commands, architecture, the real traps).
2. `docs/HANDOFF-2026-09-10-experience-design.md` (state of the work and the traps found this week).
3. `docs/DESIGN-EXPERIENCE-2026-09-10.md` (the design, the decisions that are Ashley's, the build order).
4. `docs/experience-design/rulings-packet-2026-09-10.md` (what Ashley has already decided; it wins over research and taste).
5. `docs/PERSONA-RESEARCH-2026-09-10.md` (the sourced research every design traces to).
6. The per-path spec for whichever wave you are building: `docs/experience-design/{comfort,deeper_study,pastor_leader,new_to_faith}.md`.

Standing rules you must obey:
- Push every commit to GitHub on a feature branch as it is made. Never push to `main`. Open a PR and wait for the deploy preview.
- Any change that reshapes an opening screen is owner-preview-gated: Ashley looks at the deploy-preview link and says go before it merges. A minimalist rebuild was shipped once and reverted the same night as "completely stripped". Richer and clearer, never stripped.
- Never rebuild a synced `dw_*` localStorage record from React state; merge into what is in localStorage and touch only the field you change.
- The arrival seed on Home is credit-free and stays so. Full-screen surfaces use `useSubView` alone, never with a focus trap. The path chooser is one sheet with doors, never a gate, and stays at five doors. Comfort has no graduation prompt, no streak, no count.
- Every new i18n key ships with en, es, pt and id rows in `src/utils/i18n.ts` in the same commit.
- Migrations live in the repo. Every Netlify command carries `--site`. No magic links. Passwords for admin access.
- "Needs a developer" is a defect: design a self-serve lever instead.
- Write for an expert. Deliverable first. No em dashes.

Work in a worktree, never the shared checkout: `~/futures-daily-word-experience` on branch `build/experience-1` already exists from main at e81b0dc1 with `npm ci` done, and a preview server `dw-experience-preview` on port 4184 is registered in `~/.claude/launch.json`. If either is missing, recreate them (`git worktree add -b build/experience-1 ~/futures-daily-word-experience origin/main`, then `npm ci`).

Verify with `npm run build` (tsc plus vite) and `npx vitest run` before every push. ESV text needs the Netlify function, so use `netlify dev` or the deploy preview for a real look, not bare `vite`.

The task: build Wave 0 from the build order in `docs/DESIGN-EXPERIENCE-2026-09-10.md` (numbers and hygiene: event allowlist with `path` on every event, `dw_read_days` on the local en-CA axis, remove the plan-day credit from `handleRead`, gut the seeded campus counter, remove the emoji glyphs, es and pt push templates). It needs no preview approval. Then stop and report with the PR link, what was verified and how, and the list of decisions from the design document that the next wave needs answered.

If Ashley says "build" with no wave named, build the next wave in the order. If he asks for the congregation path, seasonal reads or the dashboard cards, those were never designed: re-run the workflow script at `docs/experience-design/workflow-dw-experience-design.js` with `PATHS` and `TOPICS` cut down to only those items (the run cache from the old subscription does not transfer; it will run fresh). That script needs the Workflow tool with the user's opt-in ("ultracode" or "use a workflow"). Guard the readers: a sonnet reader once returned a placeholder StructuredOutput (`summary: "test"`) and the script now re-runs any placeholder map.
