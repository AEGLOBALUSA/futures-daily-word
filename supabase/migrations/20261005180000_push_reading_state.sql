-- The daily reminder knows your reading and your hour (MOS-to-8 build B09-17).
--
-- Adds the reading state a reader's own device reports to its push row, so the
-- v2 reminder (prompt kind dw_daily_push_v2) can name her plan and day, skip a
-- day she already read, never push a Comfort reader, and back off after three
-- reminders in a row went unopened. All columns are additive and nullable
-- (unopened_streak defaults to 0), so the live sender, which never selects
-- them, behaves exactly as before while the kind is off.
--
--   persona         the reader's path slug (comfort, pastor_leader, ...)
--   journey_day     the plan or journey day the next reminder is for
--   next_passage    the passage to name, in the reader's language (<= 40)
--   next_label      the title, e.g. "Day 12 of Bible Basics" (<= 80)
--   next_for_date   the reader-local date next_passage/next_label are due;
--                   any other day the reminder uses today's templates
--   last_opened_at  the last time the app was opened on this device
--   last_read_date  the reader-local date of her latest read day
--   last_sent_at    when the v2 reminder last went to this row (a second
--                   guard against two in a day, e.g. after a time-zone change)
--   unopened_streak v2 reminders sent since the app was last opened
--
-- No name, email or user id is added: a push row stays a device, not a person.
-- push-subscribe.js writes these through a whitelist with length caps, and the
-- checks below hold the same caps in the database.
--
-- The browser never reads this table (Netlify functions use the service key).
-- anon and authenticated held table grants that RLS alone was blocking; they
-- are revoked here so a direct anon read is refused outright. service_role
-- keeps its grant and its existing policy.
--
-- No transaction control in this file (28 Sep 2026: a "dry run" of a file that
-- carried its own begin/commit applied it). Rehearse it inside an outer
-- transaction that is rolled back.

alter table public.push_subscriptions
  add column if not exists persona         text        check (persona is null or persona ~ '^[a-z_]{2,30}$'),
  add column if not exists journey_day     int         check (journey_day is null or journey_day between 1 and 1000),
  add column if not exists next_passage    text        check (next_passage is null or char_length(next_passage) between 1 and 40),
  add column if not exists next_label      text        check (next_label is null or char_length(next_label) between 1 and 80),
  add column if not exists next_for_date   date,
  add column if not exists last_opened_at  timestamptz,
  add column if not exists last_read_date  date,
  add column if not exists last_sent_at    timestamptz,
  add column if not exists unopened_streak int         not null default 0 check (unopened_streak >= 0);

revoke all on table public.push_subscriptions from anon, authenticated;
