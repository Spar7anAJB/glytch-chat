-- 20260214182000_glytch_unban_requests.sql
begin;

create table if not exists public.glytch_unban_requests (
  id bigint generated always as identity primary key,
  glytch_id bigint not null references public.glytches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  message text,
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text
);

create index if not exists idx_glytch_unban_requests_glytch_status_requested_at
  on public.glytch_unban_requests (glytch_id, status, requested_at desc);

create unique index if not exists idx_glytch_unban_requests_one_pending_per_user
  on public.glytch_unban_requests (glytch_id, user_id)
  where status = 'pending';

alter table public.glytch_unban_requests enable row level security;

drop policy if exists "users can read own glytch unban requests" on public.glytch_unban_requests;
create policy "users can read own glytch unban requests"
on public.glytch_unban_requests
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "managers can read glytch unban requests" on public.glytch_unban_requests;
create policy "managers can read glytch unban requests"
on public.glytch_unban_requests
for select
to authenticated
using (
  public.can_manage_glytch_members(glytch_id, auth.uid())
);

drop policy if exists "banned users can create own glytch unban requests" on public.glytch_unban_requests;
create policy "banned users can create own glytch unban requests"
on public.glytch_unban_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and exists (
    select 1
    from public.glytch_bans b
    where b.glytch_id = glytch_unban_requests.glytch_id
      and b.user_id = auth.uid()
  )
);

create or replace function public.submit_glytch_unban_request(
  p_glytch_id bigint,
  p_message text default null
)
returns public.glytch_unban_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.glytch_unban_requests;
  cleaned_message text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_glytch_id is null then
    raise exception 'Glytch is required';
  end if;

  if not exists (
    select 1
    from public.glytches g
    where g.id = p_glytch_id
  ) then
    raise exception 'Glytch not found';
  end if;

  if not exists (
    select 1
    from public.glytch_bans b
    where b.glytch_id = p_glytch_id
      and b.user_id = auth.uid()
  ) then
    raise exception 'You are not banned from this Glytch';
  end if;

  cleaned_message := nullif(trim(coalesce(p_message, '')), '');

  select *
  into request_row
  from public.glytch_unban_requests r
  where r.glytch_id = p_glytch_id
    and r.user_id = auth.uid()
    and r.status = 'pending'
  order by r.requested_at desc, r.id desc
  limit 1
  for update;

  if found then
    update public.glytch_unban_requests
    set message = cleaned_message,
        requested_at = now(),
        reviewed_by = null,
        reviewed_at = null,
        review_note = null
    where id = request_row.id
    returning * into request_row;

    return request_row;
  end if;

  insert into public.glytch_unban_requests (
    glytch_id,
    user_id,
    status,
    message,
    requested_at
  )
  values (
    p_glytch_id,
    auth.uid(),
    'pending',
    cleaned_message,
    now()
  )
  returning * into request_row;

  return request_row;
end;
$$;

revoke all on function public.submit_glytch_unban_request(bigint, text) from public;
grant execute on function public.submit_glytch_unban_request(bigint, text) to authenticated;

create or replace function public.review_glytch_unban_request(
  p_request_id bigint,
  p_status text,
  p_review_note text default null
)
returns public.glytch_unban_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.glytch_unban_requests;
  next_status text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_request_id is null then
    raise exception 'Request id is required';
  end if;

  next_status := lower(trim(coalesce(p_status, '')));
  if next_status not in ('approved', 'rejected') then
    raise exception 'Review status must be approved or rejected';
  end if;

  select *
  into request_row
  from public.glytch_unban_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Unban request not found';
  end if;

  if not public.can_manage_glytch_members(request_row.glytch_id, auth.uid()) then
    raise exception 'Not allowed to review unban requests in this Glytch';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Unban request already reviewed';
  end if;

  update public.glytch_unban_requests
  set status = next_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = nullif(trim(coalesce(p_review_note, '')), '')
  where id = request_row.id
  returning * into request_row;

  if next_status = 'approved' then
    delete from public.glytch_bans
    where glytch_id = request_row.glytch_id
      and user_id = request_row.user_id;
  end if;

  return request_row;
end;
$$;

revoke all on function public.review_glytch_unban_request(bigint, text, text) from public;
grant execute on function public.review_glytch_unban_request(bigint, text, text) to authenticated;

create or replace function public.unban_user_from_glytch(
  p_glytch_id bigint,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  did_unban boolean;
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

  did_unban := found;

  if did_unban then
    update public.glytch_unban_requests
    set status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = coalesce(review_note, 'Approved via manual unban')
    where glytch_id = p_glytch_id
      and user_id = p_user_id
      and status = 'pending';
  end if;

  return did_unban;
end;
$$;

revoke all on function public.unban_user_from_glytch(bigint, uuid) from public;
grant execute on function public.unban_user_from_glytch(bigint, uuid) to authenticated;

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
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

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
    raise exception using
      message = 'You are banned from this Glytch',
      detail = json_build_object('glytch_id', target_glytch_id)::text,
      hint = 'GLYTCH_BANNED';
  end if;

  select owner_id into target_owner_id
  from public.glytches
  where id = target_glytch_id;

  perform public.initialize_glytch_roles(target_glytch_id, target_owner_id);
  perform set_config('app.allow_glytch_join_insert', '1', true);

  insert into public.glytch_members (glytch_id, user_id)
  values (target_glytch_id, auth.uid())
  on conflict (glytch_id, user_id) do nothing;

  return json_build_object('glytch_id', target_glytch_id);
end;
$$;

revoke all on function public.join_glytch_by_code(text) from public;
grant execute on function public.join_glytch_by_code(text) to authenticated;

commit;
