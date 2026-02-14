-- 20260212153000_voice_and_storage.sql
begin;
create or replace function public.user_can_access_voice_room(p_room_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  room_kind text;
  room_id_text text;
  room_id bigint;
begin
  if auth.uid() is null or p_room_key is null then
    return false;
  end if;

  room_kind := split_part(p_room_key, ':', 1);
  room_id_text := split_part(p_room_key, ':', 2);

  if room_id_text !~ '^[0-9]+$' then
    return false;
  end if;

  room_id := room_id_text::bigint;

  if room_kind = 'dm' then
    return exists (
      select 1
      from public.dm_conversations c
      where c.id = room_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    );
  end if;

  if room_kind = 'glytch' then
    return exists (
      select 1
      from public.glytch_channels ch
      where ch.id = room_id
        and ch.kind = 'voice'
        and public.glytch_has_channel_permission(ch.id, auth.uid(), 'join_voice')
    );
  end if;

  return false;
end;
$$;

revoke all on function public.user_can_access_voice_room(text) from public;
grant execute on function public.user_can_access_voice_room(text) to authenticated;

create table if not exists public.voice_participants (
  room_key text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_key, user_id)
);

create table if not exists public.voice_signals (
  id bigint generated always as identity primary key,
  room_key text not null,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in ('offer', 'answer', 'candidate')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists voice_signals_room_key_id_idx on public.voice_signals (room_key, id);
create index if not exists voice_signals_created_at_idx on public.voice_signals (created_at);

alter table public.voice_participants enable row level security;
alter table public.voice_signals enable row level security;

drop policy if exists "voice participants can view room members" on public.voice_participants;
create policy "voice participants can view room members"
on public.voice_participants
for select
to authenticated
using (public.user_can_access_voice_room(room_key));

drop policy if exists "voice participants can join as self" on public.voice_participants;
create policy "voice participants can join as self"
on public.voice_participants
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.user_can_access_voice_room(room_key)
);

drop policy if exists "voice participants can update own state" on public.voice_participants;
create policy "voice participants can update own state"
on public.voice_participants
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and public.user_can_access_voice_room(room_key)
);

drop policy if exists "voice participants can leave as self" on public.voice_participants;
create policy "voice participants can leave as self"
on public.voice_participants
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "voice participants can read room signals" on public.voice_signals;
create policy "voice participants can read room signals"
on public.voice_signals
for select
to authenticated
using (
  public.user_can_access_voice_room(room_key)
  and (target_id is null or target_id = auth.uid() or sender_id = auth.uid())
);

drop policy if exists "voice participants can insert room signals" on public.voice_signals;
create policy "voice participants can insert room signals"
on public.voice_signals
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.user_can_access_voice_room(room_key)
);

-- Storage bucket for user profile assets (avatar/banner uploads)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "public can read profile media" on storage.objects;
create policy "public can read profile media"
on storage.objects
for select
to public
using (bucket_id = 'profile-media');

drop policy if exists "users can upload own profile media" on storage.objects;
create policy "users can upload own profile media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can update own profile media" on storage.objects;
create policy "users can update own profile media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can delete own profile media" on storage.objects;
create policy "users can delete own profile media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
commit;
