# Home: today's word and one next step (B09-08)

For staff and builders. Home opens on the day's reading (the hero, unchanged) and ONE card under it with ONE pulsing button: the next thing to do, already worked out. Everything else that used to stack on Home sits, unchanged and in the same order, one tap away under **More for today**. The house ads (`PromoAds`) keep their own rule and place.

- **Where the thinking lives:** `src/utils/nextStep.ts` (pure, the nine-step order), fed by `src/utils/useHomeNextStep.ts`. The card is `src/components/NextStepCard.tsx`; the pulse is `.dw-next` in `src/index.css`.
- **Sunday:** the window is Sunday 00:00 to the campus's `sundayUntil` (16:00 unless the owner changes it) on the campus's own clock (`src/utils/sunday.ts`). A campus with a later service is changed in `/staff` → Settings → Campuses, never in code.
- **It learns:** "Write it down" and the one-time set-up asks rest for seven days after three untapped days running. That memory (`dw_next_skips`) stays on the reader's device and is never synced. The day's reading and Sunday's notes never rest.
- **Comfort readers** get no streak, celebration or count words from the card.

## How this connects

The card is where later prompts appear, as kinds of the same card, never as extra cards: the reminder offer ("Remind you then?", B09-17) and prayer counts ("{n} people prayed for your request", B09-11). Add a new card as a kind in `src/utils/nextStep.ts` (after the Sunday notes, before "Write it down"). Nothing on the card sends anything: build mode keeps every sender off.
