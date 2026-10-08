-- Daily Word staff + Sermon Prep: the person's own text size follows them
-- across devices (TEXT-SIZE-PLAN row 10; Ashley, 5 Oct 2026: "create on all
-- the apps especailly on the phone an adjustable font size").
--
-- staff_roster.text_size      one of the kit's eight step keys
--                              (xs50 s65 s80 s90 default l115 l130 l150)
-- staff_roster.text_size_at   when the person saved it (newest wins against
--                              the device cookie mos_text)
--
-- Written only by netlify/functions/intake.js text_size_set, for the signed-in
-- person's own row. staff_roster keeps RLS on with no policies: service_role
-- stays the only grantee, so nothing here widens access.
alter table public.staff_roster
  add column if not exists text_size text,
  add column if not exists text_size_at timestamptz;

alter table public.staff_roster
  drop constraint if exists staff_roster_text_size_step;
alter table public.staff_roster
  add constraint staff_roster_text_size_step
  check (text_size is null or text_size in ('xs50','s65','s80','s90','default','l115','l130','l150'));
