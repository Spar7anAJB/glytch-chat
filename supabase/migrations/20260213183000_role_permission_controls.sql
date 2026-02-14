-- 20260213183000_role_permission_controls.sql
begin;

create or replace function public.can_manage_glytch_roles(
  p_glytch_id bigint,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and p_glytch_id is not null
    and (
      public.is_glytch_owner_or_admin(p_glytch_id, p_user_id)
      or public.glytch_has_permission(p_glytch_id, p_user_id, 'add_roles')
      or public.glytch_has_permission(p_glytch_id, p_user_id, 'manage_roles')
    );
$$;

revoke all on function public.can_manage_glytch_roles(bigint, uuid) from public;
grant execute on function public.can_manage_glytch_roles(bigint, uuid) to authenticated;

create or replace function public.can_manage_glytch_profile(
  p_glytch_id bigint,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and p_glytch_id is not null
    and (
      public.is_glytch_owner_or_admin(p_glytch_id, p_user_id)
      or public.glytch_has_permission(p_glytch_id, p_user_id, 'edit_glytch_profile')
    );
$$;

revoke all on function public.can_manage_glytch_profile(bigint, uuid) from public;
grant execute on function public.can_manage_glytch_profile(bigint, uuid) to authenticated;

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
      'add_roles', true,
      'manage_channels', true,
      'create_channels', true,
      'ban_members', true,
      'mute_deafen_members', true,
      'kick_voice_members', true,
      'edit_glytch_profile', true,
      'manage_roles', true,
      'manage_members', true,
      'view_channel', true,
      'send_messages', true,
      'join_voice', true,
      'moderate_voice', true
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
      'add_roles', true,
      'manage_channels', true,
      'create_channels', true,
      'ban_members', true,
      'mute_deafen_members', true,
      'kick_voice_members', true,
      'edit_glytch_profile', true,
      'manage_roles', true,
      'manage_members', true,
      'view_channel', true,
      'send_messages', true,
      'join_voice', true,
      'moderate_voice', true
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
      'add_roles', false,
      'manage_channels', false,
      'create_channels', false,
      'ban_members', false,
      'mute_deafen_members', false,
      'kick_voice_members', false,
      'edit_glytch_profile', false,
      'manage_roles', false,
      'manage_members', false,
      'view_channel', true,
      'send_messages', true,
      'join_voice', true,
      'moderate_voice', false
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

update public.glytch_roles r
set permissions = coalesce(r.permissions, '{}'::jsonb)
  || jsonb_build_object(
    'add_roles', coalesce((r.permissions ->> 'add_roles')::boolean, (r.permissions ->> 'manage_roles')::boolean, false),
    'create_channels', coalesce((r.permissions ->> 'create_channels')::boolean, (r.permissions ->> 'manage_channels')::boolean, false),
    'ban_members', coalesce((r.permissions ->> 'ban_members')::boolean, (r.permissions ->> 'manage_members')::boolean, false),
    'mute_deafen_members', coalesce((r.permissions ->> 'mute_deafen_members')::boolean, (r.permissions ->> 'moderate_voice')::boolean, false),
    'kick_voice_members', coalesce((r.permissions ->> 'kick_voice_members')::boolean, (r.permissions ->> 'moderate_voice')::boolean, false),
    'edit_glytch_profile', coalesce((r.permissions ->> 'edit_glytch_profile')::boolean, false)
  );

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
  if not public.can_manage_glytch_roles(p_glytch_id, auth.uid()) then
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
  if not public.can_manage_glytch_roles(p_glytch_id, auth.uid()) then
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

  if not public.can_manage_glytch_roles(role_glytch_id, auth.uid()) then
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

drop policy if exists "managers can create roles" on public.glytch_roles;
create policy "managers can create roles"
on public.glytch_roles
for insert
to authenticated
with check (
  public.can_manage_glytch_roles(glytch_roles.glytch_id, auth.uid())
);

drop policy if exists "managers can update roles" on public.glytch_roles;
create policy "managers can update roles"
on public.glytch_roles
for update
to authenticated
using (
  public.can_manage_glytch_roles(glytch_roles.glytch_id, auth.uid())
)
with check (
  public.can_manage_glytch_roles(glytch_roles.glytch_id, auth.uid())
);

drop policy if exists "managers can delete roles" on public.glytch_roles;
create policy "managers can delete roles"
on public.glytch_roles
for delete
to authenticated
using (
  public.can_manage_glytch_roles(glytch_roles.glytch_id, auth.uid())
  and is_system = false
);

drop policy if exists "managers can add member roles" on public.glytch_member_roles;
create policy "managers can add member roles"
on public.glytch_member_roles
for insert
to authenticated
with check (
  public.can_manage_glytch_roles(glytch_member_roles.glytch_id, auth.uid())
);

drop policy if exists "managers can remove member roles" on public.glytch_member_roles;
create policy "managers can remove member roles"
on public.glytch_member_roles
for delete
to authenticated
using (
  public.can_manage_glytch_roles(glytch_member_roles.glytch_id, auth.uid())
);

drop policy if exists "managers can insert channel role permissions" on public.glytch_channel_role_permissions;
create policy "managers can insert channel role permissions"
on public.glytch_channel_role_permissions
for insert
to authenticated
with check (
  public.can_manage_glytch_roles(glytch_channel_role_permissions.glytch_id, auth.uid())
);

drop policy if exists "managers can update channel role permissions" on public.glytch_channel_role_permissions;
create policy "managers can update channel role permissions"
on public.glytch_channel_role_permissions
for update
to authenticated
using (
  public.can_manage_glytch_roles(glytch_channel_role_permissions.glytch_id, auth.uid())
)
with check (
  public.can_manage_glytch_roles(glytch_channel_role_permissions.glytch_id, auth.uid())
);

drop policy if exists "managers can delete channel role permissions" on public.glytch_channel_role_permissions;
create policy "managers can delete channel role permissions"
on public.glytch_channel_role_permissions
for delete
to authenticated
using (
  public.can_manage_glytch_roles(glytch_channel_role_permissions.glytch_id, auth.uid())
);

drop policy if exists "members can create channels" on public.glytch_channels;
create policy "members can create channels"
on public.glytch_channels
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_glytch_owner_or_admin(glytch_channels.glytch_id, auth.uid())
    or public.glytch_has_permission(glytch_channels.glytch_id, auth.uid(), 'create_channels')
    or public.glytch_has_permission(glytch_channels.glytch_id, auth.uid(), 'manage_channels')
  )
);

