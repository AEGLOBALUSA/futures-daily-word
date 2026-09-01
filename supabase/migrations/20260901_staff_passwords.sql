alter table public.staff_roster add column if not exists password_hash text;
drop table if exists public.staff_otp;
