-- 20260216180000_glytch_discover_search_by_id.sql
begin;

create or replace function public.search_public_glytches(
  p_query text default null,
  p_limit integer default 30
)
returns table (
  id bigint,
  owner_id uuid,
  name text,
  invite_code text,
  bio text,
  icon_url text,
  is_public boolean,
  max_members integer,
  member_count integer,
  created_at timestamptz,
  is_joined boolean
)
language sql
security definer
set search_path = public
as $$
  with base_params as (
    select
      trim(coalesce(p_query, '')) as raw_query,
      greatest(1, least(coalesce(p_limit, 30), 80)) as limit_count
  ),
  params as (
    select
      case
        when raw_query = '' then ''
        when position('#' in raw_query) > 0 then lower(trim(split_part(raw_query, '#', 1)))
        when raw_query ~ '^[0-9]+$' then ''
        else lower(raw_query)
      end as name_query,
      case
        when raw_query = '' then null
        when position('#' in raw_query) > 0 then nullif(regexp_replace(split_part(raw_query, '#', 2), '[^0-9]', '', 'g'), '')
        when raw_query ~ '^[0-9]+$' then raw_query
        else null
      end as id_query,
      limit_count
    from base_params
  )
  select
    g.id,
    g.owner_id,
    g.name,
    g.invite_code,
    g.bio,
    g.icon_url,
    g.is_public,
    g.max_members,
    coalesce(member_stats.member_count, 0)::integer as member_count,
    g.created_at,
    coalesce(joined.is_joined, false) as is_joined
  from public.glytches g
  cross join params p
  left join lateral (
    select count(*)::integer as member_count
    from public.glytch_members m
    where m.glytch_id = g.id
  ) member_stats on true
  left join lateral (
    select true as is_joined
    from public.glytch_members m
    where m.glytch_id = g.id
      and m.user_id = auth.uid()
    limit 1
  ) joined on true
  where g.is_public = true
    and (
      p.name_query = ''
      or lower(g.name) like '%' || p.name_query || '%'
      or lower(coalesce(g.bio, '')) like '%' || p.name_query || '%'
    )
    and (p.id_query is null or cast(g.id as text) = p.id_query)
  order by coalesce(joined.is_joined, false) desc, coalesce(member_stats.member_count, 0) desc, g.created_at desc
  limit (select limit_count from params);
$$;

revoke all on function public.search_public_glytches(text, integer) from public;
grant execute on function public.search_public_glytches(text, integer) to authenticated;

commit;
