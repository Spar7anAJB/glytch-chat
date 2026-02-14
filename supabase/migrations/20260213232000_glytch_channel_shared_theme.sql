-- 20260213232000_glytch_channel_shared_theme.sql
begin;

alter table public.glytch_channels
  add column if not exists channel_theme jsonb;

create or replace function public.set_glytch_channel_theme(
  p_channel_id bigint,
  p_theme jsonb default null
)
returns public.glytch_channels
language plpgsql
security definer
set search_path = public
as $$
declare
  channel_row public.glytch_channels;
  normalized_theme jsonb;
  mode_value text;
  from_value text;
  to_value text;
  image_url_value text;
begin
  select * into channel_row
  from public.glytch_channels c
  where c.id = p_channel_id
  for update;

  if not found then
    raise exception 'Channel not found';
  end if;

  if channel_row.kind <> 'text' then
    raise exception 'Only text channels support shared backgrounds';
  end if;

  if not (
    public.is_glytch_owner_or_admin(channel_row.glytch_id, auth.uid())
    or public.glytch_has_permission(channel_row.glytch_id, auth.uid(), 'manage_channels')
  ) then
    raise exception 'Not allowed to edit channel background';
  end if;

  if p_theme is null then
    normalized_theme := null;
  else
    if jsonb_typeof(p_theme) <> 'object' then
      raise exception 'Theme must be a JSON object';
    end if;

    from_value := trim(coalesce(p_theme ->> 'from', ''));
    to_value := trim(coalesce(p_theme ->> 'to', ''));
    if from_value = '' or to_value = '' then
      raise exception 'Theme colors are required';
    end if;

    mode_value := lower(trim(coalesce(p_theme ->> 'mode', 'gradient')));
    if mode_value not in ('gradient', 'image') then
      raise exception 'Invalid theme mode';
    end if;

    image_url_value := trim(coalesce(p_theme ->> 'imageUrl', ''));
    if mode_value = 'image' and image_url_value = '' then
      raise exception 'Image URL is required for image mode';
    end if;

    normalized_theme := jsonb_build_object(
      'from', from_value,
      'to', to_value,
      'mode', mode_value
    );
    if mode_value = 'image' then
      normalized_theme := normalized_theme || jsonb_build_object('imageUrl', image_url_value);
    end if;
  end if;

  update public.glytch_channels
  set channel_theme = normalized_theme
  where id = channel_row.id
  returning * into channel_row;

  return channel_row;
end;
$$;

revoke all on function public.set_glytch_channel_theme(bigint, jsonb) from public;
grant execute on function public.set_glytch_channel_theme(bigint, jsonb) to authenticated;

commit;
