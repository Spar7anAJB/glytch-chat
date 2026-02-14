-- 20260213154000_voice_forced_state_lock.sql
begin;

alter table public.voice_participants
  add column if not exists moderator_forced_muted boolean not null default false,
  add column if not exists moderator_forced_deafened boolean not null default false;

update public.voice_participants
set moderator_forced_muted = true
where moderator_forced_deafened = true
  and moderator_forced_muted = false;

update public.voice_participants
set muted = true
where moderator_forced_muted = true
  and muted = false;

update public.voice_participants
set deafened = true
where moderator_forced_deafened = true
  and deafened = false;

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
  actor_is_moderator := actor_id is not null and public.can_moderate_voice_room(new.room_key, actor_id);

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

drop trigger if exists tr_enforce_voice_participant_state_guard on public.voice_participants;
create trigger tr_enforce_voice_participant_state_guard
before insert or update on public.voice_participants
for each row
execute function public.enforce_voice_participant_state_guard();

drop function if exists public.force_voice_participant_state(text, uuid, boolean, boolean);
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

  if not public.can_moderate_voice_room(p_room_key, auth.uid()) then
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

commit;
