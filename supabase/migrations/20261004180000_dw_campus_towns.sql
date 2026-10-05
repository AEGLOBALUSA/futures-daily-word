-- Daily Word: the towns near each campus, kept by the owner in /staff (MOS-to-8 build B09-07F).
--
-- B09-07 guessed a new reader's campus from her town with a town list typed in
-- code (src/utils/campusGuess.ts TOWNS). A second campus in a town already on
-- that list (a Futuros campus in Alpharetta, say) was never guessed until a
-- developer edited it, and the Adelaide "no single guess" towns lived in code
-- too. Ashley's rule: "needs a dev" is a defect.
--
-- Now the guess reads the campus rows: each campus's own Town (city, before the
-- comma) and, in this column, the other towns its readers live in. The owner
-- edits both in /staff -> Settings -> Campuses.
--
--   towns   other towns near this campus, as the owner typed them (one per
--           line in /staff; the server trims, drops tags and duplicates, and
--           keeps at most 20). Matching ignores case and accents.
--           A town named by more than one campus of the same kind (Futures or
--           Futuros) gives readers there a short list instead of one guess:
--           that is how the Adelaide metro is written down.
--
-- Public facts only, like the rest of the row: the GET serves `towns` so the
-- reader's phone can match its own town in memory. The reader's town is never
-- sent anywhere or stored.
--
-- RLS and grants are unchanged (RLS on, no policies, service_role only).
--
-- The first values are written once, when the column is created (it is null
-- only on that first run, until the end of this file): exactly what the code
-- list held on 4 Oct 2026. Running this file again changes nothing, so a town
-- list the owner has since edited, or cleared on purpose, is never put back.
--
-- No transaction control in this file (28 Sep 2026: a "dry run" of a file that
-- carried its own transaction control applied it). Rehearse it inside an outer
-- transaction that is rolled back; apply it inside one transaction too.

alter table public.dw_campuses
  add column if not exists towns text[];

update public.dw_campuses as c
set towns = v.towns
from (values
  ('au-paradise', array['Adelaide', 'Salisbury']::text[]),
  ('au-adelaide-city', array['Paradise', 'Salisbury']::text[]),
  ('au-salisbury', array['Adelaide', 'Paradise']::text[]),
  ('au-south', array['Adelaide', 'Paradise', 'Salisbury']::text[]),
  ('au-clare-valley', array['Clare']::text[]),
  ('au-copper-coast', array['Kadina', 'Wallaroo', 'Moonta']::text[]),
  ('us-gwinnett', array['Lawrenceville']::text[]),
  ('br-rio', array['Niterói']::text[])
) as v(id, towns)
where c.id = v.id
  and c.towns is null;

update public.dw_campuses
set towns = '{}'
where towns is null;

alter table public.dw_campuses
  alter column towns set default '{}';

alter table public.dw_campuses
  alter column towns set not null;

alter table public.dw_campuses
  drop constraint if exists dw_campuses_towns_max;

alter table public.dw_campuses
  add constraint dw_campuses_towns_max check (cardinality(towns) <= 20);
