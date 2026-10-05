-- Daily Word prayer care (MOS-to-8 build B09-12): a post carrying contact
-- details, a link or bad language waits for a staff look before it reaches
-- the wall.
--
--   status       'shown'   on the wall (every existing row; the default)
--                'held'    waiting for a look (lib/prayer-screen.js matched it)
--                'private' a staff member pressed Keep it private: staff only
--   held_reason  why the screen held it: 'contact' | 'link' | 'language'
--
-- Nothing is backfilled and nothing is deleted: every existing row stays
-- 'shown'. prayer-wall.js reads status = 'shown' only; the /staff actions
-- prayers_week and prayer_decide (intake.js) read and decide the rest.
--
-- Access: on 5 Oct 2026 the live table had RLS on with one policy,
-- service_role_all_prayers (ALL, service_role), and the Supabase default
-- grants for anon and authenticated (no policy, so they read no rows). The
-- browser never calls Supabase directly (the Netlify functions use the service
-- key), so the anon and authenticated grants are revoked here: anon now gets
-- "permission denied", not an empty answer.
--
-- Apply BEFORE the code merges: prayer-wall.js filters on status, and a read
-- of a column that does not exist would empty the wall.
--
-- No transaction control in this file (28 Sep 2026). Rehearse it inside an
-- outer transaction that is rolled back; apply it inside one transaction too.

alter table public.prayers
  add column if not exists status text not null default 'shown',
  add column if not exists held_reason text;

alter table public.prayers drop constraint if exists prayers_status_check;
alter table public.prayers
  add constraint prayers_status_check check (status in ('shown', 'held', 'private'));

alter table public.prayers drop constraint if exists prayers_held_reason_check;
alter table public.prayers
  add constraint prayers_held_reason_check check (held_reason is null or held_reason in ('contact', 'link', 'language'));

create index if not exists prayers_campus_created_idx on public.prayers (campus, created_at desc);

revoke all on table public.prayers from anon, authenticated;
