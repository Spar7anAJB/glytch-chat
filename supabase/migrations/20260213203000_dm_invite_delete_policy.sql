-- 20260213203000_dm_invite_delete_policy.sql
begin;

-- Allow DM participants to delete their own messages and incoming Glytch invite messages.
drop policy if exists "participants can delete invite dm messages" on public.dm_messages;
create policy "participants can delete invite dm messages"
on public.dm_messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_messages.conversation_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
  and (
    dm_messages.sender_id = auth.uid()
    or dm_messages.content like '[[GLYTCH_INVITE]]%'
  )
);

commit;
