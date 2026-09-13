-- public.activity_events was created ad hoc in production and never migrated
-- (see 20260912_activity_events_path_journey_day.sql). This migration lets the
-- schema be rebuilt from the repo on a fresh database, a Supabase branch, or
-- `supabase db reset`. Column list verified 2026-09-12 against the live table
-- on uamavjnjvmsopjzxirsd via information_schema.columns. `if not exists`
-- throughout: replaying this against production, where the table and both
-- later columns already exist, is a no-op.

create table if not exists public.activity_events (
  id bigint generated always as identity primary key,
  email text not null,
  event_type text not null,
  detail text,
  created_at timestamptz default now(),
  user_id uuid,
  path text,
  journey_day integer
);

-- Indexes moved here from supabase-indexes.sql (that file is a hand-run
-- dashboard script, not part of the replayable migration history) so a
-- rebuilt database gets them too. Originals left in place there.

-- Analytics: "events this week/month" range scans.
-- Used by: analytics-dashboard.js lines 63-64, 71-72
create index if not exists idx_activity_events_created_at on public.activity_events (created_at);

-- Export: "activity log for a specific user".
-- Used by: export-profiles.js lines 91-94
create index if not exists idx_activity_events_email_created on public.activity_events (email, created_at desc);
