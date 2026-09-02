-- Campus form: two optional long_text boxes. Keep old title/body questions off.

update public.intake_questions
   set enabled = false, updated_at = now()
 where audience = 'campus'
   and (
     label in (
       'What do you want to add to the campus corner?',
       'What should it say?',
       'Add to campus corner'
     )
     or type = 'corner_add'
     or (config->>'publish') in ('campus_title', 'campus_body')
   );

-- This week at campus → announcement. First line = title.
insert into public.intake_questions (id, sort_order, label, help, type, audience, required, enabled, config)
select 'c1000000-0000-4000-8000-000000000001', 20,
       'What''s on this week at your campus?',
       'First line is the title. The rest is what people read.',
       'long_text', 'campus', false, true,
       '{"publish":"campus_corner","itemType":"announcement"}'::jsonb
where not exists (
  select 1 from public.intake_questions
   where audience = 'campus'
     and label = 'What''s on this week at your campus?'
);

update public.intake_questions
   set sort_order = 20,
       help = 'First line is the title. The rest is what people read.',
       type = 'long_text',
       required = false,
       enabled = true,
       config = '{"publish":"campus_corner","itemType":"announcement"}'::jsonb,
       updated_at = now()
 where audience = 'campus'
   and label = 'What''s on this week at your campus?';

-- Prayer point. First line = title.
insert into public.intake_questions (id, sort_order, label, help, type, audience, required, enabled, config)
select 'c1000000-0000-4000-8000-000000000002', 30,
       'Is there a prayer point for your people?',
       'First line is the title. The rest is what people read.',
       'long_text', 'campus', false, true,
       '{"publish":"campus_corner","itemType":"prayer_point"}'::jsonb
where not exists (
  select 1 from public.intake_questions
   where audience = 'campus'
     and label = 'Is there a prayer point for your people?'
);

update public.intake_questions
   set sort_order = 30,
       help = 'First line is the title. The rest is what people read.',
       type = 'long_text',
       required = false,
       enabled = true,
       config = '{"publish":"campus_corner","itemType":"prayer_point"}'::jsonb,
       updated_at = now()
 where audience = 'campus'
   and label = 'Is there a prayer point for your people?';

update public.intake_questions
   set sort_order = 40, enabled = true, updated_at = now()
 where audience = 'campus'
   and type = 'corner_remove'
   and label = 'Is there anything that should come down?';
