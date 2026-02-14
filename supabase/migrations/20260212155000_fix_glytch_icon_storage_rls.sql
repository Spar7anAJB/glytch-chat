-- 20260212155000_fix_glytch_icon_storage_rls.sql
begin;

-- Replace glytch-media storage policies with auth.uid()-scoped folder checks.
-- Upload path should be: {auth.uid()}/{glytch_id}/filename

drop policy if exists "glytch owners can upload icon media" on storage.objects;
drop policy if exists "glytch owners can update icon media" on storage.objects;
drop policy if exists "glytch owners can delete icon media" on storage.objects;

drop policy if exists "users can upload own glytch media" on storage.objects;
create policy "users can upload own glytch media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'glytch-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can update own glytch media" on storage.objects;
create policy "users can update own glytch media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'glytch-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'glytch-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can delete own glytch media" on storage.objects;
create policy "users can delete own glytch media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'glytch-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
