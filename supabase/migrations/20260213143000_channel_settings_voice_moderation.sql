-- 20260213143000_channel_settings_voice_moderation.sql
begin;

alter table public.glytch_channels
  add column if not exists text_post_mode text,
  add column if not exists voice_user_limit integer;

update public.glytch_channels
set text_post_mode = 'all'
where text_post_mode is null;

alter table public.glytch_channels
  alter column text_post_mode set default 'all';

alter table public.glytch_channels
  alter column text_post_mode set not null;

alter table public.glytch_channels
  drop constraint if exists glytch_channels_text_post_mode_check;

alter table public.glytch_channels
  add constraint glytch_channels_text_post_mode_check
  check (text_post_mode in ('all', 'images_only'));

alter table public.glytch_channels
  drop constraint if exists glytch_channels_voice_user_limit_check;

alter table public.glytch_channels
  add constraint glytch_channels_voice_user_limit_check
  check (
    voice_user_limit is null
    or (voice_user_limit >= 1 and voice_user_limit <= 99)
  );

update public.glytch_channels
set voice_user_limit = null
where kind <> 'voice';

create or replace function public.set_glytch_channel_settings(
  p_channel_id bigint,
  p_text_post_mode text default null,
  p_voice_user_limit integer default null
)
returns public.glytch_channels
language plpgsql
security definer
set search_path = public
as $$
declare
  channel_row public.glytch_channels;
  normalized_text_post_mode text;
  normalized_voice_user_limit integer;
begin
  select * into channel_row
  from public.glytch_channels c
  where c.id = p_channel_id
  for update;

  if not found then
    raise exception 'Channel not found';
  end if;

  if not (
    public.is_glytch_owner_or_admin(channel_row.glytch_id, auth.uid())
    or public.glytch_has_permission(channel_row.glytch_id, auth.uid(), 'manage_channels')
  ) then
    raise exception 'Not allowed to edit channel settings';
  end if;

  normalized_text_post_mode := lower(trim(coalesce(nullif(p_text_post_mode, ''), channel_row.text_post_mode, 'all')));
  if normalized_text_post_mode not in ('all', 'images_only') then
    raise exception 'Invalid text post mode';
  end if;

  if channel_row.kind = 'voice' then
    if p_voice_user_limit is null then
      normalized_voice_user_limit := null;
    else
      if p_voice_user_limit < 1 or p_voice_user_limit > 99 then
        raise exception 'Voice user limit must be between 1 and 99';
      end if;
      normalized_voice_user_limit := p_voice_user_limit;
    end if;
    normalized_text_post_mode := 'all';
  else
    normalized_voice_user_limit := null;
  end if;

  update public.glytch_channels
  set text_post_mode = normalized_text_post_mode,
      voice_user_limit = normalized_voice_user_limit
  where id = channel_row.id
  returning * into channel_row;

  return channel_row;
end;
$$;

revoke all on function public.set_glytch_channel_settings(bigint, text, integer) from public;
grant execute on function public.set_glytch_channel_settings(bigint, text, integer) to authenticated;

create or replace function public.glytch_channel_allows_message(
  p_channel_id bigint,
  p_content text,
  p_attachment_type text,
  p_attachment_url text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  channel_kind text;
  post_mode text;
begin
  if p_channel_id is null then
    return false;
  end if;

  select c.kind, c.text_post_mode
  into channel_kind, post_mode
  from public.glytch_channels c
  where c.id = p_channel_id;

  if channel_kind <> 'text' then
    return false;
  end if;

  if coalesce(post_mode, 'all') = 'images_only' then
    return (
      p_attachment_type in ('image', 'gif')
      and char_length(trim(coalesce(p_attachment_url, ''))) > 0
    );
  end if;

  return true;
end;
$$;

revoke all on function public.glytch_channel_allows_message(bigint, text, text, text) from public;
grant execute on function public.glytch_channel_allows_message(bigint, text, text, text) to authenticated;

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
      and public.glytch_channel_allows_message(
        c.id,
        glytch_messages.content,
        glytch_messages.attachment_type,
        glytch_messages.attachment_url
      )
  )
);

