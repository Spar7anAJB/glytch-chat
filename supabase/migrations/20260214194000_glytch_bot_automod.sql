-- 20260214194000_glytch_bot_automod.sql
begin;

create table if not exists public.glytch_bot_settings (
  glytch_id bigint primary key references public.glytches(id) on delete cascade,
  enabled boolean not null default true,
  block_external_links boolean not null default false,
  block_invite_links boolean not null default true,
  block_blocked_words boolean not null default false,
  blocked_words text[] not null default array[]::text[],
  dm_on_kick_or_ban boolean not null default true,
  dm_on_message_block boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.trg_create_default_glytch_bot_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.glytch_bot_settings (glytch_id, updated_by)
  values (new.id, new.owner_id)
  on conflict (glytch_id) do nothing;
  return new;
end;
$$;

drop trigger if exists tr_create_default_glytch_bot_settings on public.glytches;
create trigger tr_create_default_glytch_bot_settings
after insert on public.glytches
for each row
execute function public.trg_create_default_glytch_bot_settings();

insert into public.glytch_bot_settings (glytch_id, updated_by)
select g.id, g.owner_id
from public.glytches g
on conflict (glytch_id) do nothing;

alter table public.glytch_bot_settings enable row level security;

drop policy if exists "members can read glytch bot settings" on public.glytch_bot_settings;
create policy "members can read glytch bot settings"
on public.glytch_bot_settings
for select
to authenticated
using (
  public.is_glytch_member(glytch_id, auth.uid())
);

drop policy if exists "managers can insert glytch bot settings" on public.glytch_bot_settings;
create policy "managers can insert glytch bot settings"
on public.glytch_bot_settings
for insert
to authenticated
with check (
  public.can_manage_glytch_members(glytch_id, auth.uid())
);

drop policy if exists "managers can update glytch bot settings" on public.glytch_bot_settings;
create policy "managers can update glytch bot settings"
on public.glytch_bot_settings
for update
to authenticated
using (
  public.can_manage_glytch_members(glytch_id, auth.uid())
)
with check (
  public.can_manage_glytch_members(glytch_id, auth.uid())
);

create or replace function public.ensure_glytch_bot_settings_row(
  p_glytch_id bigint,
  p_actor_id uuid default null
)
returns public.glytch_bot_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  settings_row public.glytch_bot_settings;
begin
  if p_glytch_id is null then
    raise exception 'Glytch is required';
  end if;

  select g.owner_id into owner_id
  from public.glytches g
  where g.id = p_glytch_id;

  if owner_id is null then
    raise exception 'Glytch not found';
  end if;

  insert into public.glytch_bot_settings (glytch_id, updated_by)
  values (p_glytch_id, coalesce(p_actor_id, owner_id))
  on conflict (glytch_id) do nothing;

  select *
  into settings_row
  from public.glytch_bot_settings
  where glytch_id = p_glytch_id;

  return settings_row;
end;
$$;

revoke all on function public.ensure_glytch_bot_settings_row(bigint, uuid) from public;
grant execute on function public.ensure_glytch_bot_settings_row(bigint, uuid) to authenticated;

create or replace function public.get_glytch_bot_settings(
  p_glytch_id bigint
)
returns public.glytch_bot_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_row public.glytch_bot_settings;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_glytch_id is null then
    raise exception 'Glytch is required';
  end if;

  if not public.is_glytch_member(p_glytch_id, auth.uid()) then
    raise exception 'Not allowed to view Glytch bot settings';
  end if;

  settings_row := public.ensure_glytch_bot_settings_row(p_glytch_id, auth.uid());
  return settings_row;
end;
$$;

revoke all on function public.get_glytch_bot_settings(bigint) from public;
grant execute on function public.get_glytch_bot_settings(bigint) to authenticated;

create or replace function public.set_glytch_bot_settings(
  p_glytch_id bigint,
  p_enabled boolean default null,
  p_block_external_links boolean default null,
  p_block_invite_links boolean default null,
  p_block_blocked_words boolean default null,
  p_blocked_words text[] default null,
  p_dm_on_kick_or_ban boolean default null,
  p_dm_on_message_block boolean default null
)
returns public.glytch_bot_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_row public.glytch_bot_settings;
  normalized_blocked_words text[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_glytch_id is null then
    raise exception 'Glytch is required';
  end if;

  if not public.can_manage_glytch_members(p_glytch_id, auth.uid()) then
    raise exception 'Not allowed to update Glytch bot settings';
  end if;

  settings_row := public.ensure_glytch_bot_settings_row(p_glytch_id, auth.uid());

  if p_blocked_words is null then
    normalized_blocked_words := settings_row.blocked_words;
  else
    select coalesce(array_agg(word), array[]::text[])
    into normalized_blocked_words
    from (
      select distinct lower(trim(item)) as word
      from unnest(p_blocked_words) as item
      where char_length(trim(coalesce(item, ''))) between 1 and 48
      order by lower(trim(item))
      limit 200
    ) normalized;
  end if;

  update public.glytch_bot_settings
  set enabled = coalesce(p_enabled, settings_row.enabled),
      block_external_links = coalesce(p_block_external_links, settings_row.block_external_links),
      block_invite_links = coalesce(p_block_invite_links, settings_row.block_invite_links),
      block_blocked_words = coalesce(p_block_blocked_words, settings_row.block_blocked_words),
      blocked_words = normalized_blocked_words,
      dm_on_kick_or_ban = coalesce(p_dm_on_kick_or_ban, settings_row.dm_on_kick_or_ban),
      dm_on_message_block = coalesce(p_dm_on_message_block, settings_row.dm_on_message_block),
      updated_by = auth.uid(),
      updated_at = now()
  where glytch_id = p_glytch_id
  returning * into settings_row;

  return settings_row;
end;
$$;

revoke all on function public.set_glytch_bot_settings(bigint, boolean, boolean, boolean, boolean, text[], boolean, boolean) from public;
grant execute on function public.set_glytch_bot_settings(bigint, boolean, boolean, boolean, boolean, text[], boolean, boolean) to authenticated;

create or replace function public.send_glytch_bot_dm_notice(
  p_glytch_id bigint,
  p_target_user_id uuid,
  p_event text,
  p_reason text default null,
  p_actor_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_row public.glytch_bot_settings;
  normalized_event text;
  glytch_name text;
  glytch_owner_id uuid;
  sender_user_id uuid;
  low_user uuid;
  high_user uuid;
  dm_conversation_id bigint;
  dm_content text;
  reason_suffix text;
begin
  if p_glytch_id is null or p_target_user_id is null then
    return;
  end if;

  normalized_event := lower(trim(coalesce(p_event, '')));
  if normalized_event not in ('kicked', 'banned', 'message_blocked') then
    return;
  end if;

  settings_row := public.ensure_glytch_bot_settings_row(p_glytch_id, p_actor_user_id);

  if normalized_event in ('kicked', 'banned') and not settings_row.dm_on_kick_or_ban then
    return;
  end if;

  if normalized_event = 'message_blocked' and not settings_row.dm_on_message_block then
    return;
  end if;

  select g.name, g.owner_id
  into glytch_name, glytch_owner_id
  from public.glytches g
  where g.id = p_glytch_id;

  if glytch_name is null then
    return;
  end if;

  sender_user_id := coalesce(p_actor_user_id, glytch_owner_id);
  if sender_user_id is null then
    return;
  end if;

  if sender_user_id = p_target_user_id then
    sender_user_id := glytch_owner_id;
  end if;

  if sender_user_id is null or sender_user_id = p_target_user_id then
    return;
  end if;

  reason_suffix := case
    when nullif(trim(coalesce(p_reason, '')), '') is null then ''
    else ' Reason: ' || trim(p_reason)
  end;

  if normalized_event = 'kicked' then
    dm_content := '[Glytch Bot] You were kicked from "' || glytch_name || '".' || reason_suffix;
  elsif normalized_event = 'banned' then
    dm_content := '[Glytch Bot] You were banned from "' || glytch_name || '".' || reason_suffix;
  else
    dm_content := '[Glytch Bot] A message you sent in "' || glytch_name || '" was blocked by server moderation.' || reason_suffix;
  end if;

  low_user := least(sender_user_id, p_target_user_id);
  high_user := greatest(sender_user_id, p_target_user_id);

  insert into public.dm_conversations (user_a, user_b)
  values (low_user, high_user)
  on conflict (user_a, user_b) do nothing;

  select c.id
  into dm_conversation_id
  from public.dm_conversations c
  where c.user_a = low_user and c.user_b = high_user
  limit 1;

  if dm_conversation_id is null then
    return;
  end if;

  insert into public.dm_messages (conversation_id, sender_id, content)
  values (dm_conversation_id, sender_user_id, dm_content);
end;
$$;

revoke all on function public.send_glytch_bot_dm_notice(bigint, uuid, text, text, uuid) from public;
grant execute on function public.send_glytch_bot_dm_notice(bigint, uuid, text, text, uuid) to authenticated;

create or replace function public.enforce_glytch_bot_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  channel_glytch_id bigint;
  settings_row public.glytch_bot_settings;
  normalized_content text;
  blocked_word text;
  block_reason text;
begin
  if new.glytch_channel_id is null then
    return new;
  end if;

  select c.glytch_id
  into channel_glytch_id
  from public.glytch_channels c
  where c.id = new.glytch_channel_id;

  if channel_glytch_id is null then
    return new;
  end if;

  settings_row := public.ensure_glytch_bot_settings_row(channel_glytch_id, new.sender_id);
  if not settings_row.enabled then
    return new;
  end if;

  normalized_content := lower(trim(coalesce(new.content, '')));

  if settings_row.block_invite_links and normalized_content ~ '(discord\.gg/|discord\.com/invite/|glytch\.chat/invite/)' then
    block_reason := 'invite links are not allowed.';
  elsif settings_row.block_external_links and normalized_content ~ '(https?://|www\.)' then
    block_reason := 'external links are not allowed.';
  elsif settings_row.block_blocked_words and coalesce(array_length(settings_row.blocked_words, 1), 0) > 0 then
    select word
    into blocked_word
    from unnest(settings_row.blocked_words) as word
    where char_length(trim(coalesce(word, ''))) > 0
      and normalized_content like ('%' || lower(trim(word)) || '%')
    order by char_length(word) desc, lower(word) asc
    limit 1;

    if blocked_word is not null then
      block_reason := 'it contains a blocked word (' || blocked_word || ').';
    end if;
  end if;

  if block_reason is not null then
    perform public.send_glytch_bot_dm_notice(channel_glytch_id, new.sender_id, 'message_blocked', block_reason, null);
    raise exception 'Glytch Bot blocked this message because %', block_reason;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_enforce_glytch_bot_moderation on public.glytch_messages;
create trigger tr_enforce_glytch_bot_moderation
before insert on public.glytch_messages
for each row
execute function public.enforce_glytch_bot_moderation();

create or replace function public.ban_user_from_glytch(
  p_glytch_id bigint,
  p_user_id uuid,
  p_reason text default null
)
returns public.glytch_bans
language plpgsql
security definer
set search_path = public
as $$
declare
  target_owner_id uuid;
  banned_row public.glytch_bans;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_glytch_id is null or p_user_id is null then
    raise exception 'Glytch and user are required';
  end if;

  if not public.can_manage_glytch_members(p_glytch_id, auth.uid()) then
    raise exception 'Not allowed to ban users in this Glytch';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot ban yourself';
  end if;

  select g.owner_id
  into target_owner_id
  from public.glytches g
  where g.id = p_glytch_id;

  if target_owner_id is null then
    raise exception 'Glytch not found';
  end if;

  if p_user_id = target_owner_id then
    raise exception 'You cannot ban the Glytch owner';
  end if;

  insert into public.glytch_bans (glytch_id, user_id, banned_by, reason, banned_at)
  values (p_glytch_id, p_user_id, auth.uid(), nullif(trim(coalesce(p_reason, '')), ''), now())
  on conflict (glytch_id, user_id) do update
  set banned_by = excluded.banned_by,
      reason = excluded.reason,
      banned_at = now()
  returning * into banned_row;

  delete from public.glytch_member_roles
  where glytch_id = p_glytch_id
    and user_id = p_user_id;

  delete from public.glytch_members
  where glytch_id = p_glytch_id
    and user_id = p_user_id;

  delete from public.voice_participants vp
  using public.glytch_channels ch
  where ch.glytch_id = p_glytch_id
    and vp.user_id = p_user_id
    and vp.room_key = ('glytch:' || ch.id::text);

  perform public.send_glytch_bot_dm_notice(
    p_glytch_id,
    p_user_id,
    'banned',
    coalesce(banned_row.reason, nullif(trim(coalesce(p_reason, '')), '')),
    auth.uid()
  );

  return banned_row;
end;
$$;

revoke all on function public.ban_user_from_glytch(bigint, uuid, text) from public;
grant execute on function public.ban_user_from_glytch(bigint, uuid, text) to authenticated;

create or replace function public.kick_member_from_glytch(
  p_glytch_id bigint,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_owner_id uuid;
  removed_member boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_glytch_id is null or p_user_id is null then
    raise exception 'Glytch and user are required';
  end if;

  if not public.can_manage_glytch_members(p_glytch_id, auth.uid()) then
    raise exception 'Not allowed to kick users in this Glytch';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot kick yourself';
  end if;

  select g.owner_id
  into target_owner_id
  from public.glytches g
  where g.id = p_glytch_id;

  if target_owner_id is null then
    raise exception 'Glytch not found';
  end if;

  if p_user_id = target_owner_id then
    raise exception 'You cannot kick the Glytch owner';
  end if;

  delete from public.glytch_member_roles
  where glytch_id = p_glytch_id
    and user_id = p_user_id;

  delete from public.glytch_members
  where glytch_id = p_glytch_id
    and user_id = p_user_id;

  removed_member := found;

  delete from public.voice_participants vp
  using public.glytch_channels ch
  where ch.glytch_id = p_glytch_id
    and vp.user_id = p_user_id
    and vp.room_key = ('glytch:' || ch.id::text);

  if removed_member then
    perform public.send_glytch_bot_dm_notice(
      p_glytch_id,
      p_user_id,
      'kicked',
      null,
      auth.uid()
    );
  end if;

  return removed_member;
end;
$$;

revoke all on function public.kick_member_from_glytch(bigint, uuid) from public;
grant execute on function public.kick_member_from_glytch(bigint, uuid) to authenticated;

commit;
