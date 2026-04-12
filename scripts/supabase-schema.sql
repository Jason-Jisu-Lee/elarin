-- ============================================================
-- Elarin — Supabase schema
-- Run this in the Supabase SQL Editor (project: ghbvuecbndgxehpowxiu)
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique,
  birthday     date not null,
  platform     text not null default 'android',
  app_version  text,
  timezone     text,
  created_at   timestamptz not null default now()
);

-- Index for username uniqueness checks (isUsernameTaken query)
create index if not exists profiles_username_idx on public.profiles(username);

alter table public.profiles enable row level security;

-- Users can only read/write their own profile
create policy "profiles: owner read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);

-- ── events ───────────────────────────────────────────────────
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  goal_id     text not null,   -- local UUID from the device
  action      text not null check (action in ('done', 'step_down', 'snooze')),
  source      text not null check (source in ('in_app', 'notification')),
  occurred_at timestamptz not null default now()
);

create index if not exists events_user_id_idx    on public.events(user_id);
create index if not exists events_occurred_at_idx on public.events(occurred_at desc);

alter table public.events enable row level security;

-- Users can only read/insert their own events (never update/delete)
create policy "events: owner read"
  on public.events for select
  using (auth.uid() = user_id);

create policy "events: owner insert"
  on public.events for insert
  with check (auth.uid() = user_id);

-- ── username lookup (unauthenticated, needed for uniqueness checks + sign-in) ──
-- Allow anyone to read profiles so isUsernameTaken and username→email lookups work.
create policy "profiles: public read"
  on public.profiles for select
  using (true);

-- RPC: look up the auth email for a given username (used for sign-in by username).
-- SECURITY DEFINER lets it read auth.users via the postgres role.
create or replace function public.get_email_by_username(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select au.email
  from auth.users au
  join public.profiles p on au.id = p.id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;
