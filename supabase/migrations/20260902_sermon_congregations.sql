-- Three Sermon Notes, one per congregation (Ashley, 2 Sep 2026): Futures USA,
-- Futures Australia, Futuros USA. The Home banner picks which one a person
-- reads; the staff form and the pastor Preach card pick which one a message
-- is for. Until now there was ONE current message for everyone.
--
-- Additive: both columns default to 'futures-us' so every existing row (there
-- are none in production as of 2 Sep 2026, but the Indonesia clone differs)
-- keeps behaving as before. Apply BEFORE deploying the intake.js /
-- published-sermon.js that write and filter on the column.
--
-- RLS: unchanged. Both tables carry only the service_role ALL policy (prod
-- security pass, 21 May 2026); the app reaches them through Netlify functions.
alter table public.published_sermons
  add column if not exists congregation text not null default 'futures-us';
alter table public.published_sermons
  drop constraint if exists published_sermons_congregation_check;
alter table public.published_sermons
  add constraint published_sermons_congregation_check
  check (congregation in ('futures-us', 'futures-au', 'futuros-us'));

alter table public.intake_submissions
  add column if not exists congregation text not null default 'futures-us';
alter table public.intake_submissions
  drop constraint if exists intake_submissions_congregation_check;
alter table public.intake_submissions
  add constraint intake_submissions_congregation_check
  check (congregation in ('futures-us', 'futures-au', 'futuros-us'));

-- Exactly one current message per congregation.
create unique index if not exists published_sermons_one_current_per_congregation
  on public.published_sermons (congregation)
  where is_current;

create index if not exists published_sermons_congregation_published_at
  on public.published_sermons (congregation, published_at desc);
