-- 20260212164000_delete_glytch_rpc.sql
begin;

create or replace function public.delete_glytch(
  p_glytch_id bigint,
  p_confirmation_name text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target_name text;
  deleted_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_glytch_id is null then
    raise exception 'Glytch id is required';
  end if;

  select g.name
  into target_name
  from public.glytches g
  where g.id = p_glytch_id
    and g.owner_id = auth.uid();

  if target_name is null then
    raise exception 'Not allowed to delete this Glytch';
  end if;

  if p_confirmation_name is null or trim(p_confirmation_name) <> target_name then
    raise exception 'Confirmation name does not match the Glytch name';
  end if;

  delete from public.glytches g
  where g.id = p_glytch_id
    and g.owner_id = auth.uid()
  returning g.id into deleted_id;

  if deleted_id is null then
    raise exception 'Could not delete Glytch';
  end if;

  return json_build_object(
    'deleted', true,
    'glytch_id', deleted_id
  );
end;
$$;

revoke all on function public.delete_glytch(bigint, text) from public;
grant execute on function public.delete_glytch(bigint, text) to authenticated;

commit;
