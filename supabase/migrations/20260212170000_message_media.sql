-- 20260212170000_message_media.sql
begin;

alter table public.dm_messages add column if not exists attachment_url text;
alter table public.dm_messages add column if not exists attachment_type text;

alter table public.dm_messages drop constraint if exists dm_messages_attachment_type_check;
alter table public.dm_messages
  add constraint dm_messages_attachment_type_check
  check (
    attachment_type is null
    or attachment_type in ('image', 'gif')
  );

alter table public.dm_messages drop constraint if exists dm_messages_content_check;
alter table public.dm_messages drop constraint if exists dm_messages_content_or_attachment_check;
alter table public.dm_messages
  add constraint dm_messages_content_or_attachment_check
  check (
    char_length(trim(coalesce(content, ''))) > 0
    or attachment_url is not null
  );

alter table public.glytch_messages add column if not exists attachment_url text;
alter table public.glytch_messages add column if not exists attachment_type text;

alter table public.glytch_messages drop constraint if exists glytch_messages_attachment_type_check;
alter table public.glytch_messages
  add constraint glytch_messages_attachment_type_check
  check (
    attachment_type is null
    or attachment_type in ('image', 'gif')
  );

alter table public.glytch_messages drop constraint if exists glytch_messages_content_check;
alter table public.glytch_messages drop constraint if exists glytch_messages_content_or_attachment_check;
alter table public.glytch_messages
  add constraint glytch_messages_content_or_attachment_check
  check (
    char_length(trim(coalesce(content, ''))) > 0
    or attachment_url is not null
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-media',
  'message-media',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "public can read message media" on storage.objects;
create policy "public can read message media"
on storage.objects
for select
to public
using (bucket_id = 'message-media');

drop policy if exists "users can upload own message media" on storage.objects;
create policy "users can upload own message media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'message-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can update own message media" on storage.objects;
create policy "users can update own message media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'message-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'message-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can delete own message media" on storage.objects;
create policy "users can delete own message media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'message-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
