-- 20260220103000_username_hash_separator.sql
-- Store usernames as basename#6-char id and keep lookup RPCs compatible with legacy basename+id input.

alter table public.profiles add column if not exists current_game text;
alter table public.profiles add column if not exists current_game_updated_at timestamptz;
alter table public.profiles drop constraint if exists profiles_username_no_spaces;
alter table public.profiles drop constraint if exists profiles_username_format;

do $$
declare
  row_record record;
  normalized_source text;
  base_candidate text;
  suffix_candidate text;
  username_candidate text;
begin
  for row_record in
    select p.user_id, p.username, p.display_name
    from public.profiles p
    order by p.created_at asc nulls last, p.user_id asc
  loop
    normalized_source := lower(regexp_replace(coalesce(row_record.username, ''), '[^a-z0-9#]', '', 'g'));

    if normalized_source ~ '^[a-z0-9]{3,24}#[a-z0-9]{6}$' then
      base_candidate := split_part(normalized_source, '#', 1);
      suffix_candidate := split_part(normalized_source, '#', 2);
    elsif normalized_source ~ '^[a-z0-9]{9,30}$' then
      base_candidate := left(normalized_source, char_length(normalized_source) - 6);
      suffix_candidate := right(normalized_source, 6);
    else
      base_candidate := lower(regexp_replace(coalesce(row_record.username, ''), '[^a-z0-9]', '', 'g'));
      suffix_candidate := substr(encode(gen_random_bytes(6), 'hex'), 1, 6);
    end if;

    if char_length(base_candidate) < 3 then
      base_candidate := 'user' || substr(replace(row_record.user_id::text, '-', ''), 1, 6);
    end if;
    base_candidate := left(base_candidate, 24);
    if char_length(base_candidate) < 3 then
      base_candidate := rpad(base_candidate, 3, '0');
    end if;

    if suffix_candidate is null or char_length(suffix_candidate) <> 6 then
      suffix_candidate := substr(encode(gen_random_bytes(6), 'hex'), 1, 6);
    end if;

    loop
      suffix_candidate := lower(regexp_replace(coalesce(suffix_candidate, ''), '[^a-z0-9]', '', 'g'));
      if char_length(suffix_candidate) <> 6 then
        suffix_candidate := substr(encode(gen_random_bytes(6), 'hex'), 1, 6);
        continue;
      end if;

      username_candidate := base_candidate || '#' || suffix_candidate;
      exit when not exists (
        select 1
        from public.profiles p2
        where lower(regexp_replace(p2.username, '[^a-z0-9]', '', 'g')) =
              lower(regexp_replace(username_candidate, '[^a-z0-9]', '', 'g'))
          and p2.user_id <> row_record.user_id
      );

      suffix_candidate := substr(encode(gen_random_bytes(6), 'hex'), 1, 6);
    end loop;

    update public.profiles p
    set username = username_candidate,
        display_name = coalesce(nullif(trim(row_record.display_name), ''), base_candidate)
    where p.user_id = row_record.user_id;
  end loop;
end;
$$;

alter table public.profiles add constraint profiles_username_format check (username ~ '^[a-z0-9]{3,24}#[a-z0-9]{6}$');

drop function if exists public.is_username_available(text);
create function public.is_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  with normalized as (
    select lower(regexp_replace(trim(coalesce(p_username, '')), '[^a-z0-9]', '', 'g')) as lookup_key
  )
  select
    lookup_key <> ''
    and char_length(lookup_key) between 9 and 30
    and not exists (
      select 1
      from public.profiles p
      where lower(regexp_replace(p.username, '[^a-z0-9]', '', 'g')) = normalized.lookup_key
    )
  from normalized;
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

drop function if exists public.find_public_profile_by_username(text);
drop function if exists public.list_public_profiles_by_ids(uuid[]);

create function public.find_public_profile_by_username(p_username text)
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  banner_url text,
  bio text,
  profile_theme jsonb,
  presence_status text,
  presence_updated_at timestamptz,
  current_game text,
  current_game_updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with normalized as (
    select lower(regexp_replace(trim(coalesce(p_username, '')), '[^a-z0-9]', '', 'g')) as lookup_key
  )
  select
    p.user_id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.banner_url,
    p.bio,
    p.profile_theme,
    coalesce(p.presence_status, 'offline')::text,
    p.presence_updated_at,
    p.current_game,
    p.current_game_updated_at
  from public.profiles p
  cross join normalized
  where normalized.lookup_key <> ''
    and lower(regexp_replace(p.username, '[^a-z0-9]', '', 'g')) = normalized.lookup_key
  limit 1;
$$;

revoke all on function public.find_public_profile_by_username(text) from public;
grant execute on function public.find_public_profile_by_username(text) to authenticated;

create function public.list_public_profiles_by_ids(p_user_ids uuid[])
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  banner_url text,
  bio text,
  profile_theme jsonb,
  presence_status text,
  presence_updated_at timestamptz,
  current_game text,
  current_game_updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.user_id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.banner_url,
    p.bio,
    p.profile_theme,
    coalesce(p.presence_status, 'offline')::text,
    p.presence_updated_at,
    p.current_game,
    p.current_game_updated_at
  from public.profiles p
  where p_user_ids is not null
    and p.user_id = any (p_user_ids)
  order by p.username asc;
$$;

revoke all on function public.list_public_profiles_by_ids(uuid[]) from public;
grant execute on function public.list_public_profiles_by_ids(uuid[]) to authenticated;
