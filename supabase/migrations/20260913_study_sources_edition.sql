-- Wave B2, step 1a: a place to hold the source's own publication date/edition,
-- distinct from loaded_at (when WE loaded it, not when it was published).
alter table public.study_sources add column if not exists edition text;

comment on column public.study_sources.edition is
  'Free-text publication date or edition of the SOURCE itself (e.g. ''1710'', ''1871 edition''), '
  'as printed by the publisher — not derived from loaded_at, which only records when we loaded it. '
  'Stays null until a data load fills it in.';
