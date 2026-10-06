-- Daily Word: every prayer request reaches its campus pastor, and stays until
-- he has written or prayed (MOS-to-8 build B09-13, scorecard fix SF-09-07).
--
-- prayers (a request stays a line on /staff "Needs you" until a pastor closes it)
--   pastor_done_at    when a pastor closed it (null = still open)
--   pastor_done_kind  'wrote' (he wrote to the person) | 'prayed' (he prayed)
--   pastor_done_by    the staff address that closed it
--   escalated_on      the campus-local date the one "waited two days" email
--                     covered it; set once, so a request nudges at most once
--
-- dw_region_gate: Daily Word's per-nation switch-on (chapter 13 contract C4).
--   One row per congregation key (dw_campuses.congregation, never
--   dw_campuses.region: "North America" holds both USA and Futuros, and
--   Futuros stays off). notices_on_at is null for all three: a kind set to
--   'live' still delivers nothing until Ashley's own switch-on SQL sets the
--   nation's timestamp. No route, function or script in this repo writes it.
--   A campus whose congregation is null (Indonesia, Brazil, Other) never
--   raises a line.
--
-- dw_prompt_kind: dw_prayer_pastor_line (the /staff line) and
--   dw_prayer_waiting (the one nameless "waited two days" email) seeded OFF.
--   A kind that already exists keeps its row untouched.
--
-- staff_roster.prayer_waiting_muted: "Stop the waiting email" (CROSS-CUTTING
--   section 10). A muted pastor still sees the card.
--
-- Nothing is backfilled and nothing is deleted. Service role only: the
-- browser never calls Supabase directly.
--
-- No transaction control in this file (28 Sep 2026). Rehearse it inside an
-- outer transaction that is rolled back; apply it inside one transaction too.

alter table public.prayers
  add column if not exists pastor_done_at timestamptz,
  add column if not exists pastor_done_kind text,
  add column if not exists pastor_done_by text,
  add column if not exists escalated_on date;

alter table public.prayers drop constraint if exists prayers_pastor_done_kind_check;
alter table public.prayers
  add constraint prayers_pastor_done_kind_check check (pastor_done_kind is null or pastor_done_kind in ('wrote', 'prayed'));

alter table public.prayers drop constraint if exists prayers_pastor_done_whole_check;
alter table public.prayers
  add constraint prayers_pastor_done_whole_check check (
    (pastor_done_at is null and pastor_done_kind is null and pastor_done_by is null)
    or (pastor_done_at is not null and pastor_done_kind is not null and pastor_done_by is not null)
  );

create index if not exists prayers_campus_pastor_done_created_idx
  on public.prayers (campus, pastor_done_at, created_at);

create table if not exists public.dw_region_gate (
  region        text        primary key check (region in ('futures-au', 'futures-us', 'futuros-us')),
  notices_on_at timestamptz,
  note          text
);

alter table public.dw_region_gate enable row level security;
revoke all on table public.dw_region_gate from public, anon, authenticated;

insert into public.dw_region_gate (region, notices_on_at, note) values
  ('futures-au', null, 'Futures Australia: Daily Word notices stay off until Ashley switches the nation on'),
  ('futures-us', null, 'Futures USA: Daily Word notices stay off until Ashley switches the nation on'),
  ('futuros-us', null, 'Futuros: set up, not launched; stays off')
on conflict (region) do nothing;

insert into public.dw_prompt_kind (kind, mode, note) values
  ('dw_prayer_pastor_line', 'off', 'B09-13: a prayer request is a line on its campus pastor''s /staff until he writes or prays; name and ask only'),
  ('dw_prayer_waiting',     'off', 'B09-13: one nameless email when a request has waited two days; campus and link only, the count in the log')
on conflict (kind) do nothing;

alter table public.staff_roster
  add column if not exists prayer_waiting_muted boolean not null default false;
