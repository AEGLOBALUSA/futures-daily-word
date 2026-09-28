# Alpharetta space

This folder holds features built for Futures Alpharetta only, on top of the main Daily Word app.

The rules for working here live in `/AGENTS.md` (for the AI assistant) and `/docs/pastor-builders/START-HERE.md` (for the pastor builder).

To add a feature: create a folder under `src/alpharetta/features/<id>/` with a `Page.tsx`, then register it in `src/alpharetta/features.ts` with `visibility: 'creator'`. Switch it to `visibility: 'alpharetta'` only once the pastor wants every Alpharetta reader to see it.

Use `storage.ts`, `strings.ts`, and `access.ts` in this folder for saving data, text, and visibility. Do not use the app's global storage or translation helpers here.
