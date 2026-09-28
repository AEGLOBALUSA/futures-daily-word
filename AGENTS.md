These rules apply when you are working with a pastor builder: anyone other than Ashley Evans (GitHub AEGLOBALUSA). If you're not sure who you're working with, ask.

## Stay in the space
- All new work lives in `src/alpharetta/` (code) and `public/alpharetta/` (images). Do not touch other folders unless the section below tells you to, and only after asking.
- To add a feature: create `src/alpharetta/features/<id>/Page.tsx`, then register it in `src/alpharetta/features.ts` with `visibility: 'creator'`. Only change it to `visibility: 'alpharetta'` when the pastor tells you he wants everyone at Alpharetta to see it.
- One feature per pull request.
- Branch name: `ryan/<short-name>`.
- Never push to `main`.
- Never merge a pull request for him unless he asks you to.

## Before you leave the space
Before changing any file outside `src/alpharetta/` or `public/alpharetta/`:
1. Stop.
2. Look up that file in `.github/zones.json` and read its "why" line.
3. Tell the pastor in plain words what that file affects.
4. Ask before you touch it.

If the file is in the red zone, say plainly that the change will wait for Ashley's approval. Don't make the change yourself.

## Never
- Put real people's names, emails, phone numbers, or other private details in code. The code is public.
- Add npm packages.
- Edit or delete tests outside `src/alpharetta/`, or weaken any check.
- Edit `.github/`, `scripts/zones/`, `scripts/visual/`, `CLAUDE.md`, `AGENTS.md`, or `docs/pastor-builders/`.
- Use `t()` or `src/utils/i18n.ts` for Alpharetta strings. Put Alpharetta strings in `src/alpharetta/strings.ts`.
- Write to `localStorage` directly. Use `src/alpharetta/storage.ts` (`alphaGet` / `alphaSet` / `alphaRemove`).
- Add global CSS or `<style>` tags.
- Change what any other campus sees.
- Send data to any server. Reading public app data the app already reads is fine. Anything that stores or sends data beyond that is a red change. It waits for Ashley.

## Build to the app's look
- White page, use the existing `--dw-*` colour tokens.
- Body text at least 15px.
- Anything tappable at least 44px tall.
- One main button per screen, styled with `var(--dw-accent)`, labelled with a verb and an object (for example "Sign up to serve", never "Submit").
- Errors show beside the button that was pressed.
- Works at 390px phone width and in dark mode.
- Prefer words over icons.

## Before opening a pull request
1. Write a small test for the feature in its own folder: it renders, and its main action works.
2. Run `npx vitest run` and `npm run build`. Fix anything that fails.
3. Open the pull request using the template.
4. Explain the zones note and the walk-through note to the pastor in plain words: what changed, and what it means for him.

## Talking to the pastor
He is not a developer. After any change, tell him plainly what changed and how to see it:
- Before merge: the preview link on the pull request. Previews run without the church's live information, so a feature that reads live data shows it only after merge, in creator mode.
- After merge: the "Alpharetta" panel on the Campus tab, while signed in as pastor.

## Sunday pause and undo
- Merges pause Saturday 6pm to Sunday 2pm Atlanta time. Reverts still go through.
- To undo: open the merged pull request on GitHub, press Revert, then merge the revert. Ashley can also roll the whole site back.
- Rolling a feature out to every campus is Ashley's decision. Never yours.
