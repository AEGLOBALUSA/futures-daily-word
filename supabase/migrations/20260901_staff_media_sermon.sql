-- Media role, formatted sermon JSON on submissions, hub/media questions.
-- Do not touch staff_roster.password_hash (Ashley already has a password).

alter table public.staff_roster drop constraint if exists staff_roster_role_check;
alter table public.staff_roster add constraint staff_roster_role_check
  check (role in ('admin', 'hub', 'campus', 'media'));

alter table public.intake_questions drop constraint if exists intake_questions_type_check;
alter table public.intake_questions add constraint intake_questions_type_check
  check (type in (
    'text', 'long_text', 'yes_no', 'campus', 'date',
    'corner_add', 'corner_remove', 'sermon_notes', 'sermon_pick'
  ));

alter table public.intake_questions drop constraint if exists intake_questions_audience_check;
alter table public.intake_questions add constraint intake_questions_audience_check
  check (audience in ('all', 'campus', 'hub', 'admin', 'media'));

alter table public.intake_submissions add column if not exists formatted_sermon jsonb;

insert into public.staff_roster (email, role, campus_id, display_name)
values
  ('alexi.patsianis@futures.church', 'media', null, 'Alexi Patsianis'),
  ('jessie.ramos@futures.church', 'media', null, 'Jessie Ramos'),
  ('noah.terrell@futures.church', 'media', null, 'Noah Terrell')
on conflict (email) do update
  set role = excluded.role,
      display_name = excluded.display_name,
      campus_id = excluded.campus_id,
      updated_at = now();

-- Keep campus-corner questions. Hide the old one-block sermon_notes blob.
update public.intake_questions
   set enabled = false, updated_at = now()
 where type = 'sermon_notes';

insert into public.intake_questions (id, sort_order, label, help, type, audience, required, enabled, config)
values
  ('a1000000-0000-4000-8000-000000000001', 100, 'Date preached', '', 'date', 'hub', true, true, '{"publish":"sermon_field","sermonKey":"date"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000002', 110, 'Sermon title', '', 'text', 'hub', true, true, '{"publish":"sermon_field","sermonKey":"title"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000003', 120, 'Speaker', 'Usually you.', 'text', 'hub', true, true, '{"publish":"sermon_field","sermonKey":"speaker"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000004', 130, 'Series', '', 'text', 'hub', false, true, '{"publish":"sermon_field","sermonKey":"series"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000005', 140, 'Key verse reference', 'e.g. Ephesians 2:8-9', 'text', 'hub', false, true, '{"publish":"sermon_field","sermonKey":"keyVerse"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000006', 150, 'Key verse text', '', 'long_text', 'hub', false, true, '{"publish":"sermon_field","sermonKey":"keyVerseText"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000007', 160, 'Notes / outline', 'Paste whatever you have — Word dump, bullets, headings. AI will format this into the live Sermon Notes page so the congregation can write in it.', 'long_text', 'hub', true, true, '{"publish":"sermon_field","sermonKey":"outline"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000008', 170, 'YouTube URL', 'Paste the YouTube link when you have it. Fine to leave blank and add after Sunday.', 'text', 'hub', false, true, '{"publish":"sermon_field","sermonKey":"youtubeUrl"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000011', 200, 'Which sermon', 'This week''s message, or paste the title if you are fixing an older one.', 'sermon_pick', 'media', true, true, '{"publish":"sermon_target"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000012', 210, 'YouTube URL', 'Paste the YouTube link. This attaches to the live Sermon Notes page.', 'text', 'media', false, true, '{"publish":"sermon_field","sermonKey":"youtubeUrl"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000013', 220, 'Notes polish', 'Paste a better outline if the hub pastor notes need a cleanup. Leave blank to keep the existing notes and only add/change the video.', 'long_text', 'media', false, true, '{"publish":"sermon_field","sermonKey":"outline"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000014', 230, 'Reformat with AI', 'Turn the notes into the fill-in page the congregation writes on.', 'yes_no', 'media', false, true, '{"publish":"sermon_reformat","default":true}'::jsonb)
on conflict (id) do update
  set sort_order = excluded.sort_order,
      label = excluded.label,
      help = excluded.help,
      type = excluded.type,
      audience = excluded.audience,
      required = excluded.required,
      enabled = excluded.enabled,
      config = excluded.config,
      updated_at = now();
