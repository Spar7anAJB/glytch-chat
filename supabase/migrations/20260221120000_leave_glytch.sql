-- 20260221120000_leave_glytch.sql
begin;

create or replace function public.leave_glytch(
  p_glytch_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_owner_id uuid;
  removed_member boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_glytch_id is null then
    raise exception 'Glytch is required';
  end if;

  select g.owner_id
  into target_owner_id
  from public.glytches g
  where g.id = p_glytch_id;

  if target_owner_id is null then
    raise exception 'Glytch not found';
  end if;

  if target_owner_id = auth.uid() then
    raise exception 'The owner cannot leave this Glytch';
  end if;

  delete from public.glytch_member_roles
  where glytch_id = p_glytch_id
    and user_id = auth.uid();

  delete from public.glytch_members
  where glytch_id = p_glytch_id
    and user_id = auth.uid();

  removed_member := found;

  delete from public.voice_participants vp
  using public.glytch_channels ch
  where ch.glytch_id = p_glytch_id
    and vp.user_id = auth.uid()
    and vp.room_key = ('glytch:' || ch.id::text);

  return removed_member;
end;
$$;

revoke all on function public.leave_glytch(bigint) from public;
grant execute on function public.leave_glytch(bigint) to authenticated;

commit;
