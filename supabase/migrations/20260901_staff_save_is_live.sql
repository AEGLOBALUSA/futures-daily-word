-- AI format is optional. Save publishes. No sign-off copy on the form.
update public.intake_questions
   set help = 'Optional. You can look first, or save and it formats then.',
       updated_at = now()
 where config->>'flow' = 'notes_ai';
