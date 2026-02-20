-- 20260219124500_fix_dm_read_receipt_edit_trigger.sql
-- Allow DM read-receipt updates without tripping the text-edit enforcement trigger.

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

  -- Marking a message as read is allowed as a separate update path.
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
