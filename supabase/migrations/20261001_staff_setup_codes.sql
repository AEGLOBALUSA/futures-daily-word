-- One-time setup codes for staff sign-in (Ashley, 1 Oct 2026).
--
-- Until now the first person to type an address that had no password could set
-- one: no code, no proof of the inbox. From now on a person chooses their first
-- password only with a code Ashley's roster_save (or "Let them set a new
-- password") issued. Only a bcrypt HASH of the code is stored; it expires,
-- works once (cleared in the same statement that stores the password) and is
-- burned after five wrong guesses.
--
-- Additive and nullable, so it is safe to apply BEFORE the code that uses it —
-- and it MUST be applied before that code deploys: auth_status and set_password
-- select these columns.
--
-- Not applied by this change. Apply with the supabase-change skill.
alter table public.staff_roster add column if not exists setup_code_hash text;
alter table public.staff_roster add column if not exists setup_code_expires_at timestamptz;
alter table public.staff_roster add column if not exists setup_code_attempts integer not null default 0;
