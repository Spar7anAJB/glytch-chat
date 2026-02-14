-- Run in Supabase SQL editor
-- Preferred workflow: add new changes as incremental files in supabase/migrations
-- and keep this file as a consolidated snapshot.

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

create table if not exists public.glytches (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 64),
  invite_code text not null unique default lower(encode(gen_random_bytes(4), 'hex')),
  created_at timestamptz not null default now()
);

create table if not exists public.glytch_members (
  glytch_id bigint not null references public.glytches(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (glytch_id, user_id)
);

create table if not exists public.glytch_roles (
  id bigint generated always as identity primary key,
  glytch_id bigint not null references public.glytches(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 32),
  color text not null default '#8eaefb',
  priority integer not null default 10,
  is_system boolean not null default false,
  is_default boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (glytch_id, name)
);

create table if not exists public.glytch_member_roles (
  glytch_id bigint not null references public.glytches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id bigint not null references public.glytch_roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (glytch_id, user_id, role_id)
);

create table if not exists public.glytch_channels (
  id bigint generated always as identity primary key,
  glytch_id bigint not null references public.glytches(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 48),
  kind text not null default 'text' check (kind in ('text', 'voice')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (glytch_id, name)
);

alter table public.glytch_channels add column if not exists kind text;
update public.glytch_channels set kind = 'text' where kind is null;
alter table public.glytch_channels alter column kind set default 'text';
alter table public.glytch_channels alter column kind set not null;
alter table public.glytch_channels drop constraint if exists glytch_channels_kind_check;
alter table public.glytch_channels add constraint glytch_channels_kind_check check (kind in ('text', 'voice'));

create table if not exists public.glytch_channel_role_permissions (
  glytch_id bigint not null references public.glytches(id) on delete cascade,
  role_id bigint not null references public.glytch_roles(id) on delete cascade,
  channel_id bigint not null references public.glytch_channels(id) on delete cascade,
  can_view boolean not null default true,
  can_send_messages boolean not null default true,
  can_join_voice boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (glytch_id, role_id, channel_id)
);

create table if not exists public.glytch_messages (
  id bigint generated always as identity primary key,
  glytch_channel_id bigint not null references public.glytch_channels(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null check (char_length(content) > 0),
  created_at timestamptz not null default now()
);

alter table public.glytches enable row level security;
alter table public.glytch_members enable row level security;
alter table public.glytch_roles enable row level security;
alter table public.glytch_member_roles enable row level security;
alter table public.glytch_channel_role_permissions enable row level security;
alter table public.glytch_channels enable row level security;
alter table public.glytch_messages enable row level security;

create or replace function public.glytch_has_permission(
  p_glytch_id bigint,
  p_user_id uuid,
  p_permission text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
  allowed boolean;
begin
  if p_user_id is null or p_glytch_id is null or p_permission is null then
    return false;
  end if;

  select exists (
    select 1
    from public.glytches g
    where g.id = p_glytch_id and g.owner_id = p_user_id
  ) into is_owner;

  if is_owner then
    return true;
  end if;

  select coalesce(
    bool_or(
      case
        when p_permission = 'view_channel' then coalesce((r.permissions ->> p_permission)::boolean, true)
        else coalesce((r.permissions ->> p_permission)::boolean, false)
      end
    ),
    false
  )
  into allowed
  from public.glytch_member_roles mr
  join public.glytch_roles r on r.id = mr.role_id
  where mr.glytch_id = p_glytch_id
    and mr.user_id = p_user_id;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.glytch_has_permission(bigint, uuid, text) from public;
grant execute on function public.glytch_has_permission(bigint, uuid, text) to authenticated;

create or replace function public.is_glytch_member(
  p_glytch_id bigint,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.glytch_members m
    where m.glytch_id = p_glytch_id
      and m.user_id = p_user_id
  );
$$;

revoke all on function public.is_glytch_member(bigint, uuid) from public;
grant execute on function public.is_glytch_member(bigint, uuid) to authenticated;

create or replace function public.is_glytch_owner_or_admin(
  p_glytch_id bigint,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.glytches g
    where g.id = p_glytch_id
      and g.owner_id = p_user_id
  )
  or exists (
    select 1
    from public.glytch_member_roles mr
    join public.glytch_roles r on r.id = mr.role_id
    where mr.glytch_id = p_glytch_id
      and mr.user_id = p_user_id
      and r.is_system = true
      and r.name = 'Admin'
  );
$$;

revoke all on function public.is_glytch_owner_or_admin(bigint, uuid) from public;
grant execute on function public.is_glytch_owner_or_admin(bigint, uuid) to authenticated;

create or replace function public.glytch_has_channel_permission(
  p_channel_id bigint,
  p_user_id uuid,
  p_permission text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  channel_glytch_id bigint;
  channel_kind text;
  is_owner boolean;
  global_allowed boolean;
  explicit_count integer;
  explicit_allowed boolean;
begin
  if p_channel_id is null or p_user_id is null or p_permission is null then
    return false;
  end if;

  select c.glytch_id, c.kind
  into channel_glytch_id, channel_kind
  from public.glytch_channels c
  where c.id = p_channel_id;

  if channel_glytch_id is null then
    return false;
  end if;

  select exists (
    select 1
    from public.glytches g
    where g.id = channel_glytch_id
      and g.owner_id = p_user_id
  ) into is_owner;

  if is_owner then
    return true;
  end if;

  if not public.is_glytch_member(channel_glytch_id, p_user_id) then
    return false;
  end if;

  if p_permission = 'send_messages' and channel_kind <> 'text' then
    return false;
  end if;

  if p_permission = 'join_voice' and channel_kind <> 'voice' then
    return false;
  end if;

  global_allowed := public.glytch_has_permission(channel_glytch_id, p_user_id, p_permission);

  select
    count(*)::integer,
    bool_and(
      case
        when p_permission = 'view_channel' then cp.can_view
        when p_permission = 'send_messages' then cp.can_send_messages
        when p_permission = 'join_voice' then cp.can_join_voice
        else false
      end
    )
  into explicit_count, explicit_allowed
  from public.glytch_member_roles mr
  join public.glytch_channel_role_permissions cp
    on cp.glytch_id = mr.glytch_id
   and cp.role_id = mr.role_id
   and cp.channel_id = p_channel_id
  where mr.glytch_id = channel_glytch_id
    and mr.user_id = p_user_id;

  if explicit_count > 0 then
    return coalesce(explicit_allowed, false);
  end if;

  return coalesce(global_allowed, false);
end;
$$;

revoke all on function public.glytch_has_channel_permission(bigint, uuid, text) from public;
grant execute on function public.glytch_has_channel_permission(bigint, uuid, text) to authenticated;

create or replace function public.initialize_glytch_roles(
  p_glytch_id bigint,
  p_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_role_id bigint;
  admin_role_id bigint;
  member_role_id bigint;
begin
  insert into public.glytch_roles (glytch_id, name, color, priority, is_system, is_default, permissions)
  values (
    p_glytch_id,
    'Owner',
    '#f6511d',
    100,
    true,
    false,
    jsonb_build_object(
      'manage_roles', true,
      'manage_channels', true,
      'manage_members', true,
      'view_channel', true,
      'send_messages', true,
      'join_voice', true
    )
  )
  on conflict (glytch_id, name) do update
  set permissions = excluded.permissions,
      priority = excluded.priority,
      color = excluded.color,
      is_system = true
  returning id into owner_role_id;

  insert into public.glytch_roles (glytch_id, name, color, priority, is_system, is_default, permissions)
  values (
    p_glytch_id,
    'Admin',
    '#3a0ca3',
    70,
    true,
    false,
    jsonb_build_object(
      'manage_roles', true,
      'manage_channels', true,
      'manage_members', true,
      'view_channel', true,
      'send_messages', true,
      'join_voice', true
    )
  )
  on conflict (glytch_id, name) do update
  set permissions = excluded.permissions,
      priority = excluded.priority,
      color = excluded.color,
      is_system = true
  returning id into admin_role_id;

  insert into public.glytch_roles (glytch_id, name, color, priority, is_system, is_default, permissions)
  values (
    p_glytch_id,
    'Member',
    '#8eaefb',
    10,
    true,
    true,
    jsonb_build_object(
      'manage_roles', false,
      'manage_channels', false,
      'manage_members', false,
      'view_channel', true,
      'send_messages', true,
      'join_voice', true
    )
  )
  on conflict (glytch_id, name) do update
  set permissions = excluded.permissions,
      priority = excluded.priority,
      color = excluded.color,
      is_system = true,
      is_default = true
  returning id into member_role_id;

  update public.glytch_roles
  set is_default = (id = member_role_id)
  where glytch_id = p_glytch_id;

  insert into public.glytch_member_roles (glytch_id, user_id, role_id)
  values (p_glytch_id, p_owner_id, owner_role_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.initialize_glytch_roles(bigint, uuid) from public;
grant execute on function public.initialize_glytch_roles(bigint, uuid) to authenticated;

create or replace function public.assign_default_role_to_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_role_id bigint;
begin
  select r.id into default_role_id
  from public.glytch_roles r
  where r.glytch_id = new.glytch_id
    and r.is_default = true
  order by r.priority desc, r.id asc
  limit 1;

  if default_role_id is not null then
    insert into public.glytch_member_roles (glytch_id, user_id, role_id)
    values (new.glytch_id, new.user_id, default_role_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_assign_default_role_to_member on public.glytch_members;
create trigger tr_assign_default_role_to_member
after insert on public.glytch_members
for each row execute function public.assign_default_role_to_member();

create or replace function public.assign_glytch_role(
  p_glytch_id bigint,
  p_user_id uuid,
  p_role_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  role_glytch_id bigint;
begin
  if not public.is_glytch_owner_or_admin(p_glytch_id, auth.uid()) then
    raise exception 'Not allowed to manage roles';
  end if;

  select glytch_id into role_glytch_id
  from public.glytch_roles
  where id = p_role_id;

  if role_glytch_id is null or role_glytch_id <> p_glytch_id then
    raise exception 'Invalid role for this Glytch';
  end if;

  insert into public.glytch_member_roles (glytch_id, user_id, role_id)
  values (p_glytch_id, p_user_id, p_role_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.assign_glytch_role(bigint, uuid, bigint) from public;
grant execute on function public.assign_glytch_role(bigint, uuid, bigint) to authenticated;

create or replace function public.create_glytch_role(
  p_glytch_id bigint,
  p_name text,
  p_color text default '#8eaefb',
  p_priority integer default 10,
  p_permissions jsonb default '{}'::jsonb
)
returns public.glytch_roles
language plpgsql
security definer
set search_path = public
as $$
declare
  created_role public.glytch_roles;
begin
  if not public.is_glytch_owner_or_admin(p_glytch_id, auth.uid()) then
    raise exception 'Not allowed to manage roles';
  end if;

  insert into public.glytch_roles (glytch_id, name, color, priority, is_system, is_default, permissions)
  values (
    p_glytch_id,
    trim(p_name),
    coalesce(nullif(trim(p_color), ''), '#8eaefb'),
    coalesce(p_priority, 10),
    false,
    false,
    coalesce(p_permissions, '{}'::jsonb)
  )
  returning * into created_role;

  return created_role;
end;
$$;

revoke all on function public.create_glytch_role(bigint, text, text, integer, jsonb) from public;
grant execute on function public.create_glytch_role(bigint, text, text, integer, jsonb) to authenticated;

create or replace function public.set_role_channel_permissions(
  p_role_id bigint,
  p_channel_id bigint,
  p_can_view boolean,
  p_can_send_messages boolean,
  p_can_join_voice boolean
)
returns public.glytch_channel_role_permissions
language plpgsql
security definer
set search_path = public
as $$
declare
  role_glytch_id bigint;
  channel_glytch_id bigint;
  updated_row public.glytch_channel_role_permissions;
begin
  select r.glytch_id into role_glytch_id
  from public.glytch_roles r
  where r.id = p_role_id;

  select c.glytch_id into channel_glytch_id
  from public.glytch_channels c
  where c.id = p_channel_id;

  if role_glytch_id is null or channel_glytch_id is null or role_glytch_id <> channel_glytch_id then
    raise exception 'Role and channel must belong to the same Glytch';
  end if;

  if not (
    public.is_glytch_owner_or_admin(role_glytch_id, auth.uid())
  ) then
    raise exception 'Not allowed to edit channel permissions';
  end if;

  insert into public.glytch_channel_role_permissions (
    glytch_id,
    role_id,
    channel_id,
    can_view,
    can_send_messages,
    can_join_voice,
    updated_at
  )
  values (
    role_glytch_id,
    p_role_id,
    p_channel_id,
    coalesce(p_can_view, true),
    coalesce(p_can_send_messages, true),
    coalesce(p_can_join_voice, true),
    now()
  )
  on conflict (glytch_id, role_id, channel_id) do update
  set can_view = excluded.can_view,
      can_send_messages = excluded.can_send_messages,
      can_join_voice = excluded.can_join_voice,
      updated_at = now()
  returning * into updated_row;

  return updated_row;
end;
$$;

revoke all on function public.set_role_channel_permissions(bigint, bigint, boolean, boolean, boolean) from public;
grant execute on function public.set_role_channel_permissions(bigint, bigint, boolean, boolean, boolean) to authenticated;

drop policy if exists "members can view glytches" on public.glytches;
create policy "members can view glytches"
on public.glytches
for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.glytch_members m
    where m.glytch_id = glytches.id and m.user_id = auth.uid()
  )
);

drop policy if exists "users can create glytches" on public.glytches;
create policy "users can create glytches"
on public.glytches
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "members can view memberships" on public.glytch_members;
create policy "members can view memberships"
on public.glytch_members
for select
to authenticated
using (
  public.is_glytch_member(glytch_id, auth.uid())
  or public.glytch_has_permission(glytch_id, auth.uid(), 'manage_members')
);

drop policy if exists "users can join as self" on public.glytch_members;
create policy "users can join as self"
on public.glytch_members
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "members can view channels" on public.glytch_channels;
create policy "members can view channels"
on public.glytch_channels
for select
to authenticated
using (
  public.glytch_has_channel_permission(glytch_channels.id, auth.uid(), 'view_channel')
);

drop policy if exists "members can create channels" on public.glytch_channels;
create policy "members can create channels"
on public.glytch_channels
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.glytch_has_permission(glytch_channels.glytch_id, auth.uid(), 'manage_channels')
);

drop policy if exists "members can view glytch messages" on public.glytch_messages;
create policy "members can view glytch messages"
on public.glytch_messages
for select
to authenticated
using (
  exists (
    select 1 from public.glytch_channels c
    where c.id = glytch_messages.glytch_channel_id
      and public.glytch_has_channel_permission(c.id, auth.uid(), 'view_channel')
  )
);

drop policy if exists "members can send glytch messages" on public.glytch_messages;
create policy "members can send glytch messages"
on public.glytch_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.glytch_channels c
    where c.id = glytch_messages.glytch_channel_id
      and public.glytch_has_channel_permission(c.id, auth.uid(), 'send_messages')
  )
);

drop policy if exists "members can view channel role permissions" on public.glytch_channel_role_permissions;
create policy "members can view channel role permissions"
on public.glytch_channel_role_permissions
for select
to authenticated
using (
  public.is_glytch_member(glytch_id, auth.uid())
);

drop policy if exists "managers can insert channel role permissions" on public.glytch_channel_role_permissions;
create policy "managers can insert channel role permissions"
on public.glytch_channel_role_permissions
for insert
to authenticated
with check (
  public.is_glytch_owner_or_admin(glytch_id, auth.uid())
);

drop policy if exists "managers can update channel role permissions" on public.glytch_channel_role_permissions;
create policy "managers can update channel role permissions"
on public.glytch_channel_role_permissions
for update
to authenticated
using (
  public.is_glytch_owner_or_admin(glytch_id, auth.uid())
)
with check (
  public.is_glytch_owner_or_admin(glytch_id, auth.uid())
);

drop policy if exists "managers can delete channel role permissions" on public.glytch_channel_role_permissions;
create policy "managers can delete channel role permissions"
on public.glytch_channel_role_permissions
for delete
to authenticated
using (
  public.is_glytch_owner_or_admin(glytch_id, auth.uid())
);

drop policy if exists "members can view roles" on public.glytch_roles;
create policy "members can view roles"
on public.glytch_roles
for select
to authenticated
using (
  exists (
    select 1 from public.glytch_members m
    where m.glytch_id = glytch_roles.glytch_id and m.user_id = auth.uid()
  )
);

drop policy if exists "managers can create roles" on public.glytch_roles;
create policy "managers can create roles"
on public.glytch_roles
for insert
to authenticated
with check (
  public.is_glytch_owner_or_admin(glytch_roles.glytch_id, auth.uid())
);

drop policy if exists "managers can update roles" on public.glytch_roles;
create policy "managers can update roles"
on public.glytch_roles
for update
to authenticated
using (
  public.is_glytch_owner_or_admin(glytch_roles.glytch_id, auth.uid())
)
with check (
  public.is_glytch_owner_or_admin(glytch_roles.glytch_id, auth.uid())
);

drop policy if exists "managers can delete roles" on public.glytch_roles;
create policy "managers can delete roles"
on public.glytch_roles
for delete
to authenticated
using (
  public.is_glytch_owner_or_admin(glytch_roles.glytch_id, auth.uid())
  and is_system = false
);

drop policy if exists "members can view member roles" on public.glytch_member_roles;
create policy "members can view member roles"
on public.glytch_member_roles
for select
to authenticated
using (
  exists (
    select 1 from public.glytch_members m
    where m.glytch_id = glytch_member_roles.glytch_id and m.user_id = auth.uid()
  )
);

drop policy if exists "managers can add member roles" on public.glytch_member_roles;
create policy "managers can add member roles"
on public.glytch_member_roles
for insert
to authenticated
with check (
  public.is_glytch_owner_or_admin(glytch_member_roles.glytch_id, auth.uid())
);

drop policy if exists "managers can remove member roles" on public.glytch_member_roles;
create policy "managers can remove member roles"
on public.glytch_member_roles
for delete
to authenticated
using (
  public.is_glytch_owner_or_admin(glytch_member_roles.glytch_id, auth.uid())
);

create or replace function public.create_glytch(p_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_glytch_id bigint;
  new_code text;
  general_channel_id bigint;
begin
  insert into public.glytches (owner_id, name)
  values (auth.uid(), trim(p_name))
  returning id, invite_code into new_glytch_id, new_code;

  insert into public.glytch_members (glytch_id, user_id, role)
  values (new_glytch_id, auth.uid(), 'owner')
  on conflict (glytch_id, user_id) do update set role = 'owner';

  perform public.initialize_glytch_roles(new_glytch_id, auth.uid());

  insert into public.glytch_channels (glytch_id, name, kind, created_by)
  values (new_glytch_id, 'general', 'text', auth.uid())
  returning id into general_channel_id;

  return json_build_object(
    'glytch_id', new_glytch_id,
    'invite_code', new_code,
    'channel_id', general_channel_id
  );
end;
$$;

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
  select g.id into target_glytch_id
  from public.glytches g
  where lower(g.invite_code) = lower(trim(p_invite_code))
  limit 1;

  if target_glytch_id is null then
    raise exception 'Invalid invite code';
  end if;

  select owner_id into target_owner_id
  from public.glytches
  where id = target_glytch_id;

  perform public.initialize_glytch_roles(target_glytch_id, target_owner_id);

  insert into public.glytch_members (glytch_id, user_id)
  values (target_glytch_id, auth.uid())
  on conflict (glytch_id, user_id) do nothing;

  return json_build_object('glytch_id', target_glytch_id);
end;
$$;

create or replace function public.accept_friend_request(p_request_id bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.friend_requests;
  low_user uuid;
  high_user uuid;
  conv_id bigint;
begin
  select * into req
  from public.friend_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Friend request not found';
  end if;

  if req.receiver_id <> auth.uid() then
    raise exception 'Not allowed to accept this request';
  end if;

  if req.status <> 'pending' then
    raise exception 'Friend request is already handled';
  end if;

  update public.friend_requests
  set status = 'accepted', responded_at = now()
  where id = p_request_id;

  low_user := least(req.sender_id, req.receiver_id);
  high_user := greatest(req.sender_id, req.receiver_id);

  insert into public.dm_conversations (user_a, user_b)
  values (low_user, high_user)
  on conflict (user_a, user_b) do nothing;

  select id into conv_id
  from public.dm_conversations
  where user_a = low_user and user_b = high_user;

  return json_build_object('conversation_id', conv_id);
end;
$$;

revoke all on function public.accept_friend_request(bigint) from public;
revoke all on function public.create_glytch(text) from public;
revoke all on function public.join_glytch_by_code(text) from public;

grant execute on function public.accept_friend_request(bigint) to authenticated;
grant execute on function public.create_glytch(text) to authenticated;
grant execute on function public.join_glytch_by_code(text) to authenticated;

do $$
declare
  g record;
begin
  for g in select id, owner_id from public.glytches loop
    perform public.initialize_glytch_roles(g.id, g.owner_id);
  end loop;
end;
$$;

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
