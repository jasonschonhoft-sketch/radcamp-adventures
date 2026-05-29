-- ============================================================================
-- RadCamp Adventures — rides schema v2 (pins + photos)
--
-- HOW TO RUN: open your Supabase project → SQL Editor → New query → paste this
-- entire file → Run. Safe to re-run (idempotent): uses IF NOT EXISTS and drops
-- policies before recreating them.
--
-- Prerequisite: schema.sql (rides + profiles) has already been applied.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. pins: a JSON array of { lat, lng, label } objects on each ride.
-- ----------------------------------------------------------------------------
alter table public.rides
  add column if not exists pins jsonb not null default '[]'::jsonb;

-- ----------------------------------------------------------------------------
-- 2. ride_photos: one row per uploaded photo. The binary lives in Supabase
--    Storage (bucket 'ride-photos'); storage_path points at it.
-- ----------------------------------------------------------------------------
create table if not exists public.ride_photos (
  id            uuid primary key default gen_random_uuid(),
  ride_id       uuid not null references public.rides (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  storage_path  text not null,
  caption       text,
  created_at    timestamptz not null default now()
);

create index if not exists ride_photos_ride_id_idx on public.ride_photos (ride_id);
create index if not exists ride_photos_user_id_idx on public.ride_photos (user_id);

-- ----------------------------------------------------------------------------
-- Row Level Security — you can only touch your own photo rows.
-- ----------------------------------------------------------------------------
alter table public.ride_photos enable row level security;

drop policy if exists "ride_photos_select_own" on public.ride_photos;
drop policy if exists "ride_photos_insert_own" on public.ride_photos;
drop policy if exists "ride_photos_update_own" on public.ride_photos;
drop policy if exists "ride_photos_delete_own" on public.ride_photos;

create policy "ride_photos_select_own" on public.ride_photos
  for select using (auth.uid() = user_id);

create policy "ride_photos_insert_own" on public.ride_photos
  for insert with check (auth.uid() = user_id);

create policy "ride_photos_update_own" on public.ride_photos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ride_photos_delete_own" on public.ride_photos
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- 3. Storage bucket: 'ride-photos' (PRIVATE).
--
-- Files are stored under a per-user prefix: <user_id>/<ride_id>/<filename>.
-- The policies below let an authenticated user read/write/delete ONLY objects
-- whose first path segment equals their own auth.uid().
-- ============================================================================

-- Create the bucket (private). Re-running just leaves it as-is.
insert into storage.buckets (id, name, public)
values ('ride-photos', 'ride-photos', false)
on conflict (id) do nothing;

drop policy if exists "ride_photos_storage_select_own" on storage.objects;
drop policy if exists "ride_photos_storage_insert_own" on storage.objects;
drop policy if exists "ride_photos_storage_update_own" on storage.objects;
drop policy if exists "ride_photos_storage_delete_own" on storage.objects;

create policy "ride_photos_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'ride-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "ride_photos_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'ride-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "ride_photos_storage_update_own" on storage.objects
  for update using (
    bucket_id = 'ride-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "ride_photos_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'ride-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
