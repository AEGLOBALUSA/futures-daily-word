-- Study data layer (Pastor Study & Preach plan, Phase 2).
-- Public-domain / Creative Commons reference data, bulk-loaded by
-- scripts/load-study-data.mjs and read ONLY through netlify/functions/study.js
-- (service role). Every row carries a source_id → study_sources so the Sources
-- screen can print each licence's required attribution; share_alike marks
-- CC BY-SA content so anything derived from it is labelled the same way.
--
-- Keys are the app's canonical English book names (src/data/bible-books.ts:
-- 'Genesis' … 'Revelation', 'Psalms', 'Song of Solomon'), 1-based chapter and
-- verse. chapter/verse 0 = whole-book / whole-chapter material.

create table if not exists public.study_sources (
  id            text primary key,
  name          text not null,
  licence       text not null,
  attribution   text not null,
  url           text,
  share_alike   boolean not null default false,
  language      text not null default 'en',
  loaded_at     timestamptz,
  record_count  integer,
  notes         text
);

create table if not exists public.study_crossrefs (
  book          text not null,
  chapter       integer not null,
  verse         integer not null,
  to_book       text not null,
  to_chapter    integer not null,
  to_verse      integer not null,
  to_verse_end  integer,
  votes         integer not null default 0,
  source_id     text not null references public.study_sources(id),
  primary key (source_id, book, chapter, verse, to_book, to_chapter, to_verse)
);
create index if not exists study_crossrefs_from_idx on public.study_crossrefs (book, chapter, verse, votes desc);

create table if not exists public.study_commentary (
  source_id     text not null references public.study_sources(id),
  book          text not null,
  chapter       integer not null,
  verse_from    integer not null default 0,   -- 0 = chapter introduction / whole chapter
  verse_to      integer not null default 0,
  content       text not null,                -- plain text or light markdown, never HTML
  primary key (source_id, book, chapter, verse_from, verse_to)
);
create index if not exists study_commentary_ref_idx on public.study_commentary (book, chapter);

-- Original-language words per verse (STEPBible TAGNT / TAHOT).
create table if not exists public.study_words (
  source_id     text not null references public.study_sources(id),
  book          text not null,
  chapter       integer not null,
  verse         integer not null,
  position      integer not null,             -- word order within the verse
  word          text not null,                -- surface form (Greek / Hebrew / Aramaic)
  lemma         text,
  strongs       text,                         -- 'G3056' / 'H2617'
  morph         text,
  gloss         text,                         -- short English gloss
  translit      text,
  primary key (source_id, book, chapter, verse, position)
);
create index if not exists study_words_strongs_idx on public.study_words (strongs);

-- Strong's number → lexicon entry (STEPBible TBESG / TBESH).
create table if not exists public.study_lexicon (
  strongs       text primary key,             -- 'G3056' / 'H2617'
  language      text not null,                -- greek | hebrew | aramaic
  lemma         text not null,
  translit      text,
  pronunciation text,
  gloss         text,                         -- one line
  definition    text,                         -- fuller entry
  usage         text,                         -- e.g. occurrence count
  source_id     text not null references public.study_sources(id)
);

-- English words tagged with Strong's numbers, per verse (a public-domain
-- Strong's-tagged Bible: replaces the Bolls.Life KJV S-tag scrape).
create table if not exists public.study_tagged_english (
  source_id     text not null references public.study_sources(id),
  book          text not null,
  chapter       integer not null,
  verse         integer not null,
  words         jsonb not null,               -- [{ "w": "beginning", "s": ["H7225"] }, …]
  primary key (source_id, book, chapter, verse)
);

create table if not exists public.study_places (
  id            text primary key,
  name          text not null,
  lat           double precision,
  lon           double precision,
  description   text,
  refs          text[] not null default '{}', -- 'Genesis 12:6' …
  source_id     text not null references public.study_sources(id)
);
create index if not exists study_places_refs_idx on public.study_places using gin (refs);

create table if not exists public.study_people (
  id            text primary key,
  name          text not null,
  description   text,
  refs          text[] not null default '{}',
  source_id     text not null references public.study_sources(id)
);
create index if not exists study_people_refs_idx on public.study_people using gin (refs);

create table if not exists public.study_illustrations (
  id            text primary key,             -- source id + entry number
  topic         text not null,
  title         text,
  body          text not null,
  refs          text[] not null default '{}',
  search        tsvector generated always as (to_tsvector('english', coalesce(topic, '') || ' ' || coalesce(title, '') || ' ' || coalesce(body, ''))) stored,
  source_id     text not null references public.study_sources(id)
);
create index if not exists study_illustrations_topic_idx on public.study_illustrations (lower(topic));
create index if not exists study_illustrations_search_idx on public.study_illustrations using gin (search);

-- Topical index (Nave / Torrey): topic → verse ranges.
create table if not exists public.study_topics (
  source_id     text not null references public.study_sources(id),
  topic         text not null,
  book          text not null,
  chapter       integer not null,
  verse         integer not null default 0,
  verse_end     integer not null default 0,
  primary key (source_id, topic, book, chapter, verse, verse_end)
);
create index if not exists study_topics_ref_idx on public.study_topics (book, chapter);
create index if not exists study_topics_topic_idx on public.study_topics (lower(topic));

-- Revised Common Lectionary: readings per Sunday / feast, years A/B/C.
create table if not exists public.study_lectionary (
  source_id     text not null references public.study_sources(id),
  year          text not null,                -- 'A' | 'B' | 'C'
  slug          text not null,                -- e.g. 'advent-1'
  name          text not null,
  season        text,
  readings      jsonb not null,               -- [{ "kind": "first", "ref": "Isaiah 2:1-5" }, …]
  primary key (source_id, year, slug)
);

-- RLS: reference data is served by study.js with the service role. Nothing
-- reads these tables from the browser, so no anon / authenticated policy —
-- least privilege, and revoked by role name, not just public.
do $$
declare t text;
begin
  foreach t in array array[
    'study_sources', 'study_crossrefs', 'study_commentary', 'study_words', 'study_lexicon',
    'study_tagged_english', 'study_places', 'study_people', 'study_illustrations',
    'study_topics', 'study_lectionary'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from authenticated', t);
  end loop;
end $$;
