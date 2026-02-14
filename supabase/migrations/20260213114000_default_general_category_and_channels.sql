-- 20260213114000_default_general_category_and_channels.sql
begin;

create or replace function public.create_glytch(p_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_glytch_id bigint;
  new_code text;
  general_category_id bigint;
  general_channel_id bigint;
begin
  insert into public.glytches (owner_id, name)
  values (auth.uid(), trim(p_name))
  returning id, invite_code into new_glytch_id, new_code;

  insert into public.glytch_members (glytch_id, user_id, role)
  values (new_glytch_id, auth.uid(), 'owner')
  on conflict (glytch_id, user_id) do update set role = 'owner';

  perform public.initialize_glytch_roles(new_glytch_id, auth.uid());

  insert into public.glytch_channel_categories (glytch_id, name, created_by)
  values (new_glytch_id, 'General', auth.uid())
  returning id into general_category_id;

  insert into public.glytch_channels (glytch_id, name, kind, category_id, created_by)
  values (new_glytch_id, 'general-chat', 'text', general_category_id, auth.uid())
  returning id into general_channel_id;

  insert into public.glytch_channels (glytch_id, name, kind, category_id, created_by)
  values (new_glytch_id, 'general-vc', 'voice', general_category_id, auth.uid());

  return json_build_object(
    'glytch_id', new_glytch_id,
    'invite_code', new_code,
    'channel_id', general_channel_id
  );
end;
$$;

revoke all on function public.create_glytch(text) from public;
grant execute on function public.create_glytch(text) to authenticated;

commit;
