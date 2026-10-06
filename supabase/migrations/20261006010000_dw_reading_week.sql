-- DW-P08: a campus's reading week, without a code.
--
-- public.reading_week(p_campus) answers four counts for ONE campus, and
-- nothing else: no name, no email, no id ever leaves it.
--
--   readers          people at the campus who opened the Daily Word in the
--                    last 7 full days on the campus clock (any tracked event:
--                    opening the app counts, the same signal behind the code
--                    dashboard's "active this week")
--   first_time       of those, people with no Daily Word event before the week
--   started_journey  of those, people who started Bible Basics (plan
--                    'faith-pathway') or the I'm New journey in the week
--   prev_readers     people at the campus who opened it in the 7 days before
--
-- The campus join (activity_events has no campus column, read live 5 Oct
-- 2026): activity_events.email = profiles.email (both stored lower-case;
-- profiles.email is unique), and profiles.campus = p_campus, the id from
-- dw_campuses. A reader counts at the campus their profile names today.
--
-- The week is the 7 full local days ending at today's local midnight in the
-- campus's dw_campuses.time_zone (so Monday morning reads Monday to Sunday),
-- worked out on the local calendar and turned back into instants, so a week
-- that crosses a daylight-saving change is still 7 calendar days.
--
-- Service role only: security definer (it reads profiles and activity_events
-- past RLS), search_path empty, execute revoked from public, anon and
-- authenticated and granted to service_role alone. Netlify's intake action
-- `reading_week` is the only caller; it decides which campus a staff member
-- may ask for.
--
-- No transaction control in this file (the 28 Sep 2026 dry-run trap).

create or replace function public.reading_week(p_campus text)
returns table (readers integer, first_time integer, started_journey integer, prev_readers integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz         text;
  v_today      timestamp;
  v_end        timestamptz;
  v_start      timestamptz;
  v_prev_start timestamptz;
begin
  if p_campus is null or btrim(p_campus) = '' then
    raise exception 'reading_week: a campus is required' using errcode = '22023';
  end if;

  select c.time_zone into v_tz from public.dw_campuses c where c.id = p_campus;
  if v_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_tz) then
    v_tz := 'America/New_York';
  end if;

  v_today      := date_trunc('day', now() at time zone v_tz);
  v_end        := v_today at time zone v_tz;
  v_start      := (v_today - interval '7 days') at time zone v_tz;
  v_prev_start := (v_today - interval '14 days') at time zone v_tz;

  return query
  with ev as (
    select a.email, a.event_type, a.detail, a.created_at
    from public.activity_events a
    join public.profiles p on p.email = a.email
    where p.campus = p_campus
      and a.created_at >= v_prev_start
      and a.created_at < v_end
  ),
  wk as (
    select distinct ev.email from ev where ev.created_at >= v_start
  )
  select
    (select count(*) from wk)::integer,
    (select count(*) from wk
      where not exists (
        select 1 from public.activity_events o
        where o.email = wk.email and o.created_at < v_start
      ))::integer,
    (select count(distinct ev.email) from ev
      where ev.created_at >= v_start
        and ((ev.event_type = 'plan_start' and ev.detail = 'faith-pathway')
          or ev.event_type = 'new_to_faith_start'
          or (ev.event_type = 'persona_change' and ev.detail = 'new_to_faith')))::integer,
    (select count(distinct ev.email) from ev where ev.created_at < v_start)::integer;
end;
$$;

comment on function public.reading_week(text) is
  'DW-P08: four counts for one campus over the last 7 full local days (readers, first_time, started_journey, prev_readers). Counts only; service_role only; called by the intake action reading_week.';

revoke all on function public.reading_week(text) from public, anon, authenticated;
grant execute on function public.reading_week(text) to service_role;
