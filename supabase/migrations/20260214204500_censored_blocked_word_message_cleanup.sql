-- 20260214204500_censored_blocked_word_message_cleanup.sql
begin;

alter table public.glytch_messages
  add column if not exists bot_should_delete boolean not null default false;

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
      -- Let the send succeed, but only with a safe placeholder. It will be auto-deleted after insert.
      new.content := '[Message removed]';
      new.attachment_url := null;
      new.attachment_type := null;
      new.bot_should_delete := true;
      return new;
    end if;
  end if;

  if block_reason is not null then
    perform public.send_glytch_bot_dm_notice(channel_glytch_id, new.sender_id, 'message_blocked', null, null);
    raise exception 'Glytch Bot blocked this message.';
  end if;

  new.bot_should_delete := false;
  return new;
end;
$$;

drop trigger if exists tr_enforce_glytch_bot_moderation on public.glytch_messages;
create trigger tr_enforce_glytch_bot_moderation
before insert on public.glytch_messages
for each row
execute function public.enforce_glytch_bot_moderation();

create or replace function public.cleanup_glytch_bot_censored_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  channel_glytch_id bigint;
begin
  if not coalesce(new.bot_should_delete, false) then
    return new;
  end if;

  select c.glytch_id
  into channel_glytch_id
  from public.glytch_channels c
  where c.id = new.glytch_channel_id;

  if channel_glytch_id is not null then
    perform public.send_glytch_bot_dm_notice(channel_glytch_id, new.sender_id, 'message_blocked', null, null);
  end if;

  delete from public.glytch_messages
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists tr_cleanup_glytch_bot_censored_message on public.glytch_messages;
create trigger tr_cleanup_glytch_bot_censored_message
after insert on public.glytch_messages
for each row
execute function public.cleanup_glytch_bot_censored_message();

commit;
