-- One-prompt metadata + paste notes flow. Disable Point 1/2/3 dump questions.
-- Do not touch staff_roster.password_hash.

-- Hide compound / point-by-point / polish questions.
update public.intake_questions
   set enabled = false, updated_at = now()
 where type in ('sermon_notes', 'corner_add')
    or label in (
      'Notes / outline',
      'Notes polish',
      'Reformat with AI',
      'Add to campus corner',
      'This week''s sermon notes',
      'Do the notes need a cleanup?',
      'What is the one thing you want people to walk away with?'
    )
    or label like 'Point %'
    or label like 'If you are cleaning%'
    or (label = 'What should people do this week?' and audience in ('hub', 'media'));

-- Campus: one title box, one body box, one remove picker.
update public.intake_questions
   set config = '{"publish":"campus_title"}'::jsonb,
       help = '',
       enabled = true,
       updated_at = now()
 where audience = 'campus' and type = 'text' and enabled = true
   and (config->>'publish' in ('campus_corner', 'campus_title') or label like 'What do you want to add%');

update public.intake_questions
   set config = '{"publish":"campus_body"}'::jsonb,
       enabled = true,
       updated_at = now()
 where audience = 'campus' and type = 'long_text'
   and label = 'What should it say?';

-- Hub metadata labels + key-verse help.
update public.intake_questions
   set help = 'e.g. Ephesians 2:8-9', updated_at = now()
 where audience = 'hub' and (config->>'sermonKey') = 'keyVerse' and enabled = true;

update public.intake_questions
   set config = '{"publish":"sermon_target"}'::jsonb, updated_at = now()
 where audience = 'media' and type = 'sermon_pick';

-- Notes flow questions (rendered as paste → AI? → preview on the form).
insert into public.intake_questions (id, sort_order, label, help, type, audience, required, enabled, config)
values
  ('b1000000-0000-4000-8000-000000000001', 250, 'Do you have your notes?', '', 'yes_no', 'hub', true, true, '{"flow":"notes_have"}'::jsonb),
  ('b1000000-0000-4000-8000-000000000002', 260, 'Paste your notes.', 'Whatever you have — outline, Word dump, bullets.', 'long_text', 'hub', false, true, '{"flow":"notes_paste","publish":"sermon_field","sermonKey":"outline"}'::jsonb),
  ('b1000000-0000-4000-8000-000000000003', 270, 'Would you like AI to format these for the congregation?', 'You will see the congregation page. Sign off when it looks right.', 'yes_no', 'hub', false, true, '{"flow":"notes_ai","publish":"sermon_reformat"}'::jsonb),
  ('b1000000-0000-4000-8000-000000000004', 410, 'Paste notes if you are cleaning them up.', 'Leave blank to only attach the YouTube. Pasting notes will not wipe the video.', 'long_text', 'media', false, true, '{"flow":"notes_paste","publish":"sermon_field","sermonKey":"outline"}'::jsonb),
  ('b1000000-0000-4000-8000-000000000005', 420, 'Would you like AI to format these for the congregation?', 'You will see the congregation page. Sign off when it looks right.', 'yes_no', 'media', false, true, '{"flow":"notes_ai","publish":"sermon_reformat"}'::jsonb)
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
