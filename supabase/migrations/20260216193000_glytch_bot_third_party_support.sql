-- 20260216193000_glytch_bot_third_party_support.sql
begin;

alter table public.glytch_bot_settings
  add column if not exists third_party_bots_enabled boolean not null default false;

alter table public.glytch_bot_settings
  add column if not exists third_party_bot_webhook_url text;

alter table public.glytch_bot_settings
  drop constraint if exists glytch_bot_settings_third_party_bot_webhook_url_length;

alter table public.glytch_bot_settings
  add constraint glytch_bot_settings_third_party_bot_webhook_url_length
  check (third_party_bot_webhook_url is null or char_length(third_party_bot_webhook_url) <= 2048);

drop function if exists public.set_glytch_bot_settings(bigint, boolean, boolean, boolean, boolean, text[], boolean, boolean);
create or replace function public.set_glytch_bot_settings(
  p_glytch_id bigint,
  p_enabled boolean default null,
  p_block_external_links boolean default null,
  p_block_invite_links boolean default null,
  p_block_blocked_words boolean default null,
  p_blocked_words text[] default null,
  p_dm_on_kick_or_ban boolean default null,
  p_dm_on_message_block boolean default null,
  p_third_party_bots_enabled boolean default null,
  p_third_party_bot_webhook_url text default null,
  p_apply_third_party_bot_webhook_url boolean default false
)
returns public.glytch_bot_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_row public.glytch_bot_settings;
  normalized_blocked_words text[];
  normalized_webhook_url text;
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

  normalized_webhook_url := settings_row.third_party_bot_webhook_url;
  if p_apply_third_party_bot_webhook_url then
    normalized_webhook_url := nullif(trim(coalesce(p_third_party_bot_webhook_url, '')), '');
  end if;

  if normalized_webhook_url is not null and normalized_webhook_url !~* '^https?://' then
    raise exception 'Third-party bot webhook URL must start with http:// or https://';
  end if;

  if not coalesce(p_third_party_bots_enabled, settings_row.third_party_bots_enabled) then
    normalized_webhook_url := null;
  end if;

  update public.glytch_bot_settings
  set enabled = coalesce(p_enabled, settings_row.enabled),
      block_external_links = coalesce(p_block_external_links, settings_row.block_external_links),
      block_invite_links = coalesce(p_block_invite_links, settings_row.block_invite_links),
      block_blocked_words = coalesce(p_block_blocked_words, settings_row.block_blocked_words),
      blocked_words = normalized_blocked_words,
      dm_on_kick_or_ban = coalesce(p_dm_on_kick_or_ban, settings_row.dm_on_kick_or_ban),
      dm_on_message_block = coalesce(p_dm_on_message_block, settings_row.dm_on_message_block),
      third_party_bots_enabled = coalesce(p_third_party_bots_enabled, settings_row.third_party_bots_enabled),
      third_party_bot_webhook_url = normalized_webhook_url,
      updated_by = auth.uid(),
      updated_at = now()
  where glytch_id = p_glytch_id
  returning * into settings_row;

  return settings_row;
end;
$$;

revoke all on function public.set_glytch_bot_settings(bigint, boolean, boolean, boolean, boolean, text[], boolean, boolean, boolean, text, boolean) from public;
grant execute on function public.set_glytch_bot_settings(bigint, boolean, boolean, boolean, boolean, text[], boolean, boolean, boolean, text, boolean) to authenticated;

commit;
