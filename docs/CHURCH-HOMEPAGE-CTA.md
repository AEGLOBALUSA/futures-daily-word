# Church homepage CTA — one tap into Day 1

The Daily Word site (`futuresdailyword.com`) now lands a **cold visitor straight
into Day 1** of the existing 40-day series **New & Returning to Faith**
("Grace Changes Everything" · Ephesians 2). No five-choice picker.

The church site (`futures.church`) is a **different repo**. This file is the
exact homepage CTA that site needs. Nothing here invents traffic numbers.

## Destination (already live once this PR ships)

| | |
|---|---|
| **URL** | `https://futuresdailyword.com/?from=church` |
| **Also works** | `https://futuresdailyword.com/` (same Day 1; `from=church` is attribution only) |
| **Sunday** | Same URL. Do not send people to `?sunday=1` / `?sermon=1` for this hop — those open sermon-notes / guest chrome. Day 1 is the product. |
| **What they see** | Superdesign Day 1 landing (wordmark, Day 1 of 40, **Grace Changes Everything**, Ephesians 2:8-9, pastoral word). One tap: **Begin Day 1**. No persona picker, tabs, or settings. |
| **What they do not see** | I'm New / Church Member / Deep Study / Leader / Comfort. No skip. |

`from=church` is stripped from the address bar after read, and fires a real
`app_open` detail (`church`) through the existing `track()` helper. It does
not reset a returning reader who already chose a pathway in Settings.

## Copy (one tap on the church homepage)

Keep it one action. Suggested label (EN); translate on the church site if that
page is localized:

- **Button / tile:** `Today's Word`
- **Optional sub:** `Day 1 · Grace Changes Everything`
- **Aria:** `Open today's Daily Word — Day 1 of New & Returning to Faith`

Do not add a second tap ("choose your path", "learn more", email-first). The
leak was 1,855 church-site people vs 41 on Daily Word in 14 days — the hop
has to be the tap.

## Placement

Especially Sunday. One obvious control on the church homepage (hero or the
existing Daily Word tab/tile), pointing at the URL above. Not buried in the
footer. Not an iframe of the five-choice picker.

## What Daily Word already does (do not rebuild this on the church repo)

- Cold start writes `new_to_faith` with source `default` (local only — does
  not stamp over a cross-device choice).
- Enrolls `dw_pathway_progress` on Day 1 of the existing 40-day JSON
  (`books/faith-pathway.json`). No new teaching, no new verses.
- Returning users with `source: onboarding | settings | upgrade` are left alone.

## Verify after the church change

1. Incognito → church homepage → tap CTA → Daily Word Day 1 landing
   ("Grace Changes Everything", Ephesians 2:8-9, **Begin Day 1**). No picker.
2. Tap **Begin Day 1** → Home with the same day's reading.
2. Same user, Settings → change persona → still their choice on reload.
3. `?from=church` disappears from the URL after load.
