-- 20260216202000_single_session_login.sql
begin;

create table if not exists public.user_session_locks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_user_session_locks_expires_at
  on public.user_session_locks (expires_at);

alter table public.user_session_locks enable row level security;

revoke all on table public.user_session_locks from public;
revoke all on table public.user_session_locks from anon;
revoke all on table public.user_session_locks from authenticated;

drop function if exists public.claim_single_session_login(text);
create or replace function public.claim_single_session_login(p_session_id text)
returns public.user_session_locks
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_id uuid;
  normalized_session_id text;
  lock_ttl interval := interval '2 hours';
  existing_row public.user_session_locks;
  next_row public.user_session_locks;
begin
  requester_id := auth.uid();
  if requester_id is null then
    raise exception 'Authentication required';
  end if;

  normalized_session_id := btrim(coalesce(p_session_id, ''));
  if normalized_session_id = '' then
    raise exception 'Session key is required';
  end if;

  select *
  into existing_row
  from public.user_session_locks locks
  where locks.user_id = requester_id
  for update;

  if found
    and existing_row.session_id is distinct from normalized_session_id
    and existing_row.expires_at > now() then
    raise exception 'This account is already active in another session.';
  end if;

  insert into public.user_session_locks (
    user_id,
    session_id,
    created_at,
    updated_at,
    expires_at
  )
  values (
    requester_id,
    normalized_session_id,
    now(),
    now(),
    now() + lock_ttl
  )
  on conflict (user_id) do update
  set session_id = excluded.session_id,
      updated_at = now(),
      expires_at = now() + lock_ttl
  returning * into next_row;

  return next_row;
end;
$$;

drop function if exists public.release_single_session_login(text);
create or replace function public.release_single_session_login(p_session_id text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_id uuid;
  normalized_session_id text;
  deleted_rows integer := 0;
begin
  requester_id := auth.uid();
  if requester_id is null then
    raise exception 'Authentication required';
  end if;

  normalized_session_id := nullif(btrim(coalesce(p_session_id, '')), '');

  delete from public.user_session_locks locks
  where locks.user_id = requester_id
    and (
      normalized_session_id is null
      or locks.session_id = normalized_session_id
      or locks.expires_at <= now()
    );

  get diagnostics deleted_rows = row_count;
  return deleted_rows > 0;
end;
$$;

revoke all on function public.claim_single_session_login(text) from public;
grant execute on function public.claim_single_session_login(text) to authenticated;

revoke all on function public.release_single_session_login(text) from public;
grant execute on function public.release_single_session_login(text) to authenticated;

commit;
