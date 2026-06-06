# Daily Word ↔ Futures Church — Cohesion Recommendation

## Executive summary
When a visitor taps "Open the full Daily Word app" from the church `/daily-word` page, they jump on four axes at once: cream→charcoal, warm-brown→coral-red, Fraunces→DM Serif, flat-editorial→glossy-metallic. The instinct is "the app needs a redesign." It does not. **The recommended verdict is a light-touch cohesion layer, not a reskin.** Ship a thin "Part of Futures Church" seam frame plus one shared connective color (gold) and a matching chrome font. Keep Daily Word's dark, coral, serif, metallic interior as its own sub-brand signature. Total effort ~1.5–2.5 days at low risk; a full reskin would be 8–15 days at high risk and is the wrong direction.

## Why not a redesign
Two ground-truth facts reframe the whole question:

1. **The church site is itself dark-first.** `app/globals.css` sets the body to obsidian `#050506` with Rhymes Text UltraLight forced site-wide. The cream `/daily-word` page and the entire Bible College site are deliberate light "reading rooms" — the exception, not the rule. So **light→dark is already a sanctioned in-brand move** (Selah, the obsidian default, and dark pages all live happily). The jump isn't the brand violation it appears to be.

2. **The genuine failure is orientation, not aesthetics.** Crossing to `futuresdailyword.com` gives the visitor *no signal they are still inside Futures* — no wordmark, no "part of Futures Church" label, no way back. The app shares literally zero tokens with the family. That is the only hard seam, and it is cheap to fix.

The app's two hardest-to-change parts — the hardcoded metallic ruby/gold gradients scattered across a 270KB `HomeScreen.tsx`/`BibleAI.tsx`, and a `"NUCLEAR DARK MODE TEXT OVERRIDE"` block that forces `* { color:#FFFFFF !important }` — are exactly what a deep reskin would have to fight. They are also the app's earned signature. Fighting them is both expensive and wrong-headed against the owner's explicit "their own site, linked like part of the church" directive.

## The cohesion model for the whole family: "One house, many rooms"
This pattern already exists and is proven twice in the codebase. The Bible College is a full standalone-feeling site that still reads as Futures via the same cream/ink/warm-red+gold recipe and an explicit footer label — `components/layout/CollegeFooter.tsx` literally says **"Part of Futures Church · futuresglobal.college."** Selah lives inside the church repo and inherits cohesion for free.

**Shared (the brand spine — every room carries these):**
- **Connective accent role:** warm gold `#C8906B` / warm-700 `#8A5A3C` for links, focus rings, `::selection`, and all seam chrome. Gold is already the *only* color shared across church, College (`#B5892F`/`#C89A3C`), and the app's own AI motif — it is the natural family tie.
- **Type rhythm:** wide-tracked uppercase eyebrow (Inter Tight ~0.24em), ultralight high-contrast serif display (Fraunces Light — the PWA-safe fallback for Rhymes, already in church + College configs), serif-italic for emphasis, Inter Tight chrome.
- **Seam frame:** a thin "[Sub-brand] · part of Futures Church" gold-italic wordmark lockup, an identical gold link-out pill on *both* sides of every boundary, a minimal © Futures Global footer row.
- **Discipline:** restraint (church's ≤3% vivid-accent rule), reduced-motion/save-data respect, pill radius 999px.

**Distinct (each sub-brand owns):** its canvas tone (Daily Word dark `#0F0D0B`, College cream — both first-class), ONE signature accent (Daily Word coral `#DC535D` + ruby/gold metallic gradients as its interior mark), and all interior components (ruby hero, bottom tab bar, highlighter, audio player; College's Cormorant body).

**Mechanism:** host the shared seam values in each repo's existing token layer (church Tailwind tokens, College `:root`, Daily Word `--dw-*`/`--font-*`). Copy-paste now; promote to a tiny versioned token package only if/when drift recurs. (One panelist argued for an `@futures/brand-tokens` npm package up front; given the owner's low-ceremony preference and only two divergent repos today, copy-paste is the right call until a third instance — e.g. Selah graduating to its own repo — justifies the versioning overhead.)

## Concrete plan for Daily Word
Files: `/Users/ashleymarkevans/futures-daily-word/src/index.css` (tokens + the nuclear block at file end), `src/components/TabBar.tsx` (chrome font), `src/screens/HomeScreen.tsx` & `src/components/BibleAI.tsx` (metallic gradients — **leave alone**). Parent precedents: `/Users/ashleymarkevans/futures-church-web/components/layout/CollegeFooter.tsx` (lockup) and `app/globals.css` (gold `#C8906B` focus/selection tokens to mirror).

- **Phase 0 — Unblock (~0.25–1 day):** Neutralize or scope-around the `!important` white-text override so new accents aren't silently stomped. If you don't fully untangle it, scope gold to borders/SVG/focus-rings/backgrounds (not type). Do not touch the inline gradients.
- **Phase 1 — Seam frame (~0.5 day, ship first):** Add the "Daily Word · part of Futures Church" gold-italic lockup + `futures-wordmark.png` and a persistent return link to `futures.church/daily-word`. Match the handoff pill shape/color on both sides. This alone buys ~70–80% of perceived cohesion and fixes the orientation bug.
- **Phase 2 — Connective color (~0.5 day):** Point Daily Word's link + focus-ring + selection + lockup color at gold `#C8906B` via `--dw-*` vars. Keep coral as the interior signature. Verify gold-vs-coral AA contrast; if they clash, restrict gold to the lockup/borders.
- **Phase 3 — Chrome font (~0.5–1 day):** Swap only `--font-sans` → Inter Tight for tabs/labels/buttons (+ self-hosted woff2). Leave DM Serif as the reading voice. Touching one var dodges the inline-style minefield.
- **Phase 4 (defer):** Extract a tiny shared token sheet only if drift reappears.

## Effort & risk
Phases 0–3: ~1.5–2.5 days, low risk — everything lives in `:root` vars or new wrapper chrome. Ship Phase 1 + the gold link/focus token first (~1 day) and the family's only hard seam is closed. A full reskin (rejected) is 8–15 days at high risk due to the nuclear block, scattered gradient literals, and pervasive inline styles.

## Open questions for the owner
- Return target: `/daily-word` page (best context) vs. church home?
- Keep coral exactly, or warm one notch toward terracotta `#C45236`?
- Worth a ≤1.5s branded entry transition when arriving `?from=church` (reduced-motion-gated, skipped on repeat visits)?
- When Selah launches mid-June: stays an in-site route (free cohesion) or its own repo (would justify a real token package)?
- Approve fully dismantling the `!important` text block (cleaner, a11y win, +½ day) vs. scoping around it?

## Bottom line
Daily Word is the family's only true outlier, but the fix is the seams, not the skin. Give it the "part of Futures" frame, the shared gold connective, and a matching chrome font — and it becomes a room in the house instead of a different building, while staying unmistakably its own product.