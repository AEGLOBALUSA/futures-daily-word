-- Daily Word: "{n} people prayed for your request" (MOS-to-8 build B09-11).
--
-- Seeds one prompt kind, OFF. While it is off, prayer-wall.js answers
-- GET ?mine= with [] and the reader's app shows nothing new. Ashley moves it
-- to shadow, then live, on his word (Ashley, 1 Oct 2026: alerts off until a
-- region is switched on).
--
-- Shadow: the request ids allowed to see their count go in this kind's
-- shadow_recipients list (lower-case uuids), set by hand with one SQL update,
-- never committed. The same list and the same deliverable() check every other
-- Daily Word kind uses.
--
-- This kind sends nothing: no email, no push, no log row. It only lets the
-- poster's own phone read how many people tapped Pray on her own requests.
--
-- No transaction control in this file (28 Sep 2026). Rehearse it inside an
-- outer transaction that is rolled back; apply it inside one transaction too.

insert into public.dw_prompt_kind (kind, mode, note) values
  ('dw_prayed_count', 'off', 'B09-11: the poster''s own phone shows how many people prayed for her request (in-app only; shadow list = request ids)')
on conflict (kind) do nothing;
