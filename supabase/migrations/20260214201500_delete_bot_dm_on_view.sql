-- 20260214201500_delete_bot_dm_on_view.sql
begin;

create or replace function public.mark_dm_conversation_read(p_conversation_id bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer := 0;
  deleted_bot_message_count integer := 0;
  deleted_empty_conversation boolean := false;
  bot_sender_user_id constant uuid := '00000000-0000-4000-8000-00000000b070';
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_conversation_id is null then
    raise exception 'Conversation id is required';
  end if;

  if not exists (
    select 1
    from public.dm_conversations c
    where c.id = p_conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid())
  ) then
    raise exception 'Not allowed to read this conversation';
  end if;

  update public.dm_messages m
  set read_by_receiver_at = coalesce(m.read_by_receiver_at, now())
  where m.conversation_id = p_conversation_id
    and m.sender_id <> auth.uid()
    and m.read_by_receiver_at is null;

  get diagnostics updated_count = row_count;

  delete from public.dm_messages m
  where m.conversation_id = p_conversation_id
    and m.sender_id = bot_sender_user_id
    and m.sender_id <> auth.uid();

  get diagnostics deleted_bot_message_count = row_count;

  if deleted_bot_message_count > 0
    and not exists (
      select 1
      from public.dm_messages m
      where m.conversation_id = p_conversation_id
    ) then
    delete from public.dm_conversations c
    where c.id = p_conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid());
    deleted_empty_conversation := found;
  end if;

  return json_build_object(
    'updated_count', updated_count,
    'deleted_bot_message_count', deleted_bot_message_count,
    'deleted_empty_conversation', deleted_empty_conversation
  );
end;
$$;

revoke all on function public.mark_dm_conversation_read(bigint) from public;
grant execute on function public.mark_dm_conversation_read(bigint) to authenticated;

commit;