drop policy if exists "members can create channel categories" on public.glytch_channel_categories;
create policy "members can create channel categories"
on public.glytch_channel_categories
for insert
to authenticated
with check (
  auth.uid() is not null
  and (
    public.is_glytch_owner_or_admin(glytch_channel_categories.glytch_id, auth.uid())
    or public.glytch_has_permission(glytch_channel_categories.glytch_id, auth.uid(), 'create_channels')
    or public.glytch_has_permission(glytch_channel_categories.glytch_id, auth.uid(), 'manage_channels')
  )
);

create or replace function public.can_manage_glytch_members(
  p_glytch_id bigint,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and p_glytch_id is not null
    and (
      public.is_glytch_owner_or_admin(p_glytch_id, p_user_id)
      or public.glytch_has_permission(p_glytch_id, p_user_id, 'ban_members')
      or public.glytch_has_permission(p_glytch_id, p_user_id, 'manage_members')
    );
$$;

revoke all on function public.can_manage_glytch_members(bigint, uuid) from public;
grant execute on function public.can_manage_glytch_members(bigint, uuid) to authenticated;

create or replace function public.can_moderate_voice_room_action(
  p_room_key text,
  p_user_id uuid,
  p_action text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  room_kind text;
  room_id_text text;
  room_id bigint;
  channel_glytch_id bigint;
  normalized_action text;
begin
  if p_room_key is null or p_user_id is null then
    return false;
  end if;

  normalized_action := lower(trim(coalesce(p_action, '')));
  if normalized_action not in ('mute_deafen', 'kick') then
    return false;
  end if;

  room_kind := split_part(p_room_key, ':', 1);
  room_id_text := split_part(p_room_key, ':', 2);

  if room_kind <> 'glytch' then
    return false;
  end if;

  if room_id_text !~ '^[0-9]+$' then
    return false;
  end if;

  room_id := room_id_text::bigint;

  select c.glytch_id into channel_glytch_id
  from public.glytch_channels c
  where c.id = room_id
    and c.kind = 'voice';

  if channel_glytch_id is null then
    return false;
  end if;

  if public.is_glytch_owner_or_admin(channel_glytch_id, p_user_id) then
    return true;
  end if;

  if not public.is_glytch_member(channel_glytch_id, p_user_id) then
    return false;
  end if;

  if not public.glytch_has_channel_permission(room_id, p_user_id, 'join_voice') then
    return false;
  end if;

  if normalized_action = 'mute_deafen' then
    return public.glytch_has_permission(channel_glytch_id, p_user_id, 'mute_deafen_members')
      or public.glytch_has_permission(channel_glytch_id, p_user_id, 'moderate_voice');
  end if;

  return public.glytch_has_permission(channel_glytch_id, p_user_id, 'kick_voice_members')
    or public.glytch_has_permission(channel_glytch_id, p_user_id, 'moderate_voice');
end;
$$;

revoke all on function public.can_moderate_voice_room_action(text, uuid, text) from public;
grant execute on function public.can_moderate_voice_room_action(text, uuid, text) to authenticated;

create or replace function public.can_moderate_voice_room(
  p_room_key text,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.can_moderate_voice_room_action(p_room_key, p_user_id, 'mute_deafen')
    or public.can_moderate_voice_room_action(p_room_key, p_user_id, 'kick');
$$;

revoke all on function public.can_moderate_voice_room(text, uuid) from public;
grant execute on function public.can_moderate_voice_room(text, uuid) to authenticated;

create or replace function public.enforce_voice_participant_state_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  actor_is_moderator boolean;
begin
  if tg_op = 'INSERT' then
    if new.moderator_forced_deafened then
      new.moderator_forced_muted := true;
    end if;
    if new.moderator_forced_muted then
      new.muted := true;
    end if;
    if new.moderator_forced_deafened then
      new.deafened := true;
      new.muted := true;
    end if;
    return new;
  end if;

  actor_id := auth.uid();
  actor_is_moderator := actor_id is not null and public.can_moderate_voice_room_action(new.room_key, actor_id, 'mute_deafen');

  if not actor_is_moderator then
    if new.moderator_forced_muted is distinct from old.moderator_forced_muted
      or new.moderator_forced_deafened is distinct from old.moderator_forced_deafened then
      raise exception 'Only moderators can change forced mute/deafen state';
    end if;

    if old.moderator_forced_deafened and (new.deafened is distinct from true or new.muted is distinct from true) then
      raise exception 'You are force deafened by a moderator';
    end if;

    if old.moderator_forced_muted and new.muted is distinct from true then
      raise exception 'You are force muted by a moderator';
    end if;
  end if;

  if new.moderator_forced_deafened then
    new.moderator_forced_muted := true;
  end if;
  if new.moderator_forced_muted then
    new.muted := true;
  end if;
  if new.moderator_forced_deafened then
    new.deafened := true;
    new.muted := true;
  end if;

  return new;
end;
$$;

create or replace function public.force_voice_participant_state(
  p_room_key text,
  p_target_user_id uuid,
  p_force_muted boolean default null,
  p_force_deafened boolean default null
)
returns public.voice_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_row public.voice_participants;
  updated_row public.voice_participants;
  next_force_muted boolean;
  next_force_deafened boolean;
  next_muted boolean;
  next_deafened boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_room_key is null or p_target_user_id is null then
    raise exception 'Room key and target user are required';
  end if;

  if p_force_muted is null and p_force_deafened is null then
    raise exception 'Provide force-muted and/or force-deafened state';
  end if;

  if not public.can_moderate_voice_room_action(p_room_key, auth.uid(), 'mute_deafen') then
    raise exception 'Not allowed to moderate this voice channel';
  end if;

  select * into existing_row
  from public.voice_participants vp
  where vp.room_key = p_room_key
    and vp.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'Target user is not in this voice channel';
  end if;

  next_force_deafened := coalesce(p_force_deafened, existing_row.moderator_forced_deafened);
  next_force_muted := coalesce(p_force_muted, existing_row.moderator_forced_muted);

  if next_force_deafened then
    next_force_muted := true;
  end if;

  next_deafened := case
    when next_force_deafened then true
    when p_force_deafened is not null then false
    else existing_row.deafened
  end;

  next_muted := case
    when next_force_deafened or next_force_muted then true
    when p_force_muted is not null then false
    else existing_row.muted
  end;

  if next_deafened then
    next_muted := true;
  end if;

  update public.voice_participants
  set muted = next_muted,
      deafened = next_deafened,
      moderator_forced_muted = next_force_muted,
      moderator_forced_deafened = next_force_deafened
  where room_key = p_room_key
    and user_id = p_target_user_id
  returning * into updated_row;

  return updated_row;
end;
$$;

revoke all on function public.force_voice_participant_state(text, uuid, boolean, boolean) from public;
grant execute on function public.force_voice_participant_state(text, uuid, boolean, boolean) to authenticated;

create or replace function public.kick_voice_participant(
  p_room_key text,
  p_target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_room_key is null or p_target_user_id is null then
    raise exception 'Room key and target user are required';
  end if;

  if not public.can_moderate_voice_room_action(p_room_key, auth.uid(), 'kick') then
    raise exception 'Not allowed to moderate this voice channel';
  end if;

  delete from public.voice_participants vp
  where vp.room_key = p_room_key
    and vp.user_id = p_target_user_id;

  if not found then
    raise exception 'Target user is not in this voice channel';
  end if;

  return true;
end;
$$;

revoke all on function public.kick_voice_participant(text, uuid) from public;
grant execute on function public.kick_voice_participant(text, uuid) to authenticated;

create or replace function public.set_glytch_icon(
  p_glytch_id bigint,
  p_icon_url text
)
returns public.glytches
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_glytch public.glytches;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.glytches g
  set icon_url = nullif(trim(p_icon_url), '')
  where g.id = p_glytch_id
    and public.can_manage_glytch_profile(g.id, auth.uid())
  returning g.* into updated_glytch;

  if updated_glytch.id is null then
    raise exception 'Not allowed to update this Glytch icon';
  end if;

  return updated_glytch;
end;
$$;

revoke all on function public.set_glytch_icon(bigint, text) from public;
grant execute on function public.set_glytch_icon(bigint, text) to authenticated;

create or replace function public.set_glytch_profile(
  p_glytch_id bigint,
  p_name text,
  p_bio text
)
returns public.glytches
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_glytch public.glytches;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or nullif(trim(p_name), '') is null then
    raise exception 'Glytch name is required';
  end if;

  update public.glytches g
  set name = trim(p_name),
      bio = nullif(trim(p_bio), '')
  where g.id = p_glytch_id
    and public.can_manage_glytch_profile(g.id, auth.uid())
  returning g.* into updated_glytch;

  if updated_glytch.id is null then
    raise exception 'Not allowed to update this Glytch profile';
  end if;

  return updated_glytch;
end;
$$;

revoke all on function public.set_glytch_profile(bigint, text, text) from public;
grant execute on function public.set_glytch_profile(bigint, text, text) to authenticated;

commit;
