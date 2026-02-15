-- Fix recursive RLS evaluation on public.group_chat_members
begin;

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

drop policy if exists "members can view group chat members" on public.group_chat_members;
create policy "members can view group chat members"
on public.group_chat_members
for select
to authenticated
using (
  public.is_group_chat_member(group_chat_members.group_chat_id, auth.uid())
);

commit;
