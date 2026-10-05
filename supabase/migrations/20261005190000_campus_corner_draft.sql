-- Daily Word: the campus corner arrives drafted, "Make this yours"
-- (MOS-to-8 build B09-18).
--
-- On Monday morning, campus time, the hourly job netlify/functions/corner-draft.js
-- writes ONE draft per campus for that week: a short note that compiles what
-- the app already holds (Sunday's published message: title, speaker, key verse
-- reference, series and one line of the published notes) and, once the campus
-- pastor answers, his own words. The campus pastor edits it on /staff and puts
-- it on the campus corner with his own tap (intake.js corner_draft_publish,
-- which writes ONE campus_content row). Nothing here is ever published by the
-- job, and nothing here sends an email.
--
--   week_of        the Monday (campus-local date) that starts the draft's week.
--                  unique (campus, week_of): one draft per campus per week; the
--                  job's insert IS its claim, so a second run writes nothing.
--   body           the draft text (the template's, or the model's when every
--                  sentence traces back to the facts), later the pastor's edit.
--   prayer_point   only ever the pastor's own words; the model never writes it.
--   facts          exactly what the draft was built from (lib/corner-draft.js
--                  buildFacts): the message fields, the last three corner
--                  titles and the pastor's typed answers. Never a reader's name,
--                  a prayer request, an analytics count or Bible verse text.
--   written_by     'model' or 'template' (who wrote the current body before
--                  the pastor's own edits).
--   status         draft -> published (the pastor's tap) or skipped
--                  ("Not this week"). Only a 'draft' can change.
--   refresh_count  redrafts asked for from the pastor's answers; capped at 5 a
--                  week in intake.js.
--
-- Service role only: RLS on, no policies, everything revoked from anon and
-- authenticated. The browser never reads this table; every read and write goes
-- through the staff session in intake.js (campus pastor: own campus only;
-- admin: any) or the scheduled job (service key).
--
-- The switch is dw_prompt_kind 'dw_corner_draft', seeded OFF by B09-01
-- (20261002120000_dw_prompt_switches.sql). The insert below only re-asserts the
-- row if it is missing and never changes an existing mode.
--
-- No transaction control in this file (28 Sep 2026: a "dry run" of a file that
-- carried its own transaction control applied it). Rehearse it inside an outer
-- transaction that is rolled back.

create table if not exists public.campus_corner_draft (
  id             uuid        primary key default gen_random_uuid(),
  campus         text        not null check (campus ~ '^[a-z]{2}-[a-z0-9-]{2,40}$'),
  week_of        date        not null check (extract(isodow from week_of) = 1),
  body           text        not null check (char_length(body) between 1 and 4000),
  prayer_point   text        check (prayer_point is null or char_length(prayer_point) <= 600),
  facts          jsonb       not null default '{}'::jsonb,
  written_by     text        not null check (written_by in ('model', 'template')),
  status         text        not null default 'draft' check (status in ('draft', 'published', 'skipped')),
  refresh_count  integer     not null default 0 check (refresh_count between 0 and 50),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  published_at   timestamptz,
  constraint campus_corner_draft_campus_week_key unique (campus, week_of)
);

create index if not exists campus_corner_draft_status_week_idx
  on public.campus_corner_draft (status, week_of desc);

alter table public.campus_corner_draft enable row level security;

revoke all on table public.campus_corner_draft from public, anon, authenticated;

insert into public.dw_prompt_kind (kind, mode, note) values
  ('dw_corner_draft', 'off', 'B09-18: the campus corner arrives drafted (Make this yours)')
on conflict (kind) do nothing;
