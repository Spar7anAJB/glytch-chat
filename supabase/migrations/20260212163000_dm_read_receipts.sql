-- 20260212163000_dm_read_receipts.sql
begin;

alter table public.dm_messages add column if not exists read_by_receiver_at timestamptz;

create index if not exists dm_messages_conversation_sender_unread_idx
  on public.dm_messages (conversation_id, sender_id, read_by_receiver_at);

create or replace function public.mark_dm_conversation_read(p_conversation_id bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer := 0;
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

  return json_build_object('updated_count', updated_count);
end;
$$;

revoke all on function public.mark_dm_conversation_read(bigint) from public;
grant execute on function public.mark_dm_conversation_read(bigint) to authenticated;

commit;
