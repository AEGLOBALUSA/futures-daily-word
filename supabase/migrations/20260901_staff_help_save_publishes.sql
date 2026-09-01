-- Live staff form: Save publishes. No "after Ashley approves" / sign-off copy.
update public.intake_questions
   set help = 'Paste the YouTube link. It goes on the Sermon Notes page.',
       updated_at = now()
 where help ilike '%after Ashley approves%';

update public.intake_questions
   set help = 'Optional. You can look first, or save and it formats then.',
       updated_at = now()
 where help ilike '%sign off%';
