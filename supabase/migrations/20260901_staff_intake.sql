-- Applied via Supabase MCP as staff_intake (2026-09-01).
-- Service-role only. One intake form; Ashley reviews before anything goes live.

create table if not exists public.staff_roster (
  email text primary key,
  role text not null check (role in ('admin', 'hub', 'campus')),
  campus_id text,
  display_name text not null default '',
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- OTP table left from the first draft; unused. Passwords live on staff_roster.

create table if not exists public.staff_otp (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_sessions (
  token_hash text primary key,
  email text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.intake_questions (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  label text not null,
  help text not null default '',
  type text not null check (type in (
    'text', 'long_text', 'yes_no', 'campus', 'date',
    'corner_add', 'corner_remove', 'sermon_notes'
  )),
  audience text not null default 'all' check (audience in ('all', 'campus', 'hub', 'admin')),
  required boolean not null default false,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intake_submissions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null,
  campus_id text,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  publish_result jsonb
);

create table if not exists public.published_sermons (
  id text primary key,
  sermon jsonb not null,
  is_current boolean not null default false,
  submission_id uuid references public.intake_submissions(id) on delete set null,
  published_at timestamptz not null default now(),
  published_by text not null default ''
);

-- Ashley Evans is the only seeded admin. Password is set out of band (hashed).
-- Other staff are not invented here; they sign in on /staff and set their own password.
insert into public.staff_roster (email, role, campus_id, display_name)
values ('ae@futures.global', 'admin', null, 'Ashley Evans')
on conflict (email) do update
  set role = 'admin',
      display_name = 'Ashley Evans',
      updated_at = now();
