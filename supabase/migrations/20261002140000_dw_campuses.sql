-- Daily Word: one campus list, kept by the owner in /staff (MOS-to-8 build B09-02).
--
-- Until now the campus list was typed by hand in seven places (the reader app,
-- the prayer wall, staff intake, campus codes, Planning Center matching, the
-- campus overview and the Sermon Notes congregation default), and adding a
-- campus was a code change. This table is the one list. Every function reads it
-- through netlify/functions/lib/campuses.js (5-minute cache, a bundled copy of
-- this seed if the read fails), the reader app reads active rows through the
-- public GET /.netlify/functions/campuses, and the owner edits rows in
-- /staff -> Settings -> Campuses (intake.js campus_save, admin only).
--
--   id            never renamed or deleted: it is stored on readers' profiles,
--                 prayers.campus, campus_content.campus, staff_roster.campus_id,
--                 and campus codes hash it. A campus leaves the pickers with
--                 active = false.
--   sunday_until  the local time Sunday's notes stop leading Home (B09-08).
--   pco_names     lower-case Planning Center campus spellings that map here.
--
-- Public facts only: a row never holds a person's details. updated_by is set by
-- the server to the saving staff address and is never served by the GET.
--
-- Seeded with exactly the 22 rows the app carried on 2 Oct 2026 (tokens.ts),
-- same ids, names, towns, regions and order. Venezuela is not seeded (the owner
-- adds those campuses in /staff when he chooses).
--
-- Service role only: RLS on, no policies, everything revoked from anon and
-- authenticated. The browser never reads this table directly.
--
-- No transaction control in this file (28 Sep 2026: a "dry run" of a file that
-- carried its own transaction control applied it). Rehearse it inside an outer
-- transaction that is rolled back.

create table if not exists public.dw_campuses (
  id            text        primary key check (id ~ '^[a-z]{2}-[a-z0-9-]{2,40}$' or id = 'other'),
  name          text        not null check (char_length(name) between 2 and 60),
  city          text        not null default '' check (char_length(city) <= 80),
  region        text        not null check (char_length(region) between 2 and 40),
  congregation  text        null check (congregation in ('futures-us', 'futures-au', 'futuros-us')),
  time_zone     text        not null check (char_length(time_zone) between 2 and 64),
  sunday_until  time        not null default '16:00',
  video_url     text        null check (video_url is null or video_url ~ '^https://'),
  pco_names     text[]      not null default '{}',
  sort_order    int         not null default 0,
  active        boolean     not null default true,
  updated_at    timestamptz not null default now(),
  updated_by    text        null
);

create index if not exists dw_campuses_sort_idx on public.dw_campuses (sort_order, id);

alter table public.dw_campuses enable row level security;

revoke all on table public.dw_campuses from public, anon, authenticated;

-- A row that already exists keeps its owner's edits.
insert into public.dw_campuses (id, name, city, region, congregation, time_zone, video_url, pco_names, sort_order) values
  ('au-paradise', 'Futures Paradise', 'Paradise, SA', 'Australia', 'futures-au', 'Australia/Adelaide', null, array['paradise', 'futures paradise']::text[], 10),
  ('au-adelaide-city', 'Futures Adelaide City', 'Adelaide, SA', 'Australia', 'futures-au', 'Australia/Adelaide', null, array['adelaide city', 'futures adelaide city', 'adelaide']::text[], 20),
  ('au-salisbury', 'Futures Salisbury', 'Salisbury, SA', 'Australia', 'futures-au', 'Australia/Adelaide', null, array['salisbury', 'futures salisbury']::text[], 30),
  ('au-south', 'Futures South', 'South Australia', 'Australia', 'futures-au', 'Australia/Adelaide', null, array['south', 'futures south']::text[], 40),
  ('au-clare-valley', 'Futures Clare Valley', 'Clare Valley, SA', 'Australia', 'futures-au', 'Australia/Adelaide', null, array['clare valley', 'futures clare valley']::text[], 50),
  ('au-mount-barker', 'Futures Mount Barker', 'Mount Barker, SA', 'Australia', 'futures-au', 'Australia/Adelaide', null, array['mount barker', 'futures mount barker', 'mt barker']::text[], 60),
  ('au-victor-harbor', 'Futures Victor Harbor', 'Victor Harbor, SA', 'Australia', 'futures-au', 'Australia/Adelaide', null, array['victor harbor', 'futures victor harbor', 'victor harbour']::text[], 70),
  ('au-copper-coast', 'Futures Copper Coast', 'Copper Coast, SA', 'Australia', 'futures-au', 'Australia/Adelaide', null, array['copper coast', 'futures copper coast']::text[], 80),
  ('us-gwinnett', 'Futures Gwinnett', 'Gwinnett, GA', 'North America', 'futures-us', 'America/New_York', 'https://www.youtube.com/embed/live_stream?channel=UCbrXwvwaPr_ZootS3z8YKLQ', array['gwinnett', 'futures gwinnett']::text[], 90),
  ('us-kennesaw', 'Futures Kennesaw', 'Kennesaw, GA', 'North America', 'futures-us', 'America/New_York', null, array['kennesaw', 'futures kennesaw']::text[], 100),
  ('us-alpharetta', 'Futures Alpharetta', 'Alpharetta, GA', 'North America', 'futures-us', 'America/New_York', null, array['alpharetta', 'futures alpharetta']::text[], 110),
  ('us-futuros-duluth', 'Futuros Duluth', 'Duluth, GA', 'North America', 'futuros-us', 'America/New_York', null, array['futuros duluth', 'duluth']::text[], 120),
  ('us-futuros-kennesaw', 'Futuros Kennesaw', 'Kennesaw, GA', 'North America', 'futuros-us', 'America/New_York', null, array['futuros kennesaw']::text[], 130),
  ('us-futuros-grayson', 'Futuros Grayson', 'Grayson, GA', 'North America', 'futuros-us', 'America/New_York', null, array['futuros grayson', 'grayson']::text[], 140),
  ('us-franklin', 'Futures Franklin', 'Franklin, TN', 'North America', 'futures-us', 'America/Chicago', null, array['franklin', 'futures franklin']::text[], 150),
  ('id-solo', 'Futures Solo', 'Surakarta, Central Java', 'Indonesia', null, 'Asia/Jakarta', null, array['solo', 'futures solo', 'surakarta']::text[], 160),
  ('id-cemani', 'Futures Cemani', 'Cemani, Central Java', 'Indonesia', null, 'Asia/Jakarta', null, array['cemani', 'futures cemani']::text[], 170),
  ('id-bali', 'Futures Bali', 'Denpasar, Bali', 'Indonesia', null, 'Asia/Makassar', null, array['bali', 'futures bali', 'denpasar']::text[], 180),
  ('id-samarinda', 'Futures Samarinda', 'Samarinda, East Kalimantan', 'Indonesia', null, 'Asia/Makassar', null, array['samarinda', 'futures samarinda']::text[], 190),
  ('id-langowan', 'Futures Langowan', 'Langowan, North Sulawesi', 'Indonesia', null, 'Asia/Makassar', null, array['langowan', 'futures langowan']::text[], 200),
  ('br-rio', 'Futures Rio', 'Rio de Janeiro, Brazil', 'Brazil', null, 'America/Sao_Paulo', null, array['rio', 'futures rio', 'rio de janeiro']::text[], 210),
  ('other', 'Non-Futures Church', 'Any', 'Other', null, 'UTC', null, '{}'::text[], 220)
on conflict (id) do nothing;
