-- Campus codes only for admin-confirmed campuses (Ashley's decision, 2 Sep 2026).
--
-- staff_roster.campus_id is written by two paths in netlify/functions/intake.js:
--   * roster_save — Ashley, in /staff → People            → campus_set_by = 'admin'
--   * "submit"    — a campus pastor with no roster campus
--                   picking one on their first submission  → campus_set_by = 'self'
-- pastor-admin my-campus-code derives the campus pastor code from campus_id, so
-- without this column a self-assigned campus minted a code nobody had confirmed.
-- From now on only 'admin' mints; 'self' answers { code: null, reason:
-- "campus_not_confirmed" } until Ashley re-saves the person with that campus.
--
-- Backfill: every campus assigned before this column existed is treated as
-- admin-confirmed (those rows were seeded or set by Ashley). pastor-admin also
-- reads a NULL as 'admin' so nothing changes for pastors already set up between
-- this migration and the code deploy — apply this migration BEFORE deploying
-- the intake.js that writes the column, or roster_save / self-assignment fail
-- on the unknown column.
alter table public.staff_roster add column if not exists campus_set_by text;

update public.staff_roster
   set campus_set_by = 'admin'
 where campus_id is not null
   and campus_set_by is null;
