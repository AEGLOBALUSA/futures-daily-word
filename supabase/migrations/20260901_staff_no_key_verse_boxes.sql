-- Keep key-verse boxes off the pastor form. AI pulls a verse from pasted notes.
update public.intake_questions
   set enabled = false, updated_at = now()
 where enabled = true
   and (
     (config->>'sermonKey') in ('keyVerse', 'keyVerseText')
     or label in (
       'What is the key verse?',
       'Write out the key verse.',
       'Key verse reference',
       'Key verse text'
     )
   );
