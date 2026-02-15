-- 20260214200000_glytch_bot_system_sender.sql
begin;

do $$
declare
  bot_user_id constant uuid := '00000000-0000-4000-8000-00000000b070';
  bot_email constant text := 'glytch-bot@system.local';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000'::uuid,
    bot_user_id,
    'authenticated',
    'authenticated',
    bot_email,
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email'], 'is_system_bot', true),
    jsonb_build_object('display_name', 'Glytch Bot', 'username', 'glytchbot_00b070'),
    now(),
    now()
  )
  on conflict (id) do nothing;

  insert into public.profiles (
    user_id,
    email,
    display_name,
    username,
    bio,
    profile_theme
  )
  values (
    bot_user_id,
    bot_email,
    'Glytch Bot',
    'glytchbot_00b070',
    'Built-in Glytch moderation assistant.',
    '{}'::jsonb
  )
  on conflict (user_id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      username = excluded.username,
      bio = excluded.bio,
      profile_theme = excluded.profile_theme;
end;
$$;

create or replace function public.send_glytch_bot_dm_notice(
  p_glytch_id bigint,
  p_target_user_id uuid,
  p_event text,
  p_reason text default null,
  p_actor_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  bot_sender_user_id constant uuid := '00000000-0000-4000-8000-00000000b070';
  settings_row public.glytch_bot_settings;
  normalized_event text;
  glytch_name text;
  dm_conversation_id bigint;
  dm_content text;
  reason_suffix text;
  low_user uuid;
  high_user uuid;
begin
  if p_glytch_id is null or p_target_user_id is null then
    return;
  end if;

  if p_target_user_id = bot_sender_user_id then
    return;
  end if;

  normalized_event := lower(trim(coalesce(p_event, '')));
  if normalized_event not in ('kicked', 'banned', 'message_blocked') then
    return;
  end if;

  settings_row := public.ensure_glytch_bot_settings_row(p_glytch_id, p_actor_user_id);

  if normalized_event in ('kicked', 'banned') and not settings_row.dm_on_kick_or_ban then
    return;
  end if;

  if normalized_event = 'message_blocked' and not settings_row.dm_on_message_block then
    return;
  end if;

  select g.name
  into glytch_name
  from public.glytches g
  where g.id = p_glytch_id;

  if glytch_name is null then
    return;
  end if;

  reason_suffix := case
    when nullif(trim(coalesce(p_reason, '')), '') is null then ''
    else ' Reason: ' || trim(p_reason)
  end;

  if normalized_event = 'kicked' then
    dm_content := '[Glytch Bot] You were kicked from "' || glytch_name || '".' || reason_suffix;
  elsif normalized_event = 'banned' then
    dm_content := '[Glytch Bot] You were banned from "' || glytch_name || '".' || reason_suffix;
  else
    dm_content := '[Glytch Bot] A message you sent in "' || glytch_name || '" was blocked by server moderation.' || reason_suffix;
  end if;

  low_user := least(bot_sender_user_id, p_target_user_id);
  high_user := greatest(bot_sender_user_id, p_target_user_id);

  insert into public.dm_conversations (user_a, user_b)
  values (low_user, high_user)
  on conflict (user_a, user_b) do nothing;

  select c.id
  into dm_conversation_id
  from public.dm_conversations c
  where c.user_a = low_user
    and c.user_b = high_user
  limit 1;

  if dm_conversation_id is null then
    return;
  end if;

  insert into public.dm_messages (conversation_id, sender_id, content)
  values (dm_conversation_id, bot_sender_user_id, dm_content);
end;
$$;

revoke all on function public.send_glytch_bot_dm_notice(bigint, uuid, text, text, uuid) from public;
grant execute on function public.send_glytch_bot_dm_notice(bigint, uuid, text, text, uuid) to authenticated;

commit;
