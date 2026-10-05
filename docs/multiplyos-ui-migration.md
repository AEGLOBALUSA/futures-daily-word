# MultiplyOS UI migration (Daily Word, v1)

Presentation only, default ON (owner ruling 5 Oct 2026), scoped to the staff screens at `/staff`.

Base reading size: Apple standard — 13px desktop, 17px phone (owner ruling 5 Oct 2026). `--mos-font-size` is 13px and becomes 17px under `@media (max-width: 767px)`; page title 26px (28px phone), section headings 17px (20px phone); controls 32px tall on desktop, 44px on phones.

## Turn on / off
- On: open `/staff?ui=multiplyos`. This sets the cookie `mos_ui=1` (one year, Path=/, SameSite=Lax, Secure).
- Off: open `/staff?ui=legacy`. This sets `mos_ui=0` (one year), so the off choice persists on that device.
- With no cookie, or any value other than `0`, the new look is on.
- When on, `<html>` gets `data-ui="multiplyos"` and class `mos-ui`. The flag is applied by `src/multiplyos/uiFlag.ts`, called from `src/main.tsx`.
- Off-route (any path other than `/staff`) the attribute is never set, even with the cookie.

## Staff screens (flag applies)
Login, StaffHome, QuickNotes, IntakeForm, NotesFlow, ReviewQueue/History, Roster/People, Campuses.

## Congregation screens (unchanged)
Everything else. The reader and congregation screens never read the flag.

## Left legacy in v1 (in-reader pastor tools)
PollDashboard, AnalyticsDashboard, PastorSignIn, PastorStudyOnboarding, Alpharetta creator panel.

## Rules for styling
- All MultiplyOS rules live in `src/multiplyos/staff-ui.css` (imported only by `StaffApp`, so it ships in the StaffApp chunk, never `index-*.css`).
- Every rule there must be prefixed `html[data-ui="multiplyos"]`.
- Do not name a file `multiplyos.css` and do not edit `DESIGN.md` (design-lint trap).

## Rollback
- ?ui=legacy per device; revert this flag commit to turn it off for everyone.
- Whole feature: revert the commit, or remove the `applyUiFlag` call in `src/main.tsx`. With no attribute set, none of the `mos-*` rules match and the legacy look is unchanged.
