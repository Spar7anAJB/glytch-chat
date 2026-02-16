-- 20260216141000_profile_comments.sql
begin;

create table if not exists public.profile_comments (
  id bigint generated always as identity primary key,
  profile_user_id uuid not null references public.profiles(user_id) on delete cascade,
  author_user_id uuid not null default auth.uid() references public.profiles(user_id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint profile_comments_content_length check (char_length(trim(content)) between 1 and 400)
);

create index if not exists profile_comments_profile_user_idx
  on public.profile_comments (profile_user_id, created_at asc);

create index if not exists profile_comments_author_user_idx
  on public.profile_comments (author_user_id, created_at desc);

alter table public.profile_comments enable row level security;

create or replace function public.profile_comments_visibility_mode(p_profile_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when lower(coalesce(p.profile_theme ->> 'profileCommentsVisibility', 'public')) in ('public', 'friends', 'private', 'off')
        then lower(coalesce(p.profile_theme ->> 'profileCommentsVisibility', 'public'))
      else 'public'
    end
  from public.profiles p
  where p.user_id = p_profile_user_id
  limit 1;
$$;

revoke all on function public.profile_comments_visibility_mode(uuid) from public;
grant execute on function public.profile_comments_visibility_mode(uuid) to authenticated;

drop policy if exists "users can read visible profile comments" on public.profile_comments;
create policy "users can read visible profile comments"
on public.profile_comments
for select
to authenticated
using (
  auth.uid() = profile_user_id
  or (
    coalesce(public.profile_comments_visibility_mode(profile_user_id), 'public') = 'public'
    or (
      coalesce(public.profile_comments_visibility_mode(profile_user_id), 'public') = 'friends'
      and public.users_are_friends(auth.uid(), profile_user_id)
    )
  )
);

drop policy if exists "users can create allowed profile comments" on public.profile_comments;
create policy "users can create allowed profile comments"
on public.profile_comments
for insert
to authenticated
with check (
  auth.uid() = author_user_id
  and char_length(trim(content)) between 1 and 400
  and (
    coalesce(public.profile_comments_visibility_mode(profile_user_id), 'public') = 'public'
    or (
      coalesce(public.profile_comments_visibility_mode(profile_user_id), 'public') = 'friends'
      and (
        auth.uid() = profile_user_id
        or public.users_are_friends(auth.uid(), profile_user_id)
      )
    )
    or (
      coalesce(public.profile_comments_visibility_mode(profile_user_id), 'public') = 'private'
      and auth.uid() = profile_user_id
    )
  )
);

drop policy if exists "authors or owners can delete profile comments" on public.profile_comments;
create policy "authors or owners can delete profile comments"
on public.profile_comments
for delete
to authenticated
using (
  auth.uid() = author_user_id
  or auth.uid() = profile_user_id
);

commit;
