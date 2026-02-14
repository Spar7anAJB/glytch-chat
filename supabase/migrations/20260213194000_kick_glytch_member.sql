-- 20260213194000_kick_glytch_member.sql
begin;

create or replace function public.kick_member_from_glytch(
  p_glytch_id bigint,
  p_user_id uuid
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

  if p_glytch_id is null or p_user_id is null then
    raise exception 'Glytch and user are required';
  end if;

  if not public.can_manage_glytch_members(p_glytch_id, auth.uid()) then
    raise exception 'Not allowed to kick users in this Glytch';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot kick yourself';
  end if;

  select g.owner_id
  into target_owner_id
  from public.glytches g
  where g.id = p_glytch_id;

  if target_owner_id is null then
    raise exception 'Glytch not found';
  end if;

  if p_user_id = target_owner_id then
    raise exception 'You cannot kick the Glytch owner';
  end if;

  delete from public.glytch_member_roles
  where glytch_id = p_glytch_id
    and user_id = p_user_id;

  delete from public.glytch_members
  where glytch_id = p_glytch_id
    and user_id = p_user_id;

  removed_member := found;

  delete from public.voice_participants vp
  using public.glytch_channels ch
  where ch.glytch_id = p_glytch_id
    and vp.user_id = p_user_id
    and vp.room_key = ('glytch:' || ch.id::text);

  return removed_member;
end;
$$;

revoke all on function public.kick_member_from_glytch(bigint, uuid) from public;
grant execute on function public.kick_member_from_glytch(bigint, uuid) to authenticated;

commit;
