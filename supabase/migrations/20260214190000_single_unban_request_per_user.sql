-- 20260214190000_single_unban_request_per_user.sql
begin;

with ranked_requests as (
  select
    id,
    row_number() over (
      partition by glytch_id, user_id
      order by requested_at desc, id desc
    ) as row_rank
  from public.glytch_unban_requests
)
delete from public.glytch_unban_requests requests
using ranked_requests ranked
where requests.id = ranked.id
  and ranked.row_rank > 1;

drop index if exists idx_glytch_unban_requests_one_pending_per_user;

create unique index if not exists idx_glytch_unban_requests_one_request_per_user
  on public.glytch_unban_requests (glytch_id, user_id);

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

  select *
  into request_row
  from public.glytch_unban_requests r
  where r.glytch_id = p_glytch_id
    and r.user_id = auth.uid()
  order by r.requested_at desc, r.id desc
  limit 1;

  if found then
    if request_row.status = 'pending' then
      raise exception 'You already have a pending unban request for this Glytch';
    end if;
    raise exception 'You already submitted an unban request for this Glytch';
  end if;

  cleaned_message := nullif(trim(coalesce(p_message, '')), '');

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

commit;
