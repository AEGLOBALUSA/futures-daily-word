-- Daily Word prompt switches and send log (MOS-to-8 build B09-01).
--
-- Every Daily Word notice that tells a pastor, staff member or reader
-- something has a switch here, and it starts OFF. Ashley's ruling, 1 Oct 2026:
-- all alerts stay off until a region is switched on.
--
--   off     nothing is generated for anyone (the default for every kind);
--   shadow  generated and logged, delivered only to addresses on that kind's
--           shadow_recipients list (Ashley alone by default; the list is set
--           by hand with one SQL update and is never committed: public repo);
--   live    delivered to everyone the kind allows. Only Ashley sets live, and
--           only after he switches the region on (chapter 13 contract C4; the
--           Daily Word region gate itself is build B09-13).
--
-- dw_prompt_log holds one row per thing raised. dedupe_key is unique, so the
-- same thing is never raised twice (netlify/functions/lib/prompts.js claim()
-- inserts the row BEFORE anything is delivered). Kinds about readers store
-- counts and links only in title/body, never a reader's name, email or prayer.
--
-- Service role only: RLS on, no policies, everything revoked from anon and
-- authenticated. The browser never reads either table, and nothing in either
-- table reaches a model.
--
-- No transaction control in this file (28 Sep 2026: a "dry run" of a file that
-- carried its own transaction control applied it). Rehearse it inside an outer
-- transaction that is rolled back.

create table if not exists public.dw_prompt_kind (
  kind              text        primary key check (kind ~ '^dw_[a-z0-9_]{2,60}$'),
  mode              text        not null default 'off' check (mode in ('off', 'shadow', 'live')),
  shadow_recipients text[]      not null default '{}',
  note              text,
  updated_at        timestamptz not null default now()
);

create table if not exists public.dw_prompt_log (
  id          bigserial   primary key,
  kind        text        not null references public.dw_prompt_kind (kind),
  dedupe_key  text        not null unique check (char_length(dedupe_key) between 1 and 300),
  recipient   text        not null check (char_length(recipient) between 1 and 320),
  -- An "off" kind raises nothing, so only shadow and live rows are ever logged.
  mode        text        not null check (mode in ('shadow', 'live')),
  written_by  text        not null check (written_by in ('template', 'model')),
  title       text,
  body        text,
  link        text,
  delivered   boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists dw_prompt_log_kind_time_idx
  on public.dw_prompt_log (kind, created_at desc);

alter table public.dw_prompt_kind enable row level security;
alter table public.dw_prompt_log  enable row level security;

revoke all on table public.dw_prompt_kind from public, anon, authenticated;
revoke all on table public.dw_prompt_log  from public, anon, authenticated;
revoke all on sequence public.dw_prompt_log_id_seq from public, anon, authenticated;

-- Every kind the Daily Word chapter (B09-10, 11, 12, 13, 17, 18) will raise,
-- seeded OFF. A kind that already exists keeps its row untouched.
insert into public.dw_prompt_kind (kind, mode, note) values
  ('dw_sunday_notes_missing', 'off', 'B09-10: Saturday nudge when Sunday''s notes are not up yet'),
  ('dw_corner_draft',         'off', 'B09-18: the campus corner arrives drafted (Make this yours)'),
  ('dw_reading_week',         'off', 'Monday line: the campus''s reading week, counts and links only'),
  ('dw_prayer_held',          'off', 'B09-12: a prayer post held for a look, campus and link only'),
  ('dw_prayer_week',          'off', 'B09-12: the campus''s prayer requests that week, counts and links only'),
  ('dw_new_reader_hello',     'off', 'I''m New: staff are told; the hello itself is a person''s own words'),
  ('dw_daily_push_v2',        'off', 'B09-17: the reading reminder that knows your reading and hour (off = today''s push)')
on conflict (kind) do nothing;
