-- 20260212154000_glytch_icons.sql
begin;

alter table public.glytches add column if not exists icon_url text;

create or replace function public.set_glytch_icon(
  p_glytch_id bigint,
  p_icon_url text
)
returns public.glytches
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_glytch public.glytches;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.glytches g
  set icon_url = nullif(trim(p_icon_url), '')
  where g.id = p_glytch_id
    and g.owner_id = auth.uid()
  returning g.* into updated_glytch;

  if updated_glytch.id is null then
    raise exception 'Not allowed to update this Glytch icon';
  end if;

  return updated_glytch;
end;
$$;

revoke all on function public.set_glytch_icon(bigint, text) from public;
grant execute on function public.set_glytch_icon(bigint, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'glytch-media',
  'glytch-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "public can read glytch media" on storage.objects;
create policy "public can read glytch media"
on storage.objects
for select
to public
using (bucket_id = 'glytch-media');

drop policy if exists "glytch owners can upload icon media" on storage.objects;
create policy "glytch owners can upload icon media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'glytch-media'
  and exists (
    select 1
    from public.glytches g
    where g.id::text = (storage.foldername(name))[1]
      and g.owner_id = auth.uid()
  )
);

drop policy if exists "glytch owners can update icon media" on storage.objects;
create policy "glytch owners can update icon media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'glytch-media'
  and exists (
    select 1
    from public.glytches g
    where g.id::text = (storage.foldername(name))[1]
      and g.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'glytch-media'
  and exists (
    select 1
    from public.glytches g
    where g.id::text = (storage.foldername(name))[1]
      and g.owner_id = auth.uid()
  )
);

drop policy if exists "glytch owners can delete icon media" on storage.objects;
create policy "glytch owners can delete icon media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'glytch-media'
  and exists (
    select 1
    from public.glytches g
    where g.id::text = (storage.foldername(name))[1]
      and g.owner_id = auth.uid()
  )
);

commit;
