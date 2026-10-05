# MultiplyOS UI migration (Daily Word, v1)

Presentation only, default OFF, scoped to the staff screens at `/staff`.

## Turn on / off
- On: open `/staff?ui=multiplyos`. This sets the cookie `mos_ui=1` (one year, Path=/, SameSite=Lax, Secure).
- Off: open `/staff?ui=legacy`. This clears the cookie.
- Or set/clear the `mos_ui` cookie directly.
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
- Per user: `/staff?ui=legacy`.
- Whole feature: revert the commit, or remove the `applyUiFlag` call in `src/main.tsx`. With no attribute set, none of the `mos-*` rules match and the legacy look is unchanged.
