-- Hide the duplicate notes-flow rows that were inserted without flow/publish config.
-- Keep b1000000-* (flow: notes_have / notes_paste / notes_ai).
update public.intake_questions
   set enabled = false, updated_at = now()
 where enabled = true
   and coalesce(config->>'flow', '') = ''
   and (
     label in (
       'Do you have your notes?',
       'Paste your notes.',
       'Would you like AI to format these for the congregation?',
       'Paste the notes that need a cleanup.'
     )
     or config ? 'paste'
     or config ? 'ai_format'
   );
