-- 20260212161000_glytch_profile_settings.sql
begin;

alter table public.glytches add column if not exists bio text;

create or replace function public.set_glytch_profile(
  p_glytch_id bigint,
  p_name text,
  p_bio text
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

  if p_name is null or nullif(trim(p_name), '') is null then
    raise exception 'Glytch name is required';
  end if;

  update public.glytches g
  set name = trim(p_name),
      bio = nullif(trim(p_bio), '')
  where g.id = p_glytch_id
    and g.owner_id = auth.uid()
  returning g.* into updated_glytch;

  if updated_glytch.id is null then
    raise exception 'Not allowed to update this Glytch profile';
  end if;

  return updated_glytch;
end;
$$;

revoke all on function public.set_glytch_profile(bigint, text, text) from public;
grant execute on function public.set_glytch_profile(bigint, text, text) to authenticated;

commit;
