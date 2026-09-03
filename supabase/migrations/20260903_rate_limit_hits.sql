-- The shared rate limiter's table (netlify/functions/lib/rate-limit.js), which
-- has been documented in that file's header since the limiter was written and
-- never created. Without it every "shared" limit — claude, the two TTS
-- functions, intake-login, and now sermon-notes-email — was a per-warm-Lambda
-- memory counter: concurrent instances never shared a count, and a cold start
-- granted a fresh budget. Found by the 3 Sep 2026 review of the notes email.
--
-- Service role only. The functions write with the service key; nothing else
-- may read or write it.

create table if not exists public.rate_limit_hits (
  key        text        not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_key_time_idx
  on public.rate_limit_hits (key, created_at);

alter table public.rate_limit_hits enable row level security;

revoke all on table public.rate_limit_hits from public, anon, authenticated;
