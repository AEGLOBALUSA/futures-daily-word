# Follow-up: syncing the journey answers to the cloud

17 Sep 2026. Recorded during the I'm New close-the-day build (branch `build/im-new-close`).

## State

The journey's per-day answers live in `localStorage` under `dw_pathway_qa_<day>`:
numeric slots `0` and `1` from the two lesson questions (`src/components/PathwayAnswer.tsx`),
string slots `c0`..`c2` from Close the day (`src/utils/journeyClose.ts`).

Both writers call `syncMisc`, but the key matches neither `MISC_KEYS` nor `MISC_PREFIXES`
in `src/utils/cloudSync.ts`, so `isSyncedMiscKey` is false and the answers have never
reached the cloud. They are on the device only. This was true before this build for the
two lesson answers and is unchanged by it. `src/utils/cloudSync.misc-keys.test.ts` pins it.

## Why the prefix was not simply added

It was added during the build and an opus data-loss review found two defects, both
confirmed by an independent skeptic. The change was backed out.

1. **No per-slot merge (blocker).** The record has two independent writers, authored keys
   are fill-only on pull (a non-empty local record skips the cloud copy whole), and
   `netlify/functions/user-sync.js` rebuilds the `misc` bag from exactly what the client
   pushes. A device holding `{"0":"new"}` for a day pulls nothing, then pushes that record
   over a cloud copy holding `{"0":..,"1":..,"c0":..}`. The other slots are gone from the
   only backup. Same shape whenever two devices touch different slots of one day.
2. **No per-account attribution (high).** A staff sign-in on a shared device switches
   `dw_profile` to the pastor's email (`src/utils/useStaffIdentity.ts`), and the next push
   sweeps every local `dw_pathway_qa_*` key into the pastor's row; the pastor's other
   devices then restore a new believer's private answers as their own. The same hole
   already exists for `dw_user_story` and `dw_sermon_notes`.

A first repair used "longer text wins" per slot plus eviction of the answers on account
switch. Both were rejected: longer-wins reverts a reader's own edit the moment they
shorten or clear an answer (the push-time union writes the cached cloud copy back over
local), and eviction silently deletes a guest's only copy of what they wrote.

## What a correct change needs

- A per-slot merge where the local slot wins when present and the cloud only fills slots
  the device does not have, on apply and as a push-time union (the `dw_read_days` pattern).
- Per-account attribution for authored misc keys, so `collectMisc` never pushes text
  written under another identity. Fix it for `dw_user_story` and `dw_sermon_notes` in the
  same change.
- A decision from Ashley on what happens to a guest's answers on a shared device when a
  different person signs in: keep on the device but never push, or something else. Never
  delete without that decision.
- Its own gated review on the data-loss dimension, and tests that reproduce both scenarios.
