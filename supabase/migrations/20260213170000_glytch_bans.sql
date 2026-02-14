-- 20260213170000_glytch_bans.sql
begin;

create table if not exists public.glytch_bans (
  glytch_id bigint not null references public.glytches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  banned_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason text,
  banned_at timestamptz not null default now(),
  primary key (glytch_id, user_id)
);

create index if not exists idx_glytch_bans_glytch_banned_at
  on public.glytch_bans (glytch_id, banned_at desc);

alter table public.glytch_bans enable row level security;

create or replace function public.can_manage_glytch_members(
  p_glytch_id bigint,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and p_glytch_id is not null
    and (
      public.is_glytch_owner_or_admin(p_glytch_id, p_user_id)
      or public.glytch_has_permission(p_glytch_id, p_user_id, 'manage_members')
    );
$$;

revoke all on function public.can_manage_glytch_members(bigint, uuid) from public;
grant execute on function public.can_manage_glytch_members(bigint, uuid) to authenticated;

create or replace function public.ban_user_from_glytch(
  p_glytch_id bigint,
  p_user_id uuid,
  p_reason text default null
)
returns public.glytch_bans
language plpgsql
security definer
set search_path = public
as $$
declare
  target_owner_id uuid;
  banned_row public.glytch_bans;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_glytch_id is null or p_user_id is null then
    raise exception 'Glytch and user are required';
  end if;

  if not public.can_manage_glytch_members(p_glytch_id, auth.uid()) then
    raise exception 'Not allowed to ban users in this Glytch';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot ban yourself';
  end if;

  select g.owner_id
  into target_owner_id
  from public.glytches g
  where g.id = p_glytch_id;

  if target_owner_id is null then
    raise exception 'Glytch not found';
  end if;

  if p_user_id = target_owner_id then
    raise exception 'You cannot ban the Glytch owner';
  end if;

  insert into public.glytch_bans (glytch_id, user_id, banned_by, reason, banned_at)
  values (p_glytch_id, p_user_id, auth.uid(), nullif(trim(coalesce(p_reason, '')), ''), now())
  on conflict (glytch_id, user_id) do update
  set banned_by = excluded.banned_by,
      reason = excluded.reason,
      banned_at = now()
  returning * into banned_row;

  delete from public.glytch_member_roles
  where glytch_id = p_glytch_id
    and user_id = p_user_id;

  delete from public.glytch_members
  where glytch_id = p_glytch_id
    and user_id = p_user_id;

  delete from public.voice_participants vp
  using public.glytch_channels ch
  where ch.glytch_id = p_glytch_id
    and vp.user_id = p_user_id
    and vp.room_key = ('glytch:' || ch.id::text);

  return banned_row;
end;
$$;

revoke all on function public.ban_user_from_glytch(bigint, uuid, text) from public;
grant execute on function public.ban_user_from_glytch(bigint, uuid, text) to authenticated;

create or replace function public.unban_user_from_glytch(
  p_glytch_id bigint,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_glytch_id is null or p_user_id is null then
    raise exception 'Glytch and user are required';
  end if;

  if not public.can_manage_glytch_members(p_glytch_id, auth.uid()) then
    raise exception 'Not allowed to unban users in this Glytch';
  end if;

  delete from public.glytch_bans
  where glytch_id = p_glytch_id
    and user_id = p_user_id;

  return found;
end;
$$;

revoke all on function public.unban_user_from_glytch(bigint, uuid) from public;
grant execute on function public.unban_user_from_glytch(bigint, uuid) to authenticated;

drop policy if exists "managers can view glytch bans" on public.glytch_bans;
create policy "managers can view glytch bans"
on public.glytch_bans
for select
to authenticated
using (
  public.can_manage_glytch_members(glytch_id, auth.uid())
);

drop policy if exists "managers can insert glytch bans" on public.glytch_bans;
create policy "managers can insert glytch bans"
on public.glytch_bans
for insert
to authenticated
with check (
  public.can_manage_glytch_members(glytch_id, auth.uid())
);

drop policy if exists "managers can delete glytch bans" on public.glytch_bans;
create policy "managers can delete glytch bans"
on public.glytch_bans
for delete
to authenticated
using (
  public.can_manage_glytch_members(glytch_id, auth.uid())
);

create or replace function public.join_glytch_by_code(p_invite_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target_glytch_id bigint;
  target_owner_id uuid;
begin
  select g.id into target_glytch_id
  from public.glytches g
  where lower(g.invite_code) = lower(trim(p_invite_code))
  limit 1;

  if target_glytch_id is null then
    raise exception 'Invalid invite code';
  end if;

  if exists (
    select 1
    from public.glytch_bans b
    where b.glytch_id = target_glytch_id
      and b.user_id = auth.uid()
  ) then
    raise exception 'You are banned from this Glytch';
  end if;

  select owner_id into target_owner_id
  from public.glytches
  where id = target_glytch_id;

  perform public.initialize_glytch_roles(target_glytch_id, target_owner_id);

  insert into public.glytch_members (glytch_id, user_id)
  values (target_glytch_id, auth.uid())
  on conflict (glytch_id, user_id) do nothing;

  return json_build_object('glytch_id', target_glytch_id);
end;
$$;

revoke all on function public.join_glytch_by_code(text) from public;
grant execute on function public.join_glytch_by_code(text) to authenticated;

commit;
