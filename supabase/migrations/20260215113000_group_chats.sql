-- 20260215113000_group_chats.sql
begin;

create table if not exists public.group_chats (
  id bigint generated always as identity primary key,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table if not exists public.group_chat_members (
  group_chat_id bigint not null references public.group_chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  last_read_message_id bigint not null default 0,
  primary key (group_chat_id, user_id)
);

create index if not exists group_chat_members_user_id_idx on public.group_chat_members (user_id);
create index if not exists group_chat_members_group_id_idx on public.group_chat_members (group_chat_id);

create table if not exists public.group_chat_messages (
  id bigint generated always as identity primary key,
  group_chat_id bigint not null references public.group_chats(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null default '',
  attachment_url text,
  attachment_type text,
  created_at timestamptz not null default now(),
  constraint group_chat_messages_attachment_type_check check (
    attachment_type is null or attachment_type in ('image', 'gif')
  ),
  constraint group_chat_messages_content_or_attachment_check check (
    char_length(trim(coalesce(content, ''))) > 0
    or nullif(trim(coalesce(attachment_url, '')), '') is not null
  )
);

create index if not exists group_chat_messages_group_id_created_idx on public.group_chat_messages (group_chat_id, id desc);
create index if not exists group_chat_messages_sender_id_idx on public.group_chat_messages (sender_id);

create table if not exists public.group_chat_message_reactions (
  message_id bigint not null references public.group_chat_messages(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emoji text not null check (char_length(trim(emoji)) between 1 and 32),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index if not exists group_chat_message_reactions_message_id_idx
  on public.group_chat_message_reactions (message_id);
create index if not exists group_chat_message_reactions_user_id_idx
  on public.group_chat_message_reactions (user_id);

alter table public.group_chats enable row level security;
alter table public.group_chat_members enable row level security;
alter table public.group_chat_messages enable row level security;
alter table public.group_chat_message_reactions enable row level security;

create or replace function public.is_group_chat_member(
  p_group_chat_id bigint,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_chat_members m
    where m.group_chat_id = p_group_chat_id
      and m.user_id = p_user_id
  );
$$;

revoke all on function public.is_group_chat_member(bigint, uuid) from public;
grant execute on function public.is_group_chat_member(bigint, uuid) to authenticated;

create or replace function public.ensure_group_chat_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_chat_members (group_chat_id, user_id, added_by, role, last_read_message_id)
  values (new.id, new.created_by, new.created_by, 'owner', 0)
  on conflict (group_chat_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists tr_ensure_group_chat_owner_membership on public.group_chats;
create trigger tr_ensure_group_chat_owner_membership
after insert on public.group_chats
for each row
execute function public.ensure_group_chat_owner_membership();

drop policy if exists "members can view group chats" on public.group_chats;
create policy "members can view group chats"
on public.group_chats
for select
to authenticated
using (
  exists (
    select 1
    from public.group_chat_members m
    where m.group_chat_id = group_chats.id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "users can create group chats" on public.group_chats;
create policy "users can create group chats"
on public.group_chats
for insert
to authenticated
with check (
  created_by = auth.uid()
);

drop policy if exists "owners can update group chats" on public.group_chats;
create policy "owners can update group chats"
on public.group_chats
for update
to authenticated
using (
  exists (
    select 1
    from public.group_chat_members m
    where m.group_chat_id = group_chats.id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.group_chat_members m
    where m.group_chat_id = group_chats.id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  )
);

drop policy if exists "owners can delete group chats" on public.group_chats;
create policy "owners can delete group chats"
on public.group_chats
for delete
to authenticated
using (
  exists (
    select 1
    from public.group_chat_members m
    where m.group_chat_id = group_chats.id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  )
);

drop policy if exists "members can view group chat members" on public.group_chat_members;
create policy "members can view group chat members"
on public.group_chat_members
for select
to authenticated
using (
  public.is_group_chat_member(group_chat_members.group_chat_id, auth.uid())
);

drop policy if exists "members can view group chat messages" on public.group_chat_messages;
create policy "members can view group chat messages"
on public.group_chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.group_chat_members m
    where m.group_chat_id = group_chat_messages.group_chat_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "members can send group chat messages" on public.group_chat_messages;
create policy "members can send group chat messages"
on public.group_chat_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.group_chat_members m
    where m.group_chat_id = group_chat_messages.group_chat_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "users can delete own group chat messages" on public.group_chat_messages;
create policy "users can delete own group chat messages"
on public.group_chat_messages
for delete
to authenticated
using (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.group_chat_members m
    where m.group_chat_id = group_chat_messages.group_chat_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "members can view group chat reactions" on public.group_chat_message_reactions;
create policy "members can view group chat reactions"
on public.group_chat_message_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.group_chat_messages gm
    join public.group_chat_members m on m.group_chat_id = gm.group_chat_id
    where gm.id = group_chat_message_reactions.message_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "members can add group chat reactions" on public.group_chat_message_reactions;
create policy "members can add group chat reactions"
on public.group_chat_message_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.group_chat_messages gm
    join public.group_chat_members m on m.group_chat_id = gm.group_chat_id
    where gm.id = group_chat_message_reactions.message_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "users can remove own group chat reactions" on public.group_chat_message_reactions;
create policy "users can remove own group chat reactions"
on public.group_chat_message_reactions
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.group_chat_messages gm
    join public.group_chat_members m on m.group_chat_id = gm.group_chat_id
    where gm.id = group_chat_message_reactions.message_id
      and m.user_id = auth.uid()
  )
);

create or replace function public.users_are_friends(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.sender_id = p_user_a and fr.receiver_id = p_user_b)
        or (fr.sender_id = p_user_b and fr.receiver_id = p_user_a)
      )
  );
$$;

revoke all on function public.users_are_friends(uuid, uuid) from public;
grant execute on function public.users_are_friends(uuid, uuid) to authenticated;

create or replace function public.create_group_chat(
  p_name text default null,
  p_member_ids uuid[] default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_id uuid := auth.uid();
  normalized_name text;
  created_group_chat_id bigint;
  member_user_id uuid;
begin
  if actor_user_id is null then
    raise exception 'Not authenticated';
  end if;

  normalized_name := left(coalesce(nullif(trim(coalesce(p_name, '')), ''), 'New Group Chat'), 80);

  insert into public.group_chats (created_by, name)
  values (actor_user_id, normalized_name)
  returning id into created_group_chat_id;

  insert into public.group_chat_members (group_chat_id, user_id, added_by, role, last_read_message_id)
  values (created_group_chat_id, actor_user_id, actor_user_id, 'owner', 0)
  on conflict (group_chat_id, user_id) do nothing;

  if p_member_ids is not null then
    for member_user_id in
      select distinct item
      from unnest(p_member_ids) as item
      where item is not null
    loop
      if member_user_id = actor_user_id then
        continue;
      end if;

      if not public.users_are_friends(actor_user_id, member_user_id) then
        raise exception 'You can only add friends to a group chat';
      end if;

      insert into public.group_chat_members (group_chat_id, user_id, added_by, role, last_read_message_id)
      values (created_group_chat_id, member_user_id, actor_user_id, 'member', 0)
      on conflict (group_chat_id, user_id) do nothing;
    end loop;
  end if;

  return json_build_object('group_chat_id', created_group_chat_id);
end;
$$;

revoke all on function public.create_group_chat(text, uuid[]) from public;
grant execute on function public.create_group_chat(text, uuid[]) to authenticated;

create or replace function public.add_group_chat_members(
  p_group_chat_id bigint,
  p_member_ids uuid[]
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_id uuid := auth.uid();
  member_user_id uuid;
  inserted_count integer := 0;
begin
  if actor_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_group_chat_id is null then
    raise exception 'Group chat is required';
  end if;

  if not exists (
    select 1
    from public.group_chat_members self_member
    where self_member.group_chat_id = p_group_chat_id
      and self_member.user_id = actor_user_id
  ) then
    raise exception 'Not allowed to add members to this group chat';
  end if;

  if p_member_ids is null or coalesce(array_length(p_member_ids, 1), 0) = 0 then
    return json_build_object('inserted_count', 0);
  end if;

  for member_user_id in
    select distinct item
    from unnest(p_member_ids) as item
    where item is not null
  loop
    if member_user_id = actor_user_id then
      continue;
    end if;

    if not public.users_are_friends(actor_user_id, member_user_id) then
      raise exception 'You can only add friends to a group chat';
    end if;

    insert into public.group_chat_members (group_chat_id, user_id, added_by, role, last_read_message_id)
    values (p_group_chat_id, member_user_id, actor_user_id, 'member', 0)
    on conflict (group_chat_id, user_id) do nothing;

    if found then
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  return json_build_object('inserted_count', inserted_count);
end;
$$;

revoke all on function public.add_group_chat_members(bigint, uuid[]) from public;
grant execute on function public.add_group_chat_members(bigint, uuid[]) to authenticated;

create or replace function public.mark_group_chat_read(p_group_chat_id bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_id uuid := auth.uid();
  latest_message_id bigint := 0;
begin
  if actor_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_group_chat_id is null then
    raise exception 'Group chat is required';
  end if;

  if not exists (
    select 1
    from public.group_chat_members m
    where m.group_chat_id = p_group_chat_id
      and m.user_id = actor_user_id
  ) then
    raise exception 'Not allowed to read this group chat';
  end if;

  select coalesce(max(m.id), 0)
  into latest_message_id
  from public.group_chat_messages m
  where m.group_chat_id = p_group_chat_id;

  update public.group_chat_members m
  set last_read_message_id = greatest(m.last_read_message_id, latest_message_id)
  where m.group_chat_id = p_group_chat_id
    and m.user_id = actor_user_id;

  return json_build_object(
    'updated', true,
    'last_read_message_id', latest_message_id
  );
end;
$$;

revoke all on function public.mark_group_chat_read(bigint) from public;
grant execute on function public.mark_group_chat_read(bigint) to authenticated;

create or replace function public.list_group_chat_unread_counts(p_group_chat_ids bigint[] default null)
returns table (
  group_chat_id bigint,
  unread_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    m.group_chat_id,
    count(msg.id)::bigint as unread_count
  from public.group_chat_members m
  left join public.group_chat_messages msg
    on msg.group_chat_id = m.group_chat_id
   and msg.sender_id <> auth.uid()
   and msg.id > coalesce(m.last_read_message_id, 0)
  where m.user_id = auth.uid()
    and (
      p_group_chat_ids is null
      or m.group_chat_id = any(p_group_chat_ids)
    )
  group by m.group_chat_id;
$$;

revoke all on function public.list_group_chat_unread_counts(bigint[]) from public;
grant execute on function public.list_group_chat_unread_counts(bigint[]) to authenticated;

drop policy if exists "participants can read message media" on storage.objects;
create policy "participants can read message media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'message-media'
  and (
    (
      (storage.foldername(name))[1] = 'dm'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and exists (
        select 1
        from public.dm_conversations c
        where c.id = ((storage.foldername(name))[2])::bigint
          and (c.user_a = auth.uid() or c.user_b = auth.uid())
      )
    )
    or
    (
      (storage.foldername(name))[1] = 'group'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and exists (
        select 1
        from public.group_chat_members m
        where m.group_chat_id = ((storage.foldername(name))[2])::bigint
          and m.user_id = auth.uid()
      )
    )
    or
    (
      (storage.foldername(name))[1] = 'glytch'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and public.glytch_has_channel_permission(((storage.foldername(name))[2])::bigint, auth.uid(), 'view_channel')
    )
  )
);

drop policy if exists "users can upload scoped message media" on storage.objects;
create policy "users can upload scoped message media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'message-media'
  and (
    (
      (storage.foldername(name))[1] = 'dm'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and (storage.foldername(name))[3] = auth.uid()::text
      and exists (
        select 1
        from public.dm_conversations c
        where c.id = ((storage.foldername(name))[2])::bigint
          and (c.user_a = auth.uid() or c.user_b = auth.uid())
      )
    )
    or
    (
      (storage.foldername(name))[1] = 'group'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and (storage.foldername(name))[3] = auth.uid()::text
      and exists (
        select 1
        from public.group_chat_members m
        where m.group_chat_id = ((storage.foldername(name))[2])::bigint
          and m.user_id = auth.uid()
      )
    )
    or
    (
      (storage.foldername(name))[1] = 'glytch'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and (storage.foldername(name))[3] = auth.uid()::text
      and public.glytch_has_channel_permission(((storage.foldername(name))[2])::bigint, auth.uid(), 'send_messages')
    )
  )
);

drop policy if exists "users can update scoped message media" on storage.objects;
create policy "users can update scoped message media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'message-media'
  and (storage.foldername(name))[3] = auth.uid()::text
)
with check (
  bucket_id = 'message-media'
  and (storage.foldername(name))[3] = auth.uid()::text
  and (
    (
      (storage.foldername(name))[1] = 'dm'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and exists (
        select 1
        from public.dm_conversations c
        where c.id = ((storage.foldername(name))[2])::bigint
          and (c.user_a = auth.uid() or c.user_b = auth.uid())
      )
    )
    or
    (
      (storage.foldername(name))[1] = 'group'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and exists (
        select 1
        from public.group_chat_members m
        where m.group_chat_id = ((storage.foldername(name))[2])::bigint
          and m.user_id = auth.uid()
      )
    )
    or
    (
      (storage.foldername(name))[1] = 'glytch'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and public.glytch_has_channel_permission(((storage.foldername(name))[2])::bigint, auth.uid(), 'send_messages')
    )
  )
);

drop policy if exists "users can delete scoped message media" on storage.objects;
create policy "users can delete scoped message media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'message-media'
  and (storage.foldername(name))[3] = auth.uid()::text
  and (
    (
      (storage.foldername(name))[1] = 'dm'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and exists (
        select 1
        from public.dm_conversations c
        where c.id = ((storage.foldername(name))[2])::bigint
          and (c.user_a = auth.uid() or c.user_b = auth.uid())
      )
    )
    or
    (
      (storage.foldername(name))[1] = 'group'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and exists (
        select 1
        from public.group_chat_members m
        where m.group_chat_id = ((storage.foldername(name))[2])::bigint
          and m.user_id = auth.uid()
      )
    )
    or
    (
      (storage.foldername(name))[1] = 'glytch'
      and (storage.foldername(name))[2] ~ '^[0-9]+$'
      and public.glytch_has_channel_permission(((storage.foldername(name))[2])::bigint, auth.uid(), 'send_messages')
    )
  )
);

commit;
