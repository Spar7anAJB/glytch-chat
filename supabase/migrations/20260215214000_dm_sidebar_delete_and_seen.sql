-- 20260215214000_dm_sidebar_delete_and_seen.sql
begin;

create table if not exists public.dm_conversation_user_state (
  conversation_id bigint not null references public.dm_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hidden_after_message_id bigint not null default 0,
  hidden_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists dm_conversation_user_state_user_conversation_idx
  on public.dm_conversation_user_state (user_id, conversation_id);

alter table public.dm_conversation_user_state enable row level security;

drop policy if exists "participants can view dm conversation state" on public.dm_conversation_user_state;
create policy "participants can view dm conversation state"
on public.dm_conversation_user_state
for select
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_conversation_user_state.conversation_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
);

drop policy if exists "participants can create dm conversation state" on public.dm_conversation_user_state;
create policy "participants can create dm conversation state"
on public.dm_conversation_user_state
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_conversation_user_state.conversation_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
);

drop policy if exists "participants can update dm conversation state" on public.dm_conversation_user_state;
create policy "participants can update dm conversation state"
on public.dm_conversation_user_state
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_conversation_user_state.conversation_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_conversation_user_state.conversation_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
);

drop policy if exists "participants can delete dm conversation state" on public.dm_conversation_user_state;
create policy "participants can delete dm conversation state"
on public.dm_conversation_user_state
for delete
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_conversation_user_state.conversation_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
);

create or replace function public.list_dm_conversations_for_user()
returns setof public.dm_conversations
language sql
security definer
set search_path = public
as $$
  select c.*
  from public.dm_conversations c
  left join public.dm_conversation_user_state s
    on s.conversation_id = c.id
   and s.user_id = auth.uid()
  where (auth.uid() = c.user_a or auth.uid() = c.user_b)
    and (
      s.conversation_id is null
      or exists (
        select 1
        from public.dm_messages m
        where m.conversation_id = c.id
          and m.id > coalesce(s.hidden_after_message_id, 0)
      )
    )
  order by c.created_at asc;
$$;

revoke all on function public.list_dm_conversations_for_user() from public;
grant execute on function public.list_dm_conversations_for_user() to authenticated;

create or replace function public.hide_dm_conversation(p_conversation_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  latest_message_id bigint := 0;
begin
  if me is null then
    raise exception 'Not authenticated.';
  end if;

  if p_conversation_id is null or p_conversation_id <= 0 then
    raise exception 'Invalid DM conversation.';
  end if;

  if not exists (
    select 1
    from public.dm_conversations c
    where c.id = p_conversation_id
      and (c.user_a = me or c.user_b = me)
  ) then
    raise exception 'DM conversation not found.';
  end if;

  select coalesce(max(m.id), 0)
  into latest_message_id
  from public.dm_messages m
  where m.conversation_id = p_conversation_id;

  insert into public.dm_conversation_user_state (
    conversation_id,
    user_id,
    hidden_after_message_id,
    hidden_at
  )
  values (
    p_conversation_id,
    me,
    latest_message_id,
    now()
  )
  on conflict (conversation_id, user_id) do update
  set
    hidden_after_message_id = greatest(public.dm_conversation_user_state.hidden_after_message_id, excluded.hidden_after_message_id),
    hidden_at = excluded.hidden_at;

  return jsonb_build_object(
    'conversation_id', p_conversation_id,
    'hidden_after_message_id', latest_message_id
  );
end;
$$;

revoke all on function public.hide_dm_conversation(bigint) from public;
grant execute on function public.hide_dm_conversation(bigint) to authenticated;

commit;
