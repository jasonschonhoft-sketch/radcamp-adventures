-- ============================================================================
-- RadCamp Adventures — Supabase schema (profiles + rides)
--
-- HOW TO RUN: open your Supabase project → SQL Editor → New query → paste this
-- entire file → Run. It is safe to re-run (idempotent): tables use IF NOT
-- EXISTS and policies are dropped before being recreated.
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto (enabled by default on Supabase, but be
-- explicit so the script is portable).
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles: one row per auth user. Created automatically by a trigger (below)
-- when someone signs up.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- rides: a recorded ride owned by a single user. The GPX track is stored as a
-- GeoJSON LineString in track_geojson.
-- ----------------------------------------------------------------------------
create table if not exists public.rides (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  title             text not null,
  ride_date         date not null,
  notes             text,
  distance_miles    numeric,
  duration_minutes  integer,
  elevation_gain_ft integer,
  area_name         text,
  track_geojson     jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists rides_user_id_idx on public.rides (user_id);
create index if not exists rides_ride_date_idx on public.rides (ride_date);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.rides    enable row level security;

-- profiles: anyone authenticated can read every profile (so we can show
-- usernames), but you can only write your own row.
drop policy if exists "profiles_select_all"  on public.profiles;
drop policy if exists "profiles_insert_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
drop policy if exists "profiles_delete_own"  on public.profiles;

create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- rides: fully private — you can only see and modify your own rides.
drop policy if exists "rides_select_own" on public.rides;
drop policy if exists "rides_insert_own" on public.rides;
drop policy if exists "rides_update_own" on public.rides;
drop policy if exists "rides_delete_own" on public.rides;

create policy "rides_select_own" on public.rides
  for select using (auth.uid() = user_id);

create policy "rides_insert_own" on public.rides
  for insert with check (auth.uid() = user_id);

create policy "rides_update_own" on public.rides
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rides_delete_own" on public.rides
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Auto-create a profile when a new auth user is created.
-- SECURITY DEFINER + fixed search_path is the recommended Supabase pattern so
-- the function can insert into profiles regardless of the caller's RLS context.
-- Username is derived from the email local-part; if that collides with an
-- existing username we fall back to local-part + a short id suffix so signup
-- never fails on a duplicate.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text := split_part(new.email, '@', 1);
begin
  begin
    insert into public.profiles (id, username, full_name)
    values (new.id, base_username, new.raw_user_meta_data ->> 'full_name');
  exception when unique_violation then
    insert into public.profiles (id, username, full_name)
    values (new.id, base_username || '_' || substr(new.id::text, 1, 8), new.raw_user_meta_data ->> 'full_name');
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Keep rides.updated_at fresh on every update.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rides_set_updated_at on public.rides;
create trigger rides_set_updated_at
  before update on public.rides
  for each row execute function public.set_updated_at();
