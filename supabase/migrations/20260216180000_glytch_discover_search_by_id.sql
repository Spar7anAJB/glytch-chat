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
  with params as (
    select
      lower(trim(coalesce(p_query, ''))) as query,
      nullif(regexp_replace(trim(coalesce(p_query, '')), '[^0-9]', '', 'g'), '') as id_query,
      greatest(1, least(coalesce(p_limit, 30), 80)) as limit_count
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
      p.query = ''
      or lower(g.name) like '%' || p.query || '%'
      or lower(coalesce(g.bio, '')) like '%' || p.query || '%'
      or (p.id_query is not null and cast(g.id as text) like '%' || p.id_query || '%')
    )
  order by coalesce(joined.is_joined, false) desc, coalesce(member_stats.member_count, 0) desc, g.created_at desc
  limit (select limit_count from params);
$$;

revoke all on function public.search_public_glytches(text, integer) from public;
grant execute on function public.search_public_glytches(text, integer) to authenticated;

commit;
