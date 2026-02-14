-- 20260212171000_message_reactions.sql
begin;

create table if not exists public.dm_message_reactions (
  message_id bigint not null references public.dm_messages(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emoji text not null check (char_length(trim(emoji)) between 1 and 32),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index if not exists dm_message_reactions_message_id_idx on public.dm_message_reactions (message_id);
create index if not exists dm_message_reactions_user_id_idx on public.dm_message_reactions (user_id);

alter table public.dm_message_reactions enable row level security;

drop policy if exists "participants can view dm reactions" on public.dm_message_reactions;
create policy "participants can view dm reactions"
on public.dm_message_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.dm_messages m
    join public.dm_conversations c on c.id = m.conversation_id
    where m.id = dm_message_reactions.message_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
);

drop policy if exists "participants can add dm reactions" on public.dm_message_reactions;
create policy "participants can add dm reactions"
on public.dm_message_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.dm_messages m
    join public.dm_conversations c on c.id = m.conversation_id
    where m.id = dm_message_reactions.message_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
);

drop policy if exists "users can remove own dm reactions" on public.dm_message_reactions;
create policy "users can remove own dm reactions"
on public.dm_message_reactions
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.dm_messages m
    join public.dm_conversations c on c.id = m.conversation_id
    where m.id = dm_message_reactions.message_id
      and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  )
);

create table if not exists public.glytch_message_reactions (
  message_id bigint not null references public.glytch_messages(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emoji text not null check (char_length(trim(emoji)) between 1 and 32),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index if not exists glytch_message_reactions_message_id_idx on public.glytch_message_reactions (message_id);
create index if not exists glytch_message_reactions_user_id_idx on public.glytch_message_reactions (user_id);

alter table public.glytch_message_reactions enable row level security;

drop policy if exists "members can view glytch message reactions" on public.glytch_message_reactions;
create policy "members can view glytch message reactions"
on public.glytch_message_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.glytch_messages gm
    join public.glytch_channels c on c.id = gm.glytch_channel_id
    where gm.id = glytch_message_reactions.message_id
      and public.glytch_has_channel_permission(c.id, auth.uid(), 'view_channel')
  )
);

drop policy if exists "members can add glytch message reactions" on public.glytch_message_reactions;
create policy "members can add glytch message reactions"
on public.glytch_message_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.glytch_messages gm
    join public.glytch_channels c on c.id = gm.glytch_channel_id
    where gm.id = glytch_message_reactions.message_id
      and public.glytch_has_channel_permission(c.id, auth.uid(), 'view_channel')
  )
);

drop policy if exists "users can remove own glytch message reactions" on public.glytch_message_reactions;
create policy "users can remove own glytch message reactions"
on public.glytch_message_reactions
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.glytch_messages gm
    join public.glytch_channels c on c.id = gm.glytch_channel_id
    where gm.id = glytch_message_reactions.message_id
      and public.glytch_has_channel_permission(c.id, auth.uid(), 'view_channel')
  )
);

commit;
