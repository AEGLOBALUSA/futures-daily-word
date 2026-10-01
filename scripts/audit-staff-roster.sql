-- READ-ONLY audit of the staff roster, to run BEFORE the setup-code fix deploys.
-- Safe to paste into the Supabase SQL editor for the Daily Word project.
-- Nothing here changes data. Ashley decides what to remove (see the end).

-- 1. Every roster row, who set the campus, whether it has a password, and what
--    its sessions and submissions are. Rows to look at first: role 'campus',
--    empty name, campus_set_by 'self' or null, not someone Ashley added.
select r.email, r.role, r.campus_id, r.campus_set_by,
       (r.display_name = '') as no_name,
       (r.password_hash is not null) as has_password,
       r.created_at::date as created,
       (select count(*) from staff_sessions s where s.email = r.email and s.expires_at > now()) as live_sessions,
       (select count(*) from intake_submissions i where i.email = r.email) as submissions,
       (select count(*) from intake_submissions i where i.email = r.email and i.status = 'approved') as published
  from staff_roster r
 order by (r.display_name = '') desc, r.created_at, r.email;

-- 2. Mixed-case or padded emails. resolveStaff matches the lower-cased address
--    exactly, so such a person would be locked out. Expect zero rows.
select email from staff_roster where email <> lower(btrim(email));

-- 3. Live sessions for an address that is not on the roster (should be zero rows).
select s.email, count(*) as live_sessions
  from staff_sessions s
 where s.expires_at > now()
   and not exists (select 1 from staff_roster r where r.email = s.email)
 group by s.email;

-- 4. Anything those suspect rows already put on the campus corner or the sermon page.
--    Replace the list with the emails from query 1 that you do not recognise.
-- select * from intake_submissions where email in ('someone@futures.church') order by created_at;

-- To REMOVE a squatter (run only after you decide, one address at a time; this
-- is what People → remove does, and it ends their sessions too):
--   delete from staff_sessions where email = 'someone@futures.church';
--   delete from staff_roster   where email = 'someone@futures.church';
