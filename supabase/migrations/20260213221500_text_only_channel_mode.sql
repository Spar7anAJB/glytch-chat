-- 20260213221500_text_only_channel_mode.sql
begin;

update public.glytch_channels
set text_post_mode = 'all'
where text_post_mode is null
   or text_post_mode not in ('all', 'images_only', 'text_only');

alter table public.glytch_channels
  drop constraint if exists glytch_channels_text_post_mode_check;

alter table public.glytch_channels
  add constraint glytch_channels_text_post_mode_check
  check (text_post_mode in ('all', 'images_only', 'text_only'));

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
  if normalized_text_post_mode not in ('all', 'images_only', 'text_only') then
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

  if coalesce(post_mode, 'all') = 'text_only' then
    return (
      char_length(trim(coalesce(p_content, ''))) > 0
      and char_length(trim(coalesce(p_attachment_url, ''))) = 0
      and char_length(trim(coalesce(p_attachment_type, ''))) = 0
    );
  end if;

  return true;
end;
$$;

revoke all on function public.glytch_channel_allows_message(bigint, text, text, text) from public;
grant execute on function public.glytch_channel_allows_message(bigint, text, text, text) to authenticated;

commit;
