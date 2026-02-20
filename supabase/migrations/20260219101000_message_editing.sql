-- 20260219101000_message_editing.sql
-- Add text-only message editing support for DMs, group chats, and Glytch text channels.

alter table public.dm_messages add column if not exists edited_at timestamptz;
alter table public.group_chat_messages add column if not exists edited_at timestamptz;
alter table public.glytch_messages add column if not exists edited_at timestamptz;

create or replace function public.enforce_dm_message_text_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id <> old.id
    or new.conversation_id <> old.conversation_id
    or new.sender_id <> old.sender_id
    or coalesce(new.attachment_url, '') <> coalesce(old.attachment_url, '')
    or coalesce(new.attachment_type, '') <> coalesce(old.attachment_type, '')
    or new.created_at <> old.created_at
  then
    raise exception 'Only message content can be edited.';
  end if;

  if coalesce(new.read_by_receiver_at, '-infinity'::timestamptz) <> coalesce(old.read_by_receiver_at, '-infinity'::timestamptz) then
    if new.content is distinct from old.content then
      raise exception 'Only message content can be edited.';
    end if;
    new.edited_at := old.edited_at;
    return new;
  end if;

  if char_length(trim(coalesce(new.content, ''))) = 0 then
    raise exception 'Message content cannot be empty.';
  end if;

  if new.content is distinct from old.content then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_group_chat_message_text_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id <> old.id
    or new.group_chat_id <> old.group_chat_id
    or new.sender_id <> old.sender_id
    or coalesce(new.attachment_url, '') <> coalesce(old.attachment_url, '')
    or coalesce(new.attachment_type, '') <> coalesce(old.attachment_type, '')
    or new.created_at <> old.created_at
  then
    raise exception 'Only message content can be edited.';
  end if;

  if char_length(trim(coalesce(new.content, ''))) = 0 then
    raise exception 'Message content cannot be empty.';
  end if;

  if new.content is distinct from old.content then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_glytch_message_text_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id <> old.id
    or new.glytch_channel_id <> old.glytch_channel_id
    or new.sender_id <> old.sender_id
    or coalesce(new.attachment_url, '') <> coalesce(old.attachment_url, '')
    or coalesce(new.attachment_type, '') <> coalesce(old.attachment_type, '')
    or coalesce(new.bot_should_delete, false) <> coalesce(old.bot_should_delete, false)
    or new.created_at <> old.created_at
  then
    raise exception 'Only message content can be edited.';
  end if;

  if char_length(trim(coalesce(new.content, ''))) = 0 then
    raise exception 'Message content cannot be empty.';
  end if;

  if new.content is distinct from old.content then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_enforce_dm_message_text_edit on public.dm_messages;
create trigger tr_enforce_dm_message_text_edit
before update on public.dm_messages
for each row
execute function public.enforce_dm_message_text_edit();

drop trigger if exists tr_enforce_group_chat_message_text_edit on public.group_chat_messages;
create trigger tr_enforce_group_chat_message_text_edit
before update on public.group_chat_messages
for each row
execute function public.enforce_group_chat_message_text_edit();

drop trigger if exists tr_enforce_glytch_message_text_edit on public.glytch_messages;
create trigger tr_enforce_glytch_message_text_edit
before update on public.glytch_messages
for each row
execute function public.enforce_glytch_message_text_edit();

drop policy if exists "participants can edit own dm messages" on public.dm_messages;
create policy "participants can edit own dm messages"
on public.dm_messages
for update
to authenticated
using (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_messages.conversation_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
)
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_messages.conversation_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
);

drop policy if exists "users can edit own group chat messages" on public.group_chat_messages;
create policy "users can edit own group chat messages"
on public.group_chat_messages
for update
to authenticated
using (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.group_chat_members m
    where m.group_chat_id = group_chat_messages.group_chat_id
      and m.user_id = auth.uid()
  )
)
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.group_chat_members m
    where m.group_chat_id = group_chat_messages.group_chat_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "members can edit own glytch messages" on public.glytch_messages;
create policy "members can edit own glytch messages"
on public.glytch_messages
for update
to authenticated
using (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.glytch_channels c
    where c.id = glytch_messages.glytch_channel_id
      and public.glytch_has_channel_permission(c.id, auth.uid(), 'send_messages')
  )
)
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.glytch_channels c
    where c.id = glytch_messages.glytch_channel_id
      and public.glytch_has_channel_permission(c.id, auth.uid(), 'send_messages')
  )
);