create or replace function public.voice_room_max_participants(p_room_key text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  room_kind text;
  room_id_text text;
  room_id bigint;
  room_limit integer;
begin
  if p_room_key is null then
    return null;
  end if;

  room_kind := split_part(p_room_key, ':', 1);
  room_id_text := split_part(p_room_key, ':', 2);

  if room_kind <> 'glytch' then
    return null;
  end if;

  if room_id_text !~ '^[0-9]+$' then
    return null;
  end if;

  room_id := room_id_text::bigint;

  select c.voice_user_limit into room_limit
  from public.glytch_channels c
  where c.id = room_id
    and c.kind = 'voice';

  return room_limit;
end;
$$;

revoke all on function public.voice_room_max_participants(text) from public;
grant execute on function public.voice_room_max_participants(text) to authenticated;

create or replace function public.user_can_join_voice_room(p_room_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  room_limit integer;
  participant_count integer;
begin
  if auth.uid() is null or p_room_key is null then
    return false;
  end if;

  if not public.user_can_access_voice_room(p_room_key) then
    return false;
  end if;

  room_limit := public.voice_room_max_participants(p_room_key);
  if room_limit is null then
    return true;
  end if;

  if exists (
    select 1
    from public.voice_participants vp
    where vp.room_key = p_room_key
      and vp.user_id = auth.uid()
  ) then
    return true;
  end if;

  select count(*)::integer into participant_count
  from public.voice_participants vp
  where vp.room_key = p_room_key;

  return participant_count < room_limit;
end;
$$;

revoke all on function public.user_can_join_voice_room(text) from public;
grant execute on function public.user_can_join_voice_room(text) to authenticated;

create or replace function public.enforce_voice_room_capacity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  room_limit integer;
  participant_count integer;
begin
  room_limit := public.voice_room_max_participants(new.room_key);
  if room_limit is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.room_key, 0));

  if exists (
    select 1
    from public.voice_participants vp
    where vp.room_key = new.room_key
      and vp.user_id = new.user_id
  ) then
    return new;
  end if;

  select count(*)::integer into participant_count
  from public.voice_participants vp
  where vp.room_key = new.room_key;

  if participant_count >= room_limit then
    raise exception 'Voice channel is full';
  end if;

  return new;
end;
$$;

drop trigger if exists tr_enforce_voice_room_capacity on public.voice_participants;
create trigger tr_enforce_voice_room_capacity
before insert on public.voice_participants
for each row
execute function public.enforce_voice_room_capacity();

drop policy if exists "voice participants can join as self" on public.voice_participants;
create policy "voice participants can join as self"
on public.voice_participants
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.user_can_join_voice_room(room_key)
);

create or replace function public.can_moderate_voice_room(
  p_room_key text,
  p_user_id uuid
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
begin
  if p_room_key is null or p_user_id is null then
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

  return public.glytch_has_permission(channel_glytch_id, p_user_id, 'moderate_voice');
end;
$$;

revoke all on function public.can_moderate_voice_room(text, uuid) from public;
grant execute on function public.can_moderate_voice_room(text, uuid) to authenticated;

create or replace function public.force_voice_participant_state(
  p_room_key text,
  p_target_user_id uuid,
  p_muted boolean default null,
  p_deafened boolean default null
)
returns public.voice_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_row public.voice_participants;
  updated_row public.voice_participants;
  next_muted boolean;
  next_deafened boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_room_key is null or p_target_user_id is null then
    raise exception 'Room key and target user are required';
  end if;

  if p_muted is null and p_deafened is null then
    raise exception 'Provide muted and/or deafened state';
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

  next_deafened := coalesce(p_deafened, existing_row.deafened);
  next_muted := coalesce(p_muted, existing_row.muted);

  if next_deafened then
    next_muted := true;
  end if;

  update public.voice_participants
  set muted = next_muted,
      deafened = next_deafened
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

  if not public.can_moderate_voice_room(p_room_key, auth.uid()) then
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

commit;
