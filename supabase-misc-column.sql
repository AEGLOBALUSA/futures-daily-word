-- Futures Daily Word — user_data.misc bag
-- ----------------------------------------------------------------------------
-- Adds a single catch-all JSONB column so the client can sync the long tail of
-- small per-user keys without a column per key:
--   dw_sermon_notes, dw_sermon_<id> (sermon fill-ins), dw_user_story
--   ("My Season"), dw_reading_slots, dw_todays_plan_passages, dw_plan_day_offset,
--   dw_chapters_per_day, dw_comfort_daily, dw_personal_media_url, dw_prayed_for,
--   dw_book_today_<id>.
--
-- Before this column existed, those keys were never backed up, so they were lost
-- on reinstall / a new device. The client + user-sync.js write `misc` separately
-- and non-fatally, so applying this is safe and order-independent: the rest of
-- sync keeps working whether or not this has run yet.
--
-- Additive, nullable-with-default, idempotent — safe to run on the live DB.

alter table public.user_data
  add column if not exists misc jsonb not null default '{}'::jsonb;
