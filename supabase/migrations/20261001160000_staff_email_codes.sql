-- An emailed staff code gets its own slot (Ashley, 1 Oct 2026).
--
-- "Email me a code" used to write into setup_code_hash, the same slot as the
-- code Ashley hands over when he adds someone. Anyone could type a pastor's
-- address into "Email me a code" and void Ashley's code. From now on an emailed
-- code lives in these columns; set_password takes either code, and using one
-- clears both. Only a bcrypt HASH of the code is stored.
--
-- Additive and nullable, so it is safe to apply BEFORE the code that uses it,
-- and it MUST be applied before that code deploys: email_setup_code and
-- set_password read and write these columns.
alter table public.staff_roster add column if not exists email_code_hash text;
alter table public.staff_roster add column if not exists email_code_expires_at timestamptz;
