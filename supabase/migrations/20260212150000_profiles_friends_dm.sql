-- 20260212150000_profiles_friends_dm.sql
begin;
-- Run in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  username text,
  avatar_url text,
  banner_url text,
  bio text,
  profile_theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists profile_theme jsonb not null default '{}'::jsonb;

update public.profiles
set username = lower(regexp_replace(split_part(email, '@', 1), '\\s+', '', 'g')) || '_' || substr(replace(user_id::text, '-', ''), 1, 6)
where username is null or username = '';

alter table public.profiles alter column username set not null;

drop index if exists profiles_username_lower_key;
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

alter table public.profiles drop constraint if exists profiles_username_no_spaces;
alter table public.profiles add constraint profiles_username_no_spaces check (position(' ' in username) = 0);

alter table public.profiles enable row level security;

drop policy if exists "authenticated can read profiles" on public.profiles;
create policy "authenticated can read profiles"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles
    where lower(username) = lower(trim(p_username))
  );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

create table if not exists public.friend_requests (
  id bigint generated always as identity primary key,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (sender_id, receiver_id),
  check (sender_id <> receiver_id)
);

alter table public.friend_requests enable row level security;

drop policy if exists "users can view their requests" on public.friend_requests;
create policy "users can view their requests"
on public.friend_requests
for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "users can send friend requests" on public.friend_requests;
create policy "users can send friend requests"
on public.friend_requests
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and sender_id <> receiver_id
  and status = 'pending'
);

drop policy if exists "receiver can update request status" on public.friend_requests;
create policy "receiver can update request status"
on public.friend_requests
for update
to authenticated
using (auth.uid() = receiver_id)
with check (
  auth.uid() = receiver_id
  and status in ('accepted', 'rejected')
);

create table if not exists public.dm_conversations (
  id bigint generated always as identity primary key,
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

alter table public.dm_conversations enable row level security;

drop policy if exists "participants can view conversations" on public.dm_conversations;
create policy "participants can view conversations"
on public.dm_conversations
for select
to authenticated
using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "participants can create conversations" on public.dm_conversations;
create policy "participants can create conversations"
on public.dm_conversations
for insert
to authenticated
with check (
  (auth.uid() = user_a or auth.uid() = user_b)
  and user_a < user_b
);

create table if not exists public.dm_messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.dm_conversations(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null check (char_length(content) > 0),
  created_at timestamptz not null default now()
);

alter table public.dm_messages enable row level security;

drop policy if exists "participants can view dm messages" on public.dm_messages;
create policy "participants can view dm messages"
on public.dm_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_messages.conversation_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
);

drop policy if exists "participants can send dm messages" on public.dm_messages;
create policy "participants can send dm messages"
on public.dm_messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_messages.conversation_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
);

commit;
