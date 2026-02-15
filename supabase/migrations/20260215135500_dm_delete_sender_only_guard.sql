-- Tighten DM delete policy: sender-only deletion.
begin;

drop policy if exists "participants can delete invite dm messages" on public.dm_messages;
drop policy if exists "participants can delete dm messages" on public.dm_messages;

create policy "participants can delete dm messages"
on public.dm_messages
for delete
to authenticated
using (
  dm_messages.sender_id = auth.uid()
  and exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_messages.conversation_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
);

commit;
