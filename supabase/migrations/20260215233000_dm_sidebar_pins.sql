-- 20260215233000_dm_sidebar_pins.sql
begin;

alter table public.dm_conversation_user_state
  add column if not exists is_hidden boolean not null default false;

alter table public.dm_conversation_user_state
  add column if not exists is_pinned boolean not null default false;

alter table public.dm_conversation_user_state
  add column if not exists pinned_at timestamptz;

-- Existing rows came from hide_dm_conversation before explicit hide/pin flags existed.
update public.dm_conversation_user_state
set is_hidden = true
where is_hidden = false;

create index if not exists dm_conversation_user_state_user_pin_order_idx
  on public.dm_conversation_user_state (user_id, is_pinned desc, pinned_at desc);

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
      or s.is_hidden = false
      or exists (
        select 1
        from public.dm_messages m
        where m.conversation_id = c.id
          and m.id > coalesce(s.hidden_after_message_id, 0)
      )
    )
  order by
    coalesce(s.is_pinned, false) desc,
    coalesce(s.pinned_at, to_timestamp(0)) desc,
    c.created_at asc;
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
    hidden_at,
    is_hidden
  )
  values (
    p_conversation_id,
    me,
    latest_message_id,
    now(),
    true
  )
  on conflict (conversation_id, user_id) do update
  set
    hidden_after_message_id = greatest(public.dm_conversation_user_state.hidden_after_message_id, excluded.hidden_after_message_id),
    hidden_at = excluded.hidden_at,
    is_hidden = true;

  return jsonb_build_object(
    'conversation_id', p_conversation_id,
    'hidden_after_message_id', latest_message_id
  );
end;
$$;

revoke all on function public.hide_dm_conversation(bigint) from public;
grant execute on function public.hide_dm_conversation(bigint) to authenticated;

create or replace function public.set_dm_conversation_pinned(
  p_conversation_id bigint,
  p_pinned boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  resolved_pinned boolean := coalesce(p_pinned, false);
  resolved_pinned_at timestamptz := case when coalesce(p_pinned, false) then now() else null end;
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

  insert into public.dm_conversation_user_state (
    conversation_id,
    user_id,
    is_pinned,
    pinned_at,
    is_hidden,
    hidden_after_message_id,
    hidden_at
  )
  values (
    p_conversation_id,
    me,
    resolved_pinned,
    resolved_pinned_at,
    false,
    0,
    now()
  )
  on conflict (conversation_id, user_id) do update
  set
    is_pinned = excluded.is_pinned,
    pinned_at = excluded.pinned_at,
    is_hidden = case
      when excluded.is_pinned then false
      else public.dm_conversation_user_state.is_hidden
    end,
    hidden_after_message_id = case
      when excluded.is_pinned then 0
      else public.dm_conversation_user_state.hidden_after_message_id
    end;

  return jsonb_build_object(
    'conversation_id', p_conversation_id,
    'is_pinned', resolved_pinned,
    'pinned_at', resolved_pinned_at
  );
end;
$$;

revoke all on function public.set_dm_conversation_pinned(bigint, boolean) from public;
grant execute on function public.set_dm_conversation_pinned(bigint, boolean) to authenticated;

commit;
