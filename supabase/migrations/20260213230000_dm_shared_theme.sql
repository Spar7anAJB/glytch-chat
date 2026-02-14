-- 20260213230000_dm_shared_theme.sql
begin;

alter table public.dm_conversations
  add column if not exists dm_theme jsonb;

create or replace function public.set_dm_conversation_theme(
  p_conversation_id bigint,
  p_theme jsonb default null
)
returns public.dm_conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  conversation_row public.dm_conversations;
  normalized_theme jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_theme is null then
    normalized_theme := null;
  else
    if jsonb_typeof(p_theme) <> 'object' then
      raise exception 'Theme must be a JSON object';
    end if;
    normalized_theme := p_theme;
  end if;

  update public.dm_conversations c
  set dm_theme = normalized_theme
  where c.id = p_conversation_id
    and (c.user_a = auth.uid() or c.user_b = auth.uid())
  returning * into conversation_row;

  if not found then
    raise exception 'DM conversation not found or access denied';
  end if;

  return conversation_row;
end;
$$;

revoke all on function public.set_dm_conversation_theme(bigint, jsonb) from public;
grant execute on function public.set_dm_conversation_theme(bigint, jsonb) to authenticated;

commit;
