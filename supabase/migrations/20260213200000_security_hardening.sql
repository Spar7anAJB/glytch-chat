-- 20260213200000_security_hardening.sql
begin;

-- Restrict direct profile reads to the current user only.
drop policy if exists "authenticated can read profiles" on public.profiles;
drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

-- Expose non-sensitive profile fields via RPCs.
create or replace function public.find_public_profile_by_username(p_username text)
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  banner_url text,
  bio text,
  profile_theme jsonb,
  presence_status text,
  presence_updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.user_id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.banner_url,
    p.bio,
    p.profile_theme,
    coalesce(p.presence_status, 'offline')::text,
    p.presence_updated_at
  from public.profiles p
  where lower(p.username) = lower(trim(coalesce(p_username, '')))
  limit 1;
$$;

revoke all on function public.find_public_profile_by_username(text) from public;
grant execute on function public.find_public_profile_by_username(text) to authenticated;

create or replace function public.list_public_profiles_by_ids(p_user_ids uuid[])
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  banner_url text,
  bio text,
  profile_theme jsonb,
  presence_status text,
  presence_updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.user_id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.banner_url,
    p.bio,
    p.profile_theme,
    coalesce(p.presence_status, 'offline')::text,
    p.presence_updated_at
  from public.profiles p
  where p_user_ids is not null
    and p.user_id = any (p_user_ids)
  order by p.username asc;
$$;

revoke all on function public.list_public_profiles_by_ids(uuid[]) from public;
grant execute on function public.list_public_profiles_by_ids(uuid[]) to authenticated;

-- Prevent direct self-insert joins unless owner or trusted join RPC path.
drop policy if exists "users can join as self" on public.glytch_members;
drop policy if exists "owners can add own membership row" on public.glytch_members;
create policy "owners can add own membership row"
on public.glytch_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1
      from public.glytches g
      where g.id = glytch_members.glytch_id
        and g.owner_id = auth.uid()
    )
    or current_setting('app.allow_glytch_join_insert', true) = '1'
  )
);

-- Re-define join RPC to explicitly mark trusted insert context.
create or replace function public.join_glytch_by_code(p_invite_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target_glytch_id bigint;
  target_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select g.id into target_glytch_id
  from public.glytches g
  where lower(g.invite_code) = lower(trim(p_invite_code))
  limit 1;

  if target_glytch_id is null then
    raise exception 'Invalid invite code';
  end if;

  if exists (
    select 1
    from public.glytch_bans b
    where b.glytch_id = target_glytch_id
      and b.user_id = auth.uid()
  ) then
    raise exception 'You are banned from this Glytch';
  end if;

  select owner_id into target_owner_id
  from public.glytches
  where id = target_glytch_id;

  perform public.initialize_glytch_roles(target_glytch_id, target_owner_id);
  perform set_config('app.allow_glytch_join_insert', '1', true);

  insert into public.glytch_members (glytch_id, user_id)
  values (target_glytch_id, auth.uid())
  on conflict (glytch_id, user_id) do nothing;

  return json_build_object('glytch_id', target_glytch_id);
end;
$$;

revoke all on function public.join_glytch_by_code(text) from public;
grant execute on function public.join_glytch_by_code(text) to authenticated;

-- Make message media bucket private and enforce scoped access rules.
update storage.buckets
set public = false
where id = 'message-media';

drop policy if exists "public can read message media" on storage.objects;
drop policy if exists "participants can read message media" on storage.objects;
create policy "participants can read message media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'message-media'
  and (
    (
      (storage.foldername(name))[1] = 'dm'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and exists (
        select 1
        from public.dm_conversations c
        where c.id = ((storage.foldername(name))[2])::bigint
          and (c.user_a = auth.uid() or c.user_b = auth.uid())
      )
    )
    or
    (
      (storage.foldername(name))[1] = 'glytch'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and public.glytch_has_channel_permission(((storage.foldername(name))[2])::bigint, auth.uid(), 'view_channel')
    )
  )
);

drop policy if exists "users can upload own message media" on storage.objects;
drop policy if exists "users can upload scoped message media" on storage.objects;
create policy "users can upload scoped message media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'message-media'
  and (
    (
      (storage.foldername(name))[1] = 'dm'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and (storage.foldername(name))[3] = auth.uid()::text
      and exists (
        select 1
        from public.dm_conversations c
        where c.id = ((storage.foldername(name))[2])::bigint
          and (c.user_a = auth.uid() or c.user_b = auth.uid())
      )
    )
    or
    (
      (storage.foldername(name))[1] = 'glytch'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and (storage.foldername(name))[3] = auth.uid()::text
      and public.glytch_has_channel_permission(((storage.foldername(name))[2])::bigint, auth.uid(), 'send_messages')
    )
  )
);

drop policy if exists "users can update own message media" on storage.objects;
drop policy if exists "users can update scoped message media" on storage.objects;
create policy "users can update scoped message media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'message-media'
  and (storage.foldername(name))[3] = auth.uid()::text
)
with check (
  bucket_id = 'message-media'
  and (storage.foldername(name))[3] = auth.uid()::text
  and (
    (
      (storage.foldername(name))[1] = 'dm'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and exists (
        select 1
        from public.dm_conversations c
        where c.id = ((storage.foldername(name))[2])::bigint
          and (c.user_a = auth.uid() or c.user_b = auth.uid())
      )
    )
    or
    (
      (storage.foldername(name))[1] = 'glytch'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and public.glytch_has_channel_permission(((storage.foldername(name))[2])::bigint, auth.uid(), 'send_messages')
    )
  )
);

drop policy if exists "users can delete own message media" on storage.objects;
drop policy if exists "users can delete scoped message media" on storage.objects;
create policy "users can delete scoped message media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'message-media'
  and (storage.foldername(name))[3] = auth.uid()::text
  and (
    (
      (storage.foldername(name))[1] = 'dm'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and exists (
        select 1
        from public.dm_conversations c
        where c.id = ((storage.foldername(name))[2])::bigint
          and (c.user_a = auth.uid() or c.user_b = auth.uid())
      )
    )
    or
    (
      (storage.foldername(name))[1] = 'glytch'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and public.glytch_has_channel_permission(((storage.foldername(name))[2])::bigint, auth.uid(), 'send_messages')
    )
  )
);

commit;
