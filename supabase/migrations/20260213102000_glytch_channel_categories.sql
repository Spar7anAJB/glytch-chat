-- 20260213102000_glytch_channel_categories.sql
begin;

create table if not exists public.glytch_channel_categories (
  id bigint generated always as identity primary key,
  glytch_id bigint not null references public.glytches(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 48),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (glytch_id, name)
);

alter table public.glytch_channels
  add column if not exists category_id bigint references public.glytch_channel_categories(id) on delete set null;

create index if not exists idx_glytch_channel_categories_glytch_created_at
  on public.glytch_channel_categories (glytch_id, created_at);

create index if not exists idx_glytch_channels_category_id
  on public.glytch_channels (category_id);

alter table public.glytch_channel_categories enable row level security;

drop policy if exists "members can view channel categories" on public.glytch_channel_categories;
create policy "members can view channel categories"
on public.glytch_channel_categories
for select
using (
  public.is_glytch_member(glytch_id, auth.uid())
);

drop policy if exists "members can create channel categories" on public.glytch_channel_categories;
create policy "members can create channel categories"
on public.glytch_channel_categories
for insert
with check (
  auth.uid() is not null
  and (
    public.is_glytch_owner_or_admin(glytch_id, auth.uid())
    or public.glytch_has_permission(glytch_id, auth.uid(), 'manage_channels')
  )
);

drop policy if exists "managers can update channel categories" on public.glytch_channel_categories;
create policy "managers can update channel categories"
on public.glytch_channel_categories
for update
using (
  public.is_glytch_owner_or_admin(glytch_id, auth.uid())
  or public.glytch_has_permission(glytch_id, auth.uid(), 'manage_channels')
)
with check (
  public.is_glytch_owner_or_admin(glytch_id, auth.uid())
  or public.glytch_has_permission(glytch_id, auth.uid(), 'manage_channels')
);

drop policy if exists "managers can delete channel categories" on public.glytch_channel_categories;
create policy "managers can delete channel categories"
on public.glytch_channel_categories
for delete
using (
  public.is_glytch_owner_or_admin(glytch_id, auth.uid())
  or public.glytch_has_permission(glytch_id, auth.uid(), 'manage_channels')
);

commit;
