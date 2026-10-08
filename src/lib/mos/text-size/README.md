# MultiplyOS text size kit

Ashley, 5 Oct 2026: "create on all the apps especailly on the phone an adjustable font size so the writing can be
manually adjusted for all the apps." and "i want it to be able to go smaller, not just bigger."
Plan: `~/mos-smart-spec/SCORE-8-PLAN/tools/reports/TEXT-SIZE-PLAN.md` (this kit is its step 1).

## The rule (text-scale-core.ts)

Ashley's rulings, 5 Oct 2026: "i want text size to go down to 50%" and "there should be. save button on any screen
where changes to the ui can be made like the text size for eg".

One text multiplier, eight steps (key · scale · label):
`xs50` 0.5 · `s65` 0.65 · `s80` 0.8 · `s90` 0.9 · **`default` 1 (today's size)** · `l115` 1.15 · `l130` 1.3 · `l150` 1.5,
labelled 50% … 150%.

- Body text: `N × ts`. Below 100% the person's choice applies literally (no floor: they chose it). The 15px phone
  floor governs our Default design and the 100% proof only.
- Headings (24px and up): on the way up they move half as far, `N × (1 + (ts − 1) × 0.5)`; on the way down they shrink
  exactly as body does, so the hierarchy holds at 50%.
- Typing fields (input, textarea, select, contenteditable) never go under 16px at any step, Default included: iPhone
  Safari zooms the page when a field under 16px takes focus. Web: `max(16px, …)` (codemod) plus a zero-specificity net
  in `mos-text.css` for fields with no size of their own; native `TextInput` floors at 16.
- Phones: `eff = ts × the phone's own text setting`; body `N × min(eff, 2)`; headings up `N × min(1 + (eff − 1) × 0.5, 1.5)`,
  down `N × eff`; to the half pixel; `maxFontSizeMultiplier` is an extra cap on growth; no lower floor beyond what the
  person and the phone chose. OS scaling is switched off on wrapped text so nothing scales twice.
- Only text changes. html font-size, rem spacing, layout and hit areas never do: 44px targets hold at every step, 50% included.
- Default is pixel-identical to the app before the kit (every value is exactly N px when `--mos-ts` is 1), except a
  typing field that was under 16px, which now shows at 16px.
- A choice is `{ size, at }`: `at` is epoch ms, and every time the web kit WRITES is a whole minute (a multiple of
  60000), in the cookie and in the value it hands the server copy. Newest wins between the device copy and the server
  copy; a value dated more than 24 hours in the future is refused. Device: cookie `mos_text=<key>.<at>` (Domain=.futures.church
  on futures.church hosts, so one choice holds across every app on that device) or phone storage key `mos_text`.
- **Privacy: the browser sends the `mos_text` cookie to EVERY futures.church host** (every app, the websites, and
  any script on those pages, Tag Manager included, can read it), for a year. So it holds only the step and a whole
  minute: a time to the millisecond made it unique to the device, a marker any of those hosts could follow. The rules
  (`text-scale-core.ts`, mirrored in the pre-paint script):
  - a new choice on this device (Save, `set`, `setTextSize`) takes the next whole minute, and at least one minute past
    the choice the device already holds, so a Save always beats it, even one dated ahead by a fast clock elsewhere
    (unless that would pass the 24-hour cap: then the next whole minute);
  - a value taken from elsewhere (the server copy, another tab, the cookie) is kept, and written back to the cookie
    rounded up to the minute; a cookie still holding milliseconds is rewritten once on the first page load;
  - when the device and server copies hold the same step, sync writes nothing, whatever their times;
  - two different steps stamped the same minute (two devices, or two tabs, saved in that minute): the server copy wins
    a sync, and between tabs the cookie (the last one written) wins, so every copy converges instead of flip-flopping.
- Only the eight step keys are ever accepted (the cookie, `adopt`, `preview`, `set`, another tab's message): the
  pre-paint script's step map has no prototype, so `constructor` or `__proto__` never pass as a step.
  The page carries it as `html[data-mos-text="<key>"]` (absent at Default) and CSS reads `--mos-ts` / `--mos-ts-display`.
- An old free multiplier (futures-os `font_scale`, Daybook `fn_text_scale`) snaps to the nearest step; a tie goes to
  the larger step (0.85 → 90%).

### Save (every appearance setting)

A picker previews live and keeps nothing until the person taps Save, the screen's one main button. Cancel, close,
back, the tab or app going to the background, the dialog closing or the screen leaving puts the saved size back.
Web runtime: `MOSText.preview(key)` · `MOSText.save()` · `MOSText.revert()` · `MOSText.shown()` / `current()` / `previewing()`
(TS: `previewTextSize`, `saveTextSize`, `revertTextSize`). Native: `useTextScale()` → `preview`, `save`, `cancel`,
`size` (shown), `savedSize`, `previewing`. Only a Save reaches other tabs, other apps on the device and the server.
Any other appearance setting an app adds follows the same pattern.

## Files

| File | What it is |
|---|---|
| `text-scale-core.ts` | The rule, the steps, newest-wins, cookie and metadata encode/decode, `fs()` / `lh()` for inline styles |
| `mos-text.css` | `--mos-ts` / `--mos-ts-display` per `html[data-mos-text]` step; print resets to 1 |
| `tailwind.mos-text.cjs` | Tailwind v3 preset: named sizes follow the step, plus `text-fs-8` … `text-fs-96`; `mosText('28px')` for an app's own theme sizes |
| `mos-text.tailwind4.css` | Tailwind v4 `@theme inline` with the same values (generated by the preset's `tailwind4Css()`) |
| `mos-text-script.ts` | `MOS_TEXT_SCRIPT` (blocking pre-paint script; installs `window.MOSText`), `setTextSize`, `getTextSize`, `onTextSizeChange`, `onTextSizeSync` |
| `mos-text-prepaint.js` | `MOS_TEXT_SCRIPT` as a file: for apps whose CSP is `script-src 'self'` (no inline script) or that have no bundler. Generated: never hand-edit; run `gen-prepaint.ts` |
| `gen-prepaint.ts` | Writes `mos-text-prepaint.js` from `MOS_TEXT_SCRIPT` (`--check`: exit 1 when stale) |
| `text-size-privacy.test.ts` | The whole-minute, step-key and generated-file rules (node:test, runs the pre-paint script as shipped) |
| `mos-text-size.js` | `<mos-text-size>` picker: eight percent rows (100% marked Default), Aa previews, live preview, one Save main button and Cancel, restores on leave; keyboard and screen-reader ready; events `change` (saved) and `cancel`; attributes `labels` (JSON: title, sample, default, save, cancel, hint; es/id) and `heading="off"` |
| `native/` | `TextScaleProvider`, `useTextScale`, `Text`, `TextInput` (16 floor), `TextSizeSheet` + `TextSizeChoices` (Save / Cancel; `active` = screen focus; `accent`, `buttonFill`, `buttonInk`, `labels`), `createMetadataAdapter` (Supabase, merge-safe), all from `native/index.ts` |
| `codemod-text-px.mjs` | Web codemod: CSS `font-size`/`line-height: Npx`, Tailwind `text-[Npx]` / `leading-[Npx]`, JSX `fontSize` in style objects; typing fields get `max(16px, …)` |
| `codemod-rn-text.mjs` | Phone codemod: moves `Text` / `TextInput` off `react-native` onto the kit wrappers |
| `text-size-lint.mjs` | CI lint: px text the codemods would change, RN Text, viewport that blocks zoom, `data-mos-text-size`; warns on a typing field sized under 16px |
| `text-size-audit.mjs` | Playwright: every page × eight steps × phone 375×812 + desktop 1280×800, screenshots; at 50% and 150% fails on sideways scroll, clipped text, phone targets under 44px, step not applied; `--compare` proves Default pixel-identical |

Both codemods: `--dry-run` (default, prints a diff) · `--write` · `--check` (exit 1 if anything is left) ·
`--report file.md|file.json`. They skip `node_modules`, build output, and any email, PDF, export, canvas or SVG folder,
file or renderer, and any line marked `mos-text-ignore` (a whole file: `mos-text-ignore-file`). They are idempotent:
after `--write`, a second run prints nothing. What they cannot decide (font shorthand, rem/em, a chart's `fontSize`)
is listed in the report for a person.

Tests (in this repo): `node --import ./design/text-size/test-resolve.mjs --test 'design/text-size/**/*.test.ts'`.
In an app: `node --import ./lib/mos/text-size/test-resolve.mjs --test lib/mos/text-size/text-size-privacy.test.ts`
(or `node --import tsx --test …`). After any change to `mos-text-script.ts`, regenerate the pre-paint file:
`node --import ./lib/mos/text-size/test-resolve.mjs lib/mos/text-size/gen-prepaint.ts` (then re-copy any app copy of it,
e.g. `public/multiplyos/mos-text-prepaint.js`).
Browser proofs run too when Playwright is found: add `MOS_PLAYWRIGHT=<an app>/node_modules/playwright`.
`native/wrapper.test.tsx` is the jest-expo proof to copy into a phone app.

## Copy instructions

Every app keeps the kit at `lib/mos/text-size/` (the `@/lib/mos/text-size/...` imports the codemods write assume it).
Start an app only after its UI text branch (`ui/multiplyos-v1-text-*`) has merged; re-run the codemod after any later
UI merge (it is idempotent).

### A. Next.js web apps on Supabase auth: Connect AU, USA, Futuros, Global · Heartbeat staff · Develop · Finance

1. Copy the web half (the phone files would fail the web type check):
   ```sh
   mkdir -p lib/mos/text-size/native
   rsync -a --exclude fixtures --exclude '*.test.ts' --exclude '*.test.tsx' --exclude native \
     ~/multiplyos/design/text-size/ lib/mos/text-size/
   cp ~/multiplyos/design/text-size/native/metadataAdapter.ts lib/mos/text-size/native/
   mkdir -p public/multiplyos && cp lib/mos/text-size/mos-text-size.js public/multiplyos/
   ```
2. Baseline before any change: `node lib/mos/text-size/text-size-audit.mjs --base http://localhost:3000 --paths /account,<pages> --steps default --out /tmp/text-size-baseline`
3. `app/layout.tsx`: `<html … suppressHydrationWarning>`; in `<head>`, right after the UI flag script, the pre-paint
   script, blocking. Check the app's Content-Security-Policy first (`next.config` headers(), `netlify.toml`,
   `_headers`, or `curl -sI <live url> | grep -i content-security`):
   - inline scripts allowed (or the app already inlines the UI flag script the same way):
     `<script dangerouslySetInnerHTML={{ __html: MOS_TEXT_SCRIPT }} />` (`import { MOS_TEXT_SCRIPT } from '@/lib/mos/text-size/mos-text-script'`);
   - `script-src 'self'` with no inline allowance: `cp lib/mos/text-size/mos-text-prepaint.js public/multiplyos/` and
     `<script src="/multiplyos/mos-text-prepaint.js"></script>` (plain, blocking: no async, no defer, no next/script).
   An inline script under a strict CSP is silently blocked: nothing changes size and `window.MOSText` is missing.
   Load the picker: `<Script src="/multiplyos/mos-text-size.js" strategy="afterInteractive" />`.
4. CSS: import `@/lib/mos/text-size/mos-text.css` after `multiplyos.css` / `multiplyos-ui.css`.
5. Tailwind v3: `presets: [require('./lib/mos/text-size/tailwind.mos-text.cjs')]` in `tailwind.config`; wrap any size in the
   app's own `theme.fontSize` / `extend.fontSize` with `mosText()` from the same file.
   Tailwind v4: `@import "./lib/mos/text-size/mos-text.tailwind4.css";` after `@import "tailwindcss";`.
6. Codemod: `node lib/mos/text-size/codemod-text-px.mjs app components lib --dry-run --report text-size-codemod.md`, read the
   report, then `--write`, then `--dry-run` again (must print nothing). Handle the report's "left for a person" list.
7. Viewport must allow zoom (no `maximumScale: 1`, no `userScalable: false`).
8. The row: on `/account` (Connect) or the app's own menu above "Sign out", a "Text size" row holding
   `<mos-text-size heading="off"></mos-text-size>` (the visuals are ChatGPT's; the element is ready to drop in, Save
   and Cancel included). In a dialog, close it on the element's `change` (saved) or `cancel` event. For TSX add once:
   `declare module 'react' { namespace JSX { interface IntrinsicElements { 'mos-text-size': { heading?: string; labels?: string } } } }`.
9. Server copy, once per signed-in user in a client component:
   ```ts
   import { onTextSizeSync } from '@/lib/mos/text-size/mos-text-script';
   import { createMetadataAdapter } from '@/lib/mos/text-size/native/metadataAdapter';
   useEffect(() => { if (!userId) return; const s = onTextSizeSync(createMetadataAdapter(supabase)); return s.stop; }, [userId]);
   ```
   It reads both copies, keeps the newest on both, then saves every later pick. The adapter reads the current
   `user_metadata` and writes it back merged (prove on one real account that `display_name` survives).
10. CI: add `node lib/mos/text-size/text-size-lint.mjs app components lib`.
11. Proof: `node lib/mos/text-size/text-size-audit.mjs --base http://localhost:3000 --paths /account,<pages> --compare /tmp/text-size-baseline --out ~/mos-smart-spec/SCORE-8-PLAN/reports/text-size-proof/<app>/` → 0 errors (Default pixel-identical apart from typing fields that were under 16px; 50% and 150% clean).

### B. Expo phone apps: connect-mobile · futures-os · Tally

1. Copy: `rsync -a --exclude fixtures --exclude '*.test.ts' --exclude '*.test.tsx' ~/multiplyos/design/text-size/ lib/mos/text-size/`
   and copy `native/wrapper.test.tsx` to `__tests__/text-size-wrapper.test.tsx`.
2. Root `app/_layout.tsx`, around everything:
   ```tsx
   const textServer = useMemo(() => (session ? createMetadataAdapter(supabase) : undefined), [session?.user.id]);
   <TextScaleProvider storage={AsyncStorage} server={textServer}>…</TextScaleProvider>
   ```
   (connect-mobile: the signed-in nation's client.) futures-os also passes
   `legacyScale={async () => greenhouse_user_prefs.font_scale}`: adopted once to the nearest step (0.7 → 65%,
   1.2 → 115%, 1.6 → 150%) and that column is never written again.
3. Codemod: `node lib/mos/text-size/codemod-rn-text.mjs app components lib --dry-run --report text-size-codemod.md`, then
   `--write`, then `--dry-run` again (prints nothing). fontSize literals are not touched: the wrappers scale at render.
4. The row: a "Text size" row in Settings / More opening `<TextSizeSheet visible onClose labels accent />` (Save keeps,
   Cancel / backdrop / back restore), or `<TextSizeChoices active={useIsFocused()} onSave={…} />` inline on a screen
   (`active` lets a tab that stays mounted restore an unsaved preview when the person leaves it); pass `labels` in es/id.
5. Tally: its `lib/mos/type.ts` `fs()` multiplies by `nativeFontPx` with `useTextScale().scale`; never edit `lib/mos/scale.ts`.
6. Proof: `npx jest __tests__/text-size-wrapper.test.tsx`; iOS simulator `xcrun simctl ui booted content_size <size>` × the eight steps; Default pixel-identical (typing fields under 16 now show at 16).

### C. Apps with their own server copy: Daily Word staff + Sermon Prep (`staff_roster.text_size`), Mac (`hub_user.text_size`), Daybook (`staff.text_size`)

Steps A1–A8 and A10–A11 as above. For step A9 pass your own adapter to `onTextSizeSync`:
`{ read: async () => ({ size, at }) | null, write: async ({ size, at }) => … }` against the app's own function or table
(one migration per the plan; `at` is epoch ms, a whole minute from the web kit; keep accepting it as given, never re-stamp it). Daily Word: do not reuse `data-mos-text-size` (its tokens.css owns it).

Daybook (futures-notes; in flight on branch `ui/daybook-text-size-save`, server copy `staff.text_size`). What is there
today on origin/main, and what step 11 does with it:
- An older stepper, `src/utils/textScale.ts` (steps 0.85–2.5, localStorage `fn_text_scale`, applies on tap, no Save),
  with controls in `Settings.tsx` ("Look and text size") and `NoteActions.tsx` (the note ⋯ sheet). Step 11 replaces
  both controls with the shared picker (Save included) and adopts `fn_text_scale` ONCE to the nearest step (0.85 → 90%,
  ties go up; anything over 1.5 → 150%), then never reads or writes that key again.
- PR #153 (merged 5 Oct) ties `--mos-font-size` to `--n-text-scale` with `max(17px phone / 13px desktop)`, so the
  old 0.85 step does nothing. Step 11 moves that to `--mos-ts` and drops the max() floor (below 100% applies literally),
  keeping the 16px floor on typing fields only.
- Six font-size rules in `public/multiplyos/ui/multiplyos-ui.css` ignore the scale, one of them `12px !important`:
  run the codemod over that file too (it keeps `!important`) or the note text will not follow the choice.

### D. Device-only: Preach It Back · Daily Word public reader · Launcher

Pre-paint script (`mos-text-prepaint.js` or `MOS_TEXT_SCRIPT`), `mos-text.css`, the codemod and the picker. No server
copy. On a futures.church host the cookie is shared (the browser sends it to every futures.church host), so the
Launcher's choice shows on connect.futures.church.
