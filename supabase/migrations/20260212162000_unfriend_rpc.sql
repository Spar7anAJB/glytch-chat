-- 20260212162000_unfriend_rpc.sql
begin;

create or replace function public.unfriend_user(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  low_user uuid;
  high_user uuid;
  removed_conversation boolean := false;
  removed_requests integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id is null or p_user_id = auth.uid() then
    raise exception 'Invalid target user';
  end if;

  low_user := least(auth.uid(), p_user_id);
  high_user := greatest(auth.uid(), p_user_id);

  delete from public.dm_conversations c
  where c.user_a = low_user
    and c.user_b = high_user;

  removed_conversation := found;

  delete from public.friend_requests fr
  where (fr.sender_id = auth.uid() and fr.receiver_id = p_user_id)
     or (fr.sender_id = p_user_id and fr.receiver_id = auth.uid());

  get diagnostics removed_requests = row_count;

  return json_build_object(
    'removed_conversation', removed_conversation,
    'removed_requests', removed_requests
  );
end;
$$;

revoke all on function public.unfriend_user(uuid) from public;
grant execute on function public.unfriend_user(uuid) to authenticated;

commit;
