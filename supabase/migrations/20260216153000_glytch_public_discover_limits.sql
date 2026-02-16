-- 20260216153000_glytch_public_discover_limits.sql
begin;

alter table public.glytches
  add column if not exists is_public boolean not null default false;

alter table public.glytches
  add column if not exists max_members integer;

alter table public.glytches
  drop constraint if exists glytches_max_members_range;

alter table public.glytches
  add constraint glytches_max_members_range
  check (max_members is null or (max_members between 2 and 5000));

create index if not exists glytches_is_public_created_at_idx
  on public.glytches (is_public, created_at desc);

create index if not exists glytches_name_search_idx
  on public.glytches (lower(name));

drop function if exists public.create_glytch(text);
drop function if exists public.create_glytch(text, boolean, integer);
create or replace function public.create_glytch(
  p_name text,
  p_is_public boolean default false,
  p_max_members integer default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_glytch_id bigint;
  new_code text;
  general_category_id bigint;
  general_channel_id bigint;
  normalized_name text;
  normalized_max_members integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  normalized_name := trim(coalesce(p_name, ''));
  if normalized_name = '' then
    raise exception 'Glytch name is required';
  end if;

  normalized_max_members := case
    when p_max_members is null then null
    else p_max_members
  end;

  if normalized_max_members is not null and (normalized_max_members < 2 or normalized_max_members > 5000) then
    raise exception 'Max members must be between 2 and 5000';
  end if;

  insert into public.glytches (owner_id, name, is_public, max_members)
  values (auth.uid(), normalized_name, coalesce(p_is_public, false), normalized_max_members)
  returning id, invite_code into new_glytch_id, new_code;

  insert into public.glytch_members (glytch_id, user_id, role)
  values (new_glytch_id, auth.uid(), 'owner')
  on conflict (glytch_id, user_id) do update set role = 'owner';

  perform public.initialize_glytch_roles(new_glytch_id, auth.uid());

  insert into public.glytch_channel_categories (glytch_id, name, created_by)
  values (new_glytch_id, 'General', auth.uid())
  returning id into general_category_id;

  insert into public.glytch_channels (glytch_id, name, kind, category_id, created_by)
  values (new_glytch_id, 'general-chat', 'text', general_category_id, auth.uid())
  returning id into general_channel_id;

  insert into public.glytch_channels (glytch_id, name, kind, category_id, created_by)
  values (new_glytch_id, 'general-vc', 'voice', general_category_id, auth.uid());

  return json_build_object(
    'glytch_id', new_glytch_id,
    'invite_code', new_code,
    'channel_id', general_channel_id
  );
end;
$$;

revoke all on function public.create_glytch(text, boolean, integer) from public;
grant execute on function public.create_glytch(text, boolean, integer) to authenticated;

drop function if exists public.set_glytch_profile(bigint, text, text);
drop function if exists public.set_glytch_profile(bigint, text, text, boolean, integer, boolean);
create or replace function public.set_glytch_profile(
  p_glytch_id bigint,
  p_name text,
  p_bio text,
  p_is_public boolean default null,
  p_max_members integer default null,
  p_apply_max_members boolean default false
)
returns public.glytches
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_glytch public.glytches;
  current_member_count integer;
  next_max_members integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or nullif(trim(p_name), '') is null then
    raise exception 'Glytch name is required';
  end if;

  if p_apply_max_members then
    next_max_members := p_max_members;
    if next_max_members is not null and (next_max_members < 2 or next_max_members > 5000) then
      raise exception 'Max members must be between 2 and 5000';
    end if;

    if next_max_members is not null then
      select count(*)::integer into current_member_count
      from public.glytch_members m
      where m.glytch_id = p_glytch_id;

      if next_max_members < current_member_count then
        raise exception 'Max members cannot be lower than current member count';
      end if;
    end if;
  end if;

  update public.glytches g
  set name = trim(p_name),
      bio = nullif(trim(p_bio), ''),
      is_public = coalesce(p_is_public, g.is_public),
      max_members = case
        when p_apply_max_members then p_max_members
        else g.max_members
      end
  where g.id = p_glytch_id
    and g.owner_id = auth.uid()
  returning g.* into updated_glytch;

  if updated_glytch.id is null then
    raise exception 'Not allowed to update this Glytch profile';
  end if;

  return updated_glytch;
end;
$$;

revoke all on function public.set_glytch_profile(bigint, text, text, boolean, integer, boolean) from public;
grant execute on function public.set_glytch_profile(bigint, text, text, boolean, integer, boolean) to authenticated;

create or replace function public.join_glytch_by_code(p_invite_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target_glytch_id bigint;
  target_owner_id uuid;
  target_max_members integer;
  current_member_count integer;
  already_member boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select g.id, g.owner_id, g.max_members
  into target_glytch_id, target_owner_id, target_max_members
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
    raise exception using
      message = 'You are banned from this Glytch',
      detail = json_build_object('glytch_id', target_glytch_id)::text,
      hint = 'GLYTCH_BANNED';
  end if;

  select exists (
    select 1
    from public.glytch_members m
    where m.glytch_id = target_glytch_id
      and m.user_id = auth.uid()
  ) into already_member;

  if not already_member and target_max_members is not null then
    select count(*)::integer into current_member_count
    from public.glytch_members m
    where m.glytch_id = target_glytch_id;

    if current_member_count >= target_max_members then
      raise exception using
        message = 'This Glytch is full',
        detail = json_build_object('glytch_id', target_glytch_id)::text,
        hint = 'GLYTCH_FULL';
    end if;
  end if;

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

create or replace function public.join_public_glytch(p_glytch_id bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target_owner_id uuid;
  target_is_public boolean;
  target_max_members integer;
  current_member_count integer;
  already_member boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select g.owner_id, g.is_public, g.max_members
  into target_owner_id, target_is_public, target_max_members
  from public.glytches g
  where g.id = p_glytch_id;

  if target_owner_id is null then
    raise exception 'Glytch not found';
  end if;

  if not coalesce(target_is_public, false) then
    raise exception 'This Glytch is private. Use an invite code.';
  end if;

  if exists (
    select 1
    from public.glytch_bans b
    where b.glytch_id = p_glytch_id
      and b.user_id = auth.uid()
  ) then
    raise exception using
      message = 'You are banned from this Glytch',
      detail = json_build_object('glytch_id', p_glytch_id)::text,
      hint = 'GLYTCH_BANNED';
  end if;

  select exists (
    select 1
    from public.glytch_members m
    where m.glytch_id = p_glytch_id
      and m.user_id = auth.uid()
  ) into already_member;

  if not already_member and target_max_members is not null then
    select count(*)::integer into current_member_count
    from public.glytch_members m
    where m.glytch_id = p_glytch_id;

    if current_member_count >= target_max_members then
      raise exception using
        message = 'This Glytch is full',
        detail = json_build_object('glytch_id', p_glytch_id)::text,
        hint = 'GLYTCH_FULL';
    end if;
  end if;

  perform public.initialize_glytch_roles(p_glytch_id, target_owner_id);
  perform set_config('app.allow_glytch_join_insert', '1', true);

  insert into public.glytch_members (glytch_id, user_id)
  values (p_glytch_id, auth.uid())
  on conflict (glytch_id, user_id) do nothing;

  return json_build_object('glytch_id', p_glytch_id);
end;
$$;

revoke all on function public.join_public_glytch(bigint) from public;
grant execute on function public.join_public_glytch(bigint) to authenticated;

create or replace function public.search_public_glytches(
  p_query text default null,
  p_limit integer default 30
)
returns table (
  id bigint,
  owner_id uuid,
  name text,
  invite_code text,
  bio text,
  icon_url text,
  is_public boolean,
  max_members integer,
  member_count integer,
  created_at timestamptz,
  is_joined boolean
)
language sql
security definer
set search_path = public
as $$
  with params as (
    select
      lower(trim(coalesce(p_query, ''))) as query,
      greatest(1, least(coalesce(p_limit, 30), 80)) as limit_count
  )
  select
    g.id,
    g.owner_id,
    g.name,
    g.invite_code,
    g.bio,
    g.icon_url,
    g.is_public,
    g.max_members,
    coalesce(member_stats.member_count, 0)::integer as member_count,
    g.created_at,
    coalesce(joined.is_joined, false) as is_joined
  from public.glytches g
  cross join params p
  left join lateral (
    select count(*)::integer as member_count
    from public.glytch_members m
    where m.glytch_id = g.id
  ) member_stats on true
  left join lateral (
    select true as is_joined
    from public.glytch_members m
    where m.glytch_id = g.id
      and m.user_id = auth.uid()
    limit 1
  ) joined on true
  where g.is_public = true
    and (
      p.query = ''
      or lower(g.name) like '%' || p.query || '%'
      or lower(coalesce(g.bio, '')) like '%' || p.query || '%'
    )
  order by coalesce(joined.is_joined, false) desc, coalesce(member_stats.member_count, 0) desc, g.created_at desc
  limit (select limit_count from params);
$$;

revoke all on function public.search_public_glytches(text, integer) from public;
grant execute on function public.search_public_glytches(text, integer) to authenticated;

commit;
