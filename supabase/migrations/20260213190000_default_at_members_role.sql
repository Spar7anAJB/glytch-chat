-- 20260213190000_default_at_members_role.sql
begin;

-- If a Glytch already has @members, move Member role assignments into @members.
insert into public.glytch_member_roles (glytch_id, user_id, role_id)
select old_role.glytch_id, mr.user_id, new_role.id
from public.glytch_member_roles mr
join public.glytch_roles old_role
  on old_role.id = mr.role_id
 and old_role.name = 'Member'
join public.glytch_roles new_role
  on new_role.glytch_id = old_role.glytch_id
 and new_role.name = '@members'
on conflict do nothing;

-- Preserve per-channel overrides by carrying Member role permissions into @members.
insert into public.glytch_channel_role_permissions (
  glytch_id,
  role_id,
  channel_id,
  can_view,
  can_send_messages,
  can_join_voice,
  updated_at
)
select old_cp.glytch_id,
       new_role.id,
       old_cp.channel_id,
       old_cp.can_view,
       old_cp.can_send_messages,
       old_cp.can_join_voice,
       now()
from public.glytch_channel_role_permissions old_cp
join public.glytch_roles old_role
  on old_role.id = old_cp.role_id
 and old_role.name = 'Member'
join public.glytch_roles new_role
  on new_role.glytch_id = old_role.glytch_id
 and new_role.name = '@members'
left join public.glytch_channel_role_permissions existing_cp
  on existing_cp.glytch_id = old_cp.glytch_id
 and existing_cp.role_id = new_role.id
 and existing_cp.channel_id = old_cp.channel_id
where existing_cp.role_id is null;

update public.glytch_channel_role_permissions new_cp
set can_view = (new_cp.can_view and old_cp.can_view),
    can_send_messages = (new_cp.can_send_messages and old_cp.can_send_messages),
    can_join_voice = (new_cp.can_join_voice and old_cp.can_join_voice),
    updated_at = now()
from public.glytch_channel_role_permissions old_cp
join public.glytch_roles old_role
  on old_role.id = old_cp.role_id
 and old_role.name = 'Member'
join public.glytch_roles new_role
  on new_role.glytch_id = old_role.glytch_id
 and new_role.name = '@members'
where new_cp.glytch_id = old_cp.glytch_id
  and new_cp.role_id = new_role.id
  and new_cp.channel_id = old_cp.channel_id;

-- Rename legacy Member role when @members does not yet exist.
update public.glytch_roles old_role
set name = '@members'
where old_role.name = 'Member'
  and not exists (
    select 1
    from public.glytch_roles conflict_role
    where conflict_role.glytch_id = old_role.glytch_id
      and conflict_role.name = '@members'
  );

-- Remove leftover legacy Member roles where @members already exists.
delete from public.glytch_roles old_role
where old_role.name = 'Member'
  and exists (
    select 1
    from public.glytch_roles members_role
    where members_role.glytch_id = old_role.glytch_id
      and members_role.name = '@members'
  );

-- Ensure every Glytch has an @members role.
insert into public.glytch_roles (glytch_id, name, color, priority, is_system, is_default, permissions)
select
  g.id,
  '@members',
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
from public.glytches g
where not exists (
  select 1
  from public.glytch_roles r
  where r.glytch_id = g.id
    and r.name = '@members'
);

-- Normalize @members settings and make it the default role for each Glytch.
update public.glytch_roles r
set is_system = true,
    permissions = coalesce(r.permissions, '{}'::jsonb)
      || jsonb_build_object(
        'add_roles', coalesce((r.permissions ->> 'add_roles')::boolean, (r.permissions ->> 'manage_roles')::boolean, false),
        'manage_channels', coalesce((r.permissions ->> 'manage_channels')::boolean, false),
        'create_channels', coalesce((r.permissions ->> 'create_channels')::boolean, (r.permissions ->> 'manage_channels')::boolean, false),
        'ban_members', coalesce((r.permissions ->> 'ban_members')::boolean, (r.permissions ->> 'manage_members')::boolean, false),
        'mute_deafen_members', coalesce((r.permissions ->> 'mute_deafen_members')::boolean, (r.permissions ->> 'moderate_voice')::boolean, false),
        'kick_voice_members', coalesce((r.permissions ->> 'kick_voice_members')::boolean, (r.permissions ->> 'moderate_voice')::boolean, false),
        'edit_glytch_profile', coalesce((r.permissions ->> 'edit_glytch_profile')::boolean, false),
        'manage_roles', coalesce((r.permissions ->> 'manage_roles')::boolean, false),
        'manage_members', coalesce((r.permissions ->> 'manage_members')::boolean, false),
        'view_channel', coalesce((r.permissions ->> 'view_channel')::boolean, true),
        'send_messages', coalesce((r.permissions ->> 'send_messages')::boolean, true),
        'join_voice', coalesce((r.permissions ->> 'join_voice')::boolean, true),
        'moderate_voice', coalesce((r.permissions ->> 'moderate_voice')::boolean, false)
      )
where r.name = '@members';

update public.glytch_roles role_row
set is_default = (role_row.id = defaults.role_id)
from (
  select r.glytch_id, r.id as role_id
  from public.glytch_roles r
  where r.name = '@members'
) as defaults
where role_row.glytch_id = defaults.glytch_id;

-- Make sure all members are assigned @members.
insert into public.glytch_member_roles (glytch_id, user_id, role_id)
select m.glytch_id, m.user_id, r.id
from public.glytch_members m
join public.glytch_roles r
  on r.glytch_id = m.glytch_id
 and r.name = '@members'
on conflict do nothing;

-- Future Glytches should initialize with @members as the default role.
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
    '@members',
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

commit;
